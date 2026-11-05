import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
export const digest = value => hash(JSON.stringify(canonical(value)));
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, file);
}
export function packageFiles(directory) {
  const root = fs.realpathSync(directory);
  function visit(current) {
    return fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(entry => {
        const file = path.join(current, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Package symlinks are unsupported: ${entry.name}`);
        if (entry.isDirectory()) return visit(file);
        if (!entry.isFile()) throw new Error(`Unsupported package entry: ${entry.name}`);
        return [{ path: path.relative(root, file).split(path.sep).join('/'), sha256: hash(fs.readFileSync(file)) }];
      });
  }
  return visit(root);
}
export const packageHash = directory => digest(packageFiles(directory));

export function jsonBody(value) {
  const body = typeof value === 'string' ? JSON.parse(value) : value;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object body.');
  return body;
}

export const logicalTools = [
  'ask', 'retrieve', 'list_agents', 'fetch', 'fetch_blob', 'get_schema', 'search_paths',
  'call_function', 'create_entity', 'update_entity', 'delete_entity', 'do_action'
];
export function logicalTool(name) {
  return logicalTools.find(tool => name === tool || name?.endsWith(`-${tool}`) ||
    name?.endsWith(`__${tool}`) || name?.endsWith(`_${tool}`)) ?? null;
}
export function callPaths(args = {}) {
  return args.entityUrls ?? [
    args.functionUrl ?? args.actionUrl ?? args.entityUrl ?? args.parentUrl ?? args.path
  ].filter(Boolean);
}
export function resultValues(value) {
  const values = [value];
  if (value?.type === 'text' && typeof value.text === 'string') {
    try { values.push(...resultValues(JSON.parse(value.text))); } catch { /* Plain provider text is valid. */ }
  }
  for (const nested of [value?.data, value?.structuredContent]) {
    if (Array.isArray(nested)) nested.forEach(item => values.push(...resultValues(item)));
    else if (nested && typeof nested === 'object') values.push(...resultValues(nested));
  }
  for (const item of Array.isArray(value?.content) ? value.content : []) values.push(...resultValues(item));
  return values;
}
export function failedResult(value) {
  return resultValues(value).some(item => item?.isError === true || item?.success === false ||
    (typeof item?.statusCode === 'number' && item.statusCode >= 400));
}

export class Budget {
  constructor(file, limit = 1000) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('Session limit must be 1-1000.');
    this.file = path.resolve(file);
    this.limit = limit;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.locked(() => {
      if (!fs.existsSync(this.file)) this.append({ kind: 'budget', schemaVersion: 1, limit });
      this.entries();
    });
  }
  locked(action) {
    const lock = `${this.file}.lock`;
    let fd;
    try {
      fd = fs.openSync(lock, 'wx');
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Budget is locked; inspect the owning process before recovery: ${lock}`);
      throw error;
    }
    try {
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid }));
      return action();
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(lock);
    }
  }
  append(value) {
    const fd = fs.openSync(this.file, 'a');
    try {
      fs.writeFileSync(fd, `${JSON.stringify({ ...value, recordedAt: new Date().toISOString() })}\n`);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
  }
  entries() {
    const entries = fs.readFileSync(this.file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    if (entries[0]?.kind !== 'budget' || entries[0].schemaVersion !== 1 || entries[0].limit !== this.limit) {
      throw new Error('Budget header/limit changed; refusing to reset accounting.');
    }
    const ids = entries.filter(row => row.kind === 'reserved').map(row => row.id);
    if (new Set(ids).size !== ids.length || ids.length > this.limit) throw new Error('Invalid budget ledger.');
    return entries;
  }
  reserve(details) {
    return this.locked(() => {
      if (this.entries().filter(row => row.kind === 'reserved').length >= this.limit) {
        throw new Error('Global scenario-session budget exhausted.');
      }
      const id = randomUUID();
      this.append({ ...details, kind: 'reserved', id });
      return id;
    });
  }
  finish(id, details) {
    this.locked(() => {
      const entries = this.entries();
      if (!entries.some(row => row.kind === 'reserved' && row.id === id) ||
          entries.some(row => row.kind === 'finished' && row.id === id)) {
        throw new Error('Unknown or already finished session.');
      }
      this.append({ ...details, kind: 'finished', id });
    });
  }
  get used() { return this.entries().filter(row => row.kind === 'reserved').length; }
}
