// Public synthetic contract: G = grounding/ownership; R = workflow reliability.
// IDs are stable requirements, not private benchmark or run identifiers.
export const requirements = {
  G01: 'Ordinary questions, summaries, comparisons and implementation context retrieve first.',
  G02: 'Explicit default Copilot delegation calls ask directly.',
  G03: 'Unknown named agents use live list_agents and exact returned identity.',
  G04: 'Known trusted agent IDs are reused without redundant discovery.',
  G05: 'Missing or ambiguous named agents never silently select a substitute.',
  G06: 'Same-agent continuation uses the returned conversation ID.',
  G07: 'Unspecified sources explicitly select Grounding.',
  G08: 'Unknown file location alone explicitly selects Grounding.',
  G09: 'Indexed file and Teams scope is retained.',
  G10: 'Required external sources select Copilot without a Grounding probe.',
  G11: 'Dataverse and GraphConnectors require Copilot and are retained.',
  G12: 'Mixed indexed and external sources are not silently narrowed.',
  G13: 'Explicit Copilot retrieval is honored within source authorization.',
  G14: 'Grounding-only restrictions prevent unauthorized broadening.',
  G15: 'Incompatible source requirements require clarification.',
  G16: 'Sufficient evidence ends same-objective semantic searching.',
  G17: 'Zero hits do not authorize broader retrieval.',
  G18: 'A concrete allowed missing source permits one targeted escalation.',
  G19: 'Escalation budgets belong to objectives, not paraphrases or batches.',
  G20: 'Errors, timeouts and host caps are not broader-source signals.',
  G21: 'Explicit denial stops all alternate-route attempts.',
  G22: 'Missing retrieve is disclosed, with no implicit ask or broad sweep.',
  G23: 'Unsupported Grounding is disclosed, not silently omitted.',
  G24: 'Exact entities, full collections, bytes and mutations use entity tools.',
  G25: 'Retrieval arguments have explicit strategy, query array and compatible capabilities.',
  'R.C1': 'Domain recipes remain discoverable, parsed frontmatter and local links are valid.',
  'R.C2': 'Files use exact authoritative source/destination identity and effect-correct tools.',
  'R.C3': 'Approval, execution and observed completion are separate states.',
  'R.C4': 'Recovery is bounded, operation-aware and grounded in observed diagnostics.',
  'R.C5': 'Calendar windows, reminder scope, recurrence and delta cursors are preserved.',
  'R.C6': 'Teams/directory identity types, privileges and query restrictions are honored.',
  'R.C7': 'Exact routes, explicit delegation, continuity, citations and limitations are preserved.',
  'R.schema': 'Explicit schema and path discovery requests cannot be optimized away.',
  'R.sharepoint': 'Library columns use authoritative fields with completeness and per-result checks.',
  'R.businessapps': 'Business Applications preserve discovery, returned paths and privilege boundaries.'
};

export const capabilities = [
  'People', 'Meetings', 'OneDriveAndSharePoint', 'Email',
  'TeamsMessages', 'Dataverse', 'GraphConnectors'
];
export const broaderCapabilities = ['Dataverse', 'GraphConnectors'];
export const terminals = [
  'completed', 'accepted/pending', 'awaiting confirmation',
  'not found in searched scope', 'blocked', 'outcome unknown'
];
export const requiredReferences = [
  'retrieve-work-iq.md', 'ask-work-iq.md', 'agents-work-iq.md',
  'files-work-iq.md', 'calendar-work-iq.md', 'mail-work-iq.md',
  'teams-work-iq.md', 'tasks-work-iq.md', 'workflows-work-iq.md',
  'troubleshooting.md', 'get-schema-work-iq.md', 'search-paths-work-iq.md'
];

// These files add public-only domains, not exceptions to shared safety policy.
export const publicOnlyFiles = {
  'references/sharepoint-work-iq.md': 'Public package supplies SharePoint site/list navigation.',
  'references/sharepoint-library-metadata.md': 'Public package supplies authoritative library-column workflows.',
  'references/business-applications.md': 'Public package supplies Business Applications discovery and operations.'
};

export function retrievalProblems(args, supported = capabilities) {
  const errors = [];
  if (!Array.isArray(args.query) || !args.query.length ||
      args.query.some(q => typeof q !== 'string' || !q.trim())) errors.push('query must be a nonempty array of nonblank strings');
  if (!['grounding', 'copilot'].includes(args.strategy)) errors.push('strategy must be explicitly grounding or copilot');
  if (args.capabilities !== undefined && (!Array.isArray(args.capabilities) ||
      args.capabilities.some(c => !c || typeof c !== 'object' || Array.isArray(c) ||
        Object.keys(c).some(k => k !== 'name') || !supported.includes(c.name)))) {
    errors.push('capabilities must be supported {name} objects');
  }
  if (args.strategy === 'grounding' && Array.isArray(args.capabilities) &&
      args.capabilities.some(c => broaderCapabilities.includes(c?.name))) {
    errors.push('Grounding cannot use Dataverse or GraphConnectors');
  }
  const allowed = new Set(['query', 'strategy', 'capabilities', 'agentId', 'includeDeveloperCard']);
  if (Object.keys(args).some(k => !allowed.has(k))) errors.push('unsupported retrieval argument');
  return errors;
}
