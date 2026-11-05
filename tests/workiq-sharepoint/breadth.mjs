import { catalog, getScenario, schemaSnapshot } from './matrix.mjs';
import { digest } from './common.mjs';

const intents = {
  add_comment: 'Add the comment "Keep the recovery owner explicit" to the release specification.',
  add_shortcut: 'Create a shortcut to the release specification in the Reports folder.',
  apply_column_formatting_v2: 'Format the Status column with a green background for Ready and red for Blocked.',
  apply_knowledge_base_instructions: 'Apply the knowledge-base instructions from the supplied appendix Markdown file.',
  apply_view_formatting_v2: 'Apply a compact row layout to the existing All Documents view.',
  archive_items: 'Archive the run-owned release specification and report the operation receipt.',
  cancel_esign_agreement: 'Cancel the pending signature agreement for the release specification.',
  check_permissions: 'Check my effective permissions on the release specification.',
  configure_approvals_v2: 'Enable modern approvals on this run-owned document library.',
  configure_quick_step_columns: 'Show the existing quick steps as columns in the run-owned library.',
  copy_items: 'Copy the release specification into Reports, keeping both originals and failing on a name conflict.',
  create_approval_request_v2: 'Request approval of the release specification with the title Release review.',
  create_doc_collection_form: 'Create a document-collection form for this run-owned library.',
  create_document_form: 'Create an intake form that generates documents in this run-owned library.',
  create_folder: 'Create a blue folder named Trial in the run-owned document library.',
  create_form: 'Create a list form titled Release intake using the existing Status and Budget EUR fields.',
  create_list_items_v2: 'Create an item named Trial with Status Ready in this run-owned list.',
  create_or_update_list: 'Create a run-owned generic list called Trial with a Status choice column containing Ready and Blocked.',
  create_or_update_quick_step: 'Create a quick step called Mark ready that sets the existing Status column to Ready.',
  create_site: 'Create a private team site named Trial sandbox in this simulated tenant.',
  delete_field: 'Delete the run-owned Experiment Note column from this library.',
  delete_items: 'Delete the run-owned release specification file.',
  delete_list: 'Delete this run-owned disposable Documents library.',
  delete_list_item: 'Delete list item 1 from this run-owned disposable library.',
  delete_quickstep: 'Delete the existing run-owned Mark ready quick step.',
  delete_view: 'Delete the existing run-owned Trial view.',
  discover_sharepoint_lists: 'List the available lists and document libraries, excluding hidden ones.',
  find_items: 'Find the release-readiness files and return their names and links.',
  find_site: 'Find the accessible team site named Aster Research and return its exact name and address.',
  getDownloadFileDetails: 'Prepare an original-file download for the release specification; do not transfer the bytes yet.',
  getUploadFileDetails: 'Prepare an upload session for a new Trial.txt file of 128 bytes; do not upload any content.',
  get_approval_enabled_v2: 'Tell me whether modern approvals are enabled for this library.',
  get_approval_request: 'Show the current approval request and its status for the release specification.',
  get_comments: 'Read the comments on the release specification.',
  get_content_types: 'List the document content types available for this site.',
  get_datetime_info: 'Show the site current date, time zone, and date-format information.',
  get_document_images: 'Retrieve the embedded diagram referenced by the release specification, not the original file.',
  get_document_pages: 'Read only page 2 of the release specification.',
  get_esign_agreement_details: 'Show the details and recipient status of the pending signature agreement.',
  get_forms: 'List the forms belonging to this document library.',
  get_list_schema: 'Show the column display names, internal names, and types in this library.',
  get_lookup_info: 'Find the selectable lookup values matching Project for the Project lookup column.',
  get_onedrive_details: 'From this SharePoint context, show my connected OneDrive location details.',
  get_onedrive_favorites: 'From this SharePoint context, show my favorite files and folders.',
  get_page_thumbnails: 'Show the thumbnail for page 2 of the release specification.',
  get_quicksteps: 'List the quick steps configured on this library.',
  get_recent_items: 'Show the recently used files in this SharePoint context.',
  get_recycle_bin_contents: 'Show the deleted files and folders available in the site recycle bin.',
  get_restoreable_lists: 'List the deleted lists that could be restored at this site.',
  get_shared_items: 'Show items shared with me in this SharePoint context.',
  get_site_key: 'Return the opaque site-context key for the supplied site URL.',
  get_structured_text: 'Read the release specification and summarize its approval and recovery instructions.',
  get_table_of_contents: 'Show the outline and page ranges of the release specification.',
  get_taxonomy: 'List the term groups in the site taxonomy store.',
  get_template_fields: 'Show the fields supplied by the template named Issue tracker.',
  get_user_info: 'Show the current user information in this SharePoint site context.',
  get_view_definition: 'Show the fields, filter, and sort definition of the All Documents view.',
  get_views_of_list: 'List the public and personal views of this library.',
  knowledge_base_operations: 'List the knowledge bases available at this site.',
  learn: 'Show the server-provided usage guidance for native document search and text extraction.',
  list_esign_requests: 'List signature requests where I am the sender.',
  list_item_versions: 'Show the version history of list item 1.',
  list_items: 'List every immediate file and folder in this library.',
  load_skill: 'Load the server-provided workflow guidance for managing SharePoint documents.',
  move_items: 'Move the release specification into Reports, failing rather than overwriting a conflict.',
  rename_item: 'Rename the run-owned release specification to Final.docx.',
  resolve_approval_request: 'Approve the pending approval request for list item 1, with the response Ready.',
  restore_item_version: 'Restore version 1.0 of the run-owned list item 1.',
  restore_list: 'Restore the deleted Trial list from the site recycle bin.',
  restore_recycle_bin_items: 'Restore the deleted Archived plan.docx file from the site recycle bin.',
  semantic_search: 'According to the release specification, what approval gate prevents rollout before security checks pass?',
  send_invite_for_list: 'Invite reviewer@example.invalid to the run-owned library with read access.',
  set_folder_color: 'Set the run-owned Reports folder color to dark blue.',
  set_sensitivity_label_on_file: 'Apply the available Internal sensitivity label to the run-owned release specification, with justification Trial classification.',
  set_site_homepage: 'Set the run-owned site homepage to its supplied Overview.aspx page.',
  share_file: 'Share the run-owned release specification with reviewer@example.invalid as a reader.',
  unshare_file: 'Remove reviewer@example.invalid access to the run-owned release specification.',
  update_batch_list_items: 'Set Status to Blocked on every run-owned item currently marked Ready.',
  update_list_items_v2: 'Change the Status column of run-owned item 1 to Blocked.',
  update_onedrive_favorite: 'Add the SharePoint release specification to my favorites.'
};

const helpers = new Set(['get_site_key', 'learn', 'get_datetime_info', 'load_skill']);
const groups = name => /approval|esign|form/.test(name) ? 'approvals-and-forms'
  : /comment|shar|permission|invite|sensitivity/.test(name) ? 'collaboration'
    : /recycle|restore|archive|version/.test(name) ? 'lifecycle'
      : /structured|semantic|document|contents|thumbnail/.test(name) ? 'document-processing'
        : /field|column|view|list|lookup|quickstep|quick_step/.test(name) ? 'lists-and-schema'
          : /knowledge|taxonomy|template|homepage|site/.test(name) ? 'site-and-knowledge'
            : helpers.has(name) ? 'guidance' : 'files-and-navigation';

export const breadthInventory = catalog.map(entry => {
  const name = entry.path.slice('/sharepoint/'.length);
  if (!intents[name]) throw new Error(`Missing catalog intent: ${name}`);
  return {
    id: `breadth-${name}`, path: entry.path, operation: entry.operations[0],
    family: groups(name), helper: helpers.has(name),
    effect: name === 'getDownloadFileDetails' ? 'original-transfer-preparation'
      : name === 'getUploadFileDetails' ? 'upload-preparation'
        : entry.operations[0] === 'action' || name === 'apply_knowledge_base_instructions' ? 'mutation' : 'read',
    required: schemaSnapshot[entry.path].schema.required ?? [],
    intent: intents[name], layer: 'model-mock',
    completionEvidence: 'Routing/schema/scope probe only; not a full service-effect or live-completion test.'
  };
});
if (Object.keys(intents).length !== catalog.length) throw new Error('Catalog intent inventory has extra or missing paths.');
export const breadthHash = digest(breadthInventory);

export function getBreadthScenario(id) {
  const entry = breadthInventory.find(row => row.id === id);
  if (!entry) throw new Error(`Unknown catalog probe: ${id}`);
  const scenario = getScenario('reading-01');
  Object.assign(scenario, {
    id, family: 'catalog', catalogFamily: entry.family, split: 'breadth',
    routingOnly: true, catalogPath: entry.path,
    nativeEligible: !entry.helper, acceptable: [entry.path], expected: [],
    botdoc: false, needsCitation: false,
    allowDownload: entry.effect === 'original-transfer-preparation'
  });
  const c = scenario.context;
  scenario.prompt = `At ${c.siteUrl}, use the Documents library unless the request is site-wide. ` +
    `${entry.intent} The release specification is ${c.docs[0].fileUrl}; ` +
    `the appendix is ${c.docs[1].fileUrl}; the site page is ${c.siteUrl}/SitePages/Overview.aspx. ` +
    'These are disposable evaluation resources. Perform only the requested operation and report the actual result.';
  return scenario;
}

export function catalogProbeResponse(name, context) {
  const c = context;
  const viewId = 'c5dd7eab-f87d-4c44-8204-e385a448ca01';
  const recycleId = '217b5fd1-e0f2-4c21-95d2-8b9b41cbd014';
  const approval = { id: 'approval-trial-017', approvalId: 'approval-trial-017', title: 'Release review', status: 'Pending', itemId: 1 };
  const agreement = { id: 'agreement-trial-019', agreementId: 'agreement-trial-019', status: 'Pending', title: 'Release signature' };
  const view = { id: viewId, viewId, title: 'All Documents', name: 'All Documents', fields: ['FileLeafRef', 'ReviewState'], query: '<Query />' };
  const data = {
    get_comments: { comments: [{ id: 'comment-trial-1', text: 'Keep the recovery owner explicit.' }] },
    check_permissions: { permissions: ['Read', 'Edit'], canRead: true, canEdit: true },
    get_approval_enabled_v2: { enabled: true },
    get_approval_request: { request: approval },
    get_esign_agreement_details: { agreement },
    list_esign_requests: { agreements: [agreement] },
    get_content_types: { contentTypes: [{ id: '0x0101', name: 'Document' }] },
    get_datetime_info: { now: '2026-01-15T12:00:00Z', timeZone: 'UTC', dateFormat: 'yyyy-MM-dd' },
    get_forms: { forms: [{ id: 'form-trial-1', title: 'Release intake', url: `${c.libraryUrl}/Forms/Release.aspx` }] },
    get_lookup_info: { values: [{ id: 17, value: 'Project Aster' }] },
    get_onedrive_details: { id: c.driveId, webUrl: c.libraryUrl },
    get_onedrive_favorites: { items: c.docs },
    get_page_thumbnails: { thumbnails: [{ pageNumber: 2, description: 'Simulated thumbnail fixture; no rendered-document validation.' }] },
    get_quicksteps: { quickSteps: [{ id: 'quickstep-trial-1', quickstepId: 'quickstep-trial-1', title: 'Mark ready' }] },
    get_recent_items: { items: c.docs },
    get_recycle_bin_contents: { items: [{ id: recycleId, title: 'Archived plan.docx', name: 'Archived plan.docx' }] },
    get_restoreable_lists: { lists: [{ id: recycleId, title: 'Trial', listName: 'Trial' }] },
    get_shared_items: { items: c.docs },
    get_taxonomy: { groups: [{ id: 'taxonomy-trial-1', name: 'Release governance' }] },
    get_template_fields: { fields: [{ internalName: 'IssueStatus', title: 'Issue status', type: 'Choice' }] },
    get_user_info: { id: 7, displayName: 'Taylor Example', email: 'taylor@example.invalid' },
    get_view_definition: { view },
    get_views_of_list: { views: [view, { ...view, id: 'view-trial-2', viewId: 'view-trial-2', title: 'Trial', name: 'Trial' }] },
    knowledge_base_operations: { knowledgeBases: [{ id: 'knowledge-trial-1', title: 'Release knowledge' }] },
    list_item_versions: { items: [{ itemId: 1, versions: [{ versionId: 512, versionLabel: '1.0' }] }] },
    load_skill: { skill: 'SharePoint document workflow guidance', instructions: 'Resolve scope, inspect schemas, and operate on explicitly requested resources only.' },
    apply_knowledge_base_instructions: { applied: true, path: c.docs[1].fileUrl }
  }[name];
  return {
    success: true, simulationOnly: true, serviceEffectsVerified: false,
    ...(data ?? { status: 'accepted', receipt: `simulated-${name}`, message: 'Mock-only operation accepted. No live service mutation or completion was performed.' })
  };
}
