import { ErrorSignature, LogEntry } from '../types/log';

// Normalize error message into a template by masking variable parts:
// - UUIDs (e.g. 123e4567-e89b-12d3-a456-426614174000)
// - IP addresses (e.g. 192.168.1.1)
// - Numbers / IDs (e.g. order_id=48291, status 502)
// - Timestamps and dates
// - Hex hashes / tokens
export function generateErrorTemplate(message: string): string {
  if (!message) return 'Unknown error';

  let normalized = message
    // Mask UUIDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '<UUID>')
    // Mask IPv4
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<IP>')
    // Mask Hex hashes or long tokens (8+ hex chars)
    .replace(/\b0x[0-9a-fA-F]+\b|\b[0-9a-fA-F]{16,}\b/g, '<HASH>')
    // Mask ISO dates & timestamps
    .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, '<TIME>')
    // Mask standalone numbers
    .replace(/\b\d+\b/g, '<NUM>')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();

  // If too long, truncate template preview cleanly
  if (normalized.length > 140) {
    normalized = normalized.substring(0, 137) + '...';
  }

  return normalized;
}

export function clusterErrors(logs: LogEntry[]): ErrorSignature[] {
  const errorLogs = logs.filter(
    (l) => l.level === 'FATAL' || l.level === 'ERROR' || l.level === 'WARN'
  );

  const clusterMap = new Map<
    string,
    {
      template: string;
      logs: LogEntry[];
      services: Set<string>;
    }
  >();

  for (const log of errorLogs) {
    const template = generateErrorTemplate(log.message);
    const key = `${log.level}:::${template}`;

    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        template,
        logs: [],
        services: new Set<string>(),
      });
    }

    const item = clusterMap.get(key)!;
    item.logs.push(log);
    if (log.service) {
      item.services.add(log.service);
    }
  }

  const results: ErrorSignature[] = [];
  let sigId = 1;

  for (const [, item] of clusterMap.entries()) {
    const sorted = [...item.logs].sort((a, b) => a.timestampMs - b.timestampMs);
    const sample = sorted[0];

    results.push({
      signatureId: `sig-${sigId++}`,
      template: item.template,
      count: item.logs.length,
      level: sample.level,
      firstSeen: sorted[0].timestamp,
      lastSeen: sorted[sorted.length - 1].timestamp,
      services: Array.from(item.services),
      sampleLog: sample,
    });
  }

  // Sort by highest occurrence count
  return results.sort((a, b) => b.count - a.count);
}
