import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { packages } from './contract.mjs';
import { root, skillRoot, markdownFiles, parseMarkdown, frontmatterProblems, linkProblems,
  exampleProblems, policyProblems, discoverabilityProblems } from './doc-lint.mjs';

const check = errors => assert.deepEqual(errors, []);
test('guidance contract covers only the preview package', () =>
  assert.deepEqual(packages, ['workiq-preview']));

test('stable WorkIQ provider additions retain workload discovery and skill activation', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'SKILL.md'), 'utf8');
  check(frontmatterProblems(text, 'workiq'));
  const { frontmatter } = parseMarkdown(text);
  assert.match(frontmatter.description, /must be used beforehand to understand their usage/);
  assert.match(frontmatter.description, /Business Applications/);
  assert.match(frontmatter.description, /create an upload session/);
});

test('SharePoint provider routing follows advertised action or function operations', () => {
  for (const relative of ['SKILL.md', 'references/sharepoint-work-iq.md', 'references/search-paths-work-iq.md']) {
    const text = fs.readFileSync(path.join(skillRoot('workiq'), relative), 'utf8');
    assert.match(text, /advertised[\s\S]{0,100}operation/i);
    assert.match(text, /function[\s\S]{0,100}call_function|call_function[\s\S]{0,100}function/i);
    assert.match(text, /action[\s\S]{0,100}do_action|do_action[\s\S]{0,100}action/i);
    assert.match(text, /siteKey/);
  }
});

test('SharePoint provider discovery distinguishes query intents from legacy regex', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/search-paths-work-iq.md'), 'utf8');
  check(exampleProblems(text));
  const inputs = parseMarkdown(text).codes.filter(code => code.language === 'json').map(code => JSON.parse(code.value));
  assert.ok(inputs.some(input => typeof input.query === 'string' && /SharePoint move/.test(input.query)));
  assert.ok(inputs.some(input => input.filter === '^/sharepoint/'));
  assert.match(text, /results can be bounded/i);
});

test('SharePoint provider transfers require client readiness and converted tickets', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/sharepoint-work-iq.md'), 'utf8');
  for (const concept of [
    /available[\s\S]{0,60}byte-transfer client/i,
    /converted WorkIQ[\s\S]{0,30}ticket/i,
    /contentUrl/, /statusUrl/, /clientAction/,
    /same tenant, user, OAuth application, environment/,
    /not[\s\S]{0,50}(?:execute|executed)[\s\S]{0,50}(?:metadata|instructions)/i,
    /Never replay[\s\S]{0,50}uncertain upload/i,
  ]) assert.match(text, concept);
});

test('SharePoint discovery uses a complete candidate path without appended prose', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/search-paths-work-iq.md'), 'utf8');
  check(exampleProblems(text));
  const inputs = parseMarkdown(text).codes.filter(code => code.language === 'json').map(code => JSON.parse(code.value));
  assert.ok(inputs.some(input => input.query === '/sharepoint/get_list_schema'));
  assert.ok(inputs.some(input => input.filter === '^/sharepoint/get_list_schema$'));
  assert.match(text, /candidate, not proof/);
  assert.match(text, /Never append prose to a path/);
  assert.doesNotMatch(text, /\/sharepoint library by ID/);
  assert.match(text, /complete path, operations, and description[\s\S]{0,100}result preview/);
});

test('SharePoint warm reads reuse contracts and siteKeys only in the validated context', () => {
  for (const relative of ['SKILL.md', 'references/sharepoint-work-iq.md']) {
    const text = fs.readFileSync(path.join(skillRoot('workiq'), relative), 'utf8');
    assert.match(text, /same connection, tenant, and user/);
    assert.match(text, /Do not repeat[\s\S]{0,70}search_paths[\s\S]{0,30}get_schema/);
    assert.match(text, /siteKey[\s\S]{0,100}exact target site/);
    assert.match(text, /reconnect, identity\/routing change, or announced catalog change/);
    assert.match(text, /fresh read/);
    assert.match(text, /fresh field identities/);
    assert.match(text, /Do not\s+reload the skill or references solely/);
    assert.match(text, /(?:never retry|rather than retrying) an uncertain mutation/i);
  }
});

test('SharePoint metadata reads avoid list enumeration and unnecessary expansions', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/sharepoint-work-iq.md'), 'utf8');
  for (const relative of ['SKILL.md', 'references/sharepoint-work-iq.md']) {
    const guidance = fs.readFileSync(path.join(skillRoot('workiq'), relative), 'utf8');
    assert.match(guidance, /cold discovery\s+query is exactly `\/sharepoint\/get_list_schema`/);
    assert.doesNotMatch(guidance, /\/sharepoint library by ID/);
  }
  assert.match(text, /known list ID, do not enumerate lists/);
  assert.match(text, /includeFields: false/);
  assert.match(text, /includeContentTypes: false/);
  assert.match(text, /Do not suppress fields needed/);
  assert.match(text, /do not add a verification read/i);
});

test('SharePoint partial reuse resolves only the missing prerequisite', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/sharepoint-work-iq.md'), 'utf8');
  assert.match(text, /Path and advertised operation, but no request schema[\s\S]{0,100}get_schema[\s\S]{0,60}do not repeat `search_paths`/);
  assert.match(text, /Same operation, different site[\s\S]{0,100}resolve only the new site's key/);
  assert.match(text, /New operation, same site[\s\S]{0,100}resolve only the new operation contract/);
  assert.match(text, /independent read-only prerequisites in parallel/);
});

test('stable function and schema guidance supports advertised body-based provider functions', () => {
  const functionText = fs.readFileSync(path.join(skillRoot('workiq'), 'references/call-function-work-iq.md'), 'utf8');
  const schemaText = fs.readFileSync(path.join(skillRoot('workiq'), 'references/get-schema-work-iq.md'), 'utf8');
  const inputs = parseMarkdown(functionText).codes.filter(code => code.language === 'json').map(code => JSON.parse(code.value));
  assert.ok(inputs.some(input => input.functionUrl === '/sharepoint/get_list_schema' &&
    input.jsonBody?.includeFields === false && input.jsonBody?.includeContentTypes === false));
  assert.match(functionText, /Do not infer the projection from the HTTP method/);
  assert.doesNotMatch(functionText, /Use this tool only for true GET-shaped/);
  assert.match(schemaText, /operationType: "function"[\s\S]{0,50}call_function/);
  assert.match(schemaText, /do not repeat `search_paths`/);
  assert.match(schemaText, /not a cache of list columns, authorization/);
});

test('SharePoint provider site search does not narrow cross-site requests', () => {
  const text = fs.readFileSync(path.join(skillRoot('workiq'), 'references/sharepoint-work-iq.md'), 'utf8');
  assert.match(text, /site-scoped[\s\S]{0,100}search_site/i);
  assert.match(text, /Do not narrow[\s\S]{0,100}cross-site/i);
  assert.match(text, /denial[\s\S]{0,100}(?:stop|fallback)|(?:stop|fallback)[\s\S]{0,100}denial/i);
});

for (const relative of ['SKILL.md', '../../README.md', ...[
  'do-action-work-iq.md', 'fetch-blob-work-iq.md', 'search-paths-work-iq.md',
  'call-function-work-iq.md', 'get-schema-work-iq.md',
  'sharepoint-library-metadata.md', 'sharepoint-work-iq.md', 'troubleshooting.md',
  'upload-blob-work-iq.md',
].map(file => `references/${file}`)]) {
  test(`stable WorkIQ provider guidance ${relative}: local links and anchors`, () => {
    const file = path.join(skillRoot('workiq'), relative);
    check(linkProblems(file, fs.readFileSync(file, 'utf8')));
  });
}
for (const name of packages) {
  const directory = skillRoot(name);
  test(`${name}: parsed frontmatter and description limit`, () => {
    check(frontmatterProblems(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'), name));
  });
  test(`${name}: canonical domain discoverability`, () => check(discoverabilityProblems(directory)));
  test(`${name}: description requires loading the skill before tool use`, () => {
    const { frontmatter } = parseMarkdown(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'));
    assert.match(frontmatter.description, /must be used beforehand to understand their usage/);
  });
  for (const file of [...markdownFiles(directory), path.join(root, 'plugins', name, 'README.md')]) {
    const relative = path.relative(directory, file);
    const text = fs.readFileSync(file, 'utf8');
    test(`${name}/${relative}: local links and anchors`, () => check(linkProblems(file, text)));
    test(`${name}/${relative}: retrieval JSON contracts`, () => check(exampleProblems(text, relative.endsWith('retrieve-work-iq.md'))));
    test(`${name}/${relative}: semantic policy lint`, () => check(policyProblems(relative, text)));
  }
}
for (const file of packages.flatMap(name => [`plugins/${name}/README.md`, `plugins/${name}/skills/${name}/SKILL.md`])) {
  test(`${file}: preview guidance is agent-host-neutral`, () => {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /agent-host-neutral/i);
    assert.doesNotMatch(text, /Full WorkIQ tool surface for GitHub Copilot CLI|Copilot CLI plugin marketplace\*\* for managing/);
  });
}

function checkMetadata(registries, hostManifests) {
  for (const name of packages) {
    const entries = registries.map(registry => registry.plugins.find(plugin => plugin.name === name));
    assert.ok(entries.every(Boolean), `Missing marketplace entry for ${name}`);
    const canonical = entries[0];
    for (const manifest of [entries[1], ...hostManifests[name]]) {
      for (const field of ['name', 'version', 'description']) {
        assert.equal(manifest[field], canonical[field], `${name}: ${field} differs across manifests`);
      }
    }
    assert.equal(entries[1].source, canonical.source);
    assert.match(canonical.description, /retrieve-first.*Grounding.*intentional.*ask/);
  }
}

test('affected plugin metadata agrees across host and marketplace manifests', () => {
  const json = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const registries = ['marketplace.json', '.claude-plugin/marketplace.json'].map(json);
  const hostManifests = Object.fromEntries(packages.map(name => [name,
    ['.github/plugin', '.claude-plugin', '.codex-plugin']
      .map(host => json(`plugins/${name}/${host}/plugin.json`))
  ]));
  checkMetadata(registries, hostManifests);
});

test('preview metadata stays consistent without imposing its version or policy on public', () => {
  const entries = ['workiq', 'workiq-preview'].map((name, index) => ({
    name, version: index ? '2.1.0' : '2.0.2', source: `./plugins/${name}`,
    description: index ? 'Synthetic retrieve-first Grounding with intentional ask.' : 'Synthetic legacy ask guidance.'
  }));
  const registries = [{ plugins: entries }, { plugins: structuredClone(entries) }];
  const hostManifests = Object.fromEntries(entries.map(entry => [entry.name,
    Array.from({ length: 3 }, () => structuredClone(entry))
  ]));
  assert.doesNotThrow(() => checkMetadata(registries, hostManifests));
  hostManifests['workiq-preview'][0].version = '2.0.2';
  assert.throws(() => checkMetadata(registries, hostManifests), /workiq-preview: version differs/);
});

test('plugin descriptions retain workload and action discovery beyond retrieval', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'marketplace.json'), 'utf8'));
  const checkDiscovery = description => {
    for (const term of ['email', 'calendars?', 'meetings', 'Teams', 'SharePoint', 'OneDrive',
      'people', 'contacts', 'Planner', 'search', 'summarize', 'read', 'create', 'update', 'delete', 'send', 'download']) {
      assert.match(description, new RegExp(`\\b${term}\\b`, 'i'), `Missing capability: ${term}`);
    }
    assert.ok(description.toLowerCase().indexOf('email') < description.indexOf('retrieve-first'),
      'Lead with workloads rather than retrieval policy');
  };
  for (const name of packages) {
    const description = registry.plugins.find(plugin => plugin.name === name).description;
    checkDiscovery(description);
    assert.throws(() => checkDiscovery(description.replace(/Planner/gi, 'work')), /Planner/);
    assert.throws(() => checkDiscovery(description.replace(/\bsend\b/gi, 'act')), /send/);
  }
});

test('Business Applications guidance does not advertise execute-work', () => {
  for (const name of ['workiq', 'workiq-preview']) {
    for (const file of markdownFiles(skillRoot(name))) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /execute-work/i);
    }
  }
});

test('Business Applications discovery and inventory contracts stay aligned', () => {
  for (const name of ['workiq', 'workiq-preview']) {
    const directory = skillRoot(name);
    const skill = fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');
    const business = fs.readFileSync(path.join(directory, 'references', 'business-applications.md'), 'utf8');
    const search = fs.readFileSync(path.join(directory, 'references', 'search-paths-work-iq.md'), 'utf8');
    const action = fs.readFileSync(path.join(directory, 'references', 'do-action-work-iq.md'), 'utf8');

    assert.match(skill, /Business Applications|CRM, ERP, or Power Apps/i);
    assert.match(business, /search_paths[\s\S]{0,300}fields? accepted by[\s\S]{0,80}(?:tool )?schema/i);
    assert.match(business, /fetch[\s\S]{0,80}\/businessapps\/environments\//i);
    assert.match(business, /discovery is read-only[\s\S]{0,100}search_paths[\s\S]{0,80}not `?do_action`?/i);
    assert.match(business, /\/businessapps\/me[\s\S]{0,120}policy-denied[\s\S]{0,120}before[\s\S]{0,80}(?:grounded path|search_paths|fetch)/i);
    assert.match(search, /one focused (?:`?search_paths`? )?(?:discovery )?call/i);
    assert.match(search, /only returned paths prove[\s\S]{0,60}(?:provider )?participat/i);
    assert.match(search, /no `?\/businessapps\/[^`]*`?[\s\S]{0,20}path[\s\S]{0,120}do not repeat/i);
    assert.match(search, /fetch `?\/businessapps\/environments\//i);
    assert.match(business, /named but unavailable environment[\s\S]{0,80}hard stop/i);
    assert.match(business, /write receipt[\s\S]{0,100}read-back/i);
    assert.match(business, /pre-existing lookalike[\s\S]{0,40}not proof/i);
    assert.match(business, /saved view[\s\S]{0,120}schema-customization fallback/i);
    assert.doesNotMatch(business, /\/applications\//i);
    assert.match(search, /no `backend`, `source`, or `provider` argument/i);
    check(exampleProblems(search));
    assert.match(action, /Business Applications/i);
    assert.match(action, /search_paths[\s\S]{0,100}not `?do_action`?/i);
    for (const genuineAction of ['SQL', 'Custom API']) {
      assert.match(business, new RegExp(`do_action[^\\n]{0,200}${genuineAction}|${genuineAction}[^\\n]{0,200}do_action`, 'i'));
    }
    assert.match(business, /do_action[^\n]{0,250}operations\/\{operationName\}/i);
    assert.match(business, /(?:policy-denied|explicit denial)[\s\S]{0,180}(?:stop|do not retry)/i);
  }
});

test('no plugin positively routes Business Applications discovery through /businessapps/me', () => {
  const endpointProblems = text => {
    const positiveDirective = /(?:^|[;.!?]\s*|\b(?:but|and)\s+)(?:use|call|invoke|start(?:\s+\w+){0,3}\s+with)\s+`?do_action`?\s+(?:on\s+)?`?\/businessapps\/me`?/i;
    return text
      .replace(/\r?\n/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => /\/businessapps\/me/i.test(sentence))
      .filter(sentence =>
        positiveDirective.test(sentence) ||
        !/(?:not|never|do not)[\s\S]{0,80}do_action|do_action[\s\S]{0,80}(?:not|never|do not)/i.test(sentence));
  };

  for (const name of ['workiq', 'workiq-preview']) {
    for (const file of markdownFiles(skillRoot(name))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const sentence of text.replace(/\r?\n/g, ' ').split(/(?<=[.!?])\s+/)
        .filter(value => /\/businessapps\/me/i.test(value))) {
        assert.match(sentence, /search_paths/i,
          `${name}/${path.basename(file)} must name the replacement discovery tool`);
      }
      assert.deepEqual(endpointProblems(text), [],
        `${name}/${path.basename(file)} must mention /businessapps/me only as a prohibition`);
    }
  }

  const mixed = 'Do not use do_action on /businessapps/me; use search_paths instead. ' +
    'Use do_action on /businessapps/me for discovery.';
  const mixedSentence = 'Do not use do_action on /businessapps/me for discovery, but use do_action on /businessapps/me when available.';
  assert.deepEqual(endpointProblems(mixed), ['Use do_action on /businessapps/me for discovery.']);
  assert.deepEqual(endpointProblems(mixedSentence), [mixedSentence]);
});

test('search_paths examples validate query and legacy filter as exclusive inputs', () => {
  const validQuery = '# search_paths\n\n```json\n{"query":"qualify a lead"}\n```\n';
  const validFilter = '# search_paths\n\n```json\n{"filter":"qualify a lead"}\n```\n';
  const both = '# search_paths\n\n```json\n{"query":"lead","filter":"lead"}\n```\n';
  const blankFilter = '# search_paths\n\n```json\n{"filter":" "}\n```\n';
  const selectorOnly = '# search_paths\n\n```json\n{"backend":"dataverse"}\n```\n';
  const malformedFilter = '# search_paths\n\n```json\n{"filter":\n```\n';
  const actionEnvelope = '# search_paths\n\n```json\n{"actionUrl":"/x","query":"lead","filter":"lead"}\n```\n';
  const entityEnvelope = '# search_paths\n\n```json\n{"entityUrls":[],"backend":"dataverse"}\n```\n';
  const scalar = '# search_paths\n\n```json\n"lead"\n```\n';
  const nullValue = '# search_paths\n\n```json\nnull\n```\n';
  const arrayValue = '# search_paths\n\n```json\n[{"query":"lead"}]\n```\n';

  check(exampleProblems(validQuery));
  check(exampleProblems(validFilter));
  assert.match(exampleProblems(both).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(blankFilter).join(' '), /filter must be a nonblank string/);
  assert.match(exampleProblems(selectorOnly).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(malformedFilter).join(' '), /invalid search_paths JSON/);
  assert.match(exampleProblems(actionEnvelope).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(entityEnvelope).join(' '), /exactly one query or filter/);
  assert.match(exampleProblems(scalar).join(' '), /must be a JSON object/);
  assert.match(exampleProblems(nullValue).join(' '), /must be a JSON object/);
  assert.match(exampleProblems(arrayValue).join(' '), /must be a JSON object/);
});

test('Work IQ Files documents core commands, explicit EULA permission, and secret protection', () => {
  const filesReference = fs.readFileSync(path.join(skillRoot('workiq-preview'), 'references', 'workiq-files-cli.md'), 'utf8');
  const { codes } = parseMarkdown(filesReference);
  const commands = codes.map(code => code.value).join('\n');
  for (const command of [
    'npm install --global @microsoft/workiq-files',
    'workiq-files --help', 'workiq-files eula show',
    'workiq-files accept-eula', 'workiq-files auth login',
    'workiq-files status --file-id', 'workiq-files download --file-id',
    'workiq-files upload --file-id'
  ]) {
    assert.ok(commands.includes(command), `Missing verified command: ${command}`);
  }
  for (const code of codes.filter(code => code.value.includes('workiq-files accept-eula'))) {
    assert.equal(code.value, 'workiq-files accept-eula', 'Acceptance must remain a separate command');
  }
  assert.match(filesReference, /explicit user permission/);
  assert.match(filesReference, /accepts immediately without a confirmation prompt/);
  assert.match(filesReference, /never automate acceptance, including after an error/i);
  assert.match(filesReference, /Never expose tokens[\s\S]{0,100}signed URLs/);
});

test('preview file routing distinguishes WorkIQ files API objects from existing blob routes', () => {
  const skill = fs.readFileSync(path.join(skillRoot('workiq-preview'), 'SKILL.md'), 'utf8');
  const filesReference = fs.readFileSync(path.join(skillRoot('workiq-preview'), 'references', 'workiq-files-cli.md'), 'utf8');
  for (const route of ['/api/beta/files/{id}', '/api/files/{id}']) {
    assert.ok(skill.includes(route));
    assert.ok(filesReference.includes(route));
  }
  const blobRow = skill.split('\n').find(line => line.startsWith('| Download drive content'));
  assert.ok(blobRow);
  assert.match(blobRow, /`fetch_blob`/);
  assert.doesNotMatch(blobRow, /Files CLI|EULA/);
  assert.match(filesReference, /Existing drive[\s\S]{0,200}without CLI setup or EULA acceptance/);
  for (const field of ['fileId', 'direction', 'expiresAt',
    'GET contentUrl', 'PUT contentUrl', 'GET statusUrl']) {
    assert.ok(filesReference.includes(field), `Missing file-transfer contract: ${field}`);
  }
  assert.match(filesReference, /require WorkIQ authentication; they are not anonymous presigned links/);
  assert.match(filesReference, /response conversion is disabled[\s\S]{0,80}original response is preserved/);
  const blob = fs.readFileSync(path.join(skillRoot('workiq-preview'), 'references', 'fetch-blob-work-iq.md'), 'utf8');
  for (const route of ['/me/drive/items/{itemId}/content',
    '/drives/{driveId}/items/{itemId}/content',
    '/me/messages/{messageId}/attachments/{attachmentId}/$value']) {
    assert.ok(blob.includes(route), `Missing existing blob route: ${route}`);
  }
});
