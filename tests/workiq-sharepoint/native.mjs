import { catalog, schemaSnapshot } from './matrix.mjs';
import { jsonBody } from './common.mjs';

export const requestSchemas = Object.fromEntries(Object.entries(schemaSnapshot)
  .map(([url, entry]) => [url.slice('/sharepoint/'.length), entry.schema]));

export function validateSchema(value, schema, at = '$') {
  const errors = [];
  if (!schema || schema === true) return errors;
  if (schema === false) return [`${at}: forbidden`];
  if (schema.anyOf || schema.oneOf) {
    const options = schema.anyOf ?? schema.oneOf;
    const passed = options.filter(option => !validateSchema(value, option, at).length).length;
    if (!passed || (schema.oneOf && passed !== 1)) return [`${at}: no unique matching schema`];
  }
  if (value === null && (schema.nullable || schema.type === 'null' || schema.type?.includes?.('null'))) return errors;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const matches = type => type === undefined || (type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type);
  if (!types.some(matches)) return [`${at}: expected ${types.join('|')}`];
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: unsupported value`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: too many items`);
    if (schema.items) value.forEach((entry, index) => errors.push(...validateSchema(entry, schema.items, `${at}[${index}]`)));
  } else if (value && typeof value === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${at}.${key}: required`);
    for (const [key, entry] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validateSchema(entry, schema.properties[key], `${at}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${at}.${key}: unexpected`);
    }
  }
  return errors;
}

export function validateNative(name, args, scenario, state, schemas = requestSchemas) {
  const entry = catalog.find(item => item.path === `/sharepoint/${name}`);
  if (!entry || !schemas[name]) return { errors: ['Request contract not captured for this operation.'], schemaKnown: false };
  let body;
  try { body = args.jsonBody == null ? {} : jsonBody(args.jsonBody); } catch (error) { return { errors: [error.message], schemaKnown: true }; }
  const errors = validateSchema(body, schemas[name]);
  const c = scenario.context;
  if (body.siteKey !== undefined && (body.siteKey !== c.siteKey || !state.siteResolved)) errors.push('siteKey was not resolved for this site.');
  if (body.listId !== undefined && (body.listId !== c.listId || !state.libraryResolved)) errors.push('listId was not resolved for this library.');
  if (body.documentLibraryId !== undefined && body.documentLibraryId !== c.driveId) errors.push('Wrong document-library drive identity.');
  if (body.fileId !== undefined && !c.docs.some(doc => doc.id === body.fileId)) errors.push('Wrong file identity.');
  for (const key of ['listFullUrl', 'listUrl', 'docLibUrl']) {
    if (body[key] !== undefined && ![c.libraryUrl, c.libraryRelativeUrl].includes(body[key])) errors.push(`Wrong ${key} scope.`);
  }
  if (name === 'get_site_key' && body.siteUrl !== c.siteUrl &&
    !(scenario.browsing === 0 && body.siteUrl === new URL(c.siteUrl).origin)) errors.push('Wrong site URL.');
  const knownDoc = value => c.docs.some(doc => [doc.fileUrl, doc.serverRelativeUrl, doc.spItemUrl].includes(value));
  if (name === 'semantic_search' && (!body.searchTerm?.trim() || !body.spItemUrls?.every(url =>
    state.discoveredFiles.has(url) && c.docs.some(doc => doc.spItemUrl === url)))) errors.push('Passage search requires discovered file identities and a nonempty question.');
  if (name === 'get_structured_text') {
    const files = body.files ?? [body];
    if (!files.length || files.some(item => Boolean(item.fileUrl) === Boolean(item.serverRelativeUrl))) errors.push('Each file needs exactly one file URL or server-relative path.');
    if (files.some(item => !knownDoc(item.fileUrl ?? item.serverRelativeUrl))) errors.push('Unknown file target.');
    if (body.files && (body.fileUrl || body.serverRelativeUrl)) errors.push('Do not mix single-file and batch selectors.');
    if (scenario.batch && (!body.files || body.files.length !== c.docs.length ||
      !c.docs.every(doc => files.some(item => [doc.fileUrl, doc.serverRelativeUrl].includes(item.fileUrl ?? item.serverRelativeUrl))))) errors.push('All requested files must be read in one batch.');
    if (files.some(item => /\.(?:md|txt)$/i.test(item.fileUrl ?? item.serverRelativeUrl ?? '') && item.returnContent !== true)) errors.push('Instruction text needs returnContent:true.');
  }
  if (['get_document_pages', 'get_table_of_contents', 'get_document_images'].includes(name)) {
    const doc = c.docs.find(item => item.spItemUrl === body.spItemUrl ||
      (item.driveId === body.driveId && item.id === body.itemId));
    if (!doc || !state.discoveredFiles.has(doc.spItemUrl)) errors.push('Document identity was not obtained from a result.');
    if (name === 'get_document_pages') {
      const pages = [...(body.pageNumbers ?? []), ...(body.pageRanges ?? []).flatMap(range =>
        range.end >= range.start && range.end - range.start <= 25 ? Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index) : Array(26).fill(0))];
      if (!pages.length || pages.length > 25 || pages.some(page => !Number.isInteger(page) || page < 1)) errors.push('Select 1-25 valid pages.');
      const requestedPage = scenario.portion === 1 ? 2 : scenario.portion === 3 ? 3 : null;
      if (requestedPage && (new Set(pages).size !== 1 || pages[0] !== requestedPage)) errors.push('Read only the requested page/section.');
    }
    if (name === 'get_document_images' && (!body.imageReferenceIds?.length || body.imageReferenceIds.length > 20 ||
      body.imageReferenceIds.some(id => !state.imageReferences.has(id) || id !== doc?.imageReferenceId))) errors.push('Use at most 20 exact image labels from this document text.');
  }
  if (name === 'list_items') {
    if (!Number.isInteger(body.rowLimit) || body.rowLimit < c.rows.length) errors.push('Enumeration rowLimit would silently truncate.');
    if (body.filter && !/^\s*<(?:View|Query)\b/.test(body.filter)) errors.push('Filter must be CAML, not OData.');
    if (body.filter?.includes('Name="Status"') || body.filter?.includes("Name='Status'")) errors.push('Use the internal field name ReviewState.');
    if (scenario.family === 'metadata' && scenario.metadata > 0) {
      if (!state.schemaRead) errors.push('Read authoritative field schema first.');
      const field = scenario.metadata === 2 ? 'Budget_x0020_EUR' : 'ReviewState';
      if (!body.viewFields?.includes(field)) errors.push('Select the requested custom column by internal name.');
      if (scenario.metadata >= 2 && body.filter && /<Where>/i.test(body.filter)) errors.push('Do not filter away rows needed by the complete aggregation.');
    }
    if (scenario.browsing === 3 && (!body.recursive || body.itemType !== 'folders')) errors.push('Complete folder hierarchy needs recursive folders.');
  }
  return { errors, body, schemaKnown: true, operation: entry.operations[0] };
}
