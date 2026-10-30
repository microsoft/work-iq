import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { frontmatterProblems, linkProblems, parseMarkdown, root, skillRoot } from './doc-lint.mjs';

const skill = skillRoot('workiq');
const read = file => fs.readFileSync(file, 'utf8');

test('stable transfer additions preserve loadable skill frontmatter', () => {
  assert.deepEqual(frontmatterProblems(read(path.join(skill, 'SKILL.md')), 'workiq'), []);
});

test('stable skill dispatches both prepared transfers through resolving references', () => {
  const file = path.join(skill, 'SKILL.md');
  const links = parseMarkdown(read(file)).links
    .map(entry => typeof entry === 'string' ? entry : entry.url)
    .filter(url => /\/(?:download|upload)-file-work-iq\.md$/.test(url ?? ''));
  assert.deepEqual(new Set(links), new Set([
    'references/download-file-work-iq.md',
    'references/upload-file-work-iq.md',
  ]));
  assert.deepEqual(linkProblems(file, links.map(url => `[workflow](${url})`).join('\n')), []);
});

for (const direction of ['download', 'upload']) {
  const file = path.join(skill, 'references', `${direction}-file-work-iq.md`);
  test(`${direction} workflow links and JSON examples resolve`, () => {
    const text = read(file);
    assert.deepEqual(linkProblems(file, text), []);
    for (const code of parseMarkdown(text).codes.filter(code => code.language === 'json')) {
      assert.doesNotThrow(() => JSON.parse(code.value));
    }
  });

  test(`${direction} workflow uses root scripts, not assumed plugin-local assets`, () => {
    const text = read(file);
    const expected = path.join(root, 'scripts', `${direction}-file.ps1`);
    const scripts = parseMarkdown(text).links
      .filter(entry => typeof entry === 'string' && entry.endsWith('.ps1'))
      .map(url => path.resolve(path.dirname(file), url));
    assert.ok(scripts.includes(expected), 'workflow must link to the repository entry point');
    assert.match(text, /not\s+(?:inside|in)\s+the\s+installed plugin/);
    assert.match(text, /\$repoRoot\\scripts\\/);
    assert.doesNotMatch(text, /\$skillRoot|%skillRoot%|files-work-iq\.md|workiq-preview/);
  });

  test(`${direction} blob reference links to its separate ticket workflow`, () => {
    const reference = path.join(skill, 'references', `${direction === 'download' ? 'fetch' : 'upload'}-blob-work-iq.md`);
    const text = read(reference);
    assert.ok(parseMarkdown(text).links.includes(`${direction}-file-work-iq.md`));
    assert.deepEqual(linkProblems(reference, text), []);
  });
}
