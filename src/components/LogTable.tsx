import React, { useState, useEffect } from 'react';
import { LogEntry, LogLevel } from '../types/log';
import { formatLogTime, formatLogDateFull } from '../utils/parser';
import { ChevronRight, Sparkles, Copy, Check, Eye } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  searchQuery: string;
  onSelectLog: (log: LogEntry) => void;
  onExplainLogWithAI: (log: LogEntry) => void;
  wordWrap?: boolean;
}

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  searchQuery,
  onSelectLog,
  onExplainLogWithAI,
  wordWrap = false,
}) => {
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopy = (log: LogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(log.raw);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'FATAL':
        return 'text-red-300 bg-red-950/80 border-red-800';
      case 'ERROR':
        return 'text-rose-300 bg-rose-950/70 border-rose-800';
      case 'WARN':
        return 'text-amber-300 bg-amber-950/70 border-amber-800';
      case 'INFO':
        return 'text-indigo-300 bg-indigo-950/50 border-indigo-800';
      case 'DEBUG':
        return 'text-slate-400 bg-slate-900 border-slate-800';
      case 'TRACE':
        return 'text-zinc-500 bg-zinc-900 border-zinc-800';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const getStatusBadge = (status?: number) => {
    if (!status) return null;
    if (status >= 500) {
      return <span className="font-mono text-rose-400 font-semibold">{status}</span>;
    }
    if (status >= 400) {
      return <span className="font-mono text-amber-400 font-semibold">{status}</span>;
    }
    if (status >= 300) {
      return <span className="font-mono text-sky-400">{status}</span>;
    }
    return <span className="font-mono text-emerald-400">{status}</span>;
  };

  // Highlight search keyword in message
  const highlightSearch = (text: string, query: string) => {
    if (!query || query.includes(':')) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-indigo-500/30 text-indigo-200 px-0.5 rounded font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
          <Eye className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-semibold text-slate-300 mb-0.5">Aucun journal correspondant</h4>
        <p className="text-[11px] text-slate-500 max-w-sm">
          Ajustez votre recherche ou réinitialisez les filtres pour visualiser les flux.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-mono text-xs select-text">
      {/* Table Header */}
      <div className="grid grid-cols-[55px_100px_65px_120px_65px_70px_1fr_80px] items-center px-4 py-1.5 border-b border-slate-800/80 bg-slate-900/40 text-slate-400 text-[10px] font-sans font-medium uppercase tracking-wider select-none shrink-0">
        <div>#</div>
        <div>Heure</div>
        <div>Niveau</div>
        <div>Service</div>
        <div>Statut</div>
        <div>Durée</div>
        <div>Message & Exception</div>
        <div className="text-right">Actions</div>
      </div>

      {/* Table Body (Virtualized scroll container) */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60">
        {paginatedLogs.map((log) => {
          const isError = log.level === 'ERROR' || log.level === 'FATAL';
          const isWarn = log.level === 'WARN';

          return (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className={`grid grid-cols-[55px_100px_65px_120px_65px_70px_1fr_80px] items-start px-4 py-1.5 cursor-pointer transition-colors group ${
                isError
                  ? 'hover:bg-rose-950/25 bg-rose-950/10'
                  : isWarn
                  ? 'hover:bg-amber-950/20 bg-amber-950/5'
                  : 'hover:bg-slate-900/70'
              }`}
            >
              {/* Line number */}
              <div className="text-slate-400 tabular-nums select-none pt-0.5 text-[11px]">
                {log.lineNumber || '—'}
              </div>

              {/* Timestamp */}
              <div
                className="text-slate-400 tabular-nums pt-0.5 whitespace-nowrap text-[11px]"
                title={formatLogDateFull(log.timestampMs)}
              >
                {formatLogTime(log.timestampMs)}
              </div>

              {/* Severity Level */}
              <div className="pt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${getLevelBadge(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
              </div>

              {/* Service / Host */}
              <div className="text-indigo-300 font-sans text-xs truncate pt-0.5 pr-2" title={log.service}>
                {log.service ? (
                  <span className="text-slate-300 font-mono text-[11px]">
                    {log.service}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              {/* HTTP Status Code */}
              <div className="pt-0.5 text-[11px]">
                {getStatusBadge(log.status) || <span className="text-slate-400">—</span>}
              </div>

              {/* Duration ms */}
              <div className="pt-0.5 tabular-nums text-[11px]">
                {typeof log.durationMs === 'number' ? (
                  <span
                    className={
                      log.durationMs >= 1000
                        ? 'text-rose-400 font-bold'
                        : log.durationMs >= 500
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }
                  >
                    {log.durationMs}ms
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              {/* Log Message */}
              <div className="pr-3 text-slate-200 leading-relaxed min-w-0">
                <div className={wordWrap ? 'break-words' : 'truncate'}>
                  {highlightSearch(log.message, searchQuery)}
                </div>

                {/* Stack trace snippet indicator */}
                {log.stackTrace && (
                  <div className="mt-0.5 text-[10px] text-rose-400/90 font-mono flex items-center gap-1">
                    <span>↳ Exception : {log.stackTrace.split('\n')[0]}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-end gap-1 pt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplainLogWithAI(log);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-indigo-950/70 transition-colors"
                  title="Diagnostiquer cette ligne avec Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleCopy(log, e)}
                  className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Copier la ligne brute"
                >
                  {copiedId === log.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectLog(log)}
                  className="p-1 rounded text-slate-500 group-hover:text-slate-200 transition-colors"
                  title="Détails"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-slate-800/80 bg-slate-950 text-xs font-sans text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px]">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, logs.length)} sur {logs.length}
          </span>
          <span>·</span>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Lignes/page :</span>
            {[50, 100, 250].map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  setPageSize(sz);
                  setPage(1);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  pageSize === sz ? 'bg-slate-800 text-white font-bold' : 'hover:text-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs transition-colors"
          >
            Précédent
          </button>
          <span className="font-mono text-xs text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs transition-colors"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};
