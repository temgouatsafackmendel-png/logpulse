import React from 'react';
import { LogEntry, LogFilter, LogLevel } from '../types/log';
import {
  Layers,
  Activity,
  Globe,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Server,
} from 'lucide-react';

interface FacetSidebarProps {
  logs: LogEntry[];
  filter: LogFilter;
  setFilter: React.Dispatch<React.SetStateAction<LogFilter>>;
  isOpen: boolean;
  onToggle: () => void;
}

export const FacetSidebar: React.FC<FacetSidebarProps> = ({
  logs,
  filter,
  setFilter,
  isOpen,
  onToggle,
}) => {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="h-full border-r border-slate-800/80 bg-slate-950 hover:bg-slate-900/60 text-slate-500 hover:text-slate-300 px-1 py-4 flex flex-col items-center justify-start transition-colors select-none"
        title="Ouvrir les facettes (Services, Niveaux, Codes HTTP)"
      >
        <ChevronRight className="w-4 h-4 mb-2" />
        <span className="text-[10px] uppercase font-mono tracking-widest [writing-mode:vertical-lr] text-slate-400">
          Facettes
        </span>
      </button>
    );
  }

  // Count by Service
  const serviceCounts = new Map<string, number>();
  // Count by Level
  const levelCounts = new Map<LogLevel, number>();
  // Count by Status Code
  const statusCounts = new Map<number, number>();

  for (const log of logs) {
    if (log.service) {
      serviceCounts.set(log.service, (serviceCounts.get(log.service) || 0) + 1);
    }
    levelCounts.set(log.level, (levelCounts.get(log.level) || 0) + 1);
    if (log.status) {
      statusCounts.set(log.status, (statusCounts.get(log.status) || 0) + 1);
    }
  }

  const sortedServices = Array.from(serviceCounts.entries()).sort((a, b) => b[1] - a[1]);
  const sortedStatuses = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]);

  const toggleServiceFilter = (svc: string) => {
    setFilter((prev) => {
      const next = new Set(prev.services);
      if (next.has(svc)) {
        next.delete(svc);
      } else {
        next.add(svc);
      }
      return { ...prev, services: next };
    });
  };

  const toggleLevelFilter = (lvl: LogLevel) => {
    setFilter((prev) => {
      const next = new Set(prev.levels);
      if (next.has(lvl)) {
        next.delete(lvl);
      } else {
        next.add(lvl);
      }
      return { ...prev, levels: next };
    });
  };

  const setStatusFilter = (st: number) => {
    setFilter((prev) => {
      // Toggle if already set
      if (prev.search.includes(`status:${st}`)) {
        return {
          ...prev,
          search: prev.search.replace(`status:${st}`, '').trim(),
        };
      }
      return {
        ...prev,
        search: `${prev.search} status:${st}`.trim(),
      };
    });
  };

  return (
    <aside className="w-60 border-r border-slate-800/80 bg-slate-950 flex flex-col text-xs font-sans select-none shrink-0 overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filtres de Facettes</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
          title="Masquer la barre de facettes"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-5">
        {/* SECTION 1: Log Levels */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Niveau de Sévérité</span>
            <span className="font-mono text-slate-400 text-[10px]">{logs.length}</span>
          </div>

          <div className="space-y-0.5">
            {(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as LogLevel[]).map((lvl) => {
              const count = levelCounts.get(lvl) || 0;
              const isChecked = filter.levels.has(lvl);

              const dotColor =
                lvl === 'FATAL'
                  ? 'bg-red-500'
                  : lvl === 'ERROR'
                  ? 'bg-rose-500'
                  : lvl === 'WARN'
                  ? 'bg-amber-500'
                  : lvl === 'INFO'
                  ? 'bg-indigo-400'
                  : 'bg-slate-500';

              return (
                <button
                  key={lvl}
                  onClick={() => toggleLevelFilter(lvl)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left ${
                    isChecked
                      ? 'bg-slate-900 text-slate-200'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    <span className="font-mono text-xs font-medium">{lvl}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Microservices & Components */}
        {sortedServices.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Services ({sortedServices.length})</span>
            </div>

            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {sortedServices.map(([svc, count]) => {
                const isChecked = filter.services.has(svc);
                return (
                  <button
                    key={svc}
                    onClick={() => toggleServiceFilter(svc)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left group ${
                      isChecked
                        ? 'bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <span className="truncate pr-2 font-mono text-[11px]">{svc}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: HTTP Status Codes */}
        {sortedStatuses.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Codes HTTP</span>
            </div>

            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {sortedStatuses.map(([st, count]) => {
                const isSelected = filter.search.includes(`status:${st}`);
                const isError = st >= 500;
                const isWarn = st >= 400 && st < 500;

                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors text-left ${
                      isSelected
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs ${
                        isError ? 'text-rose-400 font-bold' : isWarn ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      HTTP {st}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear active facet filters */}
        {(filter.services.size > 0 || filter.levels.size < 5) && (
          <button
            onClick={() =>
              setFilter((prev) => ({
                ...prev,
                services: new Set(),
                levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
              }))
            }
            className="w-full text-center py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-indigo-400 text-xs font-medium transition-colors"
          >
            Effacer les filtres de facettes
          </button>
        )}
      </div>
    </aside>
  );
};
