import React, { useState } from 'react';
import { LogEntry, SingleLogExplanation } from '../types/log';
import { formatLogDateFull } from '../utils/parser';
import {
  X,
  Copy,
  Check,
  Sparkles,
  FileCode,
  ListTree,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface LogDrawerProps {
  log: LogEntry | null;
  onClose: () => void;
  allLogs: LogEntry[];
  onApplyFilter: (field: string, val: string) => void;
  onSelectLog: (log: LogEntry) => void;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({
  log,
  onClose,
  allLogs,
  onApplyFilter,
  onSelectLog,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'stack' | 'context' | 'ai' | 'raw'>('fields');
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<SingleLogExplanation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!log) return null;

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(log.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find surrounding logs (+/- 5 chronologically)
  const sortedLogs = [...allLogs].sort((a, b) => a.timestampMs - b.timestampMs);
  const currentIndex = sortedLogs.findIndex((l) => l.id === log.id);
  const contextLogs =
    currentIndex !== -1
      ? sortedLogs.slice(Math.max(0, currentIndex - 5), Math.min(sortedLogs.length, currentIndex + 6))
      : [log];

  // Call server-side Gemini API for single log explanation
  const handleFetchAiExplanation = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/explain-single-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log }),
      });

      const data = await res.json();
      if (data.explanation) {
        setAiExplanation(data.explanation);
      } else {
        setAiError(data.error || "Impossible d'obtenir une explication.");
      }
    } catch (err: any) {
      setAiError(err.message || 'Erreur réseau.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col font-mono text-xs">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              log.level === 'FATAL'
                ? 'bg-red-950 text-red-300 border-red-700'
                : log.level === 'ERROR'
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : log.level === 'WARN'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-indigo-950 text-indigo-300 border-indigo-700'
            }`}
          >
            {log.level}
          </span>
          <span className="text-slate-400 font-sans">
            {formatLogDateFull(log.timestampMs)}
          </span>
          {log.service && (
            <span className="text-indigo-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {log.service}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyRaw}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copier la ligne brute"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/30">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-sans">
          Message
        </div>
        <div className="text-slate-100 break-words leading-relaxed select-text bg-slate-950 p-2.5 rounded border border-slate-800/80">
          {log.message}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-1 font-sans text-xs gap-1">
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'fields'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" />
          Champs Extraits
        </button>

        {log.stackTrace && (
          <button
            onClick={() => setActiveTab('stack')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'stack'
                ? 'border-rose-500 text-rose-300'
                : 'border-transparent text-rose-400/80 hover:text-rose-300'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Stack Trace
          </button>
        )}

        <button
          onClick={() => setActiveTab('context')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'context'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Contexte (+/- 5)
        </button>

        <button
          onClick={() => {
            setActiveTab('ai');
            if (!aiExplanation && !aiLoading) {
              handleFetchAiExplanation();
            }
          }}
          className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'ai'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-indigo-400/80 hover:text-indigo-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Diagnostic IA
        </button>

        <button
          onClick={() => setActiveTab('raw')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'raw'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Brut
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: Structured Fields */}
        {activeTab === 'fields' && (
          <div className="space-y-3">
            <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800">
              {[
                { key: 'level', val: log.level },
                { key: 'timestamp', val: log.timestamp },
                { key: 'service', val: log.service },
                { key: 'host', val: log.host },
                { key: 'status', val: log.status },
                { key: 'method', val: log.method },
                { key: 'path', val: log.path },
                { key: 'ip', val: log.ip },
                { key: 'durationMs', val: log.durationMs ? `${log.durationMs}ms` : undefined },
              ]
                .filter((item) => item.val !== undefined && item.val !== '')
                .map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-2.5 hover:bg-slate-900/40">
                    <span className="text-slate-400 font-mono text-xs">{item.key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-mono">{String(item.val)}</span>
                      <button
                        onClick={() => onApplyFilter(item.key, String(item.val))}
                        className="text-slate-500 hover:text-indigo-300 p-1"
                        title={`Filtrer par ${item.key}:${item.val}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {log.structured && Object.keys(log.structured).length > 0 && (
              <div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-sans">
                  Attributs Complémentaires
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-[11px] overflow-x-auto leading-relaxed">
                  {JSON.stringify(log.structured, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Stack Trace */}
        {activeTab === 'stack' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
              <span>Trace d'Exception détaillée :</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(log.stackTrace || '');
                }}
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copier la trace
              </button>
            </div>
            <pre className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-300 text-[11px] font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {log.stackTrace}
            </pre>
          </div>
        )}

        {/* TAB 3: Chronological Context */}
        {activeTab === 'context' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-sans mb-2">
              Lignes de logs chronologiquement adjacentes sur la période :
            </div>
            <div className="divide-y divide-slate-900 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              {contextLogs.map((cLog) => {
                const isTarget = cLog.id === log.id;
                return (
                  <div
                    key={cLog.id}
                    onClick={() => onSelectLog(cLog)}
                    className={`p-2.5 cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                      isTarget
                        ? 'bg-indigo-950/60 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0 pt-0.5">
                      {formatLogDateFull(cLog.timestampMs).split(' ')[1]}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                        cLog.level === 'ERROR' || cLog.level === 'FATAL'
                          ? 'text-rose-400'
                          : cLog.level === 'WARN'
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {cLog.level}
                    </span>
                    <span className="text-slate-300 break-words line-clamp-2">
                      {cLog.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Gemini AI Single Log Explanation */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {aiLoading && (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-sans">
                  Gemini 3.8 Flash analyse cette anomalie et génère les étapes de remédiation...
                </p>
              </div>
            )}

            {aiError && (
              <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 space-y-2">
                <div className="font-semibold text-xs font-sans">Erreur d'analyse IA :</div>
                <div className="text-xs">{aiError}</div>
                <button
                  onClick={handleFetchAiExplanation}
                  className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs mt-2"
                >
                  Réessayer
                </button>
              </div>
            )}

            {aiExplanation && (
              <div className="space-y-3 font-sans">
                {/* Meaning */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 space-y-1">
                  <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Signification de l'erreur
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {aiExplanation.meaning}
                  </p>
                </div>

                {/* Probable Cause */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 space-y-1">
                  <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    Cause Probable
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {aiExplanation.probableCause}
                  </p>
                </div>

                {/* Steps to resolve */}
                {aiExplanation.resolutionSteps?.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                      Étapes de Résolution
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                      {aiExplanation.resolutionSteps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Command or Code Fix */}
                {aiExplanation.commandOrCodeFix && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Commande ou Correctif Technique Suggéré
                    </div>
                    <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-xs overflow-x-auto">
                      {aiExplanation.commandOrCodeFix}
                    </pre>
                  </div>
                )}

                <button
                  onClick={handleFetchAiExplanation}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-sans"
                >
                  Régénérer l'explication
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Raw */}
        {activeTab === 'raw' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-sans">
              <span>Ligne brute non altérée :</span>
              <button
                onClick={handleCopyRaw}
                className="text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copier
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed select-text">
              {log.raw}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
