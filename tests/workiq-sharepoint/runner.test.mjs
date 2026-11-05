import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { freeze, register, runOne, batch, report, verifyInstalledPackage } from './eval.mjs';
import { Budget, readJson, writeJson } from './common.mjs';

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workiq-routing-runner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('raw evidence cannot be directed into the source checkout', () => {
  assert.throws(() => freeze(import.meta.dirname), /outside the repository/);
});

test('frozen intent and catalog matrices cannot silently change', t => {
  const root = temporary(t);
  const original = freeze(root);
  const file = path.join(root, 'matrix-freeze.json');
  writeJson(file, { ...original, matrixHash: 'changed-after-freeze' });
  assert.throws(() => freeze(root), /changed after freeze/);
  writeJson(file, original);
  const breadth = path.join(root, 'breadth-freeze.json');
  writeJson(breadth, { ...readJson(breadth), breadthHash: 'changed-after-freeze' });
  assert.throws(() => freeze(root), /breadth matrix changed/);
});

test('registered package mutation is rejected before a model session is reserved', async t => {
  const root = temporary(t), candidate = path.join(root, 'candidate');
  fs.cpSync(path.resolve(import.meta.dirname, '..', '..', 'plugins', 'workiq'), candidate, { recursive: true });
  await register(root, 'unit', candidate);
  fs.appendFileSync(path.join(candidate, 'skills', 'workiq', 'references', 'troubleshooting.md'), '\nChanged fixture.\n');
  await assert.rejects(register(root, 'unit', candidate), /immutable/);
  await assert.rejects(runOne({
    root, variant: 'unit', scenarioId: 'reading-01', executable: 'must-not-launch.exe'
  }), /provenance changed/);
  assert.equal(new Budget(path.join(root, 'budget.jsonl')).used, 0);
});

test('installed loading verifies the actual copy, enabled inventory and complete package bytes', async t => {
  const root = temporary(t), candidate = path.join(root, 'candidate'), home = path.join(root, 'home');
  fs.cpSync(path.resolve(import.meta.dirname, '..', '..', 'plugins', 'workiq'), candidate, { recursive: true });
  const registered = await register(root, 'unit', candidate);
  const directory = path.join(home, 'installed-plugins', '_direct', path.basename(candidate));
  fs.cpSync(candidate, directory, { recursive: true });
  const version = readJson(path.join(candidate, '.github', 'plugin', 'plugin.json')).version;
  const plugin = { name: 'workiq', version, enabled: true, source: 'installed' };
  const listing = [plugin, { name: 'browser-use', enabled: false, source: 'builtin' }];
  assert.equal(verifyInstalledPackage(home, registered, listing).packageHash, registered.packageHash);
  assert.throws(() => verifyInstalledPackage(home, registered, [plugin, plugin]), /Exactly one/);
  assert.throws(() => verifyInstalledPackage(home, registered, [{ ...plugin, version: '0.0.0' }]), /matching/);
  assert.throws(() => verifyInstalledPackage(home, registered, [{ ...plugin, source: 'local' }]), /installed/);
  fs.appendFileSync(path.join(directory, 'README.md'), '\nUnexpected installed bytes.\n');
  assert.throws(() => verifyInstalledPackage(home, registered, listing), /provenance/);
});

test('an installed-package junction cannot substitute an external snapshot', async t => {
  const root = temporary(t), candidate = path.join(root, 'candidate'), home = path.join(root, 'home');
  fs.cpSync(path.resolve(import.meta.dirname, '..', '..', 'plugins', 'workiq'), candidate, { recursive: true });
  const registered = await register(root, 'unit', candidate);
  const parent = path.join(home, 'installed-plugins', '_direct');
  fs.mkdirSync(parent, { recursive: true });
  fs.symlinkSync(candidate, path.join(parent, path.basename(candidate)), process.platform === 'win32' ? 'junction' : 'dir');
  const version = readJson(path.join(candidate, '.github', 'plugin', 'plugin.json')).version;
  assert.throws(() => verifyInstalledPackage(home, registered, [
    { name: 'workiq', version, enabled: true, source: 'installed' }
  ]), /symlink|outside/);
});

test('installed setup failure is retained, scored and budgeted without launching a model', async t => {
  const root = temporary(t), candidate = path.join(root, 'candidate');
  fs.cpSync(path.resolve(import.meta.dirname, '..', '..', 'plugins', 'workiq'), candidate, { recursive: true });
  await register(root, 'unit', candidate);
  const result = await runOne({
    root, variant: 'unit', scenarioId: 'reading-01', loadMode: 'installed', executable: 'must-not-launch.exe'
  });
  assert.equal(result.instrumentationValid, false);
  assert.match(result.problems.join('\n'), /setup\/launch failed/);
  const entries = new Budget(path.join(root, 'budget.jsonl')).entries();
  assert.equal(entries.filter(row => row.kind === 'reserved').length, 1);
  assert.equal(entries.find(row => row.kind === 'finished').status, 'infrastructure-failed');
  const directory = path.join(root, 'runs', result.id);
  assert.equal(fs.existsSync(path.join(directory, 'score.json')), true);
  assert.equal(fs.existsSync(path.join(directory, 'process.json')), false);
  assert.equal(readJson(path.join(directory, 'request.json')).arguments.includes('--plugin-dir'), false);
});

test('batch resume retains interrupted reservations instead of spending another session or replaying effects', async t => {
  const root = temporary(t), budget = new Budget(path.join(root, 'budget.jsonl'));
  budget.reserve({ stage: 'screening', variant: 'unit', scenarioId: 'crud-01', repetition: 1 });
  await batch({
    root, variants: ['unit'], set: 'cases:crud-01', stage: 'screening',
    executable: 'must-not-launch.exe'
  });
  assert.equal(budget.used, 1);
  assert.equal(report(root, 'screening').unscoredReservations[0].status, 'unfinished');
});

test('a concurrent batch failure lets in-flight work finish but does not schedule another session', async t => {
  const root = temporary(t), calls = [];
  let release;
  const inFlight = new Promise(resolve => { release = resolve; });
  const execute = async job => {
    calls.push(job.scenarioId);
    if (job.scenarioId !== 'reading-01') await inFlight;
    return {
      id: job.scenarioId, instrumentationValid: job.scenarioId !== 'reading-01',
      nativeRouting: false, correct: false, unrequestedDownloads: 0, problems: []
    };
  };
  const rejected = assert.rejects(batch({
    root, variants: ['unit'], set: 'cases:reading-01,reading-02,reading-04',
    stage: 'screening', concurrency: 2
  }, execute), /Instrumentation failure/);
  await new Promise(resolve => setImmediate(resolve));
  release();
  await rejected;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['reading-01', 'reading-02']);
});

test('changing a captured JSON contract after loading is rejected before reserving a session', async t => {
  const root = temporary(t), adapter = path.join(root, 'adapter');
  fs.cpSync(import.meta.dirname, adapter, { recursive: true });
  const copied = await import(pathToFileURL(path.join(adapter, 'eval.mjs')));
  const file = path.join(adapter, 'tool-contract.json'), contract = readJson(file);
  contract.source += ' Changed unit fixture.';
  writeJson(file, contract);
  await assert.rejects(copied.runOne({
    root: path.join(root, 'evidence'), variant: 'unit', scenarioId: 'reading-01',
    executable: 'must-not-launch.exe'
  }), /Runner source changed/);
  assert.equal(fs.existsSync(path.join(root, 'evidence', 'budget.jsonl')), false);
});
