import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { retrievalProblems } from './contract.mjs';
import { root, skillRoot, markdownFiles, parseMarkdown, frontmatterProblems, linkProblems, exampleProblems } from './doc-lint.mjs';
import { routeText } from './loading-contract.mjs';

const read = (name, file) => fs.readFileSync(path.join(skillRoot(name), file), 'utf8');
const both = ['workiq', 'workiq-preview'];
const route = (name, id) => routeText(skillRoot(name), id);

test('A1: current retrieval accepts a string and rejects arrays or blank queries', () => {
  assert.deepEqual(retrievalProblems({ query: 'Synthetic project', strategy: 'grounding' }), []);
  for (const query of [[], ['Synthetic project'], '', ' ', null, 7]) {
    assert.ok(retrievalProblems({ query, strategy: 'grounding' }).length);
  }
});
for (const name of both) {
  test(`${name}: A1/A2/A3 preview precedence, loading and compact entry`, () => {
    const main = read(name, 'SKILL.md');
    assert.deepEqual(frontmatterProblems(main, name), []);
    assert.match(main, /must be used beforehand/);
    const { frontmatter } = parseMarkdown(main);
    assert.match(frontmatter.description, /When both plugins are installed, workiq-preview takes precedence over workiq/);
    assert.match(main.slice(main.indexOf('# WorkIQ')).replace(/[*`\n]/g, ' '),
      /When both plugins are installed, workiq-preview takes precedence over workiq/);
    assert.doesNotMatch(main, /configuration selected by the host or user|does not override (?:it|that selection)/);
    assert.match(main, /exact.*(?:names|name)[\s\S]{0,120}(?:catalog|schema)/i);
    assert.doesNotMatch(main, /always prefer this skill|under a second/);
    assert.ok(main.split('\n').length < 230, 'entrypoint should dispatch long recipes');
    assert.match(main, name === 'workiq' ? /ask-first/i : /retrieve[\s\S]{0,100}grounding/i);
    const paths = read(name, 'references/search-paths-work-iq.md');
    assert.match(paths, /required `query`/);
    assert.match(paths, /legacy|older catalogs/i);
    assert.doesNotMatch(paths, /single WorkIQ path catalog \(Microsoft Graph paths\)/);
    assert.deepEqual(exampleProblems(paths), []);
  });
  test(`${name}: A4/A7/A8 source, intent and evidence gates`, () => {
    const main = read(name, 'SKILL.md').replace(/\s+/g, ' ');
    for (const expression of [
      /near-match/i, /each (?:requested |comparison )?source/i,
      /location[\s\S]{0,60}time/i, /remain read-only/i,
      /suggested wording/i, /no user|absent user/i,
      /comparator/i, /deliberately excluded/i, /these attendees/, /that week/
    ]) assert.match(main, expression);
    for (const id of ['mail-actions', 'teams-actions']) assert.match(route(name, id), /intent|requested effect/i);
    assert.match(route(name, 'mail-actions'), /failed `?createReply`?[\s\S]{0,200}fresh/i);
  });
  test(`${name}: A5/A6 completeness and diagnostic-driven recovery`, () => {
    const main = read(name, 'SKILL.md');
    assert.match(main, /happy.path/i);
    assert.match(main, /partial/i);
    const recovery = read(name, 'references/troubleshooting.md');
    for (const expression of [/Generic `400/, /Unknown error/, /Preserve successful batch/,
      /Retry-After/, /objective/, /accepted\/pending/, /Do not replay/i, /denial/i]) {
      assert.match(recovery, expression);
    }
    assert.doesNotMatch(recovery, /Cause:\*\* URL formatting|question is too broad|retry the tool call.*sign-in/);
  });
  test(`${name}: T1-T4 Teams ports with safe differences`, () => {
    const routeRules = [
      ['teams-read', [/chat.*(?:no replies|flat)/i, /oneOnOne/, /create-or-return/,
        /read-only[\s\S]{0,100}(?:create|lookup)|(?:create|lookup)[\s\S]{0,100}read-only/i,
        /topic%20eq/, /userId/, /tenantId/, /no query string/i, /exact marker/i,
        /supplied.*(?:URLs|paths)/i, /system-generated|read-only resource fields/, /@odata.nextLink/]],
      ['teams-actions', [/reactionType.*👍/]],
      ['teams-state', [/hideForUser/, /lastMessageReadDateTime/, /lastUpdatedDateTime/]],
      ['teams-presence', [/setUserPreferredPresence/]]
    ];
    for (const [id, rules] of routeRules) {
      const text = route(name, id);
      for (const expression of rules) assert.match(text, expression, `${name}/${id}`);
      assert.doesNotMatch(text, /messages\?\$select=createdDateTime&\$top=1|reactionType":"like"/);
      if (name === 'workiq-preview') assert.doesNotMatch(text, /Use `ask` only for synthesis/);
    }
    assert.match(read(name, 'references/delete-entity-work-iq.md'), /hideForUser/);
  });
  for (const file of markdownFiles(skillRoot(name))) {
    test(`${name}/${path.relative(skillRoot(name), file)}: local links`, () => {
      assert.deepEqual(linkProblems(file, fs.readFileSync(file, 'utf8')), []);
    });
  }
}
test('A6: public metadata workflow never reinterprets access denial as an addressing repair', () => {
  const text = read('workiq', 'references/sharepoint-library-metadata.md');
  assert.doesNotMatch(text, /Try at most two materially different|then retry once with the returned id|Stop using `call_function` for this conversation and use `fetch`/);
  assert.match(text, /Explicit.*denial[\s\S]{0,120}stop/i);
});
test('A5: public search cap is a page limit, not all-document proof', () => {
  const text = route('workiq', 'sharepoint-sites');
  assert.match(text, /500/);
  assert.match(text, /partial/);
  assert.match(text, /complete|completeness/);
});
test('A3: moved public recipes retain endpoint and exact-ID restrictions', () => {
  const calendar = route('workiq', 'calendar-actions');
  for (const expression of [/sendResponse":false/, /"Comment":""/, /ToRecipients/,
    /trailing `=`/, /%3D/]) assert.match(calendar, expression);
  assert.match(route('workiq', 'calendar-availability'), /AvailabilityViewInterval: 30/);
  const files = route('workiq', 'files-actions');
  for (const expression of [/createUploadSession` with `\{\}`/, /"folder":\{\}/,
    /conflictBehavior":"fail"/, /parentReference\.driveId/, /Do not add `eTag`/]) assert.match(files, expression);
  const bytes = read('workiq', 'references/fetch-blob-work-iq.md');
  for (const expression of [/hasAttachments%20eq%20true/, /do not combine this filter with `\$orderby`/,
    /character-for-character/, /literal `\/\$value`/, /actual materialized file path/]) assert.match(bytes, expression);
});
test('package versions remain independently consistent', () => {
  const registries = ['marketplace.json', '.claude-plugin/marketplace.json']
    .map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')));
  for (const name of both) {
    const canonical = registries[0].plugins.find(entry => entry.name === name);
    assert.match(canonical.description, /When both plugins are installed, workiq-preview takes precedence over workiq/);
    const manifests = ['.github/plugin', '.claude-plugin', '.codex-plugin']
      .map(host => JSON.parse(fs.readFileSync(path.join(root, 'plugins', name, host, 'plugin.json'), 'utf8')));
    for (const entry of [registries[1].plugins.find(entry => entry.name === name), ...manifests]) {
      for (const field of ['name', 'version', 'description']) assert.equal(entry[field], canonical[field]);
    }
  }
});
test('preview precedence retains standalone public policy and no missing-tool fallback', () => {
  assert.match(read('workiq', 'SKILL.md'), /When preview is not installed[\s\S]{0,100}ask-first/);
  assert.match(route('workiq-preview', 'semantic-context'), /does not enable preview[\s\S]{0,20}retrieval/);
  assert.match(route('workiq-preview', 'semantic-context'), /Missing retrieval[\s\S]{0,100}public fallback|Never[\s\S]{0,80}substitute public ask-first/i);
});
