import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadRoute, scenarioProblems } from '../../../tests/workiq-guidance/loading-contract.mjs';

const skill = new URL('../skills/workiq/', import.meta.url);
const read = file => fs.readFileSync(new URL(file, skill), 'utf8').replace(/\r\n/g, '\n');
const plain = text => text.replace(/[*`]/g, '').replace(/\s+/g, ' ');
const load = (id, options) => loadRoute(fileURLToPath(skill), id, { read, ...options });
const retrieval = read('references/retrieve-work-iq.md');
const details = read('references/retrieve-details-work-iq.md');
const examples = [...details.matchAll(/```json\s*\n([\s\S]*?)```/g)]
  .map(match => JSON.parse(match[1]));

test('entrypoint delegates strategy selection without forcing grounding or ask', () => {
  const entry = read('SKILL.md');
  assert.match(entry, /grounding retrieve for known\s+indexed M365 content; otherwise select strategy in its reference/);
  assert.doesNotMatch(entry, /with explicit grounding retrieve,\s+then write the answer locally/);
  assert.match(entry, /Use ask only when the user requests Copilot or a named agent's answer/);
  for (const owner of ['teams-targets', 'tasks-contract']) {
    assert.match(read(`references/${owner}-work-iq.md`), /source-based strategy selection/);
  }
});

test('source scope selects strategy, including unknown sources without a probe', () => {
  const rules = [
    /\| Known indexed M365 content \| grounding \|/,
    /\| Unknown sources, possible connected\/external sources, mixed scope or explicit broader retrieval \| copilot directly, without a Grounding probe \|/,
    /\| Required GraphConnectors \| copilot \|/,
  ];
  for (const rule of rules) {
    assert.match(retrieval, rule);
    assert.doesNotMatch(retrieval.replace(/\| (grounding|copilot)(?= |\|)/g, '| ask'), rule);
  }
  assert.match(retrieval, /Grounding-only plus a required broader source \| Explain conflict/);
  assert.match(retrieval, /Both strategies return evidence, not an ask answer/);
  assert.match(read('references/retrieve-repair-work-iq.md'),
    /unknown-source first call uses copilot directly, not a Grounding probe/);
});

test('default, source support and error rules agree across retrieval guidance', () => {
  const owners = [retrieval, details, fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8')];
  for (const text of owners) {
    const body = plain(text);
    assert.match(body, /(?:API default(?::| is)|omission defaults to) grounding/i);
    assert.doesNotMatch(body, /(?:default.{0,30}(?:remains|is)|omitted default is) copilot/i);
    assert.match(body, /Dataverse and Power BI are (?:unsupported )?roadmap sources/);
    assert.doesNotMatch(body, /TeamsMessages, Dataverse, GraphConnectors/);
  }
  assert.match(plain(retrieval), /isError true or stoppedReason error is failure, even with hits/);
  assert.match(details, /https:\/\/learn\.microsoft\.com\/en-us\/microsoft-365\/copilot\/extensibility\/work-iq\/mcp\/retrieve/);
});

test('source-based examples use actual retrieve shapes and preserve required capabilities', () => {
  assert.equal(examples.length, 3);
  for (const example of examples) assert.equal(typeof example.query, 'string');
  assert.equal(examples[0].strategy, 'copilot');
  assert.ok(!('capabilities' in examples[0]));
  assert.equal(examples[1].strategy, 'grounding');
  assert.deepEqual(examples[1].capabilities.map(item => item.name),
    ['OneDriveAndSharePoint', 'Email', 'TeamsMessages']);
  assert.equal(examples[2].strategy, 'copilot');
  assert.deepEqual(examples[2].capabilities, [{ name: 'GraphConnectors' }]);
  for (const request of ['What is the project status', 'Compare the two named proposals', 'Who owns the service']) {
    const row = retrieval.split('\n').find(line => line.includes(request));
    assert.match(row, /\| retrieve:/);
    assert.doesNotMatch(row, /retrieve with grounding:|\| ask:/);
  }
});

test('Graph batch boundary, provider grouping and successful siblings are operative', () => {
  const body = plain(read('references/fetch-work-iq.md'));
  const rules = [
    /Batch independent exact reads only within one provider/,
    /For Graph reads, use at most 50 URLs per entityUrls call/,
    /split larger sets into chunks of 50 or fewer/,
    /or a lower connected-contract limit/,
    /Mixed-provider batches fall back to the legacy Graph pipeline, not cross-provider aggregation/,
    /Do not probe larger batches/,
    /individual result status/,
    /Retain successful results/,
  ];
  for (const rule of rules) assert.match(body, rule);
  assert.doesNotMatch(body.replaceAll('50', '51'), rules[1]);
  assert.doesNotMatch(body.replace('only within', 'across'), rules[0]);
  assert.doesNotMatch(body.replace('Retain successful', 'Discard successful'), rules.at(-1));
});

test('attachment and delta contracts load only for their selected operations', () => {
  const scenario = { id: 'mail-attachments', owner: () => 'references/mail-attachments-work-iq.md',
    required: ['references/fetch-work-iq.md', 'references/fetch-blob-work-iq.md'], limit: 21000 };
  assert.deepEqual(scenarioProblems('workiq', scenario, load(scenario.id)), []);
  assert.ok(!load('mail-read').files.includes('references/fetch-blob-work-iq.md'));
  assert.match(read('references/mail-read-work-iq.md'),
    /Before selecting or\s+downloading attachments, read \[attachments\]\(mail-attachments-work-iq\.md\)/);
  const missingBinary = load(scenario.id, {
    read: file => read(file).replace('- [Binary handling](fetch-blob-work-iq.md)', ''),
  });
  assert.ok(scenarioProblems('workiq', scenario, missingBinary)
    .some(error => error.includes('required owner/prerequisite')));
  assert.ok(!load('teams-presence').files.includes('references/call-function-work-iq.md'));
  const deltaPrerequisite = /Before channel delta, read \[functions\]\(call-function-work-iq\.md\)/;
  const presence = read('references/teams-presence-work-iq.md');
  assert.match(presence, deltaPrerequisite);
  assert.doesNotMatch(presence.replace('Before channel delta, read', 'After channel delta, optionally read'),
    deltaPrerequisite);
});

test('domain batching links remain conditional prerequisites', () => {
  for (const owner of ['calendar-base', 'files-identity', 'mail-read',
    'sharepoint-library-metadata', 'teams-query-limits', 'teams-presence']) {
    const file = owner === 'sharepoint-library-metadata' ? `${owner}.md` : `${owner}-work-iq.md`;
    assert.match(read(`references/${file}`),
      /[Bb]efore batching[\s\S]{0,140}\(fetch-work-iq\.md#batches-paging-and-host-caps\)/, file);
  }
});

test('bounded Inbox recipe requires supported combinations, actual kinds and complete bytes', () => {
  const guide = read('references/mail-attachments-work-iq.md');
  const recipe = JSON.parse(guide.match(/```json\s*\n([\s\S]*?)```/)[1]);
  assert.deepEqual(recipe, { entityUrls: [
    '/me/mailFolders/inbox/messages?$filter=hasAttachments%20eq%20true&$top=10'
    + '&$select=id,subject,receivedDateTime,hasAttachments'
    + '&$expand=attachments($select=id,name,contentType,size,isInline)',
  ] });
  const body = plain(guide);
  for (const rule of [
    'not the newest attachment or a complete inventory',
    'connected contract supports this exact query combination',
    'disclose the limitation without probing variants',
    'Do not add $orderby, $skip or extra filters',
    'In returned order, choose the first message',
    'Skip reference/item attachments',
    'Missing kind or incomplete attachment data is unresolved',
    'do not follow @odata.nextLink, enumerate the mailbox',
    'Compare both path segments character-for-character',
    'Keep trailing = and the literal /$value suffix',
    'actual verified materialized file path',
    'not an ask or retrieve workflow',
    'An error is not an empty page',
  ]) assert.ok(body.includes(rule), rule);
});

test('metadata coverage and whole-table deletion retain their safeguards', () => {
  const metadata = plain(read('references/sharepoint-library-metadata.md'));
  for (const rule of ['specifically rejects a non-indexed filter or sort',
    'A generic 400 is not that diagnostic', 'Explicit denial stops',
    'Put the requested inventory, breakdown and aggregates in the message',
    'state the exact number of omitted rows', 'disclose the undelivered rows',
    'Never present incomplete source coverage as complete']) assert.ok(metadata.includes(rule), rule);
  const actions = plain(read('references/business-applications-actions.md'));
  assert.match(actions, /Delete a table \| delete_entity on the exact discovered table path/);
  assert.match(actions, /only when supported and the user confirmed deletion of the whole table, not a record/);
});
