import React, { useMemo, useState } from 'react';
import { LogEntry } from '../types/log';
import { formatLogTime } from '../utils/parser';
import { ZoomIn, RotateCcw } from 'lucide-react';

interface LogHistogramProps {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  onTimeSelect?: (startMs: number, endMs: number) => void;
  onResetTime?: () => void;
  selectedRange?: { startMs: number; endMs: number } | null;
}

interface Bucket {
  startMs: number;
  endMs: number;
  label: string;
  total: number;
  fatal: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
}

export const LogHistogram: React.FC<LogHistogramProps> = ({
  logs,
  onTimeSelect,
  onResetTime,
  selectedRange,
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<Bucket | null>(null);

  // Compute time bounds and buckets
  const { buckets, maxBucketTotal, timeSpanMinutes } = useMemo(() => {
    if (!logs || logs.length === 0) {
      return { buckets: [], maxBucketTotal: 1, timeSpanMinutes: 0 };
    }

    const timestamps = logs.map((l) => l.timestampMs).filter((t) => !isNaN(t));
    if (timestamps.length === 0) {
      return { buckets: [], maxBucketTotal: 1, timeSpanMinutes: 0 };
    }

    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const diff = maxTime - minTime;
    const timeSpanMinutes = Math.max(1, Math.round(diff / 60000));

    // Determine number of buckets (between 16 and 32)
    const bucketCount = 28;
    const bucketDuration = Math.max(1000, Math.ceil(diff / bucketCount));

    const bucketList: Bucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bStart = minTime + i * bucketDuration;
      const bEnd = bStart + bucketDuration;
      bucketList.push({
        startMs: bStart,
        endMs: bEnd,
        label: formatLogTime(bStart),
        total: 0,
        fatal: 0,
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
      });
    }

    for (const log of logs) {
      const t = log.timestampMs;
      if (isNaN(t)) continue;
      const bIndex = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor((t - minTime) / bucketDuration))
      );
      const b = bucketList[bIndex];
      if (!b) continue;

      b.total++;
      if (log.level === 'FATAL') b.fatal++;
      else if (log.level === 'ERROR') b.error++;
      else if (log.level === 'WARN') b.warn++;
      else if (log.level === 'DEBUG') b.debug++;
      else b.info++;
    }

    const maxBucket = Math.max(...bucketList.map((b) => b.total), 1);
    return { buckets: bucketList, maxBucketTotal: maxBucket, timeSpanMinutes };
  }, [logs]);

  if (buckets.length === 0) return null;

  return (
    <div className="border-b border-slate-800/80 bg-slate-950 px-5 py-2.5">
      {/* Top Header of Histogram */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
          <span className="font-semibold text-slate-200">Chronologie & Fréquence</span>
          <span>·</span>
          <span>Fenêtre : {timeSpanMinutes} min</span>
          {selectedRange && (
            <>
              <span>·</span>
              <span className="text-indigo-400 font-mono">
                Zoom : {formatLogTime(selectedRange.startMs)} → {formatLogTime(selectedRange.endMs)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
              Erreurs ({logs.filter((l) => l.level === 'ERROR' || l.level === 'FATAL').length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" />
              Avertissements ({logs.filter((l) => l.level === 'WARN').length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-indigo-500/80 inline-block" />
              Info & Divers
            </span>
          </div>

          {selectedRange && onResetTime && (
            <button
              onClick={onResetTime}
              className="text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser zoom
            </button>
          )}
        </div>
      </div>

      {/* Histogram SVG/Bar Area */}
      <div className="relative h-16 flex items-end gap-1 pt-2">
        {buckets.map((b, idx) => {
          const heightPercent = Math.max(4, Math.round((b.total / maxBucketTotal) * 100));
          const errorRatio = b.total > 0 ? (b.fatal + b.error) / b.total : 0;
          const warnRatio = b.total > 0 ? b.warn / b.total : 0;
          const infoRatio = b.total > 0 ? (b.info + b.debug) / b.total : 0;

          const isSelected =
            selectedRange &&
            b.startMs >= selectedRange.startMs &&
            b.endMs <= selectedRange.endMs;

          return (
            <div
              key={idx}
              className="relative flex-1 h-full flex items-end group cursor-pointer"
              onMouseEnter={() => setHoveredBucket(b)}
              onMouseLeave={() => setHoveredBucket(null)}
              onClick={() => {
                if (onTimeSelect && b.total > 0) {
                  onTimeSelect(b.startMs, b.endMs);
                }
              }}
            >
              {/* Stacked bar container */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full flex flex-col-reverse rounded-xs overflow-hidden transition-all duration-100 ${
                  isSelected
                    ? 'ring-1 ring-indigo-400 ring-offset-1 ring-offset-slate-950 opacity-100'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                {/* Info / normal part */}
                {infoRatio > 0 && (
                  <div
                    style={{ flex: infoRatio }}
                    className="bg-indigo-600/70 hover:bg-indigo-500"
                  />
                )}
                {/* Warning part */}
                {warnRatio > 0 && (
                  <div
                    style={{ flex: warnRatio }}
                    className="bg-amber-500/90 hover:bg-amber-400"
                  />
                )}
                {/* Error part */}
                {errorRatio > 0 && (
                  <div
                    style={{ flex: errorRatio }}
                    className="bg-rose-500 hover:bg-rose-400"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time labels below bar chart */}
      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 select-none">
        <span>{buckets[0]?.label}</span>
        <span className="hidden sm:inline">{buckets[Math.floor(buckets.length / 2)]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>

      {/* Hover Tooltip display */}
      {hoveredBucket && (
        <div className="mt-2 text-xs bg-slate-800/95 border border-slate-700 rounded px-3 py-1.5 flex items-center gap-4 text-slate-300 font-mono shadow-lg animate-in fade-in duration-75">
          <span className="text-white font-semibold flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
            {hoveredBucket.label}
          </span>
          <span>Total : {hoveredBucket.total}</span>
          {hoveredBucket.error + hoveredBucket.fatal > 0 && (
            <span className="text-rose-400">
              Erreurs : {hoveredBucket.error + hoveredBucket.fatal}
            </span>
          )}
          {hoveredBucket.warn > 0 && (
            <span className="text-amber-400">Warn : {hoveredBucket.warn}</span>
          )}
          {hoveredBucket.info > 0 && (
            <span className="text-slate-400">Info : {hoveredBucket.info}</span>
          )}
          <span className="text-slate-400 text-[11px] ml-auto">
            (Cliquer pour filtrer cette fenêtre)
          </span>
        </div>
      )}
    </div>
  );
};
