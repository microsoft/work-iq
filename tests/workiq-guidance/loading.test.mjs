import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, skillRoot } from './doc-lint.mjs';
import { entryByteLimit, loadingPackages, loadRoute, requiredLinks, declaredRoutes, scenarios, scenarioProblems,
  operativeRules, operativeRuleProblems } from './loading-contract.mjs';

for (const name of loadingPackages) {
  const directory = skillRoot(name);
  test(`${name}: router byte ceiling includes metadata and universal gates`, () => {
    const text = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    assert.ok(Buffer.byteLength(text) <= entryByteLimit);
    for (const pattern of [/without scheme, authority or API version/, /double-encode opaque IDs/,
      /Directory\/contact\/member IDs differ/, /source restrictions, confirmation or denial stops/,
      /Missing guidance stops/, /Summaries do not count/, /required confirmation/,
      /partial\/capped data cannot prove completeness/, /follow supported @odata.nextLink/,
      /Never invent \$skip/, /Inspect every nested result before use/,
      /errors or missing results are not empty[\s\S]{0,20}collections or success/]) assert.match(text, pattern);
  });
  for (const scenario of scenarios.filter(item => !item.packages || item.packages.includes(name))) {
    test(`${name}: ${scenario.id} loads its published owner/prerequisites within its byte budget`, () => {
      assert.deepEqual(scenarioProblems(name, scenario, loadRoute(directory, scenario.id)), []);
    });
  }
  for (const rule of operativeRules.filter(item => !item.packages || item.packages.includes(name))) {
    test(`${name}: ${rule.route} contains its operative constraint in the loaded owner`, () => {
      const route = loadRoute(directory, rule.route);
      assert.deepEqual(operativeRuleProblems(route, rule), []);
      const labelsOnly = {
        ...route, contents: { ...route.contents, [rule.owner]: '# Reminder, recurring series, time zones, drafts, identity, escalation\n' }
      };
      assert.ok(operativeRuleProblems(labelsOnly, rule).length);
      const missingOwner = {
        ...route, contents: Object.fromEntries(Object.entries(route.contents).filter(([file]) => file !== rule.owner))
      };
      missingOwner.contents['SKILL.md'] += '\n' + route.contents[rule.owner];
      assert.ok(operativeRuleProblems(missingOwner, rule).length, 'An unrelated loaded file cannot satisfy the owner constraint.');
    });
  }
  test(`${name}: baseline routine full-file comparators shrink`, () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests/workiq-guidance/loading-baseline.json'), 'utf8'));
    for (const [id, before] of Object.entries(baseline.packages[name])) {
      assert.ok(loadRoute(directory, id).bytes < before.bytes, id);
    }
  });
  test(`${name}: deleting a Markdown prerequisite cannot pass from an unchanged scenario catalog`, () => {
    const scenario = scenarios.find(item => item.id === 'mail-actions');
    const owner = scenario.owner(name);
    const read = file => {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      return file === owner ? text.replace(/^- \[[^\]]+\]\(mutation-work-iq\.md\)\n/m, '') : text;
    };
    const route = loadRoute(directory, scenario.id, { read });
    assert.ok(scenarioProblems(name, scenario, route).some(error => error.includes('mutation')));
  });
  test(`${name}: an extra published prerequisite is included and counted once`, () => {
    const plain = loadRoute(directory, 'mail-read');
    const read = file => {
      const text = fs.readFileSync(path.join(directory, file), 'utf8');
      return file === 'references/mail-read-work-iq.md' ?
        text + '\n## Required before use\n\n- [Recovery](troubleshooting.md)\n- [Recovery again](troubleshooting.md)\n' : text;
    };
    const expanded = loadRoute(directory, 'mail-read', { read });
    const recovery = fs.readFileSync(path.join(directory, 'references/troubleshooting.md'));
    assert.equal(expanded.files.filter(file => file.endsWith('troubleshooting.md')).length, 1);
    assert.equal(expanded.bytes - plain.bytes, recovery.length +
      Buffer.byteLength('\n## Required before use\n\n- [Recovery](troubleshooting.md)\n- [Recovery again](troubleshooting.md)\n'));
  });
  test(`${name}: missing files, cycles, escapes and inflated budgets fail explicitly`, () => {
    const normal = file => fs.readFileSync(path.join(directory, file), 'utf8');
    assert.throws(() => loadRoute(directory, 'mail-read', {
      read: file => file === 'references/mail-read-work-iq.md' ? (() => { throw new Error('Missing selected leaf'); })() : normal(file)
    }), /Missing selected leaf/);
    assert.throws(() => loadRoute(directory, 'mail-read', {
      read: file => normal(file) + (file === 'references/mail-read-work-iq.md' ?
        '\n## Required before use\n\n- [Self](mail-read-work-iq.md)\n' : '')
    }), /cycle/);
    assert.throws(() => requiredLinks('SKILL.md', '## Required before use\n\n- [Escape](../other.md)\n'), /escapes/);
    assert.throws(() => declaredRoutes('SKILL.md', '## Routes\n\n| bad | Target | [Outside](/other.md) |\n'), /Invalid/);
    for (const heading of ['## Required before use ', '### Required before use', '## required before use']) {
      assert.throws(() => requiredLinks('references/test.md', `${heading}\n\n- [Rule](rule.md)\n`), /Noncanonical/);
    }
    assert.throws(() => requiredLinks('references/test.md',
      '## Required before use\n\n- [Rule](rule.md)\n\n## Required before use\n\n- [Other](other.md)\n'), /Duplicate/);
    const route = loadRoute(directory, 'mail-read');
    assert.ok(scenarioProblems(name, { ...scenarios.find(item => item.id === 'mail-read'), limit: 1 }, route).some(error => error.includes('exceeds')));
  });
  test(`${name}: Teams state cannot borrow its intact payload from the presence route`, () => {
    const directoryRead = file => fs.readFileSync(path.join(directory, file), 'utf8');
    const stateFile = 'references/teams-state-work-iq.md';
    const presenceFile = 'references/teams-presence-work-iq.md';
    const state = directoryRead(stateFile);
    const section = name === 'workiq-preview' ? '## Hide, mark read or unread' :
      "## Removing/Deleting/Hiding a chat from the current user's chat list";
    const start = state.indexOf(section);
    assert.ok(start >= 0);
    const read = file => file === stateFile ? state.slice(0, start) :
      file === presenceFile ? directoryRead(file) + '\n' + state.slice(start) : directoryRead(file);
    const rule = operativeRules.find(item => item.route === 'teams-state');
    const route = loadRoute(directory, 'teams-state', { read });
    assert.ok(operativeRuleProblems(route, rule).length);
    assert.match(Object.values(loadRoute(directory, 'teams-presence', { read }).contents).join('\n'), /lastMessageReadDateTime/);
  });
  test(`${name}: relocated payload references do not point back to the mechanics-only action index`, () => {
    if (name !== 'workiq') return;
    for (const file of ['teams-state-work-iq.md', 'teams-actions-work-iq.md', 'upload-blob-work-iq.md']) {
      const text = fs.readFileSync(path.join(directory, 'references', file), 'utf8');
      assert.doesNotMatch(text, /(?:body|bodies|payload|example)[^\n]{0,140}do-action-work-iq\.md/i);
    }
  });
}

test('preview sufficient success does not load repair; any follow-up has an explicit repair route', () => {
  const directory = skillRoot('workiq-preview');
  assert.ok(!loadRoute(directory, 'semantic-context').files.includes('references/retrieve-repair-work-iq.md'));
  const followup = loadRoute(directory, 'retrieval-follow-up');
  assert.ok(followup.files.includes('references/retrieve-repair-work-iq.md'));
  const core = followup.contents['references/retrieve-work-iq.md'];
  assert.match(core, /Before ANY same-objective follow-up retrieval, after success or failure/);
  for (const pattern of [/Sufficient evidence ends/, /Empty results, caps, errors and timeouts do not/,
    /At most one[\s\S]{0,60}escalation per objective/]) assert.match(core, pattern);
});
