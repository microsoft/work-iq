import { readJson, digest } from './common.mjs';
import path from 'node:path';

export const fixtureRevision = 'sharepoint-routing-1';
export const catalog = readJson(path.join(import.meta.dirname, 'native-catalog.json')).paths;
export const toolContract = readJson(path.join(import.meta.dirname, 'tool-contract.json')).tools;
export const schemaSnapshot = readJson(path.join(import.meta.dirname, 'native-schemas.json')).paths;
export const families = {
  discovery: 18, semantic: 24, reading: 24, portions: 12, multiple: 12,
  metadata: 12, browsing: 12, crud: 12, failures: 12, downloads: 6, regression: 24
};
const formats = ['docx', 'pdf', 'pptx', 'xlsx', 'md', 'aspx'];
const native = name => `/sharepoint/${name}`;
const failureModes = ['denied', 'missing', 'ambiguous', 'truncated', 'unsupported', 'throttled'];
const holdout = (family, index) => family === 'failures'
  ? [1, 3, 7, 11].includes(index) : index % 3 === 2;

function document(siteUrl, prefix, index, extension, offset = 0) {
  const name = `${prefix}-${String(index + 1).padStart(2, '0')}${offset ? '-appendix' : ''}.${extension}`;
  const itemId = `01DOC${prefix.toUpperCase()}${index + 1}${offset ? 'B' : 'A'}`;
  const gate = `${prefix.toUpperCase()}-${410 + index + offset}`;
  const minutes = 21 + index + offset;
  const retention = 60 + index + offset;
  return {
    name, id: itemId, itemId, driveId: 'b!EVAL_DRIVE-017', listItemId: offset + 1,
    fileUrl: `${siteUrl}/Documents/${name}`, webUrl: `${siteUrl}/Documents/${name}`,
    serverRelativeUrl: `${new URL(siteUrl).pathname}/Documents/${name}`,
    spItemUrl: `https://graph.microsoft.com/v1.0/drives/b!EVAL_DRIVE-017/items/${itemId}`,
    gate, minutes, retention, imageReferenceId: `image_Eval/${index + 1}+${offset}==`,
    text: `# Release readiness\nThe approval gate code is ${gate}. Rollout cannot begin until the security review passes.\n# Recovery\nThe rollback window is ${minutes} minutes.\n# Records\nRetain evidence for ${retention} days.\nEmbedded diagram: image_Eval/${index + 1}+${offset}==. Caption: security review precedes rollout.`,
    file: { mimeType: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream' },
    parentReference: { driveId: 'b!EVAL_DRIVE-017', id: 'root-eval-019' }
  };
}

function makeCase(family, index) {
  const split = holdout(family, index) ? 'holdout' : 'development';
  const prefix = split === 'holdout' ? 'Cedar' : 'Aster';
  const siteUrl = `https://contoso.sharepoint.com/teams/${prefix.toLowerCase()}-${family}`;
  const extension = formats[Math.floor(index / 3) % formats.length];
  const docs = [document(siteUrl, prefix, index, extension), document(siteUrl, prefix, index, 'md', 7)];
  const main = docs[0];
  const context = {
    siteUrl, siteKey: `eval-key:${family}:${index + 1}:do-not-normalize=`,
    siteId: 'contoso.sharepoint.com,11111111-2222-4333-8444-555555555555,66666666-7777-4888-8999-aaaaaaaaaaaa',
    listId: '8b90bd37-e122-4e16-aab7-e885dce17300',
    libraryUrl: `${siteUrl}/Documents`, libraryRelativeUrl: `${new URL(siteUrl).pathname}/Documents`,
    listTitle: 'Documents', driveId: main.driveId, docs,
    rows: [
      { ID: 1, FileLeafRef: main.name, ReviewState: 'Ready', Budget_x0020_EUR: 10 },
      { ID: 2, FileLeafRef: docs[1].name, ReviewState: 'Blocked', Budget_x0020_EUR: 20 },
      { ID: 3, FileLeafRef: 'Checklist.txt', ReviewState: 'Ready', Budget_x0020_EUR: 30 }
    ]
  };
  const scenario = {
    id: `${family}-${String(index + 1).padStart(2, '0')}`, family, split,
    layer: 'model-mock', context, prompt: '', acceptable: [], expected: [],
    botdoc: false, nativeEligible: !['regression', 'downloads'].includes(family),
    allowDownload: family === 'downloads', needsCitation: false
  };
  const choose = values => values[index % values.length];
  const source = index % 2 ? `the file ${main.name} in ${siteUrl}` : main.fileUrl;
  switch (family) {
    case 'discovery':
      scenario.prompt = choose([
        `Find ${main.name} in the Documents library at ${siteUrl} and return its link.`,
        `Locate the release-readiness documents in the Documents library at ${siteUrl}. I only need their names and links.`,
        `Which files in Documents at ${siteUrl} discuss passing security checks before rollout? Give links, not a document summary.`
      ]);
      scenario.acceptable = [native('find_items')];
      scenario.expected = [main.name];
      scenario.needsCitation = true;
      break;
    case 'semantic':
      scenario.prompt = choose([
        `In ${source}, what approval gate code prevents release before the security checks are complete? Cite the document.`,
        `According to ${source}, how much time is allowed to undo a deployment? Give the duration and cite the source.`,
        `What does ${source} require for keeping the evidence after launch? State the retention period and cite it.`
      ]);
      scenario.acceptable = [native('semantic_search'), native('get_structured_text')];
      scenario.preferred = [native('semantic_search')];
      scenario.expected = [choose([main.gate, `${main.minutes}\\s*(?:minutes?|min\\b)`, `${main.retention}\\s*days?`])];
      scenario.botdoc = true;
      scenario.needsCitation = true;
      break;
    case 'reading':
      scenario.prompt = choose([
        `Summarize ${source}. Include its exact approval gate code and rollback duration, with a source link.`,
        `Read all of ${source} and explain its release-readiness and recovery instructions. Include the gate code and time window.`,
        `Give me a concise overview of ${source}, including its approval code and allowed rollback time, citing the file.`
      ]);
      scenario.acceptable = [native('get_structured_text')];
      scenario.expected = [main.gate, `${main.minutes}\\s*(?:minutes?|min\\b)`];
      scenario.botdoc = true;
      scenario.needsCitation = true;
      break;
    case 'portions': {
      const portion = Math.floor(index / 3) % 4;
      scenario.portion = portion;
      scenario.prompt = [
        `Show the section outline of ${source}, including the page ranges.`,
        `Read only page 2 of ${source} and report its approval gate code with a citation.`,
        `Retrieve the embedded diagram referenced by ${source}. Include its exact image label, not the original file.`,
        `What does the Recovery section of ${source} say about rollback time? Read that section rather than the whole document.`
      ][portion];
      scenario.acceptable = [native(['get_table_of_contents', 'get_document_pages', 'get_document_images', 'get_document_pages'][portion])];
      scenario.expected = [portion === 0 ? 'Release readiness' : portion === 1 ? main.gate
        : portion === 2 ? main.imageReferenceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : `${main.minutes}\\s*(?:minutes?|min\\b)`];
      scenario.botdoc = true;
      break;
    }
    case 'multiple':
      scenario.prompt = choose([
        `Compare ${main.fileUrl} and ${docs[1].fileUrl}. Give each file's approval gate code and say how the rollback windows differ.`,
        `Read these two files together: ${main.fileUrl} and ${docs[1].fileUrl}. Summarize the difference in approval codes and recovery timing.`,
        `Produce a side-by-side summary of ${main.fileUrl} versus ${docs[1].fileUrl}, including both exact approval codes and rollback durations.`
      ]);
      scenario.acceptable = [native('get_structured_text')];
      scenario.expected = [main.gate, docs[1].gate, String(main.minutes), String(docs[1].minutes)];
      scenario.botdoc = true;
      scenario.batch = true;
      break;
    case 'metadata': {
      const operation = Math.floor(index / 3) % 4;
      scenario.metadata = operation;
      scenario.prompt = [
        `In Documents at ${siteUrl}, what are the display names and internal names of the custom Status and Budget EUR columns?`,
        `List every file marked Ready in the Status library column in Documents at ${siteUrl}, not status mentioned inside documents.`,
        `Sum the Budget EUR library column across every item in Documents at ${siteUrl}. State whether the enumeration is complete.`,
        `Count all documents in Documents at ${siteUrl} by their Status library column. Keep missing and blank values separate if present.`
      ][operation];
      scenario.acceptable = [native(operation === 0 ? 'get_list_schema' : 'list_items')];
      scenario.expected = operation === 0 ? ['ReviewState', 'Budget_x0020_EUR'] : operation === 1
        ? [main.name, 'Checklist.txt'] : operation === 2 ? ['60', 'complete|all\\s+3|three\\s+items'] : ['Ready[^\\n]*2|2[^\\n]*Ready', 'Blocked[^\\n]*1|1[^\\n]*Blocked'];
      break;
    }
    case 'browsing': {
      const operation = Math.floor(index / 3) % 4;
      scenario.browsing = operation;
      scenario.prompt = [
        `Find the SharePoint team site called ${prefix} Research in tenant https://contoso.sharepoint.com and return its exact name and web address.`,
        `What lists and document libraries are available at ${siteUrl}?`,
        `Show every immediate file and folder in Documents at ${siteUrl}.`,
        `Show the complete nested folder hierarchy in Documents at ${siteUrl}, not only matching filenames.`
      ][operation];
      scenario.acceptable = [native(['find_site', 'discover_sharepoint_lists', 'list_items', 'list_items'][operation])];
      scenario.expected = [[`${prefix} Research`], ['Documents'], [main.name, 'Reports'], ['Reports', 'Archive']][operation];
      break;
    }
    case 'crud': {
      const operation = Math.floor(index / 3) % 4;
      scenario.crud = operation;
      scenario.prompt = [
        `Create a blue folder called Trial-${index + 1} in the disposable evaluation library Documents at ${siteUrl}, then verify it exists.`,
        `In the run-owned evaluation library Documents at ${siteUrl}, rename ${main.name} to Final-${main.name}, then verify the new name.`,
        `In the run-owned evaluation library Documents at ${siteUrl}, change item 1's Status column to Blocked and verify the stored value.`,
        `Delete item 1 from the run-owned evaluation library Documents at ${siteUrl} and verify it is no longer present.`
      ][operation];
      scenario.acceptable = [native(['create_folder', 'rename_item', 'update_list_items_v2', 'delete_list_item'][operation])];
      scenario.expected = [[`Trial-${index + 1}`], [`Final-${main.name}`], ['Blocked'], ['delet|remov|no longer|not present']][operation];
      scenario.effect = ['create-folder', 'rename', 'update-item', 'delete-item'][operation];
      break;
    }
    case 'failures': {
      scenario.failure = failureModes[Math.floor(index / 2)];
      scenario.prompt = scenario.failure === 'ambiguous'
        ? `Summarize the exact file Release-plan.docx in Documents at ${siteUrl}. If more than one file has that name, do not choose arbitrarily.`
        : `Summarize ${main.fileUrl}, including the approval code. Tell me clearly if access, extraction, or service availability prevents a reliable answer.`;
      scenario.acceptable = [native(scenario.failure === 'ambiguous' ? 'find_items' : 'get_structured_text')];
      scenario.expected = {
        denied: ['denied|unauthori[sz]ed|permission|401|403'],
        missing: ['not found|does not exist|missing|404'],
        ambiguous: ['multiple|more than one|which|ambigu'],
        truncated: ['truncat|partial|incomplete|omitted'],
        unsupported: ['not supported|unsupported|unavailable|capability'],
        throttled: ['throttl|429|rate.limit|temporarily|retry']
      }[scenario.failure];
      break;
    }
    case 'downloads':
      scenario.prompt = choose([
        `Download the original file ${main.fileUrl}. Return its actual bytes or a saved-file location, not a summary.`,
        `Get the raw original of ${main.name} from Documents at ${siteUrl}, and include the actual download result.`,
        `I need the original binary file at ${main.fileUrl}, not extracted text. Download it.`
      ]);
      scenario.acceptable = [native('getDownloadFileDetails')];
      scenario.expected = ['RXZhbHVhdGlvbiBvcmlnaW5hbCBieXRlcy4=|original\\.bin'];
      break;
    case 'regression': {
      const type = Math.floor(index / 3);
      scenario.control = type;
      scenario.prompt = [
        'List my unread inbox email subjects, using at most ten messages.',
        'What meetings are on my calendar tomorrow? Include their start times.',
        'List my Teams chats and their participants.',
        'Who is my manager? Give their display name and job title.',
        'List my Planner tasks due this week, including completion status.',
        'What is the size and last-modified date of my OneDrive file Personal-notes.txt?',
        'Find the first inbox message with a file attachment and download that attachment. Return its base64 bytes or saved path.',
        'What was decided in the latest release-planning meeting? Summarize with a source.'
      ][type];
      scenario.expected = [
        ['Review requested'], ['Evaluation sync', '09:00'], ['Evaluation chat', 'Taylor Example'],
        ['Morgan Example', 'Engineering Manager'], ['Prepare review', '50'],
        ['1024', '2026-01-15'], ['RXZhbHVhdGlvbiBvcmlnaW5hbCBieXRlcy4=|original\\.bin'],
        ['security review', 'release']
      ][type];
      scenario.allowDownload = type === 6;
      break;
    }
  }
  return scenario;
}

export const scenarios = Object.entries(families).flatMap(([family, count]) =>
  Array.from({ length: count }, (_, index) => makeCase(family, index)));
export const matrixHash = digest({ fixtureRevision, scenarios, catalog, toolContract, schemaSnapshot });

export function screeningCases() {
  const allocation = { discovery: 4, semantic: 6, reading: 6, portions: 2, multiple: 2,
    metadata: 2, browsing: 2, crud: 2, failures: 2, downloads: 1, regression: 3 };
  return Object.entries(allocation).flatMap(([family, count]) => {
    const matches = scenarios.filter(scenario => scenario.family === family && scenario.split === 'development');
    return Array.from({ length: count }, (_, index) => matches[Math.floor(index * matches.length / count)]);
  });
}

export function getScenario(id) {
  const scenario = scenarios.find(entry => entry.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return structuredClone(scenario);
}
