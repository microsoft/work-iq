import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Budget, packageHash, jsonBody, failedResult } from './common.mjs';

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workiq-sp-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('budget survives restart, counts unfinished sessions, and cannot reset its limit', t => {
  const file = path.join(temporary(t), 'budget.jsonl');
  const first = new Budget(file, 2);
  first.reserve({ scenario: 'interrupted' });
  const second = new Budget(file, 2);
  const id = second.reserve({ scenario: 'completed' });
  second.finish(id, { status: 'completed' });
  assert.equal(new Budget(file, 2).used, 2);
  assert.throws(() => second.reserve({}), /exhausted/);
  assert.throws(() => new Budget(file, 3), /limit changed/);
  assert.throws(() => second.finish(id, {}), /already finished/);
});

test('competing budget controller fails closed instead of overwriting accounting', t => {
  const file = path.join(temporary(t), 'budget.jsonl');
  const budget = new Budget(file, 2);
  fs.writeFileSync(`${file}.lock`, '{"pid":1}');
  assert.throws(() => budget.reserve({}), /locked/);
  assert.equal(budget.used, 0);
});

test('package provenance changes for reference, manifest, and MCP configuration edits', t => {
  const directory = temporary(t);
  fs.mkdirSync(path.join(directory, 'references'));
  fs.writeFileSync(path.join(directory, 'references', 'native.md'), 'first');
  const initial = packageHash(directory);
  fs.writeFileSync(path.join(directory, 'references', 'native.md'), 'second');
  const changed = packageHash(directory);
  assert.notEqual(changed, initial);
  fs.writeFileSync(path.join(directory, 'plugin.json'), '{"description":"changed"}');
  assert.notEqual(packageHash(directory), changed);
  const metadata = packageHash(directory);
  fs.writeFileSync(path.join(directory, '.mcp.json'), '{"mcpServers":{}}');
  assert.notEqual(packageHash(directory), metadata);
});

test('provider JSON accepts object/string transports but not malformed bodies', () => {
  assert.deepEqual(jsonBody('{"siteKey":"opaque"}'), { siteKey: 'opaque' });
  assert.deepEqual(jsonBody({ siteKey: 'opaque' }), { siteKey: 'opaque' });
  for (const value of ['{', 'null', '[]', null, []]) assert.throws(() => jsonBody(value));
});

test('embedded provider failures are not mistaken for outer HTTP success', () => {
  assert.equal(failedResult({
    statusCode: 200, data: [{ type: 'text', text: '{"success":false,"errorMessage":"401 Unauthorized"}' }]
  }), true);
  assert.equal(failedResult({ statusCode: 200, data: [{ type: 'text', text: '{"success":true}' }] }), false);
});
