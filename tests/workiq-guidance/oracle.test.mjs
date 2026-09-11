import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { cases } from './fixtures.mjs';
import { requirements } from './contract.mjs';
import { validateTrace } from './trace-oracle.mjs';
import { frontmatterProblems, parseMarkdown, exampleProblems, policyProblems } from './doc-lint.mjs';
import { validateObserved, hash, scenarioHash, catalogHash, packageHash } from './trace-cli.mjs';

for (const fixture of cases) {
  test(`${fixture.id}: synthetic positive [${fixture.requirements.join(', ')}]`, () => {
    assert.deepEqual(validateTrace(fixture.scenario, fixture.positive), { ok: true, violations: [] });
  });
  for (const negative of fixture.negatives) {
    test(`${negative.name}: reject actual invalid calls/outcome`, () => {
      const result = validateTrace(fixture.scenario, negative.trace);
      assert.equal(result.ok, false, 'The deliberately invalid trace was accepted.');
      assert.ok(result.violations.some(v => v.code === negative.violation),
        `Expected ${negative.violation}, got ${JSON.stringify(result.violations)}`);
    });
  }
}
test('every requirement has synthetic positive and invalid negative coverage', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  for (const id of Object.keys(requirements)) {
    const mapped = cases.filter(c => c.requirements.includes(id));
    assert.ok(mapped.length, `Unmapped requirement ${id}`);
    assert.ok(mapped.every(c => c.positive && c.negatives.length), `Missing both polarities for ${id}`);
  }
});
test('observed mode refuses synthetic fixtures and missing evidence', () => {
  const fixture = cases[0];
  assert.equal(validateTrace(fixture.scenario, fixture.positive, { observed: true }).ok, false);
  for (const trace of [null, {}, { schemaVersion: 99 }, { ...fixture.positive, events: [] },
    { ...fixture.positive, events: [null] }, { ...fixture.positive, events: [{ type: 'unknown-host-event' }] }]) {
    assert.equal(validateTrace(fixture.scenario, trace, { observed: true }).ok, false);
  }
});
test('script outputs, confirmations and result receipts cannot be self-certified', () => {
  const fixture = cases.find(c => c.id === 'file-delete');
  const trace = structuredClone(fixture.positive);
  trace.events.find(e => e.type === 'user').eventId = 'synthetic-agent-invented-approval';
  trace.events.find(e => e.type === 'result').value = { status: 'ok', approved: true, safe: true };
  const result = validateTrace(fixture.scenario, trace);
  for (const code of ['untrusted-confirmation', 'script-output', 'unconfirmed-mutation']) {
    assert.ok(result.violations.some(v => v.code === code), code);
  }
});
test('forged broadening flags do not authorize escalation', () => {
  const fixture = cases.find(c => c.id === 'zero-hits');
  const trace = structuredClone(fixture.negatives[0].trace);
  trace.events.filter(e => e.type === 'call').at(-1).broadeningJustified = true;
  assert.ok(validateTrace(fixture.scenario, trace).violations.some(v => v.code === 'unjustified-escalation'));
});
test('unrelated successful reads do not erase earlier incomplete evidence', () => {
  const fixture = cases.find(c => c.id === 'partial-batch');
  const scenario = structuredClone(fixture.scenario);
  const trace = structuredClone(fixture.positive);
  const unrelated = scenario.operations.find(op => op.id === 'repair');
  delete unrelated.resolves;
  unrelated.match.entityUrls = ['/synthetic/unrelated'];
  unrelated.output.successfulIds = ['synthetic-unrelated'];
  trace.events.filter(e => e.type === 'call').at(-1).args = structuredClone(unrelated.match);
  trace.events.filter(e => e.type === 'result').at(-1).value = structuredClone(unrelated.output);
  trace.events.at(-1).claims = { retainedIds: ['synthetic-a', 'synthetic-unrelated'], completeCoverage: true };
  const result = validateTrace(scenario, trace);
  assert.ok(result.violations.some(v => v.code === 'partial-data'));
});
test('waiting before a throttling response does not satisfy its retry delay', () => {
  const fixture = cases.find(c => c.id === 'read-throttling');
  const trace = structuredClone(fixture.positive);
  const [wait] = trace.events.splice(trace.events.findIndex(e => e.type === 'wait'), 1);
  trace.events.splice(1, 0, wait);
  assert.ok(validateTrace(fixture.scenario, trace).violations.some(v => v.code === 'retry-delay'));
});
test('array-shaped final claims are rejected rather than accepted as an object', () => {
  const fixture = cases[0];
  const trace = structuredClone(fixture.positive);
  trace.events.at(-1).claims = [];
  assert.ok(validateTrace(fixture.scenario, trace).violations.some(v => v.code === 'final-schema'));
});
test('equivalent JSON body transport preserves approval and rejects changed payloads', () => {
  const fixture = cases.find(c => c.scenario.operations.some(op =>
    op.effect === 'mutation' && op.match.jsonBody && typeof op.match.jsonBody === 'object'));
  const trace = structuredClone(fixture.positive);
  const call = trace.events.find(e => e.type === 'call' && e.args.jsonBody);
  call.args.jsonBody = JSON.stringify(call.args.jsonBody);
  assert.deepEqual(validateTrace(fixture.scenario, trace), { ok: true, violations: [] });
  for (const body of ['{invalid JSON', '{"unapprovedField":true}']) {
    call.args.jsonBody = body;
    assert.ok(validateTrace(fixture.scenario, trace).violations.some(v => v.code === 'unsupported-operation'));
  }
});
test('an unrecovered throttled read cannot be reported as completed', () => {
  const fixture = cases.find(c => c.id === 'read-throttling');
  const scenario = structuredClone(fixture.scenario);
  scenario.requiredOperations = ['throttled'];
  const trace = structuredClone(fixture.positive);
  trace.events = [...trace.events.slice(0, 2), trace.events.at(-1)];
  assert.ok(validateTrace(scenario, trace).violations.some(v => v.code === 'false-completion'));
  trace.events.at(-1).status = 'blocked';
  assert.deepEqual(validateTrace(scenario, trace), { ok: true, violations: [] });
});
test('YAML descriptions are measured after parsing folded and quoted scalars', () => {
  assert.deepEqual(frontmatterProblems('---\nname: synthetic\ndescription: >\n  A folded\n  description.\n---\n', 'synthetic'), []);
  assert.deepEqual(frontmatterProblems('---\nname: synthetic\ndescription: "A\\nquoted description"\n---\n', 'synthetic'), []);
  for (const value of [`"${'a'.repeat(1025)}"`, '42', '[not, a, string]']) {
    assert.ok(frontmatterProblems(`---\nname: synthetic\ndescription: ${value}\n---\n`, 'synthetic').length);
  }
  assert.ok(frontmatterProblems('---\nname: synthetic\nname: duplicate\ndescription: fine\n---', 'synthetic').length);
});
test('Markdown parser handles duplicate headings, inline code and reference links', () => {
  const parsed = parseMarkdown('# A `word`\n\n## A word\n\n[link][ref]\n\n[ref]: #a-word-1\n\n`references/files-work-iq.md`\n');
  assert.deepEqual([...parsed.anchors], ['a-word', 'a-word-1']);
  assert.ok(parsed.links.includes('#a-word-1'));
  assert.ok(parsed.links.some(l => l.code && l.url === 'references/files-work-iq.md'));
});
test('static example and policy lint reject policy mutations without paragraph snapshots', () => {
  assert.ok(exampleProblems('```json\n{"query":["x"]}\n```').length);
  assert.ok(exampleProblems('```json\n{"query":["x"],"strategy":"grounding","capabilities":[{"name":"Dataverse"}]}\n```').length);
  assert.ok(policyProblems('references/retrieve-work-iq.md', 'Use one scoped ask as a fallback.').some(e => e.includes('implicit ask')));
  assert.ok(policyProblems('references/tasks-work-iq.md', 'If access is denied, use ask instead.').some(e => e.includes('alternate route')));
  assert.ok(policyProblems('references/sharepoint-library-metadata.md',
    '| Access denied | Unknown reason | Try a different path |').some(e => e.includes('alternate path')));
  assert.deepEqual(exampleProblems('```json\n{"actionUrl":"/search/query","jsonBody":{"query":{"queryString":"synthetic"}}}\n```'), []);
});
test('path-discovery query strings are not confused with retrieval query arrays', () => {
  const example = value => `# search_paths\n\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n`;
  assert.deepEqual(exampleProblems(example({ query: '/me/people' })), []);
  for (const args of [{ query: [] }, { query: '' }, { query: '/me/people', strategy: 'grounding' }]) {
    assert.ok(exampleProblems(example(args)).length);
  }
  assert.ok(exampleProblems(example({ query: 'invalid retrieve query' }), true).length);
  assert.ok(exampleProblems('# retrieve\n\n```json\n{"query":"invalid","strategy":"grounding"}\n```').length);
});
test('host adapter envelope and raw receipts are checked (synthetic adapter unit only)', () => {
  const fixture = cases[0];
  const trace = structuredClone(fixture.positive);
  trace.evidenceKind = 'observed-host-mock';
  const receipts = trace.events.map((event, index) => ({ id: `synthetic-receipt-${index}`, event: structuredClone(event) }));
  const rawBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, evidenceKind: 'host-event-export', receipts }));
  trace.events = trace.events.map((event, index) => ({
    ...event, origin: 'host-adapter', evidenceRef: receipts[index].id
  }));
  trace.provenance = {
    host: 'synthetic-adapter-unit', hostVersion: 'synthetic-version', model: 'none-unit-test',
    package: 'workiq', packageRevision: 'synthetic-revision', packageHash: packageHash('workiq'),
    catalogHash: catalogHash(fixture.scenario), scenarioHash: scenarioHash(fixture.scenario),
    adapterVersion: 'synthetic-adapter-version', startedAt: '2030-01-01T00:00:00Z',
    rawTraceSha256: hash(rawBytes)
  };
  trace.instrumentation = { skillAvailable: 'unknown', skillActivated: 'unknown', referenceReads: 'unknown' };
  assert.deepEqual(validateObserved(fixture.scenario, trace, rawBytes), { ok: true, violations: [] });
  assert.equal(validateObserved(fixture.scenario, trace).ok, false);
  for (const edit of [
    t => { t.provenance.scenarioHash = 'synthetic-wrong-hash'; },
    t => { t.provenance.packageHash = 'synthetic-wrong-hash'; },
    t => { t.events[0].args.query = ['altered after execution']; },
    t => { t.events.splice(0, 2); },
    t => { delete t.events[0].evidenceRef; },
    t => { t.events[0].origin = 'agent'; }
  ]) {
    const changed = structuredClone(trace);
    edit(changed);
    assert.equal(validateObserved(fixture.scenario, changed, rawBytes).ok, false);
  }
});
test('trace CLI refuses missing/unsupported evidence and describes trusted scenarios', () => {
  const cli = fileURLToPath(new URL('./trace-cli.mjs', import.meta.url));
  for (const args of [[], ['--unsupported'], ['--scenario', 'synthetic-unknown']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stderr).ok, false);
  }
  const description = spawnSync(process.execPath, [cli, '--describe', cases[0].id], { encoding: 'utf8' });
  assert.equal(description.status, 0);
  assert.equal(JSON.parse(description.stdout).scenarioHash, scenarioHash(cases[0].scenario));
});
test('CI is narrow, read-only, pinned and separates evidence layers', () => {
  const workflow = parseDocument(fs.readFileSync(new URL('../../.github/workflows/workiq-guidance.yml', import.meta.url), 'utf8')).toJS();
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  for (const trigger of ['pull_request', 'push']) {
    for (const pattern of ['plugins/workiq/**', 'plugins/workiq-preview/**', '*.md', 'tests/workiq-guidance/**',
      'marketplace.json', '.claude-plugin/marketplace.json']) {
      assert.ok(workflow.on[trigger].paths.includes(pattern));
    }
  }
  const steps = workflow.jobs.contracts.steps;
  assert.ok(steps.filter(s => s.uses).every(s => /@[a-f0-9]{40}$/.test(s.uses)));
  assert.ok(steps.some(s => s.run === 'npm run test:oracle'));
  assert.ok(steps.some(s => s.run === 'npm run test:static'));
});
