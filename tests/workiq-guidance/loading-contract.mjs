import fs from 'node:fs';
import path from 'node:path';

export const loadingPackages = ['workiq', 'workiq-preview'];
export const entryByteLimit = 5400;

function section(text, title) {
  const heading = `## ${title}`;
  const lines = text.split('\n');
  const declarations = lines.filter(line => new RegExp(`^#{1,6}\\s+${title}\\s*$`, 'i').test(line));
  if (declarations.length > 1) throw new Error(`Duplicate ${title} section`);
  if (declarations.some(line => line !== heading)) throw new Error(`Noncanonical ${title} heading`);
  const start = lines.indexOf(heading);
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start + 1, end < 0 ? lines.length : end).filter(line => line.trim());
}

function relativeLink(parent, href) {
  if (!/^[^?#]+\.md(?:#[^?]*)?$/.test(href) || href.startsWith('/') || href.includes('\\') ||
      /^[a-z][a-z\d+.-]*:/i.test(href)) throw new Error(`Invalid guidance dependency: ${href}`);
  const result = path.posix.normalize(path.posix.join(path.posix.dirname(parent), href.split('#')[0]));
  if (result === '..' || result.startsWith('../')) throw new Error(`Guidance dependency escapes package: ${href}`);
  return result;
}

export function requiredLinks(file, text) {
  return section(text, 'Required before use').map(line => {
    const match = line.match(/^- \[[^\]]+\]\(([^)]+)\)$/);
    if (!match) throw new Error(`Malformed required guidance in ${file}: ${line}`);
    return relativeLink(file, match[1]);
  });
}

export function declaredRoutes(file, text) {
  const result = [];
  for (const line of section(text, 'Routes')) {
    if (/^\| Route \|/.test(line) || /^\|[- |]+\|$/.test(line)) continue;
    const match = line.match(/^\| ([a-z][a-z0-9-]*) \| ([^|]+) \| \[[^\]]+\]\(([^)]+)\) \|$/);
    if (!match) throw new Error(`Malformed route in ${file}: ${line}`);
    if (result.some(route => route.id === match[1])) throw new Error(`Duplicate route ${match[1]} in ${file}`);
    result.push({ id: match[1], file: relativeLink(file, match[3]) });
  }
  return result;
}

export function loadRoute(directory, id, { read = file => fs.readFileSync(path.join(directory, file), 'utf8') } = {}) {
  const cache = new Map();
  const text = file => {
    if (!cache.has(file)) cache.set(file, read(file));
    return cache.get(file);
  };
  function find(file, chain) {
    if (chain.includes(file)) throw new Error(`Routing cycle: ${[...chain, file].join(' -> ')}`);
    const routes = declaredRoutes(file, text(file));
    const direct = routes.find(route => route.id === id);
    if (direct) return [...chain, file, direct.file];
    for (const route of routes) {
      const found = find(route.file, [...chain, file]);
      if (found) return found;
    }
    return undefined;
  }
  const selected = find('SKILL.md', []);
  if (!selected) throw new Error(`Unknown guidance route: ${id}`);
  const files = new Set();
  function include(file, active = []) {
    if (active.includes(file)) throw new Error(`Mandatory guidance cycle: ${[...active, file].join(' -> ')}`);
    if (files.has(file)) return;
    const content = text(file);
    for (const dependency of requiredLinks(file, content)) include(dependency, [...active, file]);
    files.add(file);
  }
  for (const file of selected) include(file);
  const contents = Object.fromEntries([...files].map(file => [file, text(file)]));
  return {
    files: [...files],
    contents,
    bytes: Object.values(contents).reduce((sum, content) => sum + Buffer.byteLength(content, 'utf8'), 0)
  };
}

export const scenarios = [
  { id: 'semantic-context', owner: name => `references/${name === 'workiq-preview' ? 'retrieve' : 'ask'}-work-iq.md`, limit: 11000 },
  { id: 'calendar-read', owner: () => 'references/calendar-read-work-iq.md', required: ['references/calendar-base-work-iq.md'], limit: 12000 },
  { id: 'calendar-reminders', owner: () => 'references/calendar-reminders-work-iq.md', required: ['references/calendar-base-work-iq.md', 'references/call-function-work-iq.md'], limit: 17000 },
  { id: 'calendar-delta', owner: () => 'references/calendar-delta-work-iq.md', required: ['references/calendar-base-work-iq.md', 'references/call-function-work-iq.md'], limit: 16000 },
  { id: 'mail-read', owner: () => 'references/mail-read-work-iq.md', limit: 11000 },
  { id: 'teams-read', owner: () => 'references/teams-read-work-iq.md', required: ['references/teams-targets-work-iq.md'], limit: 18500 },
  { id: 'calendar-actions', owner: () => 'references/calendar-actions-work-iq.md', required: ['references/calendar-base-work-iq.md', 'references/mutation-work-iq.md'], limit: 20000 },
  { id: 'mail-actions', owner: () => 'references/mail-actions-work-iq.md', required: ['references/mail-read-work-iq.md', 'references/mutation-work-iq.md'], limit: 20000 },
  { id: 'teams-actions', owner: () => 'references/teams-actions-work-iq.md', required: ['references/teams-targets-work-iq.md', 'references/mutation-work-iq.md'], limit: 18500 },
  { id: 'teams-state', owner: () => 'references/teams-state-work-iq.md', required: ['references/teams-targets-work-iq.md', 'references/mutation-work-iq.md'], limit: 19000 },
  { id: 'files-actions', owner: () => 'references/files-actions-work-iq.md', required: ['references/files-identity-work-iq.md', 'references/mutation-work-iq.md'], limit: 20000 },
  { id: 'files-download', owner: name => `references/${name === 'workiq-preview' ? 'files-download' : 'fetch-blob'}-work-iq.md`,
    required: name => name === 'workiq-preview' ? ['references/files-identity-work-iq.md', 'references/fetch-blob-work-iq.md'] : [], limit: 16000 },
  { id: 'mail-delta', owner: () => 'references/mail-delta-work-iq.md', required: ['references/call-function-work-iq.md'], limit: 12000 },
  { id: 'calendar-availability', owner: () => 'references/calendar-availability-work-iq.md', required: ['references/calendar-base-work-iq.md'], limit: 17000 },
  { id: 'sharepoint-metadata', owner: () => 'references/sharepoint-library-metadata.md', limit: 25000 },
  { id: 'sharepoint-sites', packages: ['workiq'], owner: () => 'references/sharepoint-work-iq.md', limit: 20000 },
  { id: 'people', owner: () => 'references/people-work-iq.md', limit: 15000 },
  { id: 'planner-read', owner: () => 'references/tasks-contract-work-iq.md', limit: 12000 },
  { id: 'planner-actions', owner: () => 'references/tasks-actions-work-iq.md', required: ['references/tasks-contract-work-iq.md', 'references/mutation-work-iq.md'], limit: 15500 },
  { id: 'teams-presence', owner: () => 'references/teams-presence-work-iq.md', limit: 10000 },
  { id: 'teams-presence-set', owner: () => 'references/teams-presence-actions-work-iq.md', required: ['references/teams-presence-work-iq.md', 'references/mutation-work-iq.md'], limit: 12500 },
  { id: 'people-actions', owner: () => 'references/people-actions-work-iq.md', required: ['references/people-work-iq.md', 'references/mutation-work-iq.md'], limit: 15000 },
  { id: 'cross-domain-actions', owner: () => 'references/cross-domain-actions-work-iq.md', required: ['references/cross-domain-work-iq.md', 'references/mutation-work-iq.md'], limit: 15000 },
  { id: 'businessapps-actions', packages: ['workiq'], owner: () => 'references/business-applications-actions.md', required: ['references/business-applications.md', 'references/mutation-work-iq.md'], limit: 25000 },
  { id: 'retrieval-follow-up', packages: ['workiq-preview'], owner: () => 'references/retrieve-repair-work-iq.md', required: ['references/retrieve-work-iq.md'], limit: 15000 },
];

export function routeText(directory, id) {
  return Object.values(loadRoute(directory, id).contents).join('\n');
}

export function scenarioProblems(name, scenario, route) {
  const required = typeof scenario.required === 'function' ? scenario.required(name) : scenario.required ?? [];
  const expected = [scenario.owner(name), ...required];
  const errors = expected.filter(file => !route.files.includes(file)).map(file => `${scenario.id}: required owner/prerequisite ${file} is not loaded`);
  if (route.bytes > scenario.limit) errors.push(`${scenario.id}: ${route.bytes} bytes exceeds ${scenario.limit}`);
  return errors;
}

export const operativeRules = [
  { route: 'calendar-read', owner: 'references/calendar-base-work-iq.md',
    pattern: /(?:Resolve each boundary's UTC offset for its own requested date|Compute each boundary's offset on that boundary's date)/i },
  { route: 'mail-read', owner: 'references/mail-read-work-iq.md',
    pattern: /Exclude isDraft:true from exchanged/i },
  { route: 'mail-actions', owner: 'references/mail-actions-work-iq.md',
    pattern: /failed createReply does not authorize a fresh message/i },
  { route: 'teams-read', owner: 'references/teams-targets-work-iq.md',
    pattern: /(?:Never use the conversation member's opaque id|Never use a semantic citation as mutation identity)/i },
  { route: 'teams-state', owner: 'references/teams-state-work-iq.md',
    pattern: /"lastMessageReadDateTime"\s*:\s*"\{returnedCreatedDateTime\}"/ },
  { route: 'sharepoint-sites', packages: ['workiq'], owner: 'references/sharepoint-work-iq.md',
    pattern: /500[\s\S]{0,200}partial|partial[\s\S]{0,200}500/i },
  { route: 'retrieval-follow-up', packages: ['workiq-preview'], owner: 'references/retrieve-repair-work-iq.md',
    pattern: /Permit at most one targeted Copilot escalation per retrieval objective/i },
];

export function operativeRuleProblems(route, rule) {
  const content = route.contents[rule.owner];
  if (typeof content !== 'string') return [`${rule.route}: rule owner ${rule.owner} is not loaded`];
  const plain = content.replace(/[*`_]/g, '').replace(/\s+/g, ' ');
  return rule.pattern.test(plain) ? [] : [`${rule.route}: operative rule missing from ${rule.owner}`];
}
