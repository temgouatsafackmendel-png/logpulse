export type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

export interface LogEntry {
  id: string;
  raw: string;
  timestamp: string; // ISO format or string representation
  timestampMs: number; // For fast timeline sorting and bucketing
  level: LogLevel;
  message: string;
  service?: string;
  host?: string;
  status?: number; // HTTP status (200, 404, 500, 502...)
  method?: string; // GET, POST...
  path?: string; // Request URL
  ip?: string; // Client or remote IP
  durationMs?: number; // Response time in ms
  stackTrace?: string; // Multi-line exception stack trace
  structured?: Record<string, any>; // JSON or custom key-value payload
  lineNumber?: number;
}

export interface LogFilter {
  search: string; // Free text or structured query
  levels: Set<LogLevel>;
  services: Set<string>;
  statusRange: 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'errors';
  timeRange: 'all' | '15m' | '1h' | '6h' | '24h' | 'custom';
  customStartTime?: number;
  customEndTime?: number;
  slowOnly: boolean; // Duration > 500ms
}

export interface ErrorSignature {
  signatureId: string;
  template: string;
  count: number;
  level: LogLevel;
  firstSeen: string;
  lastSeen: string;
  services: string[];
  sampleLog: LogEntry;
}

export interface IncidentReport {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  rootCause: string;
  impactedServices: string[];
  immediateActions: string[];
  preventiveMeasures: string[];
  technicalDetails?: string;
}

export interface SingleLogExplanation {
  meaning: string;
  probableCause: string;
  resolutionSteps: string[];
  commandOrCodeFix?: string;
}

export type LogFormatType =
  | 'AUTO'
  | 'JSON'
  | 'NGINX_APACHE'
  | 'SYSLOG'
  | 'SPRING_JAVA'
  | 'KEY_VALUE'
  | 'CUSTOM_REGEX';
