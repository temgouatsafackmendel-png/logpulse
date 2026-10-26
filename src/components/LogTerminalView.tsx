import React, { useRef, useEffect } from 'react';
import { LogEntry, LogLevel } from '../types/log';
import { formatLogTime, formatLogDateFull } from '../utils/parser';
import { Copy, Sparkles, Terminal as TerminalIcon } from 'lucide-react';

interface LogTerminalViewProps {
  logs: LogEntry[];
  searchQuery: string;
  onSelectLog: (log: LogEntry) => void;
  onExplainLogWithAI: (log: LogEntry) => void;
  isStreaming: boolean;
  wordWrap: boolean;
}

export const LogTerminalView: React.FC<LogTerminalViewProps> = ({
  logs,
  searchQuery,
  onSelectLog,
  onExplainLogWithAI,
  isStreaming,
  wordWrap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when in streaming mode if user is near bottom
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs.length, isStreaming]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'FATAL':
        return 'text-red-400 font-bold';
      case 'ERROR':
        return 'text-rose-400 font-bold';
      case 'WARN':
        return 'text-amber-400';
      case 'INFO':
        return 'text-sky-400';
      case 'DEBUG':
        return 'text-slate-500';
      case 'TRACE':
        return 'text-zinc-600';
      default:
        return 'text-slate-400';
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query || query.includes(':')) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-xs">
        <TerminalIcon className="w-8 h-8 mb-2 opacity-50" />
        <div>Aucun journal ne correspond aux critères de filtre actuels.</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[#070b12] text-slate-300 font-mono text-xs p-3 select-text leading-relaxed border-t border-slate-900"
    >
      <div className="space-y-0.5">
        {logs.map((log) => {
          const isError = log.level === 'ERROR' || log.level === 'FATAL';
          const isWarn = log.level === 'WARN';

          return (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className={`group flex items-start gap-2.5 px-2 py-0.5 rounded-sm hover:bg-slate-900/90 cursor-pointer transition-colors ${
                isError ? 'bg-rose-950/15' : isWarn ? 'bg-amber-950/10' : ''
              } ${wordWrap ? 'flex-wrap' : 'whitespace-nowrap overflow-x-hidden'}`}
            >
              {/* Line number */}
              <span className="text-slate-600 select-none w-8 text-right shrink-0 tabular-nums text-[11px]">
                {log.lineNumber || '·'}
              </span>

              {/* Timestamp */}
              <span
                className="text-slate-500 shrink-0 tabular-nums text-[11px]"
                title={formatLogDateFull(log.timestampMs)}
              >
                {formatLogTime(log.timestampMs)}
              </span>

              {/* Level */}
              <span className={`w-14 shrink-0 font-bold ${getLevelColor(log.level)}`}>
                [{log.level.padEnd(5, ' ')}]
              </span>

              {/* Service */}
              {log.service && (
                <span className="text-indigo-400/90 shrink-0 font-semibold">
                  [{log.service}]
                </span>
              )}

              {/* HTTP Status Code if present */}
              {log.status && (
                <span
                  className={`shrink-0 ${
                    log.status >= 500
                      ? 'text-rose-400 font-bold'
                      : log.status >= 400
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {log.status}
                </span>
              )}

              {/* Duration ms if present */}
              {typeof log.durationMs === 'number' && (
                <span
                  className={`shrink-0 text-[11px] ${
                    log.durationMs >= 1000
                      ? 'text-rose-400 font-semibold'
                      : log.durationMs >= 500
                      ? 'text-amber-400'
                      : 'text-slate-500'
                  }`}
                >
                  ({log.durationMs}ms)
                </span>
              )}

              {/* Log Message */}
              <span className="text-slate-200 flex-1 break-all">
                {highlightText(log.message, searchQuery)}
              </span>

              {/* Inline quick actions on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-auto select-none pl-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplainLogWithAI(log);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                  title="Expliquer cette anomalie avec Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(log.raw);
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Copier la ligne brute"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
