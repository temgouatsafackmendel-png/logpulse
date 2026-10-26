import React from 'react';
import { ErrorSignature, LogEntry } from '../types/log';
import { clusterErrors } from '../utils/clustering';
import { formatLogDateFull } from '../utils/parser';
import { Layers, ArrowRight, Sparkles, AlertOctagon, Clock, ShieldAlert } from 'lucide-react';

interface ErrorSignaturesViewProps {
  logs: LogEntry[];
  onFilterBySignature: (template: string) => void;
  onExplainLogWithAI: (log: LogEntry) => void;
}

export const ErrorSignaturesView: React.FC<ErrorSignaturesViewProps> = ({
  logs,
  onFilterBySignature,
  onExplainLogWithAI,
}) => {
  const clusters = clusterErrors(logs);
  const totalErrors = logs.filter((l) => l.level === 'FATAL' || l.level === 'ERROR' || l.level === 'WARN').length;

  if (clusters.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200 mb-1">
          Aucune anomalie ou erreur récurrente détectée
        </h4>
        <p className="text-xs text-slate-400 max-w-md">
          Tous les journaux actuels sont de niveau informatif (INFO/DEBUG), ou aucune signature d'erreur n'a été trouvée.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Agrégation des Empreintes d'Erreurs ({clusters.length} motifs uniques)
          </h3>
          <p className="text-xs text-slate-400">
            Regroupement automatique des exceptions similaires pour identifier les foyers de défaillance majeurs.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-rose-400 font-bold">{totalErrors}</span> alertes regroupées en {clusters.length} signatures
        </div>
      </div>

      <div className="space-y-3">
        {clusters.map((cluster) => {
          const percentage = totalErrors > 0 ? ((cluster.count / totalErrors) * 100).toFixed(1) : '0';
          const isFatal = cluster.level === 'FATAL';
          const isError = cluster.level === 'ERROR';

          return (
            <div
              key={cluster.signatureId}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg p-4 transition-all duration-150 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      isFatal
                        ? 'bg-red-950 text-red-300 border-red-700'
                        : isError
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {cluster.level}
                  </span>

                  <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {cluster.count} occurrences ({percentage}%)
                  </span>

                  {cluster.services.map((svc) => (
                    <span
                      key={svc}
                      className="text-[11px] font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 px-1.5 py-0.5 rounded"
                    >
                      {svc}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onExplainLogWithAI(cluster.sampleLog)}
                    className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded flex items-center gap-1 transition-colors"
                    title="Expliquer cette signature avec Gemini"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Diagnostiquer IA</span>
                  </button>

                  <button
                    onClick={() => onFilterBySignature(cluster.template)}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-1 transition-colors"
                  >
                    <span>Voir les logs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Pattern / Template */}
              <div className="font-mono text-xs text-rose-200/90 bg-slate-950 p-2.5 rounded border border-slate-800/80 break-words leading-relaxed select-text">
                {cluster.template}
              </div>

              {/* Footer row: Timestamps */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Première apparition : {formatLogDateFull(cluster.sampleLog.timestampMs)}
                </span>
                <span>·</span>
                <span>Dernière apparition : {cluster.lastSeen}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
