import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getScenario } from './matrix.mjs';
import { FixtureServer } from './mock.mjs';
import { failedResult, resultValues } from './common.mjs';
import { WriteBoundary, withinSite, requireMockLayer } from './write-boundary.mjs';

function fixture(id) {
  const scenario = getScenario(id), records = [];
  return { scenario, records, server: new FixtureServer(scenario, record => records.push(record)) };
}
const call = (server, name, body) => server.call('call_function', { functionUrl: `/sharepoint/${name}`, jsonBody: body });
async function resolve({ server, scenario }) {
  await call(server, 'get_site_key', { siteUrl: scenario.context.siteUrl });
  await call(server, 'discover_sharepoint_lists', { siteKey: scenario.context.siteKey, includeHidden: false });
}
async function schema(f) {
  await call(f.server, 'get_list_schema', {
    siteKey: f.scenario.context.siteKey, listId: f.scenario.context.listId, includeHidden: false, includeReadOnly: false
  });
}

test('passage search needs a resolved site and an identity obtained from file discovery', async () => {
  const f = fixture('semantic-01'), c = f.scenario.context;
  const body = { siteKey: c.siteKey, searchTerm: 'release approval', spItemUrls: [c.docs[0].spItemUrl] };
  assert.equal(failedResult(await call(f.server, 'semantic_search', body)), true);
  await resolve(f);
  assert.equal(failedResult(await call(f.server, 'semantic_search', body)), true);
  await call(f.server, 'find_items', { siteKey: c.siteKey, listId: c.listId, pattern: c.docs[0].name });
  assert.equal(failedResult(await call(f.server, 'semantic_search', body)), false);
  assert.equal(failedResult(await call(f.server, 'semantic_search', { ...body, siteKey: c.siteKey.slice(0, -1) })), true);
});

test('filtered discovery does not authorize an identity omitted from the returned results', async () => {
  const f = fixture('semantic-01'), c = f.scenario.context;
  await resolve(f);
  await call(f.server, 'find_items', { siteKey: c.siteKey, listId: c.listId, pattern: c.docs[0].name });
  const body = { siteKey: c.siteKey, searchTerm: 'release approval', spItemUrls: [c.docs[1].spItemUrl] };
  assert.equal(failedResult(await call(f.server, 'semantic_search', body)), true);
  await call(f.server, 'find_items', { siteKey: c.siteKey, listId: c.listId, pattern: c.docs[1].name });
  assert.equal(failedResult(await call(f.server, 'semantic_search', body)), false);
});

test('structured reading enforces all-file batching and per-file instruction-content semantics', async () => {
  const f = fixture('multiple-01'), c = f.scenario.context;
  await resolve(f);
  assert.equal(failedResult(await call(f.server, 'get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl })), true);
  const files = c.docs.map(doc => ({ fileUrl: doc.fileUrl, returnContent: true }));
  assert.equal(failedResult(await call(f.server, 'get_structured_text', { siteKey: c.siteKey, files })), false);
  files[1].returnContent = false;
  assert.equal(failedResult(await call(f.server, 'get_structured_text', { siteKey: c.siteKey, files })), true);
  files[1] = { fileUrl: c.docs[1].fileUrl, serverRelativeUrl: c.docs[1].serverRelativeUrl, returnContent: true };
  assert.equal(failedResult(await call(f.server, 'get_structured_text', { siteKey: c.siteKey, files })), true);
});

test('metadata validates authoritative columns, CAML and complete enumeration, not only the path', async () => {
  const f = fixture('metadata-07'), c = f.scenario.context;
  await resolve(f);
  const body = { siteKey: c.siteKey, listId: c.listId, rowLimit: 3, viewFields: ['ID', 'Budget_x0020_EUR'] };
  assert.equal(failedResult(await call(f.server, 'list_items', body)), true);
  await schema(f);
  assert.equal(failedResult(await call(f.server, 'list_items', { ...body, rowLimit: 1 })), true);
  assert.equal(failedResult(await call(f.server, 'list_items', { ...body, filter: "Status eq 'Ready'" })), true);
  assert.equal(failedResult(await call(f.server, 'list_items', { ...body, viewFields: ['Budget EUR'] })), true);
  assert.equal(failedResult(await call(f.server, 'list_items', body)), false);
});

test('page extraction checks the requested page and image labels must have appeared in text', async () => {
  const f = fixture('portions-04'), c = f.scenario.context;
  await resolve(f);
  await call(f.server, 'find_items', { siteKey: c.siteKey, listId: c.listId, pattern: c.docs[0].name });
  const identity = { siteKey: c.siteKey, spItemUrl: c.docs[0].spItemUrl };
  assert.equal(failedResult(await call(f.server, 'get_document_pages', { ...identity, pageNumbers: [3] })), true);
  const pages = await call(f.server, 'get_document_pages', { ...identity, pageNumbers: [2] });
  assert.equal(failedResult(pages), false);
  assert.equal(JSON.stringify(pages).includes(`${c.docs[0].minutes} minutes`), false);
  const images = { ...identity, imageReferenceIds: [c.docs[0].imageReferenceId] };
  assert.equal(failedResult(await call(f.server, 'get_document_images', images)), true);
  await call(f.server, 'get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  assert.equal(failedResult(await call(f.server, 'get_document_images', images)), false);
  assert.equal(failedResult(await call(f.server, 'get_document_images', {
    ...images, imageReferenceIds: [c.docs[0].imageReferenceId.replace('/', '')]
  })), true);
});

test('mutation fixtures require owned targets and verification; parallel instances never share state', async () => {
  const first = fixture('crud-07'), second = fixture('crud-07'), c = first.scenario.context;
  await Promise.all([resolve(first), resolve(second)]);
  await schema(first);
  const body = { siteKey: c.siteKey, listUrl: c.libraryRelativeUrl,
    items: [{ itemId: 1, fieldInternalNames: ['ReviewState'], newValues: ['Blocked'] }] };
  const action = jsonBody => first.server.call('do_action', { actionUrl: '/sharepoint/update_list_items_v2', jsonBody });
  assert.equal(failedResult(await action({ ...body, items: [{ ...body.items[0], itemId: 999 }] })), true);
  assert.equal(first.server.context.rows[0].ReviewState, 'Ready');
  assert.equal(failedResult(await action(body)), false);
  assert.equal(first.server.state.effectApplied, true);
  assert.equal(first.server.state.effectVerified, false);
  assert.equal(second.server.context.rows[0].ReviewState, 'Ready');
  await call(first.server, 'list_items', { siteKey: c.siteKey, listId: c.listId, rowLimit: 3 });
  assert.equal(first.server.state.effectVerified, true);
});

test('a filtered read that omits the changed item cannot verify a mutation', async () => {
  const f = fixture('crud-07'), c = f.scenario.context;
  await resolve(f);
  await schema(f);
  await f.server.call('do_action', {
    actionUrl: '/sharepoint/update_list_items_v2',
    jsonBody: { siteKey: c.siteKey, listUrl: c.libraryRelativeUrl,
      items: [{ itemId: 1, fieldInternalNames: ['ReviewState'], newValues: ['Blocked'] }] }
  });
  await call(f.server, 'list_items', {
    siteKey: c.siteKey, listId: c.listId, rowLimit: 3, viewFields: ['ID', 'ReviewState'],
    filter: "<Query><Where><Eq><FieldRef Name='ReviewState'/><Value Type='Text'>Ready</Value></Eq></Where></Query>"
  });
  assert.equal(f.server.state.effectVerified, false);
  await call(f.server, 'list_items', {
    siteKey: c.siteKey, listId: c.listId, rowLimit: 3, viewFields: ['ID', 'ReviewState']
  });
  assert.equal(f.server.state.effectVerified, true);
});

test('a created folder remains visible to folder-only verification', async () => {
  const f = fixture('crud-01'), c = f.scenario.context;
  await resolve(f);
  assert.equal(failedResult(await f.server.call('do_action', {
    actionUrl: '/sharepoint/create_folder',
    jsonBody: { siteKey: c.siteKey, listId: c.listId, listFullUrl: c.libraryUrl,
      folders: [{ name: 'Trial-1', folderColor: 'DARK_BLUE' }] }
  })), false);
  assert.equal(f.server.state.effectApplied, true);
  assert.equal(f.server.state.effectVerified, false);
  const response = await call(f.server, 'list_items', {
    siteKey: c.siteKey, listId: c.listId, itemType: 'folders', rowLimit: 50000
  });
  assert.equal(failedResult(response), false);
  const items = resultValues(response).find(value => Array.isArray(value?.items)).items;
  assert.ok(items.some(item => item.ID === 4 && item.FileLeafRef === 'Trial-1'));
  assert.ok(items.every(item => item.folder));
  assert.equal(f.server.state.effectVerified, true);
});

test('deletion needs a complete unfiltered read, not a count or unrelated subset', async () => {
  const f = fixture('crud-10'), c = f.scenario.context;
  await resolve(f);
  assert.equal(failedResult(await f.server.call('do_action', {
    actionUrl: '/sharepoint/delete_list_item',
    jsonBody: { siteKey: c.siteKey, listId: c.listId, items: [{ listItemId: 1 }] }
  })), false);
  const body = { siteKey: c.siteKey, listId: c.listId, rowLimit: 3 };
  for (const options of [
    { countOnly: true },
    { itemType: 'folders' },
    { folderServerRelativeUrl: `${c.libraryRelativeUrl}/Reports` },
    { filter: "<Query><Where><Eq><FieldRef Name='ReviewState'/><Value Type='Text'>Ready</Value></Eq></Where></Query>" }
  ]) {
    await call(f.server, 'list_items', { ...body, ...options });
    assert.equal(f.server.state.effectVerified, false);
  }
  await call(f.server, 'list_items', body);
  assert.equal(f.server.state.effectVerified, true);
});

test('relative-date controls honor the requested day and captured local clock', async () => {
  const scenario = getScenario('regression-04');
  scenario.clock = { now: '2026-11-05T16:00:00.000Z', timeZone: 'America/New_York' };
  const server = new FixtureServer(scenario);
  const data = async functionUrl => resultValues(await server.call('fetch', { entityUrls: [functionUrl] }))
    .find(value => value?.value)?.value[0];
  const meeting = await data('/me/calendarView?startDateTime=2026-11-06T05:00:00Z&endDateTime=2026-11-07T05:00:00Z');
  assert.deepEqual(meeting.start, { dateTime: '2026-11-06T09:00:00', timeZone: 'America/New_York' });
  assert.equal(meeting.end.dateTime, '2026-11-06T09:30:00');
  assert.equal((await data('/me/events')).start.dateTime, '2026-11-06T09:00:00');
  assert.equal((await data('/me/calendarView?startDateTime=2030-01-03T05:00:00Z')).start.dateTime, '2030-01-03T09:00:00');
  assert.equal((await data('/me/planner/tasks')).dueDateTime, scenario.clock.now);
});

test('an image label discovered in another document cannot be used for the requested file', async () => {
  const f = fixture('portions-04'), c = f.scenario.context;
  await resolve(f);
  await call(f.server, 'find_items', { siteKey: c.siteKey, listId: c.listId, pattern: '*' });
  await call(f.server, 'get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[1].fileUrl, returnContent: true });
  assert.equal(failedResult(await call(f.server, 'get_document_images', {
    siteKey: c.siteKey, spItemUrl: c.docs[0].spItemUrl, imageReferenceIds: [c.docs[1].imageReferenceId]
  })), true);
});

test('embedded denied responses stay errors even under HTTP 200', async () => {
  const f = fixture('failures-01'), c = f.scenario.context;
  await call(f.server, 'get_site_key', { siteUrl: c.siteUrl });
  const denied = await call(f.server, 'get_structured_text', { siteKey: c.siteKey, fileUrl: c.docs[0].fileUrl });
  assert.equal(failedResult(denied), true);
  assert.ok(resultValues(denied).some(value => value?.statusCode === 200));
  assert.ok(resultValues(denied).some(value => value?.statusCode === 401));
  assert.equal(failedResult({ statusCode: 200, data: { success: false } }), true);
});

test('the write boundary rejects site-prefix tricks, unresolved keys, traversal and any unowned target in a batch', () => {
  const c = getScenario('crud-01').context;
  assert.equal(withinSite(`${c.siteUrl}-other/Documents`, c.siteUrl), false);
  assert.equal(withinSite(`${c.siteUrl}/%2e%2e/other`, c.siteUrl), false);
  assert.equal(withinSite(`${c.siteUrl}/Documents%2fother`, c.siteUrl), false);
  assert.equal(withinSite(`${c.siteUrl}/Documents`, c.siteUrl), true);
  const boundary = new WriteBoundary({ ...c, ownedItems: [1], ownedPaths: [c.docs[0].name] });
  const body = { siteKey: c.siteKey, listFullUrl: c.libraryUrl,
    libraryRelativePaths: [c.docs[0].name], newNames: ['Final.docx'] };
  assert.equal(boundary.authorize('rename_item', body), true);
  assert.throws(() => boundary.authorize('rename_item', { ...body, siteKey: 'guessed' }), /site key/);
  assert.throws(() => boundary.authorize('rename_item', { ...body, libraryRelativePaths: [c.docs[0].name, 'pre-existing.docx'], newNames: ['A.docx', 'B.docx'] }), /unowned source/);
  assert.throws(() => boundary.authorize('rename_item', { ...body, newNames: ['../Final.docx'] }), /destination/);
  assert.throws(() => boundary.authorize('copy_items', { ...body, jobs: [] }), /not allowlisted/);
  assert.throws(() => requireMockLayer('live'), /cannot forward live/);
});

test('stdio MCP negotiates, advertises captured tools and logs executed arguments', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workiq-sp-mcp-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const scenario = getScenario('reading-01');
  const scenarioFile = path.join(directory, 'scenario.json'), logFile = path.join(directory, 'calls.jsonl');
  fs.writeFileSync(scenarioFile, JSON.stringify(scenario));
  const child = spawn(process.execPath, [path.join(import.meta.dirname, 'mock.mjs'), scenarioFile, logFile], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  const requests = [
    { id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
    { method: 'notifications/initialized' },
    { id: 2, method: 'tools/list' },
    { id: 3, method: 'tools/call', params: { name: 'call_function', arguments: {
      functionUrl: '/sharepoint/get_site_key', jsonBody: { siteUrl: scenario.context.siteUrl }
    } } }
  ];
  child.stdin.end(requests.map(request => JSON.stringify({ jsonrpc: '2.0', ...request })).join('\n') + '\n');
  await done;
  const responses = stdout.trim().split('\n').map(JSON.parse);
  assert.equal(responses[0].result.protocolVersion, '2024-11-05');
  assert.equal(responses[1].result.tools.some(tool => tool.name === 'fetch_blob'), true);
  assert.equal(responses[1].result.tools.find(tool => tool.name === 'call_function').inputSchema.properties.jsonBody !== undefined, true);
  const record = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  assert.equal(record.valid, true);
  assert.equal(record.arguments.jsonBody.siteUrl, scenario.context.siteUrl);
});
