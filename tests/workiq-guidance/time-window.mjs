export function calendarWindowProblems(args, window) {
  const localTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
  if (!window || typeof window.path !== 'string' ||
      typeof window.timeZone !== 'string' || !window.timeZone ||
      !localTimestamp.test(window.startLocal) || !localTimestamp.test(window.endLocal)) {
    return ['A calendar-window scenario needs a path, named timezone, and second-precision local boundaries.'];
  }
  if (!args || !Array.isArray(args.entityUrls) || !args.entityUrls.length) return ['A calendar-window read needs entityUrls.'];
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: window.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
  } catch (error) {
    if (error instanceof RangeError) return [`Unsupported scenario timezone: ${window.timeZone}`];
    throw error;
  }
  const errors = [];
  for (const raw of args.entityUrls) {
    if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
      errors.push('Calendar URLs must be supported relative paths.');
      continue;
    }
    const url = new URL(raw, 'https://fixture.invalid');
    if (url.pathname !== window.path) {
      errors.push('Calendar read changed the requested resource.');
      continue;
    }
    const instants = [];
    for (const [parameter, expected] of [['startDateTime', window.startLocal], ['endDateTime', window.endLocal]]) {
      const values = url.searchParams.getAll(parameter);
      if (values.length !== 1 || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(values[0])) {
        errors.push(`${parameter} needs one explicit, URL-encoded offset or UTC timestamp.`);
        continue;
      }
      const instant = new Date(values[0]);
      if (!Number.isFinite(instant.getTime())) {
        errors.push(`${parameter} is not a valid timestamp.`);
        continue;
      }
      const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
      const actual = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
      if (actual !== expected || instant.getUTCMilliseconds() !== 0) {
        errors.push(`${parameter} does not round-trip to ${expected} in ${window.timeZone}.`);
      }
      instants.push(instant.getTime());
    }
    if (instants.length === 2 && instants[1] <= instants[0]) errors.push('Calendar end must be after start.');
  }
  return errors;
}
