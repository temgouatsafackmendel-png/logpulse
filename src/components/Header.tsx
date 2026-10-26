import React from 'react';
import {
  Shield,
  Sparkles,
  UploadCloud,
  Radio,
  Pause,
  FileText,
  Terminal,
  Layers,
  Code,
  Search,
  Database,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'logs' | 'clusters' | 'regex';
  setActiveTab: (tab: 'logs' | 'clusters' | 'regex') => void;
  onOpenIngest: () => void;
  onOpenIncidentAI: () => void;
  onOpenCommandPalette: () => void;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: 'table' | 'terminal';
  setViewMode: (mode: 'table' | 'terminal') => void;
  currentDatasetName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenIngest,
  onOpenIncidentAI,
  onOpenCommandPalette,
  isStreaming,
  setIsStreaming,
  viewMode,
  setViewMode,
  currentDatasetName,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-5 py-2.5 flex items-center justify-between gap-6 font-sans">
      {/* Zone 1: Brand Wordmark & Context */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400 transition-colors shadow-xs">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
            LogPulse
            <span className="text-[10px] text-slate-500 font-sans font-normal hidden sm:inline">
              / SRE Observability
            </span>
          </span>
        </a>

        {/* Dataset Quick Switcher button */}
        <button
          onClick={onOpenIngest}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
          title="Changer de jeu d'essai ou importer des logs"
        >
          <Database className="w-3 h-3 text-indigo-400" />
          <span className="truncate max-w-[200px]">{currentDatasetName}</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links (Single-line, unboxed tabs) */}
      <nav className="flex items-center gap-1">
        {/* Main View Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Flux de Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('clusters')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'clusters'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Empreintes ({activeTab === 'clusters' ? 'Actif' : 'Triage'})</span>
          </button>

          <button
            onClick={() => setActiveTab('regex')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'regex'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Parser Regex</span>
          </button>
        </div>

        {/* When on Logs tab, allow switching Table vs Terminal view */}
        {activeTab === 'logs' && (
          <div className="hidden md:flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono ml-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tableau
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-2 py-1 rounded transition-colors ${
                viewMode === 'terminal' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Console
            </button>
          </div>
        )}

        {/* Live Tail Toggle */}
        <button
          onClick={() => {
            setActiveTab('logs');
            setIsStreaming(!isStreaming);
          }}
          className={`ml-2 px-2.5 py-1 text-xs font-mono rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            isStreaming
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Basculer le mode direct (tail -f)"
        >
          {isStreaming ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Direct actif</span>
              <Pause className="w-3 h-3 text-emerald-400 ml-0.5" />
            </>
          ) : (
            <>
              <Radio className="w-3 h-3 text-slate-500" />
              <span>Direct</span>
            </>
          )}
        </button>
      </nav>

      {/* Zone 3: Quick Action & Command Palette */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Command palette search trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          title="Ouvrir la palette de commandes (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-sans">Palette</span>
          <kbd className="px-1 py-0.2 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Gemini RCA Trigger */}
        <button
          onClick={onOpenIncidentAI}
          className="px-3 py-1.5 text-xs font-medium text-indigo-200 bg-indigo-950/70 border border-indigo-700/50 hover:bg-indigo-900/60 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          title="Lancer l'analyse de cause racine IA (RCA)"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Diagnostic IA (RCA)</span>
          <span className="sm:hidden">RCA</span>
        </button>

        {/* Ingest Logs Button */}
        <button
          onClick={onOpenIngest}
          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Ingérer</span>
        </button>
      </div>
    </header>
  );
};
