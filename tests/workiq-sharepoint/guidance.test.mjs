import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { markdownFiles, parseMarkdown, frontmatterProblems, linkProblems } from '../workiq-guidance/doc-lint.mjs';
import { schemaSnapshot, toolContract } from './matrix.mjs';
import { jsonBody } from './common.mjs';
import { validateSchema } from './native.mjs';

const root = path.resolve(import.meta.dirname, '..', '..');
const files = markdownFiles(path.join(root, 'plugins', 'workiq', 'skills'));

test('public WorkIQ skills remain discoverable with valid bundled references', () => {
  const skills = files.filter(file => path.basename(file) === 'SKILL.md');
  assert.ok(skills.length > 0);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    assert.deepEqual(linkProblems(file, text, root), [], file);
    if (skills.includes(file)) {
      assert.deepEqual(frontmatterProblems(text, path.basename(path.dirname(file))), [], file);
    }
  }
});

test('public native JSON recipes match captured wrapper and provider request schemas', () => {
  let examples = 0;
  for (const file of files) {
    for (const code of parseMarkdown(fs.readFileSync(file, 'utf8')).codes) {
      if (code.language !== 'json' || !/"(?:functionUrl|actionUrl)"\s*:\s*"\/sharepoint\//.test(code.value)) continue;
      const request = JSON.parse(code.value), url = request.functionUrl ?? request.actionUrl;
      const entry = schemaSnapshot[url], operation = request.functionUrl ? 'function' : 'action';
      const label = `${path.relative(root, file)}: ${code.heading}`;
      assert.ok(entry, `Unknown native path in ${label}`);
      assert.equal(entry.operation, operation, label);
      const wrapper = toolContract.find(tool => tool.name === (operation === 'function' ? 'call_function' : 'do_action'));
      assert.deepEqual(validateSchema(request, wrapper.inputSchema), [], label);
      assert.deepEqual(validateSchema(jsonBody(request.jsonBody), entry.schema), [], label);
      examples += 1;
    }
  }
  assert.ok(examples > 0, 'Native routing guidance must include executable request examples.');
});
