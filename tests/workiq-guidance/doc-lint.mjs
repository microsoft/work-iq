import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { requiredReferences, retrievalProblems } from './contract.mjs';

export const root = path.resolve(import.meta.dirname, '../..');
export const skillRoot = name => path.join(root, 'plugins', name, 'skills', name);
const parser = unified().use(remarkParse);
const walk = (node, fn) => { fn(node); for (const child of node.children ?? []) walk(child, fn); };
export function parseMarkdown(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let frontmatter;
  if (match) {
    const doc = parseDocument(match[1], { uniqueKeys: true });
    if (doc.errors.length) throw new Error(doc.errors.map(e => e.message).join('; '));
    frontmatter = doc.toJS();
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) throw new Error('Frontmatter must be a mapping.');
  }
  const ast = parser.parse(match ? text.slice(match[0].length) : text);
  const anchors = new Set(), links = [], codes = [], definitions = new Map(), references = [];
  const slugger = new GithubSlugger();
  let heading = '';
  walk(ast, node => {
    if (node.type === 'heading') {
      heading = toString(node);
      anchors.add(slugger.slug(heading));
    }
    if (node.type === 'html') {
      for (const match of node.value.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) anchors.add(match[1]);
    }
    if (node.type === 'definition') definitions.set(node.identifier, node.url);
    if (node.type === 'link' || node.type === 'image') links.push(node.url);
    if (node.type === 'linkReference' || node.type === 'imageReference') references.push(node.identifier);
    if (node.type === 'code') codes.push({ language: node.lang, value: node.value, heading });
    if (node.type === 'inlineCode' && /^(?:(?:\.{1,2}\/|references\/)[\w./-]+|[\w-]+)\.md(?:#[\w%-]+)?$/.test(node.value)) {
      links.push({ code: true, url: node.value });
    }
  });
  for (const id of references) {
    if (definitions.has(id)) links.push(definitions.get(id));
    else links.push({ unresolved: id });
  }
  return { frontmatter, ast, anchors, links, codes };
}
export function frontmatterProblems(text, expectedName) {
  try {
    const { frontmatter: fm } = parseMarkdown(text);
    if (!fm) return ['missing YAML frontmatter'];
    const errors = [];
    if (fm.name !== expectedName) errors.push(`name must be ${expectedName}`);
    if (typeof fm.description !== 'string' || !fm.description.trim()) errors.push('description must be a nonblank string');
    else if (fm.description.length > 1024) errors.push(`parsed description exceeds 1024 characters (${fm.description.length})`);
    return errors;
  } catch (error) { return [`invalid frontmatter: ${error.message}`]; }
}
export function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(full) : entry.name.endsWith('.md') ? [full] : [];
  });
}
export function linkProblems(file, text, repositoryRoot = root) {
  const errors = [];
  for (const entry of parseMarkdown(text).links) {
    if (entry.code && !file.includes(`${path.sep}skills${path.sep}`)) continue;
    if (entry.unresolved) { errors.push(`unresolved link reference ${entry.unresolved}`); continue; }
    const url = typeof entry === 'string' ? entry : entry.url;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
    let pathname, fragment;
    try {
      const [rawPath, rawFragment] = url.split('#');
      pathname = decodeURIComponent(rawPath.split('?')[0]);
      fragment = rawFragment ? decodeURIComponent(rawFragment) : '';
    } catch { errors.push(`malformed link ${url}`); continue; }
    let target = pathname ? path.resolve(path.dirname(file), pathname) : file;
    // Bare code mentions in references can name the containing skill's front page.
    if (entry.code && pathname === 'SKILL.md' && !fs.existsSync(target)) target = path.resolve(path.dirname(file), '../SKILL.md');
    if (entry.code && pathname.startsWith('references/') && path.basename(path.dirname(file)) === 'references') {
      target = path.resolve(path.dirname(file), '..', pathname);
    }
    if (!target.startsWith(`${repositoryRoot}${path.sep}`)) { errors.push(`link escapes repository: ${url}`); continue; }
    if (!fs.existsSync(target)) { errors.push(`missing local target ${url}`); continue; }
    if (fragment && target.endsWith('.md')) {
      const doc = parseMarkdown(fs.readFileSync(target, 'utf8'));
      if (!doc.anchors.has(fragment)) errors.push(`missing anchor ${url}`);
    }
  }
  return errors;
}
export function exampleProblems(text, isRetrieveReference = false) {
  const errors = [];
  const document = parseMarkdown(text);
  const title = document.ast.children.find(node => node.type === 'heading' && node.depth === 1);
  const isPathDiscovery = !isRetrieveReference && title && toString(title) === 'search_paths';
  for (const code of document.codes) {
    if (code.language !== 'json') continue;
    let value;
    try { value = JSON.parse(code.value); } catch {
      if (isPathDiscovery) errors.push(`invalid search_paths JSON under ${code.heading}`);
      else if (isRetrieveReference || /"query"\s*:/.test(code.value)) errors.push(`invalid retrieval JSON under ${code.heading}`);
      continue;
    }
    const check = object => {
      if (isPathDiscovery && (!object || typeof object !== 'object' || Array.isArray(object))) {
        errors.push(`${code.heading}: search_paths arguments must be a JSON object`);
        return;
      }
      if (!object || typeof object !== 'object') return;
      if (isPathDiscovery) {
        const searchInputs = ['query', 'filter'].filter(parameter => Object.hasOwn(object, parameter));
        if (searchInputs.length !== 1) {
          errors.push(`${code.heading}: search_paths requires exactly one query or filter input`);
          return;
        }
        const [parameter] = searchInputs;
        if (typeof object[parameter] !== 'string' || !object[parameter].trim()) {
          errors.push(`${code.heading}: search_paths ${parameter} must be a nonblank string`);
        }
        if (Object.keys(object).some(key => key !== parameter)) {
          errors.push(`${code.heading}: unsupported search_paths argument`);
        }
        return;
      }
      if (Object.hasOwn(object, 'actionUrl') || Object.hasOwn(object, 'entityUrls') ||
          Object.hasOwn(object, 'functionUrl')) return;
      if (Object.hasOwn(object, 'query')) {
        errors.push(...retrievalProblems(object).map(p => `${code.heading}: ${p}`));
        if (/unknown|unspecified/i.test(code.heading) && !/conflict/i.test(code.heading) && object.strategy !== 'copilot') {
          errors.push(`${code.heading}: unknown source must explicitly select Copilot`);
        }
      } else for (const child of Object.values(object)) check(child);
    };
    check(value);
  }
  return errors;
}

// Concept-level checks deliberately avoid snapshots of full prose paragraphs.
// They establish documentation coverage only; they cannot prove instruction-following.
export const policies = [
  ['G07', 'references/retrieve-work-iq.md', /Unknown sources[^\n]*\| copilot directly, without a Grounding probe/i, 'unknown sources select Copilot directly'],
  ['G08', 'references/retrieve-work-iq.md', /Known indexed M365 content \| grounding/i, 'known indexed sources select Grounding'],
  ['G25', 'SKILL.md', /Omit capabilities unless sources are specified/i, 'advertise omitted capability filters for unspecified sources'],
  ['G25', 'references/retrieve-work-iq.md', /Unspecified source families: omit capabilities/i, 'do not guess a source-family allow-list'],
  ['G25', 'references/retrieve-work-iq.md', /`query` is a single nonblank string, never an array/i, 'query must be a single nonblank string'],
  ['G11', 'references/retrieve-work-iq.md', /Dataverse and Power BI are unsupported roadmap\s+sources/i, 'unsupported sources must not be advertised'],
  ['G22', 'references/retrieve-work-iq.md', /(?:explicit|user|select|permission)[\s\S]{0,100}(?:delegat|alternative)|(?:delegat|alternative)[\s\S]{0,100}(?:explicit|user|select)/i, 'delegation alternative requires user selection'],
  ['G19', 'references/retrieve-repair-work-iq.md', /one targeted Copilot escalation per retrieval objective/i, 'bound escalation per objective'],
  ['G20', 'references/retrieve-work-iq.md', /(?:capp?ed|truncat)[\s\S]{0,200}(?:saved|read|inspect)/i, 'inspect available saved capped results'],
  ['G03', 'references/agents-work-iq.md', /list_agents/, 'discover named agents from the live catalog'],
  ['G04', 'references/agents-work-iq.md', /(?:reuse|already known|known.{0,20}ID)/i, 'reuse trusted known agent IDs'],
  ['G05', 'references/agents-work-iq.md', /ambigui|ambiguous/i, 'handle ambiguous agent selection'],
  ['G06', 'references/ask-work-iq.md', /conversationId/, 'preserve delegated conversation continuity'],
  ['R.C2', 'references/files-actions-work-iq.md', /same.drive/i, 'declare same-drive move constraints'],
  ['R.C2', 'references/files-identity-work-iq.md', /parentReference\.driveId/i, 'retain authoritative drive identity'],
  ['R.C3', 'references/files-actions-work-iq.md', /(?:session|upload)[\s\S]{0,100}(?:bytes|replac)/i, 'separate session creation from uploaded bytes'],
  ['R.C5', 'references/calendar-base-work-iq.md', /(?:time.?zone|timeZone)/i, 'resolve timezone and window'],
  ['R.C5', 'references/calendar-base-work-iq.md', /each boundary[\s\S]{0,100}date/i, 'resolve each boundary using its requested date'],
  ['R.C5', 'references/calendar-base-work-iq.md', /round.trip/i, 'verify timezone conversion by round-trip'],
  ['R.C5', 'references/calendar-reminders-work-iq.md', /reminderView|reminder/i, 'state reminder scope'],
  ['R.C5', 'references/calendar-actions-work-iq.md', /(?:instance|series|recurr)/i, 'preserve instance/series intent'],
  ['R.C3', 'references/mail-actions-work-iq.md', /createReply/, 'persist reply drafts with reply linkage'],
  ['R.C3', 'references/mail-read-work-iq.md', /isDraft/, 'exclude unsent drafts from exchanged history'],
  ['R.C6', 'references/teams-targets-work-iq.md', /tenantId|tenant identity|tenant.*field/i, 'retain required member tenant identity'],
  ['R.C5', 'references/call-function-work-iq.md', /(?:checkpoint|initial.sync)/i, 'distinguish initial sync from saved checkpoint'],
  ['R.C4', 'references/troubleshooting.md', /(?:202|accepted)[\s\S]{0,150}(?:pending|complet)/i, 'accepted is not completed'],
  ['R.C4', 'references/troubleshooting.md', /412|precondition/i, 'reconcile precondition failures'],
  ['R.C4', 'references/troubleshooting.md', /(?:effect|read.only|getSchedule)/i, 'classify actions by effects'],
  ['R.C6', 'references/people-work-iq.md', /directory[\s\S]{0,200}contacts/i, 'distinguish directory users from contacts'],
  ['R.schema', 'references/setup-work-iq.md', /(?:explicit|request)[\s\S]{0,200}(?:get_schema|schema)/i, 'honor explicit schema requests']
];

export function policyProblems(file, text) {
  const errors = [];
  const plain = text.replace(/[*`_]/g, '').replace(/\r/g, '');
  for (const [id, owner, pattern, description] of policies) {
    if (file === owner && !pattern.test(text)) errors.push(`${id}: ${description}`);
  }
  const blocks = plain.split(/\n\s*\n/);
  for (const block of blocks) {
    if (/\|[^\n]*(?:unknown|unspecified)[^\n]*\|\s*grounding\s*\|/i.test(block)) {
      errors.push('G08: unknown sources incorrectly select Grounding');
    }
    if (/(?:use|try|call) (?:one |a |single )?(?:scoped )?ask (?:as a fallback|only if a synthesized answer|if .*meets)/i.test(block) &&
        !/(?:only after|explicit.{0,30}(?:select|request)|user.{0,30}(?:select|confirm))/i.test(block)) {
      errors.push('G22: implicit ask fallback');
    }
    if (/\|[^\n]*(?:summari[sz]e|project status|catch.up)[^\n]*\|[^\n]*ask\b/i.test(block) &&
        !/explicit|delegat|ask copilot/i.test(block)) errors.push('G01: ordinary context routed to ask');
    if (/(?:if|when)[\s\S]{0,100}(?:denied|policy.blocked)[\s\S]{0,200}(?:fall back to|try another|use ask|use.*instead)/i.test(block) &&
        !/(?:do not|never|no bypass)/i.test(block)) errors.push('G21: alternate route after denial');
    if (/(?:if|when)[^\n]{0,150}denied[^\n]{0,150}\.\s*Use\s+\//i.test(block)) {
      errors.push('G21: alternate entity path after denial');
    }
    for (const line of block.split('\n')) {
      if (/^\|.*access denied.*\|.*\|\s*(?:try|resolve|get)\b/i.test(line)) {
        errors.push('G21: denial-recovery table prescribes an alternate path');
      }
    }
    if (/(?:try|use)\s+(?:one\s+)?ask[\s\S]{0,70}(?:semantically|after the structured|to locate)|(?:if.{0,50}(?:not find|can't find|lookup.{0,15}fail))[\s\S]{0,65}(?:try|use)\s+(?:one\s+)?ask/i.test(block) &&
        !/(?:explicit.{0,30}(?:delegat|select|request)|user.{0,30}(?:select|confirm))/i.test(block)) {
      errors.push('G01: implicit ask used as a structured-lookup fallback');
    }
    if (/use ask only for synthesis questions/i.test(block)) errors.push('G01: question type alone selects delegation');
    if (/\/me\/drive\/items\/[^\s`|]*\/copy/.test(block) &&
        !/(?:do not|never|unsupported|obsolete)/i.test(block)) errors.push('R.C2: obsolete non-drive-scoped copy recipe');
    if (/(?:412|precondition)[\s\S]{0,150}(?:re.fetch|reread)[\s\S]{0,30}(?:and retry|then retry)/i.test(block) &&
        !/reconcil|renew|confirm|compare/i.test(block)) errors.push('R.C4: precondition reread followed by unconditional retry');
    if (/(?:null|timeout|ambiguous)[\s\S]{0,200}(?:fix and retry|retry (?:once|twice|the (?:write|mutation)))/i.test(block) &&
        !/(?:read|do not replay|never retry)/i.test(block)) errors.push('R.C4: unconditional ambiguous-operation replay');
    if (/(?:must|always) (?:call|execute) the (?:write|mutation) tool/i.test(block) &&
        !/confirm|authoriz|prerequisit/i.test(block)) errors.push('R.C3: unconditional mutation instruction');
  }
  return [...new Set(errors)];
}

export function discoverabilityProblems(directory) {
  const reached = new Set();
  function visit(file) {
    if (reached.has(file) || !fs.existsSync(file)) return;
    reached.add(file);
    for (const link of parseMarkdown(fs.readFileSync(file, 'utf8')).links) {
      if (typeof link !== 'string' || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
      const target = path.resolve(path.dirname(file), link.split('#')[0]);
      if (target.startsWith(`${directory}${path.sep}`) && target.endsWith('.md')) visit(target);
    }
  }
  visit(path.join(directory, 'SKILL.md'));
  return requiredReferences.flatMap(file => {
    const errors = [];
    if (!fs.existsSync(path.join(directory, 'references', file))) errors.push(`missing canonical reference ${file}`);
    if (!reached.has(path.join(directory, 'references', file))) errors.push(`SKILL.md must reach canonical ${file}`);
    return errors;
  });
}
