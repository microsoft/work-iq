import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, parseMarkdown, frontmatterProblems, linkProblems } from './doc-lint.mjs';

const plugin = path.join(root, 'plugins', 'workiq');
const skill = path.join(plugin, 'skills', 'workiq');
const read = file => fs.readFileSync(file, 'utf8');
const reference = read(path.join(skill, 'references', 'teams-grounding-work-iq.md'));
const requests = parseMarkdown(reference).codes
  .filter(code => code.language === 'json')
  .map(code => JSON.parse(code.value).entityUrls[0]);

test('public chat grounding guidance is discoverable and has valid local links', () => {
  const main = read(path.join(skill, 'SKILL.md'));
  assert.deepEqual(frontmatterProblems(main, 'workiq'), []);
  assert.match(parseMarkdown(main).frontmatter.description, /chat\/conversation.*BotDoc/s);
  for (const file of [
    path.join(skill, 'SKILL.md'),
    ...['teams-grounding', 'teams', 'fetch', 'ask'].map(name =>
      path.join(skill, 'references', `${name}-work-iq.md`)),
    path.join(plugin, 'README.md'),
    path.join(plugin, 'TEAMS-BOTDOC-TDF.md')
  ]) {
    assert.deepEqual(linkProblems(file, read(file)), [], path.relative(root, file));
  }
});

test('specific-chat synthesis overrides ask and read resolution cannot create a chat', () => {
  const main = read(path.join(skill, 'SKILL.md'));
  const override = main.indexOf('### Teams chat grounding override');
  const generic = main.indexOf('**ALWAYS use WorkIQ');
  assert.ok(override >= 0, 'Teams chat override must exist');
  assert.ok(generic >= 0, 'Generic routing table must exist');
  assert.ok(override < generic);
  assert.match(main, /Semantic summary\/status\/decisions.*except a specific Teams chat/);
  for (const name of ['teams', 'fetch', 'ask']) {
    assert.match(read(path.join(skill, 'references', `${name}-work-iq.md`)),
      /teams-grounding-work-iq\.md/, `${name} must dispatch to the override`);
  }
  assert.match(reference, /Never call `create_entity` to resolve a chat for this read/);
  assert.match(reference, /chatType == "oneOnOne"/);
  assert.match(reference, /two returned members'[\s\S]*signed-in user and counterpart/);
  assert.match(reference, /lineIndex \+ lineCount/);
  assert.match(reference, /For 401, 403, policy denial,[\s\S]*stop/);
});

test('chat lookup requires positive same-connection capability, not a discovery search hit', () => {
  assert.match(reference, /Confirm capability before any directory or chat lookup/);
  assert.match(reference, /do not run those[\s\S]*reads in parallel/);
  assert.match(reference, /get_schema[\s\S]*operationType: "fetch"/);
  assert.match(reference, /nonmatch, unrelated results, or a partial[\s\S]*catalog is inconclusive/);
  assert.match(reference, /Cache only positive confirmation/);
  assert.match(reference, /availability unconfirmed/);
  assert.match(reference, /stop before lookup/);
});

test('chat discovery is projected and bounded without speculative unbounded retries', () => {
  assert.match(reference, /\/me\/chats\?\$select=id,chatType&\$expand=members&\$top=25/);
  assert.match(reference, /if supported bounds cannot be established, request an exact chat/);
  assert.match(reference, /do not retry guessed variants or remove its bounds/);
  assert.match(reference, /Stop a 1:1[\s\S]*lookup once the exact pair is established/);
});

test('grounding examples encode opaque IDs and use provider parameters rather than OData', () => {
  assert.equal(requests.length, 3);
  const allowed = new Set(['threadId', 'start', 'end', 'fromLineNumber', 'characterLimit', 'timeZoneId']);
  for (const request of requests) {
    const url = new URL(request, 'https://example.invalid');
    assert.equal(url.pathname, '/m365-grounding/fetch');
    assert.equal(url.searchParams.get('threadId'), '19:example@unq.gbl.spaces');
    assert.match(request, /threadId=19%3Aexample%40unq\.gbl\.spaces/);
    for (const key of url.searchParams.keys()) assert.ok(allowed.has(key), `Unsupported query: ${key}`);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    if (start && end) {
      assert.match(start, /Z$/);
      assert.match(end, /Z$/);
      assert.ok(Date.parse(start) < Date.parse(end));
    }
  }
  const noWindow = new URL(requests[2], 'https://example.invalid');
  assert.equal(noWindow.searchParams.has('start'), false);
  assert.equal(noWindow.searchParams.has('end'), false);
});

test('documented rolling and local-day windows preserve different date semantics across DST', () => {
  const rolling = new URL(requests[0], 'https://example.invalid').searchParams;
  const dst = new URL(requests[1], 'https://example.invalid').searchParams;
  const hours = params => (Date.parse(params.get('end')) - Date.parse(params.get('start'))) / 3_600_000;
  assert.equal(hours(rolling), 72);
  assert.equal(hours(dst), 49);
  const local = instant => Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(instant)).filter(part => part.type !== 'literal')
    .map(part => [part.type, part.value]));
  const start = local(dst.get('start'));
  const end = local(dst.get('end'));
  assert.deepEqual([start.year, start.month, start.day, start.hour, start.minute],
    ['2026', '11', '01', '00', '00']);
  assert.deepEqual([end.year, end.month, end.day, end.hour, end.minute],
    ['2026', '11', '03', '00', '00']);
});
