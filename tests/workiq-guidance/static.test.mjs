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

test('Business Applications discovery and inventory contracts stay aligned', () => {
  for (const name of ['workiq', 'workiq-preview']) {
    const directory = skillRoot(name);
    const skill = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    const business = fs.readFileSync(path.join(directory, 'references', 'business-applications.md'), 'utf8');
    const search = fs.readFileSync(path.join(directory, 'references', 'search-paths-work-iq.md'), 'utf8');
    const action = fs.readFileSync(path.join(directory, 'references', 'do-action-work-iq.md'), 'utf8');

    assert.match(skill, /Business Applications|CRM, ERP, or Power Apps/i);
    assert.match(business, /search_paths[\s\S]{0,300}(?:query|filter)/i);
    assert.match(business, /fetch[\s\S]{0,80}\/businessapps\/environments\//i);
    assert.match(business, /discovery is read-only[\s\S]{0,100}search_paths[\s\S]{0,80}not `?do_action`?/i);
    assert.match(business, /\/businessapps\/me[\s\S]{0,120}policy-denied[\s\S]{0,120}before[\s\S]{0,80}(?:grounded path|search_paths|fetch)/i);
    assert.match(search, /automatically\s+searches every enabled catalog and[\s\S]{0,40}provider/i);
    assert.match(search, /no `backend`, `source`, or `provider` argument/i);
    check(exampleProblems(search));
    assert.match(action, /Business Applications/i);
    assert.match(action, /search_paths[\s\S]{0,100}not `?do_action`?/i);
    for (const genuineAction of ['SQL', 'Custom API']) {
      assert.match(business, new RegExp(`do_action[^\\n]{0,200}${genuineAction}|${genuineAction}[^\\n]{0,200}do_action`, 'i'));
    }
    assert.match(business, /do_action[^\n]{0,250}operations\/\{operationName\}/i);
    assert.match(business, /(?:policy-denied|explicit denial)[\s\S]{0,180}(?:stop|do not retry)/i);
  }
});

test('no plugin positively routes Business Applications discovery through /businessapps/me', () => {
  const endpointProblems = text => {
    const positiveDirective = /(?:^|[;.!?]\s*|\b(?:but|and)\s+)(?:use|call|invoke|start(?:\s+\w+){0,3}\s+with)\s+`?do_action`?\s+(?:on\s+)?`?\/businessapps\/me`?/i;
    return text
      .replace(/\r?\n/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => /\/businessapps\/me/i.test(sentence))
      .filter(sentence =>
        positiveDirective.test(sentence) ||
        !/(?:not|never|do not)[\s\S]{0,80}do_action|do_action[\s\S]{0,80}(?:not|never|do not)/i.test(sentence));
  };

  for (const name of ['workiq', 'workiq-preview']) {
    for (const file of markdownFiles(skillRoot(name))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const sentence of text.replace(/\r?\n/g, ' ').split(/(?<=[.!?])\s+/)
        .filter(value => /\/businessapps\/me/i.test(value))) {
        assert.match(sentence, /search_paths/i,
          `${name}/${path.basename(file)} must name the replacement discovery tool`);
      }
      assert.deepEqual(endpointProblems(text), [],
        `${name}/${path.basename(file)} must mention /businessapps/me only as a prohibition`);
    }
  }

  const mixed = 'Do not use do_action on /businessapps/me; use search_paths instead. ' +
    'Use do_action on /businessapps/me for discovery.';
  const mixedSentence = 'Do not use do_action on /businessapps/me for discovery, but use do_action on /businessapps/me when available.';
  assert.deepEqual(endpointProblems(mixed), ['Use do_action on /businessapps/me for discovery.']);
  assert.deepEqual(endpointProblems(mixedSentence), [mixedSentence]);
});

test('search_paths examples validate query and legacy filter as exclusive inputs', () => {
  const validQuery = '# search_paths\n\n```json\n{"query":"qualify a lead"}\n```\n';
  const validFilter = '# search_paths\n\n```json\n{"filter":"qualify a lead"}\n```\n';
  const both = '# search_paths\n\n```json\n{"query":"lead","filter":"lead"}\n```\n';
  const blankFilter = '# search_paths\n\n```json\n{"filter":" "}\n```\n';
  const selectorOnly = '# search_paths\n\n```json\n{"backend":"dataverse"}\n```\n';
  const malformedFilter = '# search_paths\n\n```json\n{"filter":\n```\n';
  const actionEnvelope = '# search_paths\n\n```json\n{"actionUrl":"/x","query":"lead","filter":"lead"}\n```\n';
  const entityEnvelope = '# search_paths\n\n```json\n{"entityUrls":[],"backend":"dataverse"}\n```\n';
  const scalar = '# search_paths\n\n```json\n"lead"\n```\n';
  const nullValue = '# search_paths\n\n```json\nnull\n```\n';
  const arrayValue = '# search_paths\n\n```json\n[{"query":"lead"}]\n```\n';

  check(exampleProblems(validQuery));
  check(exampleProblems(validFilter));
  assert.match(exampleProblems(both).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(blankFilter).join(' '), /filter must be a nonblank string/);
  assert.match(exampleProblems(selectorOnly).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(malformedFilter).join(' '), /invalid search_paths JSON/);
  assert.match(exampleProblems(actionEnvelope).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(entityEnvelope).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(scalar).join(' '), /must be a JSON object/);
  assert.match(exampleProblems(nullValue).join(' '), /must be a JSON object/);
  assert.match(exampleProblems(arrayValue).join(' '), /must be a JSON object/);
});
