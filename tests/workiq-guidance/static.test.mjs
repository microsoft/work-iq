import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { packages } from './contract.mjs';
import { root, skillRoot, markdownFiles, parseMarkdown, frontmatterProblems, linkProblems,
  exampleProblems, policyProblems, discoverabilityProblems } from './doc-lint.mjs';

const check = errors => assert.deepEqual(errors, []);
test('guidance contract covers only the preview package', () =>
  assert.deepEqual(packages, ['workiq-preview']));
for (const name of packages) {
  const directory = skillRoot(name);
  test(`${name}: parsed frontmatter and description limit`, () => {
    check(frontmatterProblems(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), name));
  });
  test(`${name}: canonical domain discoverability`, () => check(discoverabilityProblems(directory)));
  test(`${name}: description requires loading the skill before tool use`, () => {
    const { frontmatter } = parseMarkdown(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'));
    assert.match(frontmatter.description, /must be used beforehand to understand their usage/);
  });
  for (const file of [...markdownFiles(directory), path.join(root, 'plugins', name, 'README.md')]) {
    const relative = path.relative(directory, file);
    const text = fs.readFileSync(file, 'utf8');
    test(`${name}/${relative}: local links and anchors`, () => check(linkProblems(file, text)));
    test(`${name}/${relative}: retrieval JSON contracts`, () => check(exampleProblems(text, relative.endsWith('retrieve-work-iq.md'))));
    test(`${name}/${relative}: semantic policy lint`, () => check(policyProblems(relative, text)));
  }
}
for (const file of packages.flatMap(name => [`plugins/${name}/README.md`, `plugins/${name}/skills/${name}/SKILL.md`])) {
  test(`${file}: preview guidance is agent-host-neutral`, () => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /agent-host-neutral/i);
    assert.doesNotMatch(text, /Full WorkIQ tool surface for GitHub Copilot CLI|Copilot CLI plugin marketplace\*\* for managing/);
  });
}

function checkMetadata(registries, hostManifests) {
  for (const name of packages) {
    const entries = registries.map(registry => registry.plugins.find(plugin => plugin.name === name));
    assert.ok(entries.every(Boolean), `Missing marketplace entry for ${name}`);
    const canonical = entries[0];
    for (const manifest of [entries[1], ...hostManifests[name]]) {
      for (const field of ['name', 'version', 'description']) {
        assert.equal(manifest[field], canonical[field], `${name}: ${field} differs across manifests`);
      }
    }
    assert.equal(entries[1].source, canonical.source);
    assert.match(canonical.description, /retrieve-first.*Grounding.*intentional.*ask/);
  }
}

test('affected plugin metadata agrees across host and marketplace manifests', () => {
  const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const registries = ['marketplace.json', '.claude-plugin/marketplace.json'].map(json);
  const hostManifests = Object.fromEntries(packages.map(name => [name,
    ['.github/plugin', '.claude-plugin', '.codex-plugin']
      .map(host => json(`plugins/${name}/${host}/plugin.json`))
  ]));
  checkMetadata(registries, hostManifests);
});

test('preview metadata stays consistent without imposing its version or policy on public', () => {
  const entries = ['workiq', 'workiq-preview'].map((name, index) => ({
    name, version: index ? '2.1.0' : '2.0.2', source: `./plugins/${name}`,
    description: index ? 'Synthetic retrieve-first Grounding with intentional ask.' : 'Synthetic legacy ask guidance.'
  }));
  const registries = [{ plugins: entries }, { plugins: structuredClone(entries) }];
  const hostManifests = Object.fromEntries(entries.map(entry => [entry.name,
    Array.from({ length: 3 }, () => structuredClone(entry))
  ]));
  assert.doesNotThrow(() => checkMetadata(registries, hostManifests));
  hostManifests['workiq-preview'][0].version = '2.0.2';
  assert.throws(() => checkMetadata(registries, hostManifests), /workiq-preview: version differs/);
});

test('plugin descriptions retain workload and action discovery beyond retrieval', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'marketplace.json'), 'utf8'));
  const checkDiscovery = description => {
    for (const term of ['email', 'calendars?', 'meetings', 'Teams', 'SharePoint', 'OneDrive',
      'people', 'contacts', 'Planner', 'search', 'summarize', 'read', 'create', 'update', 'delete', 'send', 'download']) {
      assert.match(description, new RegExp(`\\b${term}\\b`, 'i'), `Missing capability: ${term}`);
    }
    assert.ok(description.toLowerCase().indexOf('email') < description.indexOf('retrieve-first'),
      'Lead with workloads rather than retrieval policy');
  };
  for (const name of packages) {
    const description = registry.plugins.find(plugin => plugin.name === name).description;
    checkDiscovery(description);
    assert.throws(() => checkDiscovery(description.replace(/Planner/gi, 'work')), /Planner/);
    assert.throws(() => checkDiscovery(description.replace(/\bsend\b/gi, 'act')), /send/);
  }
});
