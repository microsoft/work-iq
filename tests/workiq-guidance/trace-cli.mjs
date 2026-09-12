#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { cases } from './fixtures.mjs';
import { validateTrace } from './trace-oracle.mjs';
import { markdownFiles, skillRoot } from './doc-lint.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const scenarioHash = scenario => hash(JSON.stringify(scenario));
export const catalogHash = scenario => hash(JSON.stringify({
  tools: scenario.catalog, strategies: scenario.strategies, capabilities: scenario.capabilities,
  operations: scenario.operations.map(({ id, tool, match, effect, flexible }) => ({ id, tool, match, effect, flexible }))
}));
export function packageHash(name) {
  const directory = skillRoot(name);
  return hash(markdownFiles(directory).sort().map(file =>
    `${path.relative(directory, file)}\0${fs.readFileSync(file, 'utf8')}`).join('\0'));
}
export function validateObserved(scenario, trace, rawBytes) {
  const result = validateTrace(scenario, trace, { observed: true });
  const fail = (code, message) => result.violations.push({ code, message });
  if (trace?.provenance?.scenarioHash !== scenarioHash(scenario)) fail('scenario-hash', 'Observed trace did not use this canonical scenario.');
  if (trace?.provenance?.catalogHash !== catalogHash(scenario)) fail('catalog-hash', 'Mock catalog/operation contract differs from this scenario.');
  if (['workiq', 'workiq-preview'].includes(trace?.provenance?.package) &&
      trace.provenance.packageHash !== packageHash(trace.provenance.package)) {
    fail('package-hash', 'Loaded skill/reference digest does not match this candidate package.');
  }
  if (!rawBytes || trace?.provenance?.rawTraceSha256 !== hash(rawBytes)) {
    fail('raw-evidence', 'A matching raw host event export is required.');
  } else {
    let raw;
    try { raw = JSON.parse(rawBytes); } catch { fail('raw-evidence', 'Raw evidence is not supported JSON.'); }
    if (raw?.schemaVersion !== 1 || raw?.evidenceKind !== 'host-event-export' || !Array.isArray(raw?.receipts)) {
      fail('raw-evidence', 'Unsupported host export schema; an explicit adapter is required.');
    } else {
      const receipts = new Map();
      for (const receipt of raw.receipts) {
        if (!receipt || typeof receipt.id !== 'string' || receipts.has(receipt.id) || !receipt.event) {
          fail('raw-evidence', 'Host receipts require unique IDs and actual events.');
          continue;
        }
        receipts.set(receipt.id, receipt.event);
      }
      const consumed = new Set();
      for (const [index, event] of (Array.isArray(trace?.events) ? trace.events : []).entries()) {
        if (!event || typeof event !== 'object') { fail('raw-evidence', 'Malformed trace event.'); continue; }
        const { evidenceRef, origin, ...normalized } = event;
        if (consumed.has(evidenceRef) || raw.receipts[index]?.id !== evidenceRef ||
            !isDeepStrictEqual(normalized, receipts.get(evidenceRef))) {
          fail('raw-evidence', 'A trace event was dropped, duplicated, altered or lacks a matching host receipt.');
        }
        consumed.add(evidenceRef);
      }
      if (consumed.size !== receipts.size) fail('raw-evidence', 'All exported host events must be accounted for; do not omit unsafe calls.');
    }
  }
  result.ok = result.violations.length === 0;
  return result;
}
export function main(argv) {
  if (argv.length === 1 && argv[0] === '--list') {
    console.log(JSON.stringify(cases.map(c => ({ id: c.id, requirements: c.requirements })), null, 2));
    return 0;
  }
  if (argv.length === 2 && argv[0] === '--describe') {
    const fixture = cases.find(c => c.id === argv[1]);
    if (!fixture) throw new Error(`Unknown scenario: ${argv[1]}`);
    console.log(JSON.stringify({
      scenario: fixture.scenario, scenarioHash: scenarioHash(fixture.scenario),
      catalogHash: catalogHash(fixture.scenario),
      packageHashes: Object.fromEntries(['workiq', 'workiq-preview'].map(name => [name, packageHash(name)]))
    }, null, 2));
    return 0;
  }
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!['--scenario', '--trace', '--raw-evidence'].includes(argv[i]) || !argv[i + 1] || args[argv[i]]) {
      throw new Error('Unsupported or duplicate argument. Expected --scenario ID --trace FILE --raw-evidence FILE.');
    }
    args[argv[i]] = argv[i + 1];
  }
  if (Object.keys(args).length !== 3) throw new Error('Missing evidence. Use --scenario ID --trace FILE --raw-evidence FILE; no model or live eval is launched.');
  const fixture = cases.find(c => c.id === args['--scenario']);
  if (!fixture) throw new Error('Unknown canonical scenario; trace-supplied rules are not accepted.');
  const trace = JSON.parse(fs.readFileSync(args['--trace'], 'utf8'));
  const result = validateObserved(fixture.scenario, trace, fs.readFileSync(args['--raw-evidence']));
  console.log(JSON.stringify({ evidenceKind: 'observed-host-mock', scenarioId: fixture.id, ...result }, null, 2));
  return result.ok ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 2;
  }
}
