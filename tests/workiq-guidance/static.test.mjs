import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, packages, skillRoot, markdownFiles, frontmatterProblems, linkProblems,
  exampleProblems, policyProblems, discoverabilityProblems, parityProblems } from './doc-lint.mjs';

const check = errors => assert.deepEqual(errors, []);
for (const name of packages) {
  const directory = skillRoot(name);
  test(`${name}: parsed frontmatter and description limit`, () => {
    check(frontmatterProblems(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), name));
  });
  test(`${name}: canonical domain discoverability`, () => check(discoverabilityProblems(directory)));
  for (const file of [...markdownFiles(directory), path.join(root, 'plugins', name, 'README.md')]) {
    const relative = path.relative(directory, file);
    const text = fs.readFileSync(file, 'utf8');
    test(`${name}/${relative}: local links and anchors`, () => check(linkProblems(file, text)));
    test(`${name}/${relative}: retrieval JSON contracts`, () => check(exampleProblems(text, relative.endsWith('retrieve-work-iq.md'))));
    test(`${name}/${relative}: semantic policy lint`, () => check(policyProblems(relative, text)));
  }
}
for (const file of ['AGENTS.md', 'PLUGINS.md', 'CONTRIBUTING.md', 'README.md']) {
  test(`${file}: root documentation local links`, () => check(linkProblems(path.join(root, file), fs.readFileSync(path.join(root, file), 'utf8'))));
}
test('shared policy, reference graph and retrieval example parity', () =>
  check(parityProblems(skillRoot('workiq'), skillRoot('workiq-preview'))));

test('affected plugin metadata agrees across host and marketplace manifests', () => {
  const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const registries = ['marketplace.json', '.claude-plugin/marketplace.json'].map(json);
  for (const name of packages) {
    const entries = registries.map(registry => registry.plugins.find(plugin => plugin.name === name));
    assert.ok(entries.every(Boolean), `Missing marketplace entry for ${name}`);
    const canonical = entries[0];
    for (const manifest of [
      entries[1], ...['.github/plugin', '.claude-plugin', '.codex-plugin']
        .map(host => json(`plugins/${name}/${host}/plugin.json`))
    ]) {
      for (const field of ['name', 'version', 'description']) {
        assert.equal(manifest[field], canonical[field], `${name}: ${field} differs across manifests`);
      }
    }
    assert.equal(entries[1].source, canonical.source);
    assert.match(canonical.description, /retrieve-first.*Grounding.*intentional.*ask/);
  }
});
