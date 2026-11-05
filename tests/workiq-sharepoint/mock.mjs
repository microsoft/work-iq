import fs from 'node:fs';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import { catalog, toolContract, schemaSnapshot } from './matrix.mjs';
import { validateNative, validateSchema } from './native.mjs';
import { callPaths, readJson, resultValues } from './common.mjs';
import { WriteBoundary, requireMockLayer } from './write-boundary.mjs';
import { catalogProbeResponse } from './breadth.mjs';

const bytes = 'RXZhbHVhdGlvbiBvcmlnaW5hbCBieXRlcy4=';
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
export const helperPaths = new Set(['/sharepoint/get_site_key', '/sharepoint/learn', '/sharepoint/get_datetime_info', '/sharepoint/load_skill']);
const envelope = (data, error = false) => ({
  content: [{ type: 'text', text: JSON.stringify({ statusCode: 200, data }) }],
  isError: error
});
const failure = (statusCode, errorMessage) => envelope({ success: false, statusCode, errorMessage }, true);

function dateInZone(instant, timeZone, days = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days)).toISOString().slice(0, 10);
}

export class FixtureServer {
  constructor(scenario, record = () => {}) {
    requireMockLayer(scenario.layer);
    this.scenario = structuredClone(scenario);
    this.context = this.scenario.context;
    this.clock = scenario.clock ?? { now: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    this.record = record;
    this.state = {
      siteResolved: false, libraryResolved: false, schemaRead: false,
      discoveredFiles: new Set(), imageReferences: new Set(),
      effectApplied: false, effectVerified: false, toolCalls: 0
    };
    this.boundary = new WriteBoundary({
      ...this.context, ownedItems: this.context.rows.map(row => row.ID),
      ownedPaths: [...this.context.docs.map(doc => doc.name), 'Reports', 'Archive']
    });
  }
  metadata(doc) {
    const c = this.context;
    return Object.fromEntries(Object.entries({
      id: doc.id, itemId: doc.id, name: doc.name, fileUrl: doc.fileUrl, webUrl: doc.fileUrl,
      url: doc.fileUrl, serverRelativeUrl: doc.serverRelativeUrl, spItemUrl: doc.spItemUrl,
      driveId: doc.driveId, listItemId: doc.listItemId, parentReference: doc.parentReference,
      file: doc.file, size: 1024, lastModifiedDateTime: '2026-01-15T12:00:00Z',
      sharepointIds: { siteId: c.siteId, listId: c.listId, listItemId: String(doc.listItemId), siteUrl: c.siteUrl }
    }));
  }
  library() {
    const c = this.context;
    return {
      id: c.listId, listId: c.listId, title: 'Documents', name: 'Documents', displayName: 'Documents',
      webUrl: c.libraryUrl, listFullUrl: c.libraryUrl, listUrl: c.libraryRelativeUrl,
      serverRelativeUrl: c.libraryRelativeUrl, rootFolderServerRelativeUrl: c.libraryRelativeUrl,
      driveId: c.driveId, baseTemplate: 101, itemCount: c.rows.length
    };
  }
  fields() {
    return [
      { internalName: 'ID', internalFieldName: 'ID', title: 'ID', name: 'ID', type: 'Counter' },
      { internalName: 'FileLeafRef', internalFieldName: 'FileLeafRef', title: 'Name', name: 'FileLeafRef', type: 'Text' },
      { internalName: 'ReviewState', internalFieldName: 'ReviewState', title: 'Status', displayName: 'Status', name: 'ReviewState', type: 'Choice', choices: ['Ready', 'Blocked'] },
      { internalName: 'Budget_x0020_EUR', internalFieldName: 'Budget_x0020_EUR', title: 'Budget EUR', displayName: 'Budget EUR', name: 'Budget_x0020_EUR', type: 'Currency' },
      ...(this.scenario.routingOnly ? [
        { internalName: 'ExperimentNote', name: 'ExperimentNote', title: 'Experiment Note', id: '9c127da3-c533-4f4a-af09-9da6efae62b0', type: 'Text' },
        { internalName: 'Project', name: 'Project', title: 'Project', id: '12d09434-dccf-4350-9da9-a9d24bd1ccf4', type: 'Lookup' }
      ] : [])
    ].map((field, index) => ({ id: `6eeb1bb0-e474-4fe9-8ed2-${String(index + 1).padStart(12, '0')}`, ...field }));
  }
  documents() {
    if (this.scenario.failure === 'ambiguous') return ['Reports', 'Archive'].map((folder, index) => ({
      ...this.metadata(this.context.docs[index]), name: 'Release-plan.docx',
      fileUrl: `${this.context.libraryUrl}/${folder}/Release-plan.docx`,
      webUrl: `${this.context.libraryUrl}/${folder}/Release-plan.docx`
    }));
    return this.context.docs.map(doc => this.metadata(doc));
  }
  verifyEffect(items, complete = false) {
    const expected = this.state.expectedEffect;
    if (!expected) return;
    const fields = item => item.fields ?? item;
    const id = item => Number(fields(item).ID ?? item.listItemId);
    if (expected.deleted) {
      if (complete && !items.some(item => id(item) === expected.ID)) this.state.effectVerified = true;
      return;
    }
    const item = items.find(item => id(item) === expected.ID ||
      (expected.folder && item.webUrl === expected.webUrl));
    if (!item) return;
    const verified = this.scenario.effect === 'update-item'
      ? fields(item).ReviewState === expected.ReviewState
      : (fields(item).FileLeafRef ?? item.name) === expected.FileLeafRef;
    if (verified) this.state.effectVerified = true;
  }
  injectedFailure() {
    return ({
      denied: () => failure(401, 'Unauthorized. Access denied for this resource. Do not retry through alternate routes.'),
      missing: () => failure(404, 'The requested file was not found.'),
      unsupported: () => failure(501, 'Structured extraction is not supported for this file. No alternate content route is available.'),
      throttled: () => failure(429, 'Service is rate limited. Retry-After: 3600 seconds. Do not retry during this session.')
    })[this.scenario.failure]?.();
  }
  async call(name, args) {
    const s = this.state;
    const sequence = ++s.toolCalls;
    const record = {
      sequence, name, arguments: args, paths: callPaths(args),
      valid: false, schemaKnown: false, taskRelevant: false, effectApplied: false, effectVerified: false
    };
    let response;
    try {
      const contract = toolContract.find(tool => tool.name === name);
      if (!contract) throw new Error('Unknown MCP tool.');
      const problems = validateSchema(args, contract.inputSchema);
      if (problems.length) throw new Error(problems.join('; '));
      if (sequence > 70) throw new Error('Scenario tool-call limit exceeded.');
      const url = record.paths[0];
      if (name === 'search_paths') {
        response = envelope(this.search(args.query));
        record.valid = true;
      } else if (name === 'get_schema') {
        const snapshot = schemaSnapshot[args.path];
        response = snapshot && args.operationType === snapshot.operation
          ? envelope(snapshot.schema) : failure(404, 'No request schema for this path/operation pair.');
        record.valid = Boolean(snapshot && args.operationType === snapshot.operation);
      } else if (url?.startsWith('/sharepoint/') && ['call_function', 'do_action'].includes(name)) {
        const operation = name === 'call_function' ? 'function' : 'action';
        const nativeName = url.slice('/sharepoint/'.length);
        const validation = validateNative(nativeName, args, this.scenario, s);
        if (validation.operation !== operation) validation.errors.push('Use the wrapper matching the advertised operation.');
        record.schemaKnown = validation.schemaKnown;
        if (validation.errors.length) {
          record.errors = validation.errors;
          response = failure(400, validation.errors.join('; '));
        } else {
          record.valid = true;
          record.taskRelevant = this.scenario.acceptable.includes(url);
          response = await this.native(nativeName, validation.body);
          if (resultValues(response).some(value => value?.statusCode === 400)) record.valid = false;
        }
      } else {
        record.valid = true;
        response = this.legacy(name, args);
      }
    } catch (error) {
      record.valid = false;
      record.errors = [error.message];
      response = failure(400, error.message);
    }
    record.result = response;
    const observe = value => {
      if (!value || typeof value !== 'object') return;
      if (this.context.docs.some(doc => doc.spItemUrl === value.spItemUrl)) s.discoveredFiles.add(value.spItemUrl);
      Object.values(value).filter(nested => nested && typeof nested === 'object').forEach(observe);
    };
    resultValues(response).forEach(observe);
    record.effectApplied = s.effectApplied;
    record.effectVerified = s.effectVerified;
    this.record(record);
    return response;
  }
  search(query) {
    const nativeQuery = /sharepoint|document|library|file|folder|list|approval|form|column|view|recycle|taxonomy|knowledge|esign|signature/i.test(query);
    const nativePaths = nativeQuery ? catalog : [];
    const graph = [
      ['/sites?search={query}', ['fetch'], 'Find SharePoint sites'],
      ['/sites/{siteId}/lists', ['fetch'], 'List SharePoint libraries'],
      ['/sites/{siteId}/lists/{listId}/columns', ['fetch'], 'Read list columns'],
      ['/sites/{siteId}/lists/{listId}/items', ['fetch'], 'Read list items and fields'],
      ['/drives/{driveId}/items/{itemId}', ['fetch', 'update', 'delete'], 'Read or change drive items'],
      ['/drives/{driveId}/items/{itemId}/content', ['fetch_blob'], 'Download original file bytes'],
      ["/drives/{driveId}/root/search(q='{query}')", ['function'], 'Search drive files'],
      ['/search/query', ['action'], 'Microsoft Search'],
      ['/me/messages', ['fetch', 'create'], 'Mail'],
      ['/me/calendarView', ['fetch'], 'Calendar'],
      ['/me/chats', ['fetch'], 'Teams chats'],
      ['/me/manager', ['fetch'], 'Manager'],
      ['/me/planner/plans', ['fetch'], 'Planner plans']
    ].map(([path, operations, description]) => ({ path, uriTemplate: path, operations, description }));
    return { paths: [...nativePaths.map(entry => ({ ...entry, uriTemplate: entry.path })), ...graph] };
  }
  async native(name, body) {
    const c = this.context, s = this.state;
    const implementedReads = ['get_site_key', 'learn', 'find_site', 'discover_sharepoint_lists',
      'get_list_schema', 'find_items', 'get_structured_text', 'semantic_search',
      'get_document_pages', 'get_table_of_contents', 'get_document_images', 'list_items', 'getDownloadFileDetails'];
    if (this.scenario.routingOnly && !implementedReads.includes(name)) {
      return envelope(catalogProbeResponse(name, c));
    }
    if (name === 'get_site_key') {
      s.siteResolved = true;
      return envelope({ success: true, siteKey: c.siteKey, webUrl: body.siteUrl });
    }
    if (name === 'learn') {
      const requested = body.tools?.length ? catalog.filter(entry => body.tools.some(tool =>
        tool === entry.path || tool === entry.path.slice('/sharepoint/'.length))) : catalog;
      return envelope({ tools: requested.map(entry => ({
        ...entry, request: schemaSnapshot[entry.path].schema,
        guidance: entry.path === '/sharepoint/get_structured_text'
          ? 'Use files for two or more files. Classify returnContent independently for each file.'
          : entry.path === '/sharepoint/list_items'
            ? 'Use CAML and internal field names. Include custom viewFields and rowLimit covering the complete item count.'
            : entry.description
      })) });
    }
    const injected = this.injectedFailure();
    if (injected) return injected;
    if (name === 'find_site') return envelope({
      success: true, sites: [{ id: c.siteId, title: `${this.scenario.split === 'holdout' ? 'Cedar' : 'Aster'} Research`,
        displayName: `${this.scenario.split === 'holdout' ? 'Cedar' : 'Aster'} Research`, webUrl: c.siteUrl, siteKey: c.siteKey }]
    });
    if (name === 'discover_sharepoint_lists') {
      s.libraryResolved = true;
      return envelope({ success: true, lists: [this.library()] });
    }
    if (name === 'get_list_schema') {
      s.schemaRead = true;
      return envelope({ success: true, ...this.library(), fields: this.fields(), fieldCategories: {
        categoryFields: ['ReviewState'], personFields: []
      } });
    }
    if (name === 'find_items') {
      let items = [...this.documents(), ...c.rows.filter(row => row.folder)
        .map(row => ({ name: row.FileLeafRef, webUrl: row.webUrl, folder: {} }))];
      if (body.pattern && body.pattern !== '*') {
        const expression = new RegExp(`^${body.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`, 'i');
        items = items.filter(item => expression.test(item.name));
      }
      this.verifyEffect(items);
      return envelope({ success: true, items, count: items.length, complete: true, truncated: false });
    }
    if (name === 'get_structured_text' || name === 'semantic_search' || name === 'get_document_pages') {
      if (this.scenario.failure === 'truncated') return envelope({
        success: true, files: [{ fileUrl: c.docs[0].fileUrl, text: 'Partial release overview. Approval section omitted.',
          truncated: true, omittedPages: [2, 3], complete: false }]
      });
      const selectors = name === 'get_structured_text'
        ? (body.files ?? [body]).map(entry => entry.fileUrl ?? entry.serverRelativeUrl)
        : name === 'semantic_search' ? body.spItemUrls : [body.spItemUrl ?? `https://graph.microsoft.com/v1.0/drives/${body.driveId}/items/${body.itemId}`];
      const docs = c.docs.filter(doc => selectors.some(value => [doc.fileUrl, doc.serverRelativeUrl, doc.spItemUrl].includes(value)));
      const files = docs.map(doc => {
        s.discoveredFiles.add(doc.spItemUrl);
        const selectedPages = body.pageNumbers ?? body.pageRanges?.flatMap(range =>
          Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index));
        const text = name === 'get_document_pages'
          ? selectedPages.map(page => page === 2 ? `Release readiness: approval gate ${doc.gate}.`
            : page === 3 ? `Recovery: rollback window ${doc.minutes} minutes.`
              : page === 4 ? `Records: retain evidence ${doc.retention} days.` : 'No text on this page.').join('\n')
          : doc.text;
        if (text.includes(doc.imageReferenceId)) s.imageReferences.add(doc.imageReferenceId);
        return { fileUrl: doc.fileUrl, spItemUrl: doc.spItemUrl, fileName: doc.name,
          text, markdown: text, citation: doc.fileUrl,
          pages: name === 'get_document_pages' ? body.pageNumbers ?? body.pageRanges : undefined,
          truncated: false, complete: true };
      });
      return envelope({ success: true, ...(name === 'semantic_search' ? { passages: files } : { files }) });
    }
    if (name === 'get_table_of_contents') return envelope({
      success: true, spItemUrl: c.docs[0].spItemUrl, truncated: false, headings: [
        { title: 'Release readiness', level: 1, startPage: 2, endPage: 2 },
        { title: 'Recovery', level: 1, startPage: 3, endPage: 3 },
        { title: 'Records', level: 1, startPage: 4, endPage: 4 }
      ]
    });
    if (name === 'get_document_images') return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, imageReferenceIds: body.imageReferenceIds, truncated: false }) },
        { type: 'image', data: pixel, mimeType: 'image/png' }], isError: false
    };
    if (name === 'list_items') {
      let items = c.rows;
      if (/Ready/.test(body.filter ?? '')) items = items.filter(item => item.ReviewState === 'Ready');
      if (this.scenario.browsing === 3 || body.itemType === 'folders') items = [
        { name: 'Reports', serverRelativeUrl: `${c.libraryRelativeUrl}/Reports`, folder: {} },
        { name: 'Archive', serverRelativeUrl: `${c.libraryRelativeUrl}/Reports/Archive`, folder: {} },
        ...items.filter(item => item.folder)
      ];
      else if (this.scenario.family === 'browsing') items = [
        ...this.documents(), { name: 'Reports', serverRelativeUrl: `${c.libraryRelativeUrl}/Reports`, folder: {} }
      ];
      if (!body.countOnly) this.verifyEffect(items, !/<Where\b/i.test(body.filter ?? '') &&
        (!body.folderServerRelativeUrl || body.folderServerRelativeUrl === c.libraryRelativeUrl) &&
        body.itemType !== 'folders');
      return envelope({ success: true, items, itemCount: items.length, totalItemCount: c.rows.length, complete: true, truncated: false });
    }
    if (['create_folder', 'rename_item', 'update_list_items_v2', 'delete_list_item'].includes(name)) {
      this.boundary.authorize(name, body);
      if (!this.scenario.effect) return failure(403, 'No core mutation authorized in this scenario.');
      if (name === 'create_folder') {
        const expected = `Trial-${Number(this.scenario.id.split('-').at(-1))}`;
        if (!body.folders.some(folder => folder.name === expected &&
          ['DARK_BLUE', 'LIGHT_BLUE'].includes(folder.folderColor))) return failure(400, 'Requested folder name/color not supplied.');
        c.rows.push({ ID: 4, FileLeafRef: expected, folder: {}, webUrl: `${c.libraryUrl}/${expected}` });
      } else if (name === 'rename_item') {
        const expected = `Final-${c.docs[0].name}`;
        if (body.libraryRelativePaths[0] !== c.docs[0].name || body.newNames[0] !== expected) return failure(400, 'Wrong rename source/destination.');
        c.rows[0].FileLeafRef = expected;
        c.docs[0].name = expected;
      } else if (name === 'update_list_items_v2') {
        if (!s.schemaRead || body.items.length !== 1 || body.items[0].itemId !== 1 ||
          JSON.stringify(body.items[0].fieldInternalNames) !== '["ReviewState"]' ||
          JSON.stringify(body.items[0].newValues) !== '["Blocked"]') return failure(400, 'Use fresh internal field names and requested values.');
        c.rows[0].ReviewState = 'Blocked';
      } else c.rows = c.rows.filter(row => row.ID !== 1);
      s.effectApplied = true;
      s.expectedEffect = name === 'delete_list_item' ? { ID: 1, deleted: true }
        : structuredClone(c.rows.find(row => row.ID === (name === 'create_folder' ? 4 : 1)));
      return envelope({ success: true, status: 'accepted', verificationRequired: true, items: c.rows });
    }
    if (name === 'getDownloadFileDetails') {
      if (body.documentLibraryId !== c.driveId || !c.docs.some(doc => doc.id === body.fileId)) return failure(400, 'Wrong original-file identity.');
      return envelope({ success: true, transferPrepared: true, downloadCompleted: false,
        instructions: `Download bytes with fetch_blob at /drives/${c.driveId}/items/${body.fileId}/content. Preparation alone does not download the file.` });
    }
    return failure(501, 'This catalog operation has a captured contract but no executable core fixture.');
  }
  legacy(name, args) {
    const c = this.context, s = this.state;
    const injected = this.injectedFailure();
    if (injected) return injected;
    if (name === 'list_agents') return envelope({ agents: [{ id: 'eval-agent', displayName: 'WorkIQ' }] });
    if (['ask', 'retrieve'].includes(name)) {
      if (this.scenario.failure === 'ambiguous') return envelope({ answer: 'Multiple files named Release-plan.docx exist. Which one do you mean?' });
      if (this.scenario.failure === 'truncated') return envelope({ answer: 'The available extraction is partial and truncated. The approval section was omitted.' });
      const answer = this.scenario.family === 'regression'
        ? 'The release-planning meeting decided that security review must precede the release. Source: https://example.invalid/meeting/1'
        : c.docs.slice(0, this.scenario.batch ? 2 : 1).map(doc => `${doc.text}\nSource: ${doc.fileUrl}`).join('\n\n');
      return envelope({ answer, markdown: answer, conversationId: 'eval-conversation' });
    }
    if (name === 'fetch_blob') return envelope({
      base64Content: this.scenario.allowDownload ? bytes : Buffer.from(c.docs[0].text).toString('base64'),
      fileName: this.scenario.allowDownload ? 'original.bin' : c.docs[0].name, contentType: 'application/octet-stream',
      byteFixture: true
    });
    const paths = callPaths(args);
    const results = paths.map(url => {
      const decoded = decodeURIComponent(url);
      if (/\/columns\b/.test(url)) return { value: this.fields() };
      if (/\/lists\/[^/]+\/items/.test(url)) {
        let rows = c.rows;
        if (/Ready/.test(decoded)) rows = rows.filter(row => row.ReviewState === 'Ready');
        return { value: rows.map(row => ({ id: String(row.ID), fields: row })), complete: true };
      }
      if (/\/lists\b/.test(url)) return { value: [this.library()] };
      if (/\/groups\b/.test(url) && !/\/drive/.test(url)) return { value: [{ id: 'eval-group', displayName: `${this.scenario.split === 'holdout' ? 'Cedar' : 'Aster'} Research` }] };
      if (/\/drive(?:\?|$)|\/drive\/root$/.test(url)) return {
        id: c.driveId, webUrl: c.libraryUrl, root: { id: 'root-eval-019', name: 'Documents' },
        sharePointIds: { siteUrl: c.siteUrl }
      };
      if (/\/search\/query/.test(url)) return { value: [{ hitsContainers: [{ hits: this.documents().map(resource => ({ resource })) }] }] };
      if (/\/sites/.test(url) && !/\/drives/.test(url)) {
        const site = { id: c.siteId, displayName: `${this.scenario.split === 'holdout' ? 'Cedar' : 'Aster'} Research`, webUrl: c.siteUrl };
        return /search=/.test(url) ? { value: [site] } : site;
      }
      if (/Personal-notes|\/me\/drive\/root\/search/.test(decoded) && this.scenario.control === 5) return {
        value: [{ id: 'personal-file', name: 'Personal-notes.txt', size: 1024, lastModifiedDateTime: '2026-01-15T12:00:00Z', parentReference: { driveId: 'personal-drive' } }]
      };
      if (/\/drives|\/drive|\/search/.test(url)) return { value: this.documents() };
      if (/\/messages/.test(url)) return { value: [{
        id: 'mail-eval-1=', subject: 'Review requested', hasAttachments: true, bodyPreview: 'Please review.',
        attachments: [{ id: 'attachment-eval-1=', name: 'original.bin', '@odata.type': '#microsoft.graph.fileAttachment', isInline: false, contentType: 'application/octet-stream' }]
      }] };
      if (/calendarView|\/events/.test(url)) {
        const start = new URL(url, 'https://graph.microsoft.com').searchParams.get('startDateTime');
        const day = dateInZone(start ?? this.clock.now, this.clock.timeZone, start ? 0 : 1);
        return { value: [{ id: 'event-eval-1', subject: 'Evaluation sync',
          start: { dateTime: `${day}T09:00:00`, timeZone: this.clock.timeZone },
          end: { dateTime: `${day}T09:30:00`, timeZone: this.clock.timeZone } }] };
      }
      if (/\/chats/.test(url)) return { value: [{ id: 'chat-eval-1', topic: 'Evaluation chat', chatType: 'group', members: [{ displayName: 'Taylor Example' }] }] };
      if (/\/manager/.test(url)) return { id: 'manager-eval-1', displayName: 'Morgan Example', jobTitle: 'Engineering Manager' };
      if (/\/planner.*\/plans/.test(url)) return { value: [{ id: 'plan-eval-1', title: 'Evaluation plan' }] };
      if (/\/planner.*\/tasks/.test(url)) return { value: [{ id: 'task-eval-1', title: 'Prepare review', percentComplete: 50, dueDateTime: this.clock.now }] };
      return { id: 'person-eval-1', displayName: 'Taylor Example', mail: 'taylor@example.invalid' };
    });
    if (this.scenario.effect && ['create_entity', 'update_entity', 'delete_entity', 'do_action'].includes(name)) {
      s.effectApplied = true;
      return envelope({ success: true, status: 'accepted', verificationRequired: true });
    }
    if (this.scenario.effect && s.effectApplied) results.forEach((result, index) => {
      this.verifyEffect(result.value ?? [result], result.complete === true &&
        !decodeURIComponent(paths[index]).includes('$filter='));
    });
    return envelope(results.map((data, index) => ({ path: paths[index], statusCode: 200, data })));
  }
}

export function serve(scenarioFile, logFile) {
  const scenario = readJson(scenarioFile);
  const server = new FixtureServer(scenario, record => fs.appendFileSync(logFile, `${JSON.stringify(record)}\n`));
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  let queue = Promise.resolve();
  input.on('line', line => {
    queue = queue.then(async () => {
      let request;
      try {
        request = JSON.parse(line);
        if (request.id === undefined) return;
        let result;
        if (request.method === 'initialize') result = {
          protocolVersion: request.params?.protocolVersion ?? '2024-11-05',
          capabilities: { tools: {} }, serverInfo: { name: 'workiq-evaluation', version: '1.0.0' }
        };
        else if (request.method === 'ping') result = {};
        else if (request.method === 'tools/list') result = { tools: toolContract };
        else if (request.method === 'tools/call') result = await server.call(request.params.name, request.params.arguments ?? {});
        else {
          process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } })}\n`);
          return;
        }
        process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`);
      } catch (error) {
        if (request?.id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: error.message } })}\n`);
        else process.stderr.write(`${error.message}\n`);
      }
    });
  });
  return input;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error('Usage: node mock.mjs SCENARIO_JSON PRIVATE_CALL_LOG');
  serve(process.argv[2], process.argv[3]);
}
