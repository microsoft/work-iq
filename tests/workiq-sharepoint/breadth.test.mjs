import test from 'node:test';
import assert from 'node:assert/strict';
import { breadthInventory, getBreadthScenario } from './breadth.mjs';
import { catalog } from './matrix.mjs';
import { FixtureServer, helperPaths } from './mock.mjs';
import { failedResult } from './common.mjs';
import { score } from './trace.mjs';

test('breadth inventory covers every captured path once and separates helpers and simulated effects', () => {
  assert.equal(breadthInventory.length, 80);
  assert.deepEqual(breadthInventory.map(row => row.path).sort(), catalog.map(row => row.path).sort());
  for (const row of breadthInventory) {
    assert.equal(row.helper, helperPaths.has(row.path));
    assert.equal(row.layer, 'model-mock');
    assert.match(row.completionEvidence, /not a full service-effect or live-completion/);
    assert.ok(getBreadthScenario(row.id).prompt.includes('https://contoso.sharepoint.com/'));
    assert.ok(!getBreadthScenario(row.id).prompt.includes(row.path));
  }
});

test('catalog mutations execute only a labelled simulation after actual schema and target validation', async () => {
  const scenario = getBreadthScenario('breadth-share_file'), records = [];
  const server = new FixtureServer(scenario, record => records.push(record));
  const c = scenario.context;
  await server.call('call_function', { functionUrl: '/sharepoint/get_site_key', jsonBody: { siteUrl: c.siteUrl } });
  let result = await server.call('do_action', { actionUrl: '/sharepoint/share_file', jsonBody: {
    siteKey: c.siteKey, listFullUrl: 'https://other.sharepoint.com/sites/Other/Documents',
    libraryRelativePath: c.docs[0].name, users: ['reviewer@example.invalid'], permissionType: 'view'
  } });
  assert.equal(failedResult(result), true);
  assert.equal(records.at(-1).valid, false);
  result = await server.call('do_action', { actionUrl: '/sharepoint/share_file', jsonBody: {
    siteKey: c.siteKey, listFullUrl: c.libraryUrl, libraryRelativePath: c.docs[0].name,
    users: ['reviewer@example.invalid'], permissionType: 'view'
  } });
  assert.equal(failedResult(result), false);
  assert.equal(records.at(-1).taskRelevant, true);
  assert.match(JSON.stringify(result), /simulationOnly/);
  assert.equal(server.state.effectApplied, false);
});

test('catalog routing does not manufacture task-completion evidence', async () => {
  const scenario = getBreadthScenario('breadth-get_site_key'), records = [];
  const server = new FixtureServer(scenario, record => records.push(record));
  await server.call('call_function', { functionUrl: scenario.catalogPath, jsonBody: { siteUrl: scenario.context.siteUrl } });
  const events = [
    { type: 'session.mcp_server_tools_loaded', data: { serverName: 'workiq', toolCount: 12 } },
    { type: 'model.call_start', data: { model: 'gpt-6.1-sol' } },
    { type: 'tool.execution_start', data: { toolCallId: 'probe', toolName: 'workiq-call_function', arguments: records[0].arguments } },
    { type: 'tool.execution_complete', data: { toolCallId: 'probe', success: true, result: records[0].result } },
    { type: 'assistant.message', data: { content: 'The site key was returned.' } },
    { type: 'assistant.idle' }
  ];
  const result = score(scenario, events, records, {
    packageHash: 'unit', matrixHash: 'unit', catalogHash: 'unit', evidenceHash: 'unit'
  });
  assert.equal(result.catalogPathSelected, true);
  assert.equal(result.nativeRouting, null);
  assert.equal(result.nativeSuccess, null);
  assert.equal(result.correct, null);
});
