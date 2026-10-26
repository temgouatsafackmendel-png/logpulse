import { LogEntry, LogFormatType, LogLevel } from '../types/log';

// Helper to determine LogLevel from text
export function detectLogLevel(text: string): LogLevel {
  const upper = text.toUpperCase();
  if (/\b(FATAL|CRITICAL|PANIC|EMERGENCY|SEVERE)\b/.test(upper)) return 'FATAL';
  if (/\b(ERROR|ERR|FAIL|FAILED|EXCEPTION)\b/.test(upper)) return 'ERROR';
  if (/\b(WARN|WARNING)\b/.test(upper)) return 'WARN';
  if (/\b(DEBUG|DBG)\b/.test(upper)) return 'DEBUG';
  if (/\b(TRACE)\b/.test(upper)) return 'TRACE';
  return 'INFO';
}

// Convert arbitrary timestamp string to ms timestamp
export function parseTimestampToMs(timestampStr?: string): number {
  if (!timestampStr) return Date.now();
  const direct = Date.parse(timestampStr);
  if (!isNaN(direct)) return direct;

  // Nginx/Apache format: 26/Oct/2026:14:15:20 +0000
  const apacheMatch = timestampStr.match(/(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/);
  if (apacheMatch) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    const [, d, mon, y, h, m, s] = apacheMatch;
    const isoStr = `${y}-${months[mon] || '01'}-${d}T${h}:${m}:${s}Z`;
    const parsed = Date.parse(isoStr);
    if (!isNaN(parsed)) return parsed;
  }

  // Syslog format: Oct 26 14:15:20
  const syslogMatch = timestampStr.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (syslogMatch) {
    const now = new Date();
    const parsed = Date.parse(`${syslogMatch[1]} ${syslogMatch[2]}, ${now.getFullYear()} ${syslogMatch[3]}:${syslogMatch[4]}:${syslogMatch[5]}`);
    if (!isNaN(parsed)) return parsed;
  }

  return Date.now();
}

// Format a timestamp nicely in local or UTC
export function formatLogTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const padMs = (n: number) => n.toString().padStart(3, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${padMs(d.getMilliseconds())}`;
}

export function formatLogDateFull(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 1. JSON Parser
function tryParseJson(line: string, id: string, lineNumber: number): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const obj = JSON.parse(trimmed);
    const timeStr = obj.time || obj.timestamp || obj['@timestamp'] || obj.date || obj.datetime || '';
    const levelStr = obj.level || obj.severity || obj.log_level || obj.lvl || 'INFO';
    const message = obj.message || obj.msg || obj.log || obj.err || obj.error || JSON.stringify(obj);
    const service = obj.service || obj.app || obj.application || obj.component || obj.logger || undefined;
    const status = typeof obj.status === 'number' ? obj.status : (typeof obj.statusCode === 'number' ? obj.statusCode : undefined);
    const duration = typeof obj.duration_ms === 'number' ? obj.duration_ms : (typeof obj.latency === 'number' ? obj.latency : undefined);
    const stackTrace = obj.stack || obj.stack_trace || obj.stacktrace || obj.exception;

    return {
      id,
      lineNumber,
      raw: line,
      timestamp: timeStr ? String(timeStr) : new Date().toISOString(),
      timestampMs: parseTimestampToMs(timeStr),
      level: detectLogLevel(String(levelStr)),
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      service: service ? String(service) : undefined,
      host: obj.host ? String(obj.host) : undefined,
      status,
      method: obj.method || obj.httpMethod,
      path: obj.path || obj.url || obj.route,
      ip: obj.ip || obj.client_ip || obj.remote_addr,
      durationMs: duration,
      stackTrace: stackTrace ? String(stackTrace) : undefined,
      structured: obj,
    };
  } catch {
    return null;
  }
}

// 2. Nginx / Apache Combined / Common Log
// Example: 192.168.1.1 - user [26/Oct/2026:14:20:00 +0000] "POST /api/v1/auth HTTP/1.1" 502 432 "https://site.com" "Mozilla/5.0..." 1.425
const NGINX_REGEX = /^(\S+)\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^\s"]+)(?:\s+HTTP\/[\d.]+)?(?:")?\s+(\d{3})\s+(\d+|-)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?(?:\s+([\d.]+))?/;

function tryParseNginx(line: string, id: string, lineNumber: number): LogEntry | null {
  const match = line.match(NGINX_REGEX);
  if (!match) return null;

  const [, ip, , timestamp, method, path, statusStr, bytes, , , requestTime] = match;
  const status = parseInt(statusStr, 10);
  const durationMs = requestTime ? Math.round(parseFloat(requestTime) * 1000) : undefined;

  let level: LogLevel = 'INFO';
  if (status >= 500) level = 'ERROR';
  else if (status >= 400) level = 'WARN';

  return {
    id,
    lineNumber,
    raw: line,
    timestamp,
    timestampMs: parseTimestampToMs(timestamp),
    level,
    message: `${method} ${path} -> ${status} (${durationMs !== undefined ? `${durationMs}ms` : `${bytes}B`})`,
    service: 'nginx-ingress',
    status,
    method,
    path,
    ip,
    durationMs,
    structured: { ip, method, path, status, bytes, requestTime },
  };
}

// 3. Spring Boot / Java / Logback format
// Example: 2026-10-26 14:15:30.123 ERROR 12345 --- [nio-8080-exec-1] c.e.payment.service.BillingService : Payment failed
const SPRING_REGEX = /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+([A-Z]+)\s+(?:\d+\s+---\s+\[[^\]]*\]\s+)?([^\s:]+)\s*:\s*(.*)/;

function tryParseSpringBoot(line: string, id: string, lineNumber: number): LogEntry | null {
  const match = line.match(SPRING_REGEX);
  if (!match) return null;

  const [, timestamp, levelStr, logger, message] = match;
  const level = detectLogLevel(levelStr);
  const service = logger.split('.').pop() || logger;

  return {
    id,
    lineNumber,
    raw: line,
    timestamp,
    timestampMs: parseTimestampToMs(timestamp),
    level,
    message,
    service,
    host: 'k8s-pod',
    structured: { logger, originalLevel: levelStr },
  };
}

// 4. Syslog RFC 3164 / 5424
// Example: Oct 26 14:15:20 server-prod sshd[14285]: Failed password for invalid user root from 192.168.1.100 port 55432 ssh2
const SYSLOG_REGEX = /^([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([\w.-]+)\s+([^:\[]+)(?:\[(\d+)\])?:\s*(.*)/;

function tryParseSyslog(line: string, id: string, lineNumber: number): LogEntry | null {
  const match = line.match(SYSLOG_REGEX);
  if (!match) return null;

  const [, timestamp, host, program, pid, message] = match;
  const level = detectLogLevel(message);

  // Extract possible IP from message
  const ipMatch = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);

  return {
    id,
    lineNumber,
    raw: line,
    timestamp,
    timestampMs: parseTimestampToMs(timestamp),
    level,
    message,
    service: program.trim(),
    host,
    ip: ipMatch ? ipMatch[0] : undefined,
    structured: { host, program, pid },
  };
}

// 5. Key-Value format (logfmt)
// Example: time="2026-10-26T14:15:20Z" level=error msg="database ping timeout" cluster=prod-eu db_pool=primary latency_ms=450
function tryParseKeyValue(line: string, id: string, lineNumber: number): LogEntry | null {
  if (!line.includes('=') || !/(level|lvl|msg|time)=/i.test(line)) return null;

  const kvRegex = /([a-zA-Z0-9_.-]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;
  const kv: Record<string, string> = {};
  let count = 0;

  while ((match = kvRegex.exec(line)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    kv[key] = val;
    count++;
  }

  if (count < 2) return null;

  const timeStr = kv.time || kv.timestamp || kv.ts;
  const levelStr = kv.level || kv.lvl || kv.severity || 'INFO';
  const message = kv.msg || kv.message || kv.error || line;
  const service = kv.service || kv.app || kv.cluster || kv.component;
  const status = kv.status ? parseInt(kv.status, 10) : undefined;
  const duration = kv.latency_ms || kv.duration_ms || kv.elapsed_ms ? parseFloat(kv.latency_ms || kv.duration_ms || kv.elapsed_ms) : undefined;

  return {
    id,
    lineNumber,
    raw: line,
    timestamp: timeStr || new Date().toISOString(),
    timestampMs: parseTimestampToMs(timeStr),
    level: detectLogLevel(levelStr),
    message,
    service,
    status: isNaN(status!) ? undefined : status,
    durationMs: isNaN(duration!) ? undefined : duration,
    structured: kv,
  };
}

// 6. Generic Fallback Parser
function parseGenericLine(line: string, id: string, lineNumber: number): LogEntry {
  const level = detectLogLevel(line);

  // Look for any ISO or standard timestamp
  const dateMatch = line.match(/\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/) ||
                    line.match(/\b[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/);
  const timestampStr = dateMatch ? dateMatch[0] : undefined;

  // Look for HTTP status codes
  const statusMatch = line.match(/\b(HTTP\/\d(?:\.\d)?\s+)?([1-5]\d{2})\b/);
  const status = statusMatch ? parseInt(statusMatch[2], 10) : undefined;

  // Look for IP
  const ipMatch = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);

  return {
    id,
    lineNumber,
    raw: line,
    timestamp: timestampStr || new Date().toISOString(),
    timestampMs: parseTimestampToMs(timestampStr),
    level,
    message: line,
    status,
    ip: ipMatch ? ipMatch[0] : undefined,
  };
}

// Custom Regex Parser with Named Capture Groups
export function parseWithCustomRegex(
  text: string,
  regexPattern: string,
  regexFlags: string = 'g'
): LogEntry[] {
  try {
    const regex = new RegExp(regexPattern, regexFlags);
    const lines = text.split('\n');
    const results: LogEntry[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = regex.exec(line);
      const id = `custom-${idx + 1}`;

      if (match && match.groups) {
        const groups = match.groups;
        const level = groups.level ? detectLogLevel(groups.level) : detectLogLevel(line);
        const timestamp = groups.timestamp || new Date().toISOString();
        const status = groups.status ? parseInt(groups.status, 10) : undefined;
        const duration = groups.duration ? parseFloat(groups.duration) : undefined;

        results.push({
          id,
          lineNumber: idx + 1,
          raw: line,
          timestamp,
          timestampMs: parseTimestampToMs(timestamp),
          level,
          message: groups.message || line,
          service: groups.service,
          host: groups.host,
          status: isNaN(status!) ? undefined : status,
          ip: groups.ip,
          durationMs: isNaN(duration!) ? undefined : duration,
          structured: groups,
        });
      } else {
        results.push(parseGenericLine(line, id, idx + 1));
      }
    });

    return results;
  } catch (err) {
    console.error('Custom regex error:', err);
    return parseLogContent(text);
  }
}

// Master Log Content Parser
// Takes raw text, splits lines, binds multiline stacktraces (Java / Python),
// and parses each entry into a structured LogEntry.
export function parseLogContent(
  rawContent: string,
  formatHint: LogFormatType = 'AUTO'
): LogEntry[] {
  if (!rawContent || !rawContent.trim()) return [];

  const rawLines = rawContent.split(/\r?\n/);
  const entries: LogEntry[] = [];

  let currentEntry: LogEntry | null = null;
  let stackTraceBuffer: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check if line is continuation of stack trace (tab, at com..., Caused by:, etc.)
    const isStackTraceLine =
      /^\s+at\s+|^Caused by:|^Traceback \(most recent call last\):|^\s+File "|\s+\.\.\. \d+ more/i.test(line);

    if (isStackTraceLine && currentEntry) {
      stackTraceBuffer.push(line);
      continue;
    }

    // If we were accumulating a stack trace, finalize it for previous entry
    if (currentEntry && stackTraceBuffer.length > 0) {
      currentEntry.stackTrace = stackTraceBuffer.join('\n');
      stackTraceBuffer = [];
    }

    if (!trimmed) continue;

    const id = `log-${i + 1}-${Date.now().toString(36)}`;
    let parsed: LogEntry | null = null;

    if (formatHint === 'JSON' || (formatHint === 'AUTO' && trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      parsed = tryParseJson(line, id, i + 1);
    }

    if (!parsed && (formatHint === 'NGINX_APACHE' || formatHint === 'AUTO')) {
      parsed = tryParseNginx(line, id, i + 1);
    }

    if (!parsed && (formatHint === 'SPRING_JAVA' || formatHint === 'AUTO')) {
      parsed = tryParseSpringBoot(line, id, i + 1);
    }

    if (!parsed && (formatHint === 'SYSLOG' || formatHint === 'AUTO')) {
      parsed = tryParseSyslog(line, id, i + 1);
    }

    if (!parsed && (formatHint === 'KEY_VALUE' || formatHint === 'AUTO')) {
      parsed = tryParseKeyValue(line, id, i + 1);
    }

    if (!parsed) {
      parsed = parseGenericLine(line, id, i + 1);
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }
    currentEntry = parsed;
  }

  if (currentEntry) {
    if (stackTraceBuffer.length > 0) {
      currentEntry.stackTrace = stackTraceBuffer.join('\n');
    }
    entries.push(currentEntry);
  }

  return entries;
}
