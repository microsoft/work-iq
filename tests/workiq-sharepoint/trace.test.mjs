import test from 'node:test';
import assert from 'node:assert/strict';
import { getScenario } from './matrix.mjs';
import { FixtureServer } from './mock.mjs';
import { score, summarize, normalizeEvents } from './trace.mjs';

const provenance = {
  packageHash: 'synthetic-unit-fixture', matrixHash: 'synthetic-unit-fixture',
  catalogHash: 'synthetic-unit-fixture', evidenceHash: 'synthetic-unit-fixture'
};
function events(records, answer, extra = []) {
  return [
    { type: 'session.mcp_server_tools_loaded', data: { serverName: 'workiq', toolCount: 12 } },
    { type: 'model.call_start', data: { model: 'gpt-6.1-sol' } },
    ...records.flatMap((record, index) => [
      { type: 'tool.execution_start', data: { toolCallId: `unit-${index}`, toolName: `workiq-${record.name}`,
        arguments: record.arguments, mcpConfigServerName: 'workiq' } },
      { type: 'tool.execution_complete', data: { toolCallId: `unit-${index}`, success: true, result: record.result } }
    ]),
    ...extra,
    { type: 'assistant.message', data: { content: answer, toolRequests: [] } },
    { type: 'assistant.idle' }
  ];
}
function fixture(id) {
  const scenario = getScenario(id), records = [];
  const server = new FixtureServer(scenario, record => records.push(record));
  const call = (name, body) => server.call('call_function', { functionUrl: `/sharepoint/${name}`, jsonBody: body });
  return { scenario, records, server, call };
}

test('helper-only native calls cannot convert a legacy answer into native success', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.server.call('ask', { question: f.scenario.prompt });
  const answer = `${c.docs[0].gate}; ${c.docs[0].minutes} minutes. ${c.docs[0].fileUrl}`;
  const result = score(f.scenario, events(f.records, answer), f.records, provenance);
  assert.equal(result.instrumentationValid, true);
  assert.equal(result.anyNativeHit, true);
  assert.equal(result.correct, true);
  assert.equal(result.nativeRouting, false);
  assert.equal(result.nativeSuccess, false);
});

test('correct native evidence counts, but a blocked download attempt still defeats success', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  const answer = `${c.docs[0].gate}; ${c.docs[0].minutes} minutes. ${c.docs[0].fileUrl}`;
  let result = score(f.scenario, events(f.records, answer), f.records, provenance);
  assert.equal(result.nativeSuccess, true);
  result = score(f.scenario, events(f.records, answer, [
    { type: 'tool.execution_start', data: { toolCallId: 'denied', toolName: 'web_fetch', arguments: { url: c.docs[0].fileUrl } } },
    { type: 'tool.execution_complete', data: { toolCallId: 'denied', success: false, result: 'Permission denied.' } }
  ]), f.records, provenance);
  assert.equal(result.nativeRouting, true);
  assert.equal(result.unrequestedDownloads, 1);
  assert.equal(result.nativeSuccess, false);
});

test('an invalid native body is not a task-relevant routing win', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_structured_text', { siteKey: 'made-up', fileUrl: c.docs[0].fileUrl });
  const result = score(f.scenario, events(f.records, 'Unable to read the file.'), f.records, provenance);
  assert.equal(result.nativeRouting, false);
  assert.equal(result.invalidNativeAttempts, 1);
});

test('a valid native read of the wrong document is not a task-relevant routing win', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[1].fileUrl, returnContent: true });
  assert.equal(f.records.at(-1).valid, true);
  const result = score(f.scenario, events(f.records, `${c.docs[1].text}\n${c.docs[1].fileUrl}`), f.records, provenance);
  assert.equal(result.nativeRouting, false);
  assert.equal(result.nativeSuccess, false);
});

test('an unrelated citation does not substantiate otherwise correct document facts', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  const answer = `${c.docs[0].gate}; ${c.docs[0].minutes} minutes. [Source](https://example.invalid/unrelated)`;
  const result = score(f.scenario, events(f.records, answer), f.records, provenance);
  assert.equal(result.nativeRouting, true);
  assert.equal(result.correct, false);
  assert.equal(result.nativeSuccess, false);
});

test('all compared documents need their own source link', async () => {
  const f = fixture('multiple-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, files: c.docs.map(doc => ({
    fileUrl: doc.fileUrl, returnContent: true
  })) });
  const answer = `${c.docs.map(doc => doc.text).join('\n')}\nThe approval codes and recovery windows differ.`;
  let result = score(f.scenario, events(f.records, `${answer}\n${c.docs[0].fileUrl}`), f.records, provenance);
  assert.equal(result.correct, false);
  result = score(f.scenario, events(f.records, `${answer}\n${c.docs.map(doc => doc.fileUrl).join('\n')}`), f.records, provenance);
  assert.equal(result.nativeSuccess, true);
});

test('valid structured extraction answers a focused question without claiming the preferred semantic route', async () => {
  const f = fixture('semantic-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl, returnContent: true });
  const result = score(f.scenario, events(f.records, `${c.docs[0].gate}. ${c.docs[0].fileUrl}`), f.records, provenance);
  assert.equal(result.nativeSuccess, true);
  assert.equal(result.botdocUsed, true);
  assert.equal(result.preferredOperationUsed, false);
  assert.equal(result.semanticSearchUsed, false);
  assert.equal(result.structuredTextUsed, true);
});

test('an observed session choosing no tool is a routing failure, not an instrumentation exclusion', () => {
  const result = score(getScenario('reading-01'), events([], 'I did not read this file.'), [], provenance);
  assert.equal(result.instrumentationValid, true);
  assert.equal(result.nativeRouting, false);
  assert.equal(result.correct, false);
});

test('fact checks accept formatted numbers and equivalent dates without accepting wrong facts', async () => {
  const f = fixture('regression-16');
  await f.server.call('call_function', { functionUrl: "/me/drive/root/search(q='Personal-notes.txt')" });
  for (const date of ['January 15, 2026', '15 Jan 2026', '2026-01-15']) {
    const result = score(f.scenario, events(f.records, `Size: 1,024 bytes. Last modified: ${date}.`), f.records, provenance);
    assert.equal(result.correct, true);
  }
  const wrong = score(f.scenario, events(f.records, 'Size: 2,048 bytes. Last modified: January 16, 2026.'), f.records, provenance);
  assert.equal(wrong.correct, false);
});

test('hyphenated durations preserve quantities, units and approval codes', async () => {
  const f = fixture('reading-01'), c = f.scenario.context, doc = c.docs[0];
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: doc.fileUrl });
  const scenario = { ...f.scenario, expected: [...f.scenario.expected, `${doc.retention}\\s*days?`] };
  for (const hyphen of ['-', '\u2010', '\u2011']) {
    for (const unit of ['minute', 'minutes', 'min']) {
      const answer = `${doc.gate}; ${doc.minutes}${hyphen}${unit} recovery; ${doc.retention}${hyphen}day retention. ${doc.fileUrl}`;
      assert.equal(score(scenario, events(f.records, answer), f.records, provenance).correct, true, answer);
    }
  }
  for (const facts of [
    `${doc.gate}; ${doc.minutes + 1}-minute recovery; ${doc.retention}-day retention.`,
    `${doc.gate}; ${doc.minutes}-hour recovery; ${doc.retention}-day retention.`,
    `${doc.gate}; ${doc.minutes}-minute recovery; ${doc.retention + 1}-day retention.`,
    `${doc.gate}; ${doc.minutes}-minute recovery; ${doc.retention}-hour retention.`,
    `${doc.gate.replace('-', ' ')}; ${doc.minutes}-minute recovery; ${doc.retention}-day retention.`
  ]) {
    assert.equal(score(scenario, events(f.records, `${facts} ${doc.fileUrl}`), f.records, provenance).correct, false, facts);
  }
});

test('calendar facts accept equivalent nine-o-clock formats but not the wrong time', async () => {
  const f = fixture('regression-04');
  await f.server.call('fetch', { entityUrls: ['/me/calendarView'] });
  for (const time of ['09:00', '9:00', '9 AM', '9:00 AM', '9 a.m.']) {
    const result = score(f.scenario, events(f.records, `Evaluation sync starts at ${time}.`), f.records, provenance);
    assert.equal(result.correct, true, time);
  }
  for (const time of ['10 AM', '9 PM', '09:30']) {
    const result = score(f.scenario, events(f.records, `Evaluation sync starts at ${time}.`), f.records, provenance);
    assert.equal(result.correct, false, time);
  }
});

test('native calls followed by legacy answer delegation are not native task success', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  await f.server.call('ask', { question: f.scenario.prompt });
  const result = score(f.scenario, events(f.records, `${c.docs[0].gate}, ${c.docs[0].minutes} minutes. ${c.docs[0].fileUrl}`), f.records, provenance);
  assert.equal(result.nativeRouting, true);
  assert.equal(result.correct, true);
  assert.equal(result.nativeSuccess, false);
});

test('observed scoring fails closed for missing provenance, missing calls or an ambient server', async () => {
  const f = fixture('reading-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  assert.throws(() => score(f.scenario, events(f.records, 'No content.'), f.records, { ...provenance, packageHash: ' ' }), /provenance/);
  let result = score(f.scenario, events([], 'No content.'), f.records, provenance);
  assert.equal(result.instrumentationValid, false);
  result = score(f.scenario, events(f.records, 'No content.', [
    { type: 'session.mcp_server_tools_loaded', data: { serverName: 'ambient-workiq', toolCount: 12 } }
  ]), f.records, provenance);
  assert.equal(result.instrumentationValid, false);
});

test('transfer preparation alone is not a completed explicit download', async () => {
  const f = fixture('downloads-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('getDownloadFileDetails', { documentLibraryId: c.driveId, fileId: c.docs[0].id });
  let result = score(f.scenario, events(f.records, 'Download prepared.'), f.records, provenance);
  assert.equal(result.correct, false);
  assert.equal(result.unrequestedDownloads, 0);
  await f.server.call('fetch_blob', { path: `/drives/${c.driveId}/items/${c.docs[0].id}/content` });
  result = score(f.scenario, events(f.records, 'RXZhbHVhdGlvbiBvcmlnaW5hbCBieXRlcy4='), f.records, provenance);
  assert.equal(result.correct, true);
  const completed = events(f.records, 'RXZhbHVhdGlvbiBvcmlnaW5hbCBieXRlcy4=');
  const transferId = `unit-${f.records.length - 1}`;
  for (const completion of [
    null,
    { success: false },
    { success: true, result: { statusCode: 500, message: 'Binary transfer failed.' } }
  ]) {
    const changed = completed.flatMap(event => event.type === 'tool.execution_complete' &&
      event.data.toolCallId === transferId
      ? completion ? [{ ...event, data: { ...event.data, ...completion } }] : [] : [event]);
    assert.equal(score(f.scenario, changed, f.records, provenance).correct, false);
  }
  for (const change of [{ valid: false }, { result: { statusCode: 500 } }]) {
    const records = f.records.map((record, index) => index === f.records.length - 1
      ? { ...record, ...change } : record);
    assert.equal(score(f.scenario, completed, records, provenance).correct, false);
  }
});

test('denied access cannot be worked around through legacy routes', async () => {
  const f = fixture('failures-01'), c = f.scenario.context;
  await f.call('get_site_key', { siteUrl: c.siteUrl });
  await f.call('get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  let result = score(f.scenario, events(f.records, 'Access denied (401).'), f.records, provenance);
  assert.equal(result.nativeSuccess, true);
  await f.server.call('ask', { question: f.scenario.prompt });
  result = score(f.scenario, events(f.records, 'Access denied (401).'), f.records, provenance);
  assert.equal(result.correct, false);
  assert.equal(result.nativeSuccess, false);
});

test('confidence accounting clusters repetitions by scenario and retains infrastructure failures', () => {
  const rows = Array.from({ length: 20 }, () => ({
    scenarioId: 'one-scenario', instrumentationValid: true, nativeRouting: true,
    nativeSuccess: true, botdocUsed: null, botdocSuccess: null, correct: true,
    referenceReads: [], activation: 'unknown', unrequestedDownloads: 0
  }));
  const result = summarize(rows);
  assert.equal(result.nativeRouting.runs, 20);
  assert.equal(result.nativeRouting.cases, 1);
  assert.ok(result.nativeRouting.caseInterval95[0] < 0.5);
  rows[0].instrumentationValid = false;
  assert.equal(summarize(rows).nativeRouting.successes, 19);
  assert.equal(summarize(rows).nativeRouting.allRepeatPasses, 0);
});

test('normalization preserves an attempted tool without an execution-complete event', () => {
  const result = normalizeEvents([
    { type: 'assistant.message', data: { toolRequests: [{
      toolCallId: 'unit-request', name: 'workiq-fetch_blob', arguments: { path: '/drives/d/items/i/content' }
    }] } }
  ]);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].completion, undefined);
});
