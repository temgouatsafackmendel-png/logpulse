import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LogEntry, LogFilter, LogLevel } from './types/log';
import { getInitialDemoLogs, DEMO_DATASETS, DemoDataset } from './utils/demoData';
import { parseLogContent, parseWithCustomRegex } from './utils/parser';
import { Header } from './components/Header';
import { KPIStrip } from './components/KPIStrip';
import { LogHistogram } from './components/LogHistogram';
import { QueryBar } from './components/QueryBar';
import { LogTable } from './components/LogTable';
import { LogTerminalView } from './components/LogTerminalView';
import { FacetSidebar } from './components/FacetSidebar';
import { LogDrawer } from './components/LogDrawer';
import { IncidentAIModal } from './components/IncidentAIModal';
import { IngestionModal } from './components/IngestionModal';
import { ErrorSignaturesView } from './components/ErrorSignaturesView';
import { CustomRegexBuilder } from './components/CustomRegexBuilder';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  // 1. Initial State with rich realistic enterprise scenario
  const [logs, setLogs] = useState<LogEntry[]>(() => getInitialDemoLogs());
  const [sourceName, setSourceName] = useState<string>('Panne Microservices & Pool PostgreSQL');
  const [activeTab, setActiveTab] = useState<'logs' | 'clusters' | 'regex'>('logs');
  const [viewMode, setViewMode] = useState<'table' | 'terminal'>('table');
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [isFacetSidebarOpen, setIsFacetSidebarOpen] = useState<boolean>(true);

  // 2. Modals and Drawers
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // 3. Live Streaming Mode (tail -f simulator)
  const [isStreaming, setIsStreaming] = useState(false);

  // 4. Filters State
  const [filter, setFilter] = useState<LogFilter>({
    search: '',
    levels: new Set<LogLevel>(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
    services: new Set<string>(),
    statusRange: 'all',
    timeRange: 'all',
    slowOnly: false,
  });

  // Selected time zoom range from histogram
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ startMs: number; endMs: number } | null>(null);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Space for toggle live tail (only if not typing in input/textarea)
      if (
        e.key === ' ' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsStreaming((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // 5. Live Log Streaming Generator Effect
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const services = ['order-api', 'payment-gateway', 'inventory-worker', 'auth-service', 'nginx-ingress'];
      const svc = services[Math.floor(Math.random() * services.length)];
      const rand = Math.random();

      let newLog: LogEntry;
      if (rand < 0.15) {
        newLog = {
          id: `live-${now}-${Math.random().toString(36).substring(2, 6)}`,
          raw: `${new Date(now).toISOString()} ERROR [${svc}] Transaction rollback triggered: connection timeout after 3000ms`,
          timestamp: new Date(now).toISOString(),
          timestampMs: now,
          level: 'ERROR',
          service: svc,
          message: `Transaction rollback triggered: connection timeout after 3000ms on table '${svc}_tx'`,
          status: 500,
          durationMs: Math.floor(2500 + Math.random() * 1000),
          lineNumber: logs.length + 1,
        };
      } else if (rand < 0.3) {
        newLog = {
          id: `live-${now}-${Math.random().toString(36).substring(2, 6)}`,
          raw: `${new Date(now).toISOString()} WARN [${svc}] Connection pool buffer reached 92% capacity`,
          timestamp: new Date(now).toISOString(),
          timestampMs: now,
          level: 'WARN',
          service: svc,
          message: `Connection pool buffer reached 92% capacity. Wait queue length: 18`,
          status: 429,
          durationMs: Math.floor(450 + Math.random() * 300),
          lineNumber: logs.length + 1,
        };
      } else {
        newLog = {
          id: `live-${now}-${Math.random().toString(36).substring(2, 6)}`,
          raw: `${new Date(now).toISOString()} INFO [${svc}] Request processed successfully 200 OK`,
          timestamp: new Date(now).toISOString(),
          timestampMs: now,
          level: 'INFO',
          service: svc,
          message: `Request processed successfully 200 OK for trace_id=tr_${now.toString(16)}`,
          status: 200,
          durationMs: Math.floor(20 + Math.random() * 60),
          lineNumber: logs.length + 1,
        };
      }

      setLogs((prev) => [newLog, ...prev.slice(0, 499)]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isStreaming, logs.length]);

  // 6. Available services for filtering
  const availableServices = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.service).filter(Boolean))) as string[];
  }, [logs]);

  // 7. Filtering & Search Evaluation Engine
  const filteredLogs = useMemo(() => {
    const searchTrimmed = filter.search.trim().toLowerCase();

    // Check for structured query tags in search bar:
    // e.g. "level:ERROR", "status:502", "service:payment", "duration:>500", "ip:192.168"
    let syntaxLevel: string | null = null;
    let syntaxService: string | null = null;
    let syntaxStatus: number | null = null;
    let syntaxStatusGte: number | null = null;
    let syntaxDurationGt: number | null = null;
    let syntaxIp: string | null = null;
    let freeTextParts: string[] = [];

    if (searchTrimmed) {
      const tokens = searchTrimmed.split(/\s+/);
      for (const token of tokens) {
        if (token.startsWith('level:')) {
          syntaxLevel = token.substring(6).toUpperCase();
        } else if (token.startsWith('service:')) {
          syntaxService = token.substring(8);
        } else if (token.startsWith('status:>=')) {
          syntaxStatusGte = parseInt(token.substring(9), 10);
        } else if (token.startsWith('status:')) {
          syntaxStatus = parseInt(token.substring(7), 10);
        } else if (token.startsWith('duration:>')) {
          syntaxDurationGt = parseFloat(token.substring(10));
        } else if (token.startsWith('ip:')) {
          syntaxIp = token.substring(3);
        } else {
          freeTextParts.push(token);
        }
      }
    }

    const freeTextQuery = freeTextParts.join(' ');

    return logs.filter((log) => {
      // Level filter
      if (!filter.levels.has(log.level)) return false;
      if (syntaxLevel && log.level !== syntaxLevel) return false;

      // Service filter (from facets or syntax)
      if (filter.services.size > 0 && log.service && !filter.services.has(log.service)) {
        return false;
      }
      if (syntaxService && (!log.service || !log.service.toLowerCase().includes(syntaxService))) {
        return false;
      }

      // HTTP status filters
      if (syntaxStatus !== null && log.status !== syntaxStatus) return false;
      if (syntaxStatusGte !== null && (!log.status || log.status < syntaxStatusGte)) return false;

      if (filter.statusRange !== 'all') {
        if (!log.status) return false;
        if (filter.statusRange === '2xx' && (log.status < 200 || log.status >= 300)) return false;
        if (filter.statusRange === '3xx' && (log.status < 300 || log.status >= 400)) return false;
        if (filter.statusRange === '4xx' && (log.status < 400 || log.status >= 500)) return false;
        if (filter.statusRange === '5xx' && (log.status < 500 || log.status >= 600)) return false;
      }

      // Latency filter
      if (syntaxDurationGt !== null && (!log.durationMs || log.durationMs <= syntaxDurationGt)) {
        return false;
      }
      if (filter.slowOnly && (!log.durationMs || log.durationMs < 500)) {
        return false;
      }

      // IP syntax filter
      if (syntaxIp && (!log.ip || !log.ip.includes(syntaxIp))) {
        return false;
      }

      // Time histogram zoom filter
      if (selectedTimeRange) {
        if (log.timestampMs < selectedTimeRange.startMs || log.timestampMs > selectedTimeRange.endMs) {
          return false;
        }
      }

      // Free text search across message, raw, service, path, ip
      if (freeTextQuery) {
        const fullContent = `${log.message} ${log.raw} ${log.service || ''} ${log.path || ''} ${log.ip || ''}`.toLowerCase();
        if (!fullContent.includes(freeTextQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, filter, selectedTimeRange]);

  // Ingest logs handler
  const handleIngestLogs = useCallback((newLogs: LogEntry[], name: string) => {
    setLogs(newLogs);
    setSourceName(name);
    setSelectedTimeRange(null);
    setFilter((prev) => ({
      ...prev,
      search: '',
      levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
      services: new Set(),
      statusRange: 'all',
      slowOnly: false,
    }));
  }, []);

  const handleSelectDatasetFromPalette = (dataset: DemoDataset) => {
    const raw = dataset.generateRaw();
    const parsed = parseLogContent(raw, dataset.format);
    handleIngestLogs(parsed, dataset.name);
  };

  // Quick filter helpers
  const handleSelectLevelFromKPI = (lvl: 'ALL' | 'ERROR' | 'WARN' | 'INFO') => {
    if (lvl === 'ALL') {
      setFilter((prev) => ({
        ...prev,
        levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
      }));
    } else if (lvl === 'ERROR') {
      setFilter((prev) => ({
        ...prev,
        levels: new Set(['FATAL', 'ERROR']),
      }));
    } else if (lvl === 'WARN') {
      setFilter((prev) => ({
        ...prev,
        levels: new Set(['WARN']),
      }));
    } else if (lvl === 'INFO') {
      setFilter((prev) => ({
        ...prev,
        levels: new Set(['INFO', 'DEBUG']),
      }));
    }
  };

  const handleApplyFilterField = (field: string, val: string) => {
    setFilter((prev) => ({
      ...prev,
      search: `${prev.search} ${field}:${val}`.trim(),
    }));
  };

  const handleFilterBySignature = (template: string) => {
    const cleanWords = template.replace(/<[^>]+>/g, '').trim().split(/\s+/).slice(0, 3).join(' ');
    setFilter((prev) => ({
      ...prev,
      search: cleanWords,
    }));
    setActiveTab('logs');
  };

  // Export to CSV / JSON / TXT
  const handleExport = (format: 'csv' | 'json' | 'txt') => {
    let content = '';
    let mimeType = 'text/plain';
    let filename = `logpulse-export-${Date.now()}`;

    if (format === 'csv') {
      mimeType = 'text/csv';
      filename += '.csv';
      const headers = ['id', 'timestamp', 'level', 'service', 'status', 'duration_ms', 'ip', 'message'];
      const rows = filteredLogs.map((l) => [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${l.level}"`,
        `"${l.service || ''}"`,
        l.status || '',
        l.durationMs || '',
        `"${l.ip || ''}"`,
        `"${(l.message || '').replace(/"/g, '""')}"`,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (format === 'json') {
      mimeType = 'application/json';
      filename += '.json';
      content = JSON.stringify(filteredLogs, null, 2);
    } else {
      filename += '.log';
      content = filteredLogs.map((l) => l.raw).join('\n');
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom regex applicator
  const handleApplyCustomRegex = (pattern: string, flags: string) => {
    const rawAll = logs.map((l) => l.raw).join('\n');
    const parsed = parseWithCustomRegex(rawAll, pattern, flags);
    setLogs(parsed);
    setActiveTab('logs');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased font-sans select-none">
      {/* 1. Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngest={() => setIsIngestModalOpen(true)}
        onOpenIncidentAI={() => setIsIncidentModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isStreaming={isStreaming}
        setIsStreaming={setIsStreaming}
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentDatasetName={sourceName}
      />

      {/* 2. Top Telemetry KPI Bar */}
      <KPIStrip
        logs={logs}
        filteredLogs={filteredLogs}
        selectedLevelFilter={
          filter.levels.size === 6
            ? 'ALL'
            : filter.levels.size === 2 && filter.levels.has('FATAL') && filter.levels.has('ERROR')
            ? 'ERROR'
            : filter.levels.size === 1 && filter.levels.has('WARN')
            ? 'WARN'
            : ''
        }
        onSelectLevel={handleSelectLevelFromKPI}
      />

      {/* 3. Event Severity Histogram */}
      <LogHistogram
        logs={logs}
        filteredLogs={filteredLogs}
        selectedRange={selectedTimeRange}
        onTimeSelect={(startMs, endMs) => setSelectedTimeRange({ startMs, endMs })}
        onResetTime={() => setSelectedTimeRange(null)}
      />

      {/* Main Workspace: Facet Sidebar + Stream View */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Facet Sidebar (when on 'logs' tab) */}
        {activeTab === 'logs' && (
          <FacetSidebar
            logs={logs}
            filter={filter}
            setFilter={setFilter}
            isOpen={isFacetSidebarOpen}
            onToggle={() => setIsFacetSidebarOpen(!isFacetSidebarOpen)}
          />
        )}

        {/* Central Viewport */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* TAB 1: LOGS STREAM */}
          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col min-h-0">
              <QueryBar
                filter={filter}
                setFilter={setFilter}
                totalCount={logs.length}
                filteredCount={filteredLogs.length}
                availableServices={availableServices}
                onExport={handleExport}
                logs={logs}
                wordWrap={wordWrap}
                setWordWrap={setWordWrap}
              />

              {viewMode === 'table' ? (
                <LogTable
                  logs={filteredLogs}
                  searchQuery={filter.search}
                  onSelectLog={(log) => setSelectedLog(log)}
                  onExplainLogWithAI={(log) => setSelectedLog(log)}
                  wordWrap={wordWrap}
                />
              ) : (
                <LogTerminalView
                  logs={filteredLogs}
                  searchQuery={filter.search}
                  onSelectLog={(log) => setSelectedLog(log)}
                  onExplainLogWithAI={(log) => setSelectedLog(log)}
                  isStreaming={isStreaming}
                  wordWrap={wordWrap}
                />
              )}
            </div>
          )}

          {/* TAB 2: CLUSTERED ERROR SIGNATURES */}
          {activeTab === 'clusters' && (
            <ErrorSignaturesView
              logs={logs}
              onFilterBySignature={handleFilterBySignature}
              onExplainLogWithAI={(log) => setSelectedLog(log)}
            />
          )}

          {/* TAB 3: CUSTOM REGEX PARSER BUILDER */}
          {activeTab === 'regex' && (
            <CustomRegexBuilder
              logs={logs}
              onApplyCustomRegex={handleApplyCustomRegex}
            />
          )}
        </div>
      </div>

      {/* Slide-over Log Detail Drawer */}
      <LogDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        allLogs={logs}
        onApplyFilter={handleApplyFilterField}
        onSelectLog={(l) => setSelectedLog(l)}
      />

      {/* Root Cause Analysis (RCA) Incident AI Modal */}
      <IncidentAIModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        logs={logs}
        filteredLogs={filteredLogs}
      />

      {/* Ingestion & Dataset Selection Modal */}
      <IngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestLogs={handleIngestLogs}
      />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectDataset={handleSelectDatasetFromPalette}
        onTriggerRCA={() => setIsIncidentModalOpen(true)}
        onFilterErrorsOnly={() =>
          setFilter((p) => ({
            ...p,
            levels: new Set(['FATAL', 'ERROR']),
          }))
        }
        onFilterReset={() =>
          setFilter({
            search: '',
            levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
            services: new Set(),
            statusRange: 'all',
            timeRange: 'all',
            slowOnly: false,
          })
        }
        onToggleStreaming={() => setIsStreaming((prev) => !prev)}
        isStreaming={isStreaming}
        onToggleViewMode={() =>
          setViewMode((prev) => (prev === 'table' ? 'terminal' : 'table'))
        }
        viewMode={viewMode}
        onExport={handleExport}
      />
    </div>
  );
}
