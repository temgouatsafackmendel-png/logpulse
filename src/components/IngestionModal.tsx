import React, { useState } from 'react';
import { DEMO_DATASETS, DemoDataset } from '../utils/demoData';
import { parseLogContent } from '../utils/parser';
import { LogEntry, LogFormatType } from '../types/log';
import {
  X,
  UploadCloud,
  FileText,
  Database,
  Globe,
  Shield,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestLogs: (logs: LogEntry[], sourceName: string) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onIngestLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'upload' | 'paste'>('demo');
  const [pastedText, setPastedText] = useState('');
  const [formatHint, setFormatHint] = useState<LogFormatType>('AUTO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('k8s-db-pool-incident');

  if (!isOpen) return null;

  const handleLoadDemo = (dataset: DemoDataset) => {
    setSelectedDemoId(dataset.id);
    const raw = dataset.generateRaw();
    const parsed = parseLogContent(raw, dataset.format);
    onIngestLogs(parsed, dataset.name);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseLogContent(content, formatHint);
        onIngestLogs(parsed, file.name);
        onClose();
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsProcessing(true);
    const parsed = parseLogContent(pastedText, formatHint);
    onIngestLogs(parsed, 'Logs collés (Manuel)');
    setIsProcessing(false);
    onClose();
  };

  const getDatasetIcon = (fmt: string) => {
    switch (fmt) {
      case 'SPRING_JAVA':
        return <Database className="w-4 h-4 text-rose-400" />;
      case 'NGINX_APACHE':
        return <Globe className="w-4 h-4 text-emerald-400" />;
      case 'SYSLOG':
        return <Shield className="w-4 h-4 text-amber-400" />;
      default:
        return <Layers className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Ingestion & Source de Journaux
              </h3>
              <p className="text-xs text-slate-400">
                Chargez un jeu d'essai incident, glissez un fichier de logs ou collez du texte
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-5 pt-2 text-xs font-medium gap-2">
          <button
            onClick={() => setActiveTab('demo')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'demo'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Scénarios Incidents SRE
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Importer un Fichier (.log, .txt, .json)
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Coller du Texte Brut
          </button>
        </div>

        {/* Tab 1: Demo Datasets */}
        {activeTab === 'demo' && (
          <div className="p-5 space-y-3">
            <div className="text-xs text-slate-400 mb-2">
              Sélectionnez un scénario d'incident réel pour tester immédiatement l'analyseur :
            </div>

            <div className="space-y-2.5">
              {DEMO_DATASETS.map((ds) => {
                const isSelected = selectedDemoId === ds.id;
                return (
                  <div
                    key={ds.id}
                    onClick={() => handleLoadDemo(ds)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all duration-150 flex items-start justify-between gap-4 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-lg bg-slate-950 border border-slate-800">
                        {getDatasetIcon(ds.format)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{ds.name}</h4>
                          <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900">
                            {ds.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {ds.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors shrink-0 flex items-center gap-1 shadow-sm mt-1"
                    >
                      <span>Charger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: File Upload */}
        {activeTab === 'upload' && (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Format de parsing cible :
              </label>
              <select
                value={formatHint}
                onChange={(e) => setFormatHint(e.target.value as LogFormatType)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                <option value="AUTO">Auto-détection intelligente (Recommandé)</option>
                <option value="JSON">JSON Structuré (Kubernetes, AWS CloudWatch)</option>
                <option value="NGINX_APACHE">Nginx / Apache Combined Access Log</option>
                <option value="SPRING_JAVA">Spring Boot / Java Stacktraces (Logback, Log4j)</option>
                <option value="SYSLOG">Syslog standard (RFC 3164 / 5424)</option>
                <option value="KEY_VALUE">Clé-Valeur (logfmt)</option>
              </select>
            </div>

            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/70 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group bg-slate-900/30">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Glissez-déposez un fichier de logs ici ou cliquez pour parcourir
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Formats acceptés : .log, .txt, .json, .csv (taille max ~25 Mo)
              </div>
              <input
                type="file"
                accept=".log,.txt,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isProcessing && (
              <div className="text-center text-xs text-indigo-400 py-2">
                Lecture et analyse des lignes en cours...
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Paste Text */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                Collez vos lignes de logs brutes :
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Format :</span>
                <select
                  value={formatHint}
                  onChange={(e) => setFormatHint(e.target.value as LogFormatType)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                >
                  <option value="AUTO">Auto-détection</option>
                  <option value="JSON">JSON</option>
                  <option value="NGINX_APACHE">Nginx / Apache</option>
                  <option value="SPRING_JAVA">Spring / Java</option>
                  <option value="SYSLOG">Syslog</option>
                </select>
              </div>
            </div>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Ex: 2026-10-26 14:15:30 ERROR [billing] Payment connection timeout..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg p-3 font-mono text-xs text-slate-200"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                {pastedText ? `${pastedText.split('\n').length} lignes détectées` : 'Aucun contenu'}
              </span>
              <button
                type="submit"
                disabled={!pastedText.trim() || isProcessing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Analyser et Importer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
