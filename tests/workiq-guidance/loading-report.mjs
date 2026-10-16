import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadingPackages, loadRoute, scenarios } from './loading-contract.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const baseline = JSON.parse(fs.readFileSync(new URL('./loading-baseline.json', import.meta.url), 'utf8'));
const packages = {};
for (const name of loadingPackages) {
  const directory = path.join(root, 'plugins', name, 'skills', name);
  const entryBytes = fs.statSync(path.join(directory, 'SKILL.md')).size;
  const routes = {};
  for (const scenario of scenarios.filter(item => !item.packages || item.packages.includes(name))) {
    const route = loadRoute(directory, scenario.id);
    const before = baseline.packages[name][scenario.id];
    routes[scenario.id] = {
      files: route.files, bytes: route.bytes, estimatedTokensBytesDiv4: Math.ceil(route.bytes / 4),
      fileHashes: Object.fromEntries(Object.entries(route.contents).map(([file, content]) =>
        [file, createHash('sha256').update(content, 'utf8').digest('hex')])),
      ...(before ? { baselineBytes: before.bytes, reductionPercent: Number(((1 - route.bytes / before.bytes) * 100).toFixed(1)) } : {})
    };
  }
  const recovery = fs.statSync(path.join(directory, 'references/troubleshooting.md')).size;
  const crossDomain = [...new Set([...routes['mail-actions'].files, ...routes['calendar-actions'].files])];
  packages[name] = {
    entryBytes, entryEstimatedTokensBytesDiv4: Math.ceil(entryBytes / 4), routes,
    mailActionWithRecoveryBytes: routes['mail-actions'].bytes + recovery,
    mailAndCalendarActionsBytes: crossDomain.reduce((sum, file) => sum + fs.statSync(path.join(directory, file)).size, 0)
  };
}
console.log(JSON.stringify({
  measurement: 'Published Markdown-derived full-file static load plans; not observed model loads. Unique UTF-8 bytes and bytes/4 estimates exclude schemas, tool output, host framing and history.',
  baselineRevision: baseline.revision, packages
}, null, 2));
