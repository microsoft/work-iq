import { digest, failedResult, logicalTool, callPaths, resultValues, jsonBody } from './common.mjs';
import { helperPaths } from './mock.mjs';

export function parseJsonLines(text, { allowDiagnostics = false } = {}) {
  const rows = [], rejected = [];
  for (const [index, line] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { rejected.push(index + 1); }
  }
  if (rejected.length && !allowDiagnostics) throw new Error(`Invalid JSONL lines: ${rejected.join(', ')}`);
  return { rows, rejected };
}

export function normalizeEvents(events) {
  const attempts = new Map(), completions = new Map();
  for (const event of events) {
    const data = event.data ?? {};
    if (event.type === 'tool.execution_start') {
      attempts.set(data.toolCallId, {
        id: data.toolCallId, name: data.toolName, arguments: data.arguments ?? {},
        server: data.mcpConfigServerName ?? data.mcpServerName, source: data.mcpConfigSource
      });
    } else if (event.type === 'tool.execution_complete') completions.set(data.toolCallId, data);
  }
  for (const event of events.filter(entry => entry.type === 'assistant.message')) {
    for (const request of event.data?.toolRequests ?? []) {
      const id = request.toolCallId ?? request.id;
      if (!id || attempts.has(id)) continue;
      let args = request.arguments ?? request.function?.arguments ?? {};
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch { args = { malformedArguments: args }; }
      }
      attempts.set(id, { id, name: request.name ?? request.toolName ?? request.function?.name, arguments: args });
    }
  }
  const calls = [...attempts.values()].map(call => ({ ...call, completion: completions.get(call.id) }));
  const finalMessages = events.filter(event => event.type === 'assistant.message' &&
    event.data?.content && !event.data?.toolRequests?.length);
  return {
    calls, answer: finalMessages.at(-1)?.data.content ?? '',
    idle: events.some(event => event.type === 'assistant.idle'),
    models: [...new Set(events.filter(event => event.type === 'model.call_start')
      .map(event => event.data?.model).filter(Boolean))],
    loadedServers: events.filter(event => event.type === 'session.mcp_server_tools_loaded')
      .map(event => ({ name: event.data.serverName, toolCount: event.data.toolCount })),
    modelCalls: events.filter(event => event.type === 'model.call_start').length
  };
}

const transferPaths = paths => paths.some(url => /\/(?:content|\$value)(?:\?|$)|\/sharepoint\/getDownloadFileDetails(?:\?|$)/i.test(url));
export function downloadAttempt(call) {
  if (logicalTool(call.name) === 'fetch_blob' || transferPaths(callPaths(call.arguments))) return true;
  const args = call.arguments ?? {};
  if (/web_fetch|fetch_url|browse|download/i.test(call.name ?? '') &&
    /\.sharepoint(?:-df)?\.com\b|\/content\b|\/\$value\b/i.test(args.url ?? '')) return true;
  return /powershell|shell|bash/.test(call.name ?? '') &&
    /Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|\bcurl\b|\bwget\b|requests\.(?:get|request)|urllib\.request|https?\.get|\bfetch\s*\(/i.test(args.command ?? '');
}

const signature = call => digest({ name: logicalTool(call.name) ?? call.name, arguments: call.arguments });
function taskRelevant(record, scenario) {
  if (!record.valid || !record.taskRelevant) return false;
  const taskPath = record.paths.find(url => scenario.acceptable.includes(url));
  if (!taskPath) return false;
  const name = taskPath.slice('/sharepoint/'.length);
  if (!['semantic_search', 'get_structured_text', 'get_table_of_contents',
    'get_document_pages', 'get_document_images'].includes(name)) return true;
  let body;
  try { body = jsonBody(record.arguments.jsonBody ?? {}); } catch { return false; }
  const expected = scenario.batch ? scenario.context.docs : [scenario.context.docs[0]];
  return expected.every(doc => {
    if (name === 'get_structured_text') return (body.files ?? [body]).some(file =>
      file.fileUrl === doc.fileUrl || file.serverRelativeUrl === doc.serverRelativeUrl);
    if (name === 'semantic_search') return body.spItemUrls?.includes(doc.spItemUrl);
    const identity = body.spItemUrl === doc.spItemUrl ||
      (body.driveId === doc.driveId && body.itemId === doc.id);
    return identity && (name !== 'get_document_images' || (body.imageReferenceIds?.length &&
      body.imageReferenceIds.every(id => id === doc.imageReferenceId)));
  });
}

function sourceLinksPresent(answer, docs) {
  const links = [...answer.matchAll(/https?:\/\/[^\s<>()\[\]`]+/g)].flatMap(match => {
    try { return [new URL(match[0].replace(/[.,;:!?]+$/, ''))]; } catch { return []; }
  });
  return docs.every(doc => {
    const expected = new URL(doc.fileUrl);
    return links.some(link => !link.username && !link.password &&
      link.origin === expected.origin && link.pathname === expected.pathname);
  });
}

function factText(answer) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return answer.replace(/\b(\d+)[-\u2010\u2011](minutes?|min|hours?|days?)\b/gi, '$1 $2')
    .replace(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/gi,
    (_, hour, minute, period) => `${String(Number(hour) % 12 + (/^p/i.test(period) ? 12 : 0)).padStart(2, '0')}:${minute ?? '00'}`)
    .replace(/\b([0-9]):([0-5]\d)\b/g, '0$1:$2')
    .replace(/(?<=\d),(?=\d{3}(?:\D|$))/g, '').replace(
    /\b(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sep|October|Oct|November|Nov|December|Dec)\.?(?:\s+(\d{1,2})(?:st|nd|rd|th)?,?)?\s+(\d{4})\b/gi,
    (original, before, monthName, after, year) => {
      const month = months.indexOf(monthName.slice(0, 3).toLowerCase()), day = Number(before ?? after);
      const date = new Date(Date.UTC(Number(year), month, day));
      return day && date.getUTCMonth() === month && date.getUTCDate() === day
        ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : original;
    }
  );
}
export function score(scenario, events, records, provenance) {
  if (!provenance?.packageHash?.trim() || !provenance?.matrixHash?.trim() ||
    !provenance?.catalogHash?.trim() || !provenance?.evidenceHash?.trim()) {
    throw new Error('Observed scoring requires package, matrix, catalog and raw-evidence provenance.');
  }
  const observed = normalizeEvents(events);
  const problems = [];
  if (!observed.idle || !observed.answer) problems.push('Incomplete model session.');
  if (!observed.models.length || observed.models.some(model => model !== 'gpt-6.1-sol')) problems.push('Unexpected or unobserved model.');
  if (observed.loadedServers.length !== 1 || observed.loadedServers[0].name !== 'workiq' ||
    observed.loadedServers[0].toolCount !== 12) problems.push('MCP catalog isolation was not established.');
  const modelCalls = observed.calls.filter(call => logicalTool(call.name));
  const modelSignatures = modelCalls.map(signature).sort();
  const serverSignatures = records.map(signature).sort();
  if (JSON.stringify(modelSignatures) !== JSON.stringify(serverSignatures)) problems.push('Model and MCP execution evidence do not match.');
  if (observed.calls.some(call => /view|read_file|powershell|shell/.test(call.name ?? '') &&
    /scenario\.json|mock-calls\.jsonl|expected-results|matrix\.mjs|native-schemas\.json/.test(JSON.stringify(call.arguments)))) {
    problems.push('The model attempted to inspect private fixture/oracle material.');
  }
  const rawAttempts = observed.calls.filter(downloadAttempt);
  const unrequestedDownloads = scenario.allowDownload ? 0 : rawAttempts.length;
  const relevant = records.filter(record => taskRelevant(record, scenario));
  const nativeRouting = scenario.nativeEligible ? relevant.length > 0 : null;
  const successfulRelevant = relevant.filter(record => !failedResult(record.result));
  const successfulData = records.filter(record => record.valid && !failedResult(record.result) &&
    !['search_paths', 'get_schema', 'list_agents'].includes(record.name) &&
    !record.paths.some(url => helperPaths.has(url)));
  const answer = observed.answer.replace(/\*\*|`/g, '');
  const factChecks = scenario.expected.map(pattern => new RegExp(pattern, 'i').test(factText(answer)));
  let correct = factChecks.every(Boolean) && successfulData.length > 0;
  if (scenario.needsCitation || scenario.batch) correct &&= sourceLinksPresent(answer,
    scenario.batch ? scenario.context.docs : [scenario.context.docs[0]]);
  if (scenario.failure) {
    const expectedCode = { denied: 401, missing: 404, unsupported: 501, throttled: 429 }[scenario.failure];
    correct = factChecks.every(Boolean) && (expectedCode ? records.some(record => record.valid &&
      resultValues(record.result).some(value => value?.statusCode === expectedCode)) : successfulData.length > 0);
    if (scenario.failure === 'denied') {
      const firstDenied = records.findIndex(record => resultValues(record.result).some(value =>
        value?.statusCode === 401 || value?.statusCode === 403));
      if (firstDenied >= 0 && records.slice(firstDenied + 1).some(record =>
        !['search_paths', 'get_schema'].includes(record.name) &&
        !(record.paths.length && record.paths.every(url => helperPaths.has(url))))) correct = false;
    }
    if (scenario.failure !== 'ambiguous' && answer.includes(scenario.context.docs[0].gate)) correct = false;
  }
  if (scenario.effect) correct &&= records.some(record => record.effectApplied) &&
    records.some(record => record.effectVerified);
  if (scenario.family === 'regression') correct &&= !records.some(record => record.paths.some(url => url.startsWith('/sharepoint/')));
  if (scenario.family === 'downloads') correct &&= rawAttempts.some(call => logicalTool(call.name) === 'fetch_blob' &&
    call.completion?.success === true && !failedResult(call.completion.result) &&
    records.some(record => signature(record) === signature(call) && record.valid && !failedResult(record.result)));
  const nativeRelevantIndex = records.findIndex(record => taskRelevant(record, scenario));
  const laterLegacyData = nativeRelevantIndex >= 0 && records.slice(nativeRelevantIndex + 1)
    .some(record => ['ask', 'retrieve', 'fetch', 'fetch_blob'].includes(record.name));
  const nativeEvidence = scenario.failure ? relevant.length > 0 : successfulRelevant.length > 0;
  const nativeSuccess = scenario.routingOnly ? null : scenario.nativeEligible
    ? Boolean(nativeRouting && correct && nativeEvidence && !laterLegacyData && !unrequestedDownloads) : null;
  const botdocUsed = scenario.botdoc ? Boolean(nativeRouting) : null;
  const botdocSuccess = scenario.botdoc ? Boolean(nativeSuccess) : null;
  const activation = observed.calls.some(call => call.name === 'skill' &&
    /workiq|sharepoint/.test(call.arguments.skill ?? '')) ? 'observed' : 'unknown';
  const referenceReads = observed.calls.filter(call => /view|read_file/.test(call.name ?? ''))
    .flatMap(call => {
      const target = call.arguments.path ?? call.arguments.filePath ?? '';
      const match = target.replaceAll('\\', '/').match(/(?:^|\/)references\/([^/]+\.md)$/);
      return match ? [match[1]] : [];
    });
  return {
    schemaVersion: 1, scenarioId: scenario.id, family: scenario.family, split: scenario.split,
    layer: scenario.layer, ...provenance, instrumentationValid: problems.length === 0, problems,
    nativeEligible: scenario.nativeEligible, botdocEligible: scenario.botdoc,
    anyNativeHit: records.some(record => record.paths.some(url => url.startsWith('/sharepoint/'))),
    nativeRouting, nativeSuccess, botdocUsed, botdocSuccess, correct: scenario.routingOnly ? null : Boolean(correct),
    catalogPathSelected: scenario.routingOnly ? successfulRelevant.length > 0 : null,
    preferredOperationUsed: scenario.preferred ? relevant.some(record =>
      record.paths.some(url => scenario.preferred.includes(url))) : null,
    semanticSearchUsed: scenario.botdoc ? relevant.some(record =>
      record.paths.includes('/sharepoint/semantic_search')) : null,
    structuredTextUsed: scenario.botdoc ? relevant.some(record =>
      record.paths.includes('/sharepoint/get_structured_text')) : null,
    unrequestedDownloads, rawDownloadAttempts: rawAttempts.length, activation,
    referenceReads: [...new Set(referenceReads)], factChecks,
    operationPaths: records.filter(record => ['call_function', 'do_action'].includes(record.name)).flatMap(record => record.paths),
    invalidNativeAttempts: records.filter(record => record.paths.some(url => url.startsWith('/sharepoint/')) && !record.valid).length,
    toolCalls: observed.calls.length, modelCalls: observed.modelCalls,
    effectApplied: records.some(record => record.effectApplied), effectVerified: records.some(record => record.effectVerified)
  };
}

export function wilson(successes, count) {
  if (!count) return null;
  const z = 1.959963984540054, p = successes / count, d = 1 + z * z / count;
  const center = (p + z * z / (2 * count)) / d;
  const radius = z * Math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / d;
  return [Math.max(0, center - radius), Math.min(1, center + radius)];
}

export function metric(rows, key) {
  const eligible = rows.filter(row => row[key] !== null && row[key] !== undefined);
  const clusters = new Map();
  for (const row of eligible) {
    if (!clusters.has(row.scenarioId)) clusters.set(row.scenarioId, []);
    clusters.get(row.scenarioId).push(row);
  }
  const allRepeatPasses = [...clusters.values()].filter(runs =>
    runs.every(row => row.instrumentationValid && row[key] === true)).length;
  const successes = eligible.filter(row => row.instrumentationValid && row[key] === true).length;
  return {
    successes, runs: eligible.length, rate: eligible.length ? successes / eligible.length : null,
    cases: clusters.size, allRepeatPasses, caseInterval95: wilson(allRepeatPasses, clusters.size)
  };
}

export function summarize(rows) {
  return {
    runs: rows.length, uniqueCases: new Set(rows.map(row => row.scenarioId)).size,
    instrumentationFailures: rows.filter(row => !row.instrumentationValid).length,
    nativeRouting: metric(rows, 'nativeRouting'), nativeSuccess: metric(rows, 'nativeSuccess'),
    botdocUsed: metric(rows, 'botdocUsed'), botdocSuccess: metric(rows, 'botdocSuccess'),
    preferredOperationUsed: metric(rows, 'preferredOperationUsed'),
    semanticSearchUsed: metric(rows, 'semanticSearchUsed'),
    structuredTextUsed: metric(rows, 'structuredTextUsed'),
    catalogPathSelected: metric(rows, 'catalogPathSelected'),
    correct: metric(rows, 'correct'),
    unrequestedDownloadRuns: rows.filter(row => row.unrequestedDownloads).length,
    activationObservedRuns: rows.filter(row => row.activation === 'observed').length,
    referenceReadRuns: rows.filter(row => row.referenceReads.length).length
  };
}
