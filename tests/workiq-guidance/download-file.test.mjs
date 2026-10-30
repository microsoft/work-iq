import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const script = path.join(root, 'scripts/download-file.ps1');
const harness = path.join(import.meta.dirname, 'download-file-tests.ps1');

test('file-transfer entry points reject routing-header injection before authentication', () => {
  for (const name of ['download-file.ps1', 'upload-file.ps1']) {
    for (const partition of ['ClusterSet/ITM\\SDFV2\r\nInjected: value', 'x'.repeat(257)]) {
      const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File',
        path.join(path.dirname(script), name), '-Logout', '-TargetPartition', partition], {
        encoding: 'utf8', timeout: 15_000
      });
      assert.ifError(result.error);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /TargetPartition/);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Opening a browser|To sign in|"logged_out"/);
    }
  }
});

for (const scenario of ['urls', 'complete', 'incomplete', 'http-errors', 'output', 'authentication', 'permission-scopes']) {
  test(`file-ticket downloader: ${scenario} (offline HTTP handler)`, () => {
    const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', harness, '-Case', scenario], {
      encoding: 'utf8', timeout: 60_000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS/);
  });
}

test('script entry point rejects native URLs and invalid arguments before authentication', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workiq-download-entry-'));
  try {
    for (const [extra, code] of [
      [['-ContentUrl', 'https://tenant.sharepoint.com/native-content', '-ExpectedBytes', '4'], 'INVALID_REFERENCE'],
      [['-ContentUrl', '/api/beta/files/synthetic/content', '-ExpectedBytes', '-1'], 'INVALID_ARGUMENT'],
      [['-ContentUrl', '/api/beta/files/synthetic/content'], 'INVALID_ARGUMENT'],
      [['-ContentUrl', '/api/beta/files/synthetic/content', '-ExpectedBytes', '4', '-DeviceCode'], 'INVALID_ARGUMENT']
    ]) {
      const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', script,
        '-OutFile', path.join(directory, 'result.bin'), '-NonInteractive', ...extra], {
        encoding: 'utf8', timeout: 15_000
      });
      assert.ifError(result.error);
      if (process.platform === 'win32' && /not digitally signed|running scripts is disabled/.test(result.stderr)) {
        t.skip('Host execution policy blocks the unsigned script; no policy or trust settings were changed.');
        return;
      }
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`\\[${code}\\]`));
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Opening a browser|To sign in/);
      assert.deepEqual(fs.readdirSync(directory), []);
    }
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
