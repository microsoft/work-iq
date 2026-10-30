import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const script = path.join(root, 'scripts/upload-file.ps1');
const harness = path.join(import.meta.dirname, 'upload-file-tests.ps1');

for (const scenario of ['metadata', 'complete', 'initial-status', 'progress', 'http-errors', 'source']) {
  test(`file-ticket uploader: ${scenario} (offline HTTP handler)`, () => {
    const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', harness, '-Case', scenario], {
      encoding: 'utf8', timeout: 120_000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /PASS/);
  });
}

test('upload entry point validates arguments and metadata without authentication', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workiq-upload-entry-'));
  const transfer = path.join(directory, 'transfer.json');
  fs.writeFileSync(transfer, 'sensitive-test-marker invalid JSON');
  try {
    for (const [extra, code] of [
      [[], 'INVALID_ARGUMENT'],
      [['-TransferFile', transfer], 'INVALID_ARGUMENT'],
      [['-TransferFile', transfer, '-InFile', 'unused.bin', '-DeviceCode'], 'INVALID_ARGUMENT'],
      [['-TransferFile', transfer, '-InFile', 'unused.bin'], 'INVALID_METADATA']
    ]) {
      const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-File', script, '-NonInteractive', ...extra], {
        encoding: 'utf8', timeout: 15_000
      });
      assert.ifError(result.error);
      if (process.platform === 'win32' && /not digitally signed|running scripts is disabled/.test(result.stderr)) {
        t.skip('Host execution policy blocks the unsigned script; no policy or trust settings were changed.');
        return;
      }
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`\\[${code}\\]`));
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Opening a browser|To sign in|sensitive-test-marker/);
    }
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
