import React, { useState } from 'react';
import { IncidentReport, LogEntry } from '../types/log';
import {
  X,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Download,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Wrench,
  HelpCircle,
} from 'lucide-react';

interface IncidentAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  filteredLogs: LogEntry[];
}

export const IncidentAIModal: React.FC<IncidentAIModalProps> = ({
  isOpen,
  onClose,
  logs,
  filteredLogs,
}) => {
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    // Collect representative errors and warnings
    const targetLogs = (filteredLogs.length > 0 ? filteredLogs : logs).filter(
      (l) => l.level === 'FATAL' || l.level === 'ERROR' || l.level === 'WARN'
    );

    const stats = {
      total: logs.length,
      errors: logs.filter((l) => l.level === 'FATAL' || l.level === 'ERROR').length,
      warnings: logs.filter((l) => l.level === 'WARN').length,
      services: Array.from(new Set(logs.map((l) => l.service).filter(Boolean))),
    };

    try {
      const res = await fetch('/api/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: targetLogs.slice(0, 40),
          stats,
          incidentQuestion: userQuestion.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        setError(data.error || "Impossible d'effectuer l'analyse de l'incident.");
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau lors de la communication avec le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!report) return;
    const md = `# Rapport d'Incident : ${report.title}
Gravité : ${report.severity}

## Résumé Exécutif
${report.summary}

## Cause Racine (Root Cause Analysis)
${report.rootCause}

## Services Impactés
${report.impactedServices.map((s) => `- ${s}`).join('\n')}

## Actions Immédiates Recommandées
${report.immediateActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## Mesures Préventives
${report.preventiveMeasures.map((p, i) => `${i + 1}. ${p}`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-950 text-red-200 border-red-700';
      case 'HIGH':
        return 'bg-rose-950 text-rose-300 border-rose-700';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      default:
        return 'bg-indigo-950 text-indigo-300 border-indigo-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Diagnostic IA de Cause Racine (RCA)
                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/80 border border-indigo-800 px-1.5 py-0.5 rounded">
                  Gemini 3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Analyse corrélée des journaux d'erreurs, identification de l'origine et plan d'action
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-200">
          {/* Question / Focus input */}
          <div className="space-y-2 bg-slate-900/50 p-3.5 rounded-lg border border-slate-800">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              Question spécifique ou orientation de l'analyse (Optionnel) :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ex: Pourquoi le service de paiement a rejeté les requêtes à 14:15 ?"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
              />
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyse en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lancer Diagnostic</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Initial State when no report yet */}
          {!report && !loading && !error && (
            <div className="py-10 text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-indigo-400 mx-auto opacity-70" />
              <div className="text-sm font-semibold text-slate-200">
                Prêt pour l'analyse corrélée des incidents
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                L'intelligence artificielle va examiner les {logs.filter((l) => l.level === 'FATAL' || l.level === 'ERROR').length} erreurs
                et {logs.filter((l) => l.level === 'WARN').length} avertissements détectés pour isoler l'événement déclencheur.
              </p>
              <button
                onClick={runAnalysis}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Générer le rapport SRE
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                Génération de l'analyse de cause racine en cours...
              </div>
              <p className="text-xs text-slate-400">
                Corrélation des traces de pile, timestamps et dépendances entre microservices
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 space-y-2">
              <div className="font-semibold text-xs">Erreur lors de l'analyse :</div>
              <div>{error}</div>
              <button
                onClick={runAnalysis}
                className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs mt-2"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Report Display */}
          {report && !loading && (
            <div className="space-y-4">
              {/* Report Header Card */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase font-mono ${getSeverityBadge(
                      report.severity
                    )}`}
                  >
                    Gravité : {report.severity}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMarkdown}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors text-[11px]"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier Markdown</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={runAnalysis}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Régénérer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white tracking-tight">
                  {report.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.summary}
                </p>
              </div>

              {/* Root Cause Card */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Cause Racine Déterminée (Root Cause)
                </div>
                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {report.rootCause}
                </div>
              </div>

              {/* Impacted Services */}
              {report.impactedServices?.length > 0 && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Services et Composants Impactés
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.impactedServices.map((svc, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px]"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate Actions Checklist */}
              {report.immediateActions?.length > 0 && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Plan d'Action Immédiat (Remédiation)
                  </div>
                  <ul className="space-y-2">
                    {report.immediateActions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded border border-slate-800/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200 leading-relaxed font-mono text-[11px] select-text">
                          {action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preventive Measures */}
              {report.preventiveMeasures?.length > 0 && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                    Recommandations Préventives d'Architecture
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                    {report.preventiveMeasures.map((pm, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {pm}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredLogs.length} logs sélectionnés pour ce contexte d'incident</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
