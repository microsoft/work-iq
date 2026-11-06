import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { packages } from './contract.mjs';
import { root, skillRoot, markdownFiles, parseMarkdown, frontmatterProblems, linkProblems,
  exampleProblems, policyProblems, discoverabilityProblems } from './doc-lint.mjs';
import { entryByteLimit, loadRoute, declaredRoutes, requiredLinks, scenarios, scenarioProblems,
  operativeRules, operativeRuleProblems } from './loading-contract.mjs';

const check = errors => assert.deepEqual(errors, []);
const directory = skillRoot('workiq');
const read = file => fs.readFileSync(path.join(directory, file), 'utf8').replace(/\r\n/g, '\n');
const plain = text => text.replace(/[*`]/g, '').replace(/\s+/g, ' ');
for (const relative of ['AGENTS.md', 'CONTRIBUTING.md', 'PLUGINS.md', 'README.md']) {
  test(`${relative}: public documentation local links and anchors`, () => {
    const file = path.join(root, relative);
    check(linkProblems(file, fs.readFileSync(file, 'utf8')));
  });
}
test('guidance contracts cover the published stable package, not the retired preview', () => {
  assert.deepEqual(packages, ['workiq']);
  assert.equal(fs.existsSync(path.join(root, 'plugins', 'workiq-preview')), false);
});
test('parsed frontmatter and description limit', () =>
  check(frontmatterProblems(read('SKILL.md'), 'workiq')));
test('description requires reading guidance before tool use', () => {
  assert.match(parseMarkdown(read('SKILL.md')).frontmatter.description, /Read before using workiq tools/i);
});
test('canonical domains and mechanics are reachable through modular guidance', () =>
  check(discoverabilityProblems(directory)));
for (const file of [...markdownFiles(directory), path.join(root, 'plugins', 'workiq', 'README.md')]) {
  const relative = path.relative(directory, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  test(`${relative}: local links and anchors`, () => check(linkProblems(file, text)));
  test(`${relative}: request JSON contracts`, () =>
    check(exampleProblems(text, /retrieve(?:-details)?-work-iq\.md$/.test(relative))));
  test(`${relative}: semantic policy lint`, () => check(policyProblems(relative, text)));
}

test('entrypoint stays small and requires domain, leaf and prerequisites before each call', () => {
  const entry = read('SKILL.md');
  assert.ok(Buffer.byteLength(entry) <= entryByteLimit);
  assert.match(entry, /Per call, read the domain index, leaf and `Required before use` links/);
  assert.match(entry, /Before status summaries, read/);
  assert.match(entry, /Before retry\/reconciliation, read/);
  assert.match(entry, /Missing required text stops; reuse only current verbatim text/);
});
for (const scenario of scenarios) {
  test(`${scenario.id}: route loads the owner and mandatory prerequisites within budget`, () => {
    check(scenarioProblems('workiq', scenario, loadRoute(directory, scenario.id, { read })));
  });
}
for (const rule of operativeRules) {
  test(`${rule.route}: operative rule belongs to the loaded leaf`, () =>
    check(operativeRuleProblems(loadRoute(directory, rule.route, { read }), rule)));
}
test('every declared route and required dependency can load without cycles', () => {
  for (const file of markdownFiles(directory)) {
    const relative = path.relative(directory, file).split(path.sep).join('/');
    for (const dependency of requiredLinks(relative, read(relative))) {
      assert.ok(fs.existsSync(path.join(directory, dependency)), dependency);
    }
    for (const route of declaredRoutes(relative, read(relative))) {
      const loaded = loadRoute(directory, route.id, { read });
      assert.ok(loaded.files.includes(route.file), route.id);
    }
  }
});
test('same-objective follow-ups require the repair owner, including after successful retrieval', () => {
  assert.match(read('references/retrieve-work-iq.md'),
    /Before refining or repeating a search for the same question, read the\s+retrieval-follow-up route below, even after a successful search/);
  const loaded = loadRoute(directory, 'retrieval-follow-up', { read });
  assert.ok(loaded.files.includes('references/retrieve-work-iq.md'));
  const repair = plain(loaded.contents['references/retrieve-repair-work-iq.md']);
  assert.match(repair, /one targeted Copilot escalation per retrieval objective/);
  assert.match(repair, /at most two focused refinements or exact reads/);
  assert.match(repair, /unknown-source first call uses copilot directly, not a Grounding probe/);
});

function checkMetadata(registries, manifests) {
  assert.deepEqual(registries[1], registries[0]);
  assert.ok(registries[0].plugins.every(plugin => plugin.name !== 'workiq-preview'));
  const canonical = registries[0].plugins.find(plugin => plugin.name === 'workiq');
  assert.ok(canonical, 'Missing stable marketplace entry');
  assert.equal(canonical.version, '3.0.0');
  assert.equal(canonical.source, './plugins/workiq');
  for (const manifest of manifests) {
    for (const field of ['name', 'version', 'description']) {
      assert.equal(manifest[field], canonical[field], `${field} differs across manifests`);
    }
    assert.equal(manifest.skills, './skills/');
  }
}
test('all marketplaces and host manifests publish consistent stable 3.0 metadata', () => {
  const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  checkMetadata(['marketplace.json', '.claude-plugin/marketplace.json'].map(json),
    ['.github/plugin', '.claude-plugin', '.codex-plugin'].map(host => json(`plugins/workiq/${host}/plugin.json`)));
});
test('metadata contract rejects mismatched hosts and retired preview registration', () => {
  const entry = { name: 'workiq', version: '3.0.0', source: './plugins/workiq', description: 'Synthetic' };
  const registries = Array.from({ length: 2 }, () => ({ plugins: [structuredClone(entry)] }));
  const manifests = Array.from({ length: 3 }, () => ({ ...entry, skills: './skills/' }));
  assert.doesNotThrow(() => checkMetadata(registries, manifests));
  manifests[0].version = '2.0.2';
  assert.throws(() => checkMetadata(registries, manifests), /version differs/);
  manifests[0].version = '3.0.0';
  for (const registry of registries) registry.plugins.push({ name: 'workiq-preview' });
  assert.throws(() => checkMetadata(registries, manifests));
});
test('plugin description retains workload and action discovery', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'marketplace.json'), 'utf8'));
  const description = registry.plugins.find(plugin => plugin.name === 'workiq').description;
  for (const term of ['mail', 'calendar', 'Teams', 'files', 'SharePoint', 'people', 'Planner',
    'Business Applications', 'retrieve', 'summarize', 'ask', 'reads', 'operations', 'confirmation', 'mutations']) {
    assert.match(description, new RegExp(`\\b${term}s?\\b`, 'i'), `Missing capability: ${term}`);
  }
});
test('Business Applications uses its actual discovery action, with read-only classification and denial stops', () => {
  const business = read('references/business-applications.md');
  assert.match(business, /read-only discovery\s+action `do_action` `\/businessapps\/me`/);
  assert.match(business, /"actionUrl":"\/businessapps\/me","jsonBody":\{"query":/);
  assert.match(business, /explicit environment listing, use `fetch`\s+`\/businessapps\/environments\/`/);
  assert.match(business, /search_paths` is another\s+discovery option, not a fallback after denial/);
  assert.match(business, /Take every environment, app, table, record, skill, API and operation identifier\s+from returned paths/);
  assert.match(business, /Explicit access, privilege or policy denial stops/);
  assert.match(business, /Environment SQL queries use do_action, not call_function/);
  const actions = read('references/business-applications-actions.md');
  assert.match(actions, /execute-work` only for an\s+explicitly delegated open-ended goal whose environment exposes that path/);
  assert.match(actions, /reuse the returned sessionId\s+for continuation/);
  assert.match(actions, /Delegating a goal does not authorize unapproved writes/);
  assert.match(actions, /Never replay an\s+ambiguous write/);
});
test('search_paths preserves the current query schema and scoped inventory', () => {
  const search = read('references/search-paths-work-iq.md');
  assert.match(search, /exposes required `query`\s+\(string\)/);
  assert.match(search, /Older catalogs may expose a regex `filter` instead/);
  assert.match(search, /send only its accepted fields/);
  assert.match(search, /one focused discovery call/);
  assert.match(search, /Never\s+add paths the results did not return/);
  assert.match(search, /no basis for inventing `backend`, `source`, or `provider` selectors/);
});
test('search_paths examples reject malformed arguments, arrays, blank strings and mixed interfaces', () => {
  const example = value => `# search_paths\n\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n`;
  check(exampleProblems(example({ query: 'qualify a lead' })));
  check(exampleProblems(example({ filter: 'qualify a lead' })));
  for (const value of [
    { query: 'lead', filter: 'lead' }, { query: [] }, { query: ['lead'] }, { query: '' },
    { query: ' ' }, { query: null }, { query: 42 }, { filter: ' ' }, { backend: 'dataverse' },
    { actionUrl: '/x', query: 'lead', filter: 'lead' }, { entityUrls: [], backend: 'dataverse' },
    'lead', null, [{ query: 'lead' }]
  ]) assert.ok(exampleProblems(example(value)).length, JSON.stringify(value));
  assert.match(exampleProblems('# search_paths\n\n```json\n{"query":\n```\n').join(' '), /invalid search_paths JSON/);
});
test('Work IQ Files documents commands, separate explicit EULA permission, and secret protection', () => {
  const reference = read('references/workiq-files-cli.md');
  const { codes } = parseMarkdown(reference);
  const commands = codes.map(code => code.value).join('\n');
  for (const command of [
    'npm install --global @microsoft/workiq-files', 'workiq-files --help', 'workiq-files eula show',
    'workiq-files accept-eula', 'workiq-files auth login', 'workiq-files status --file-id',
    'workiq-files download --file-id', 'workiq-files upload --file-id'
  ]) assert.ok(commands.includes(command), command);
  for (const code of codes.filter(code => code.value.includes('workiq-files accept-eula'))) {
    assert.equal(code.value, 'workiq-files accept-eula');
  }
  assert.match(reference, /explicit user permission/);
  assert.match(reference, /accepts immediately without a confirmation prompt/);
  assert.match(reference, /never automate acceptance, including after an error/i);
  assert.match(reference, /Never expose tokens[\s\S]{0,100}signed URLs/);
});
test('file routing keeps WorkIQ transfer objects separate from existing Graph blob routes', () => {
  const reference = read('references/workiq-files-cli.md');
  const index = read('references/files-work-iq.md');
  for (const route of ['/api/beta/files/{id}', '/api/files/{id}']) {
    assert.ok(index.includes(route));
    assert.ok(reference.includes(route));
  }
  const download = loadRoute(directory, 'files-download', { read });
  assert.match(Object.values(download.contents).join('\n'), /fetch_blob/);
  assert.ok(!download.files.includes('references/workiq-files-cli.md'));
  assert.match(reference, /Existing drive[\s\S]{0,200}without CLI setup or EULA acceptance/);
  for (const field of ['fileId', 'direction', 'expiresAt', 'GET contentUrl', 'PUT contentUrl', 'GET statusUrl']) {
    assert.ok(reference.includes(field), field);
  }
  assert.match(reference, /require WorkIQ authentication; they are not anonymous presigned links/);
  assert.match(reference, /response conversion is disabled[\s\S]{0,80}original response is preserved/);
  const blob = read('references/fetch-blob-work-iq.md');
  for (const route of ['/me/drive/items/{itemId}/content', '/drives/{driveId}/items/{itemId}/content',
    '/me/messages/{messageId}/attachments/{attachmentId}/$value']) assert.ok(blob.includes(route), route);
});
