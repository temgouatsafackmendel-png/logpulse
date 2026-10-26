import React from 'react';
import { LogEntry } from '../types/log';
import { AlertOctagon, AlertTriangle, Layers, Clock, Activity } from 'lucide-react';

interface KPIStripProps {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  selectedLevelFilter?: string;
  onSelectLevel: (lvl: 'ALL' | 'ERROR' | 'WARN' | 'INFO') => void;
}

export const KPIStrip: React.FC<KPIStripProps> = ({
  logs,
  filteredLogs,
  selectedLevelFilter = 'ALL',
  onSelectLevel,
}) => {
  const total = logs.length;
  const errors = logs.filter((l) => l.level === 'FATAL' || l.level === 'ERROR').length;
  const warnings = logs.filter((l) => l.level === 'WARN').length;
  const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';

  // Calculate average latency if logs contain durationMs
  const logsWithDuration = logs.filter((l) => typeof l.durationMs === 'number' && l.durationMs > 0);
  const avgLatency =
    logsWithDuration.length > 0
      ? Math.round(
          logsWithDuration.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) /
            logsWithDuration.length
        )
      : null;

  // Distinct services & IPs
  const services = new Set(logs.map((l) => l.service).filter(Boolean));
  const uniqueIps = new Set(logs.map((l) => l.ip).filter(Boolean));

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 border-b border-slate-800/80 bg-slate-950 font-sans">
      {/* 1. Total Volume */}
      <button
        type="button"
        onClick={() => onSelectLevel('ALL')}
        className={`px-4 py-2.5 text-left transition-colors hover:bg-slate-900/40 cursor-pointer ${
          selectedLevelFilter === 'ALL' ? 'bg-slate-900/60' : ''
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium mb-0.5">
          <span>Total Événements</span>
          <Activity className="w-3 h-3 text-slate-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white font-mono tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">lignes</span>
        </div>
      </button>

      {/* 2. Errors & Fatal */}
      <button
        type="button"
        onClick={() => onSelectLevel('ERROR')}
        className={`px-4 py-2.5 text-left transition-colors hover:bg-rose-950/20 cursor-pointer ${
          selectedLevelFilter === 'ERROR' ? 'bg-rose-950/30 ring-1 ring-inset ring-rose-900/50' : ''
        }`}
      >
        <div className="flex items-center justify-between text-rose-400 text-[11px] font-medium mb-0.5">
          <span>Erreurs & Fatal</span>
          <AlertOctagon className="w-3 h-3 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-rose-400 font-mono tabular-nums">
            {errors.toLocaleString()}
          </span>
          <span className="text-[10px] text-rose-400/80 font-mono tabular-nums">
            ({errorRate}%)
          </span>
        </div>
      </button>

      {/* 3. Warnings */}
      <button
        type="button"
        onClick={() => onSelectLevel('WARN')}
        className={`px-4 py-2.5 text-left transition-colors hover:bg-amber-950/20 cursor-pointer ${
          selectedLevelFilter === 'WARN' ? 'bg-amber-950/30 ring-1 ring-inset ring-amber-900/50' : ''
        }`}
      >
        <div className="flex items-center justify-between text-amber-400 text-[11px] font-medium mb-0.5">
          <span>Avertissements</span>
          <AlertTriangle className="w-3 h-3 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-amber-400 font-mono tabular-nums">
            {warnings.toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-400/70 font-mono">alertes</span>
        </div>
      </button>

      {/* 4. Average Latency */}
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium mb-0.5">
          <span>Latence Moyenne</span>
          <Clock className="w-3 h-3 text-slate-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-indigo-300 font-mono tabular-nums">
            {avgLatency !== null ? `${avgLatency}` : '—'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {avgLatency !== null ? 'ms' : 'N/A'}
          </span>
        </div>
      </div>

      {/* 5. Services & Unique IPs */}
      <div className="px-4 py-2.5 col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium mb-0.5">
          <span>Composants Actifs</span>
          <Layers className="w-3 h-3 text-slate-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white font-mono tabular-nums">
            {services.size || 1}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {uniqueIps.size > 0 ? `· ${uniqueIps.size} adresses IP` : 'services'}
          </span>
        </div>
      </div>
    </div>
  );
};
