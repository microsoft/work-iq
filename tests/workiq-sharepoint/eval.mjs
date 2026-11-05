import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Budget, digest, hash, packageFiles, packageHash, readJson, writeJson } from './common.mjs';
import { scenarios, matrixHash, catalog, schemaSnapshot, toolContract, screeningCases, getScenario } from './matrix.mjs';
import { breadthInventory, breadthHash, getBreadthScenario } from './breadth.mjs';
import { normalizeEvents, parseJsonLines, score, summarize } from './trace.mjs';

const model = 'gpt-6.1-sol';
const catalogHash = digest({ catalog, schemaSnapshot, toolContract });
const suiteRoot = import.meta.dirname;
const adapterFiles = ['common.mjs', 'matrix.mjs', 'breadth.mjs', 'native.mjs', 'mock.mjs', 'trace.mjs',
  'write-boundary.mjs', 'eval.mjs', 'tool-contract.json', 'native-catalog.json', 'native-schemas.json'];
const adapterHash = () => digest(adapterFiles.map(file => ({ file, hash: hash(fs.readFileSync(path.join(suiteRoot, file))) })));
const loadedAdapterHash = adapterHash();
const stages = { calibration: 16, screening: 160, development: 160, refinement: 80, holdout: 336, breadth: 160, smoke: 32, reserve: 56 };
const cliTools = ['skill', 'view', 'glob', 'rg',
  ...toolContract.map(tool => `workiq-${tool.name}`)];
const ledgerEntries = root => new Budget(path.join(root, 'budget.jsonl')).entries();

export function freeze(root) {
  const relative = path.relative(path.resolve(suiteRoot, '..', '..'), path.resolve(root));
  if (!relative || (!path.isAbsolute(relative) && !relative.startsWith(`..${path.sep}`))) {
    throw new Error('Raw evidence must be stored outside the repository.');
  }
  const breadthFile = path.join(root, 'breadth-freeze.json');
  if (fs.existsSync(breadthFile)) {
    if (readJson(breadthFile).breadthHash !== breadthHash) throw new Error('Catalog-breadth matrix changed after freeze.');
  } else writeJson(breadthFile, { breadthHash, probes: breadthInventory });
  const file = path.join(root, 'matrix-freeze.json');
  if (fs.existsSync(file)) {
    if (readJson(file).matrixHash !== matrixHash) throw new Error('Matrix/catalog changed after freeze. Use a new experiment, not a silently changed holdout.');
    return readJson(file);
  }
  const value = { schemaVersion: 1, matrixHash, catalogHash,
    scenarios: scenarios.map(({ context, ...entry }) => entry), screening: screeningCases().map(entry => entry.id) };
  writeJson(file, value);
  return value;
}

export async function register(root, variant, directory) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/.test(variant)) throw new Error('Invalid variant label.');
  freeze(root);
  const { parseMarkdown, frontmatterProblems, markdownFiles, linkProblems } = await import('../workiq-guidance/doc-lint.mjs');
  const problems = [], inheritedRepositoryLinks = [];
  for (const file of markdownFiles(path.join(directory, 'skills'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const problem of linkProblems(file, text, directory)) {
      const relative = path.relative(directory, file).split(path.sep).join('/');
      if (relative === 'skills/workiq/references/troubleshooting.md' &&
        problem === 'link escapes repository: ../../../../../ADMIN-INSTRUCTIONS.md') {
        inheritedRepositoryLinks.push(`${relative}: ${problem}`);
      } else problems.push(`${relative}: ${problem}`);
    }
    if (path.basename(file) === 'SKILL.md') {
      const { frontmatter } = parseMarkdown(text);
      problems.push(...frontmatterProblems(text, path.basename(path.dirname(file))));
      if (!frontmatter?.name) problems.push('Missing skill name.');
    }
  }
  if (problems.length) throw new Error(problems.join('\n'));
  const endpoint = readJson(path.join(directory, '.mcp.json')).mcpServers.workiq;
  if (endpoint.url !== 'https://workiq.svc.cloud.microsoft/mcp') throw new Error('Candidate hosted endpoint was changed.');
  const value = {
    schemaVersion: 1, variant, directory: fs.realpathSync(directory), packageHash: packageHash(directory),
    files: packageFiles(directory), matrixHash, catalogHash, inheritedRepositoryLinks
  };
  const file = path.join(root, 'registered', `${variant}.json`);
  if (fs.existsSync(file) && readJson(file).packageHash !== value.packageHash) throw new Error('Registered variants are immutable. Use a new label.');
  writeJson(file, value);
  return value;
}

function assertStage(root, stage) {
  if (!Object.hasOwn(stages, stage)) throw new Error(`Unknown experiment stage: ${stage}`);
  const used = ledgerEntries(root).filter(entry => entry.kind === 'reserved' && entry.stage === stage).length;
  if (used >= stages[stage]) throw new Error(`Stage session allocation exhausted: ${stage}`);
}

export function verifyInstalledPackage(home, candidate, listing) {
  const enabled = Array.isArray(listing) ? listing.filter(plugin => plugin.enabled) : [];
  const manifest = readJson(path.join(candidate.directory, '.github', 'plugin', 'plugin.json'));
  if (enabled.length !== 1 || enabled[0].name !== 'workiq' || enabled[0].source !== 'installed' ||
    enabled[0].version !== manifest.version) throw new Error('Exactly one matching installed workiq package must be enabled.');
  const directory = path.join(home, 'installed-plugins', '_direct', path.basename(candidate.directory));
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Installed package must be a copy, not a symlink.');
  const resolved = fs.realpathSync(directory), relative = path.relative(fs.realpathSync(home), resolved);
  if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error('Installed package resolves outside its isolated home.');
  }
  const files = packageFiles(resolved), installedHash = digest(files);
  if (installedHash !== candidate.packageHash) throw new Error('Installed package provenance differs from the registered snapshot.');
  return { directory: resolved, packageHash: installedHash, files, listing };
}

export async function runOne({ root, variant, scenarioId, stage = 'calibration', repetition = 1,
  executable = process.env.WORKIQ_COPILOT_EXE ?? 'copilot', timeout = 300000, loadMode = 'directory' }) {
  if (!['directory', 'installed'].includes(loadMode)) throw new Error('Choose directory or installed package loading.');
  root = path.resolve(root);
  if (adapterHash() !== loadedAdapterHash) throw new Error('Runner source changed after loading; restart before reserving another session.');
  freeze(root);
  const candidate = readJson(path.join(root, 'registered', `${variant}.json`));
  if (candidate.matrixHash !== matrixHash || candidate.packageHash !== packageHash(candidate.directory)) throw new Error('Candidate provenance changed.');
  const scenario = scenarioId.startsWith('breadth-') ? getBreadthScenario(scenarioId) : getScenario(scenarioId);
  scenario.clock = { now: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  assertStage(root, stage);
  const budget = new Budget(path.join(root, 'budget.jsonl'));
  const details = {
    stage, variant, scenarioId, repetition, loadMode, packageHash: candidate.packageHash,
    matrixHash, breadthHash, catalogHash, adapterHash: adapterHash()
  };
  const id = budget.reserve(details);
  const directory = path.join(root, 'runs', id);
  fs.mkdirSync(path.join(directory, 'workspace'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'home'));
  writeJson(path.join(directory, 'scenario.json'), scenario);
  const mockFile = path.join(directory, 'mock-calls.jsonl');
  fs.writeFileSync(mockFile, '');
  const configFile = path.join(directory, 'mcp.json');
  writeJson(configFile, { mcpServers: { workiq: {
    type: 'stdio', command: process.execPath,
    args: [path.join(suiteRoot, 'mock.mjs'), path.join(directory, 'scenario.json'), mockFile],
    tools: ['*']
  } } });
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (/^(OTEL_|COPILOT_OTEL_|COPILOT_CUSTOM_INSTRUCTIONS_DIRS|COPILOT_HOME$)/.test(name)) delete environment[name];
  }
  Object.assign(environment, {
    COPILOT_HOME: path.join(directory, 'home'),
    COPILOT_OTEL_FILE_EXPORTER_PATH: path.join(directory, 'otel.jsonl'),
    COPILOT_OTEL_EXPORTER_TYPE: 'file', OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT: 'true'
  });
  const args = ['-p', scenario.prompt, '--model', model, '--output-format', 'json',
    '--no-custom-instructions', '--disable-builtin-mcps', '--no-ask-user', '--no-auto-update',
    '--allow-all-tools', ...(loadMode === 'directory' ? ['--plugin-dir', candidate.directory] : []),
    '--additional-mcp-config', `@${configFile}`,
    '--usage-output-file', path.join(directory, 'usage.json'), '--available-tools', ...cliTools];
  const revision = execFileSync('git', ['--no-pager', 'rev-parse', 'HEAD'], { cwd: path.resolve(suiteRoot, '..', '..'), encoding: 'utf8' }).trim();
  writeJson(path.join(directory, 'request.json'), {
    ...details, id, model, layer: scenario.layer, revision, node: process.version, fixtureClock: scenario.clock,
    executable, settings: { timeout, maxToolCalls: 70, maxModelCalls: 24, automaticSkillSelection: true },
    arguments: args, packageFiles: candidate.files
  });
  const started = Date.now();
  const stdoutFile = path.join(directory, 'stdout.jsonl'), stderrFile = path.join(directory, 'stderr.txt');
  const stdout = fs.createWriteStream(stdoutFile), stderr = fs.createWriteStream(stderrFile);
  let end, installation;
  try {
    if (loadMode === 'installed') {
      for (const [label, command] of [
        ['plugin-install', ['plugin', 'install', candidate.directory]],
        ['plugin-list', ['plugin', 'list', '--json']]
      ]) {
        const out = fs.openSync(path.join(directory, `${label}-stdout.txt`), 'w');
        const err = fs.openSync(path.join(directory, `${label}-stderr.txt`), 'w');
        try {
          execFileSync(executable, command, {
            cwd: path.join(directory, 'workspace'), env: environment, windowsHide: true,
            stdio: ['ignore', out, err], timeout: 60000
          });
        } finally { fs.closeSync(out); fs.closeSync(err); }
      }
      installation = verifyInstalledPackage(environment.COPILOT_HOME, candidate,
        readJson(path.join(directory, 'plugin-list-stdout.txt')));
      writeJson(path.join(directory, 'installation.json'), installation);
    }
    end = await new Promise(resolve => {
      const child = spawn(executable, args, { cwd: path.join(directory, 'workspace'), env: environment,
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      writeJson(path.join(directory, 'process.json'), { pid: child.pid, startedAt: new Date().toISOString() });
      let timeoutReason, buffer = '', toolCount = 0, modelCount = 0;
      const stop = reason => {
        timeoutReason ??= reason;
        child.kill();
      };
      const timer = setTimeout(() => stop('Scenario deadline exceeded.'), timeout);
      child.stdout.on('data', data => {
        stdout.write(data);
        buffer += data.toString('utf8');
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          try {
            const event = JSON.parse(line);
            if (event.type === 'tool.execution_start' && ++toolCount > 70) stop('Tool-call limit exceeded.');
            if (event.type === 'model.call_start' && ++modelCount > 24) stop('Model-call limit exceeded.');
          } catch { /* Non-JSON diagnostics are retained in the original evidence. */ }
        }
      });
      child.stderr.on('data', data => stderr.write(data));
      child.on('error', error => { clearTimeout(timer); resolve({ code: null, error: error.message }); });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal, error: timeoutReason });
      });
    });
  } catch (error) {
    end = { code: null, error: `Scenario setup/launch failed: ${error.message}` };
  } finally {
    await Promise.all([new Promise(resolve => stdout.end(resolve)), new Promise(resolve => stderr.end(resolve))]);
  }
  const rawEvents = fs.readFileSync(stdoutFile, 'utf8');
  const rawCalls = fs.readFileSync(mockFile, 'utf8');
  const parsed = parseJsonLines(rawEvents, { allowDiagnostics: true });
  const records = parseJsonLines(rawCalls).rows;
  const evidenceHash = digest({ stdout: hash(rawEvents), calls: hash(rawCalls),
    otel: fs.existsSync(path.join(directory, 'otel.jsonl')) ? hash(fs.readFileSync(path.join(directory, 'otel.jsonl'))) : null });
  const result = score(scenario, parsed.rows, records, { ...details, id, evidenceHash, durationMs: Date.now() - started });
  if (end.code !== 0 || end.error) result.problems.push(end.error ?? `CLI exit code: ${end.code}`);
  if (packageHash(candidate.directory) !== candidate.packageHash) result.problems.push('Package mutated during the scenario.');
  if (installation) {
    try { verifyInstalledPackage(environment.COPILOT_HOME, candidate, installation.listing); }
    catch (error) { result.problems.push(`Installed package changed during the scenario: ${error.message}`); }
  }
  if (adapterHash() !== details.adapterHash) result.problems.push('Runner/fixture source mutated during the scenario.');
  result.instrumentationValid = result.problems.length === 0;
  writeJson(path.join(directory, 'score.json'), result);
  writeJson(path.join(directory, 'outcome.json'), { ...end, id, durationMs: result.durationMs, diagnostics: parsed.rejected });
  budget.finish(id, { status: result.instrumentationValid ? 'completed' : 'infrastructure-failed',
    correct: result.correct, nativeRouting: result.nativeRouting, evidenceHash });
  fs.appendFileSync(path.join(root, 'progress.jsonl'), `${JSON.stringify({
    id, variant, scenarioId, stage, repetition, valid: result.instrumentationValid,
    native: result.nativeRouting, correct: result.correct, downloads: result.unrequestedDownloads,
    used: budget.used, durationMs: result.durationMs
  })}\n`);
  return result;
}

export function readScores(root, stage) {
  const runs = path.join(root, 'runs');
  return fs.existsSync(runs) ? fs.readdirSync(runs).flatMap(id => {
    const file = path.join(runs, id, 'score.json');
    return fs.existsSync(file) ? [readJson(file)] : [];
  }).filter(row => !stage || row.stage === stage) : [];
}

export async function batch(options, execute = runOne) {
  const { root, variants, set, stage, repetitions = 1, concurrency = 1 } = options;
  if (![1, 2].includes(concurrency)) throw new Error('Only validated serial/two-session mock execution is supported.');
  if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error('Repetitions must be a positive integer.');
  const screen = screeningCases();
  const selected = set === 'screen' ? screen : set === 'expanded'
    ? scenarios.filter(entry => entry.split === 'development' && !screen.some(item => item.id === entry.id))
    : set === 'holdout' ? scenarios.filter(entry => entry.split === 'holdout')
      : set === 'development' ? scenarios.filter(entry => entry.split === 'development')
        : set === 'breadth' ? breadthInventory.map(row => getBreadthScenario(row.id))
          : set?.startsWith('cases:') ? set.slice(6).split(',').map(id =>
            id.startsWith('breadth-') ? getBreadthScenario(id) : getScenario(id)) : null;
  if (!selected) throw new Error('Choose screen, expanded, development, holdout, breadth, or cases:ID,ID.');
  const queue = [];
  for (let repetition = 1; repetition <= repetitions; repetition++) {
    for (const [index, scenario] of selected.entries()) {
      const balanced = (index + repetition) % 2 ? variants : [...variants].reverse();
      for (const variant of balanced) queue.push({ ...options, variant, scenarioId: scenario.id, repetition });
    }
  }
  const entries = ledgerEntries(root);
  const scheduled = queue.filter(job => !entries.some(entry => entry.kind === 'reserved' &&
    entry.stage === stage && entry.variant === job.variant && entry.scenarioId === job.scenarioId && entry.repetition === job.repetition));
  let cursor = 0, stopped = false;
  const outcomes = await Promise.allSettled(Array.from({ length: concurrency }, async () => {
    while (!stopped && cursor < scheduled.length) {
      try {
        const job = scheduled[cursor++];
        const result = await execute(job);
        console.log(JSON.stringify({ variant: job.variant, case: job.scenarioId, repetition: job.repetition,
          valid: result.instrumentationValid, native: result.nativeRouting, correct: result.correct,
          downloads: result.unrequestedDownloads, problems: result.problems }));
        if (!result.instrumentationValid) throw new Error(`Instrumentation failure; stop rather than scale invalid evidence: ${result.id}`);
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  }));
  const failure = outcomes.find(outcome => outcome.status === 'rejected');
  if (failure) throw failure.reason;
}

export function report(root, stage) {
  const rows = readScores(root, stage);
  const entries = ledgerEntries(root), scoredIds = new Set(rows.map(row => row.id));
  const groups = {};
  for (const row of rows) {
    const key = `${row.stage}/${row.variant}/${row.split}/${row.matrixHash.slice(0, 12)}/${row.adapterHash.slice(0, 12)}`;
    (groups[key] ??= []).push(row);
  }
  return {
    schemaVersion: 1, matrixHash, breadthHash, catalogHash,
    sessionsReserved: entries.filter(entry => entry.kind === 'reserved').length,
    unscoredReservations: entries.filter(entry => entry.kind === 'reserved' &&
      (!stage || entry.stage === stage) && !scoredIds.has(entry.id)).map(entry => ({
      id: entry.id, stage: entry.stage, variant: entry.variant, scenarioId: entry.scenarioId,
      repetition: entry.repetition,
      status: entries.find(finished => finished.kind === 'finished' && finished.id === entry.id)?.status ?? 'unfinished'
    })),
    groups: Object.fromEntries(Object.entries(groups).map(([key, runs]) => [key, summarize(runs)])),
    failures: rows.filter(row => !row.instrumentationValid || row.correct === false || row.unrequestedDownloads ||
      row.nativeSuccess === false || row.catalogPathSelected === false).map(row => ({
      id: row.id, scenarioId: row.scenarioId, variant: row.variant, stage: row.stage, repetition: row.repetition,
      valid: row.instrumentationValid, nativeRouting: row.nativeRouting, nativeSuccess: row.nativeSuccess,
      correct: row.correct, downloads: row.unrequestedDownloads, problems: row.problems
    }))
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true, options: {
      root: { type: 'string' }, variant: { type: 'string' }, variants: { type: 'string' },
      package: { type: 'string' }, case: { type: 'string' }, stage: { type: 'string' },
      set: { type: 'string' }, repetitions: { type: 'string', default: '1' },
      concurrency: { type: 'string', default: '1' }, executable: { type: 'string' },
      output: { type: 'string' }, timeout: { type: 'string' }, 'load-mode': { type: 'string', default: 'directory' }
    }
  });
  const command = positionals[0] ?? 'list';
  if (command === 'list') {
    console.log(JSON.stringify({ matrixHash, breadthHash, catalogHash, cases: scenarios.length, paths: catalog.length,
      screening: screeningCases().length,
      families: Object.fromEntries([...new Set(scenarios.map(row => row.family))].map(family => [family, {
        development: scenarios.filter(row => row.family === family && row.split === 'development').length,
        holdout: scenarios.filter(row => row.family === family && row.split === 'holdout').length
      }])) }, null, 2));
    return;
  }
  if (!values.root) throw new Error('An explicit private --root is required. Never place raw traces in the repository.');
  const root = path.resolve(values.root);
  let result;
  if (command === 'freeze') result = { matrixHash: freeze(root).matrixHash };
  else if (command === 'register') result = await register(root, values.variant, path.resolve(values.package));
  else if (command === 'run') result = await runOne({ root, variant: values.variant, scenarioId: values.case,
    stage: values.stage, executable: values.executable, loadMode: values['load-mode'],
    timeout: values.timeout ? Number(values.timeout) : undefined });
  else if (command === 'batch') return batch({ root, variants: values.variants.split(','), set: values.set,
    stage: values.stage, repetitions: Number(values.repetitions), concurrency: Number(values.concurrency),
    executable: values.executable, loadMode: values['load-mode'],
    timeout: values.timeout ? Number(values.timeout) : undefined });
  else if (command === 'report') result = report(root, values.stage);
  else throw new Error(`Unknown command: ${command}`);
  if (values.output) writeJson(path.resolve(values.output), result);
  console.log(JSON.stringify(command === 'register' ? {
    variant: result.variant, packageHash: result.packageHash, files: result.files.length
  } : result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
