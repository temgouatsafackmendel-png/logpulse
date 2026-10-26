import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Download, Filter, WrapText, AlignLeft } from 'lucide-react';
import { LogEntry, LogFilter, LogLevel } from '../types/log';

interface QueryBarProps {
  filter: LogFilter;
  setFilter: React.Dispatch<React.SetStateAction<LogFilter>>;
  totalCount: number;
  filteredCount: number;
  availableServices: string[];
  onExport: (format: 'csv' | 'json' | 'txt') => void;
  logs: LogEntry[];
  wordWrap: boolean;
  setWordWrap: React.Dispatch<React.SetStateAction<boolean>>;
}

export const QueryBar: React.FC<QueryBarProps> = ({
  filter,
  setFilter,
  totalCount,
  filteredCount,
  availableServices,
  onExport,
  logs,
  wordWrap,
  setWordWrap,
}) => {
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLevelToggle = (lvl: LogLevel) => {
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

  const handleSelectAllLevels = () => {
    setFilter((prev) => ({
      ...prev,
      levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
    }));
  };

  const handleSelectOnlyErrors = () => {
    setFilter((prev) => ({
      ...prev,
      levels: new Set(['FATAL', 'ERROR']),
    }));
  };

  const handleResetFilters = () => {
    setFilter({
      search: '',
      levels: new Set(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']),
      services: new Set(),
      statusRange: 'all',
      timeRange: 'all',
      slowOnly: false,
    });
    setAiFeedback(null);
  };

  const insertSyntaxToken = (token: string) => {
    setFilter((prev) => ({
      ...prev,
      search: `${prev.search} ${token}`.trim(),
    }));
    searchInputRef.current?.focus();
  };

  // Convert natural language to query using Gemini
  const handleAskAIQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await fetch('/api/natural-language-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: aiPrompt,
          availableServices,
        }),
      });

      const data = await res.json();
      if (data.query) {
        setFilter((prev) => ({
          ...prev,
          search: data.query,
          levels:
            data.recommendedLevel === 'ERROR'
              ? new Set(['FATAL', 'ERROR'])
              : data.recommendedLevel === 'WARN'
              ? new Set(['WARN'])
              : prev.levels,
        }));
        setAiFeedback(data.explanation || 'Filtre appliqué avec succès.');
        setAiPromptOpen(false);
        setAiPrompt('');
      }
    } catch (err) {
      console.error(err);
      setAiFeedback('Erreur lors de la génération de la requête.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const isFiltered =
    filter.search.trim() !== '' ||
    filter.levels.size < 6 ||
    filter.services.size > 0 ||
    filter.statusRange !== 'all' ||
    filter.slowOnly;

  return (
    <div className="border-b border-slate-800/80 bg-slate-950 px-5 py-2.5 space-y-2.5 font-sans">
      {/* Row 1: Search bar + AI Assistant + Export + Wrap Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Rechercher (ex: level:ERROR service:billing status:>=500 timeout)... Appuyez sur '/' pour filtrer"
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md pl-9 pr-8 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 transition-colors"
          />
          {filter.search && (
            <button
              onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* AI Query Generator Trigger */}
        <button
          onClick={() => setAiPromptOpen(!aiPromptOpen)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            aiPromptOpen
              ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200'
              : 'bg-slate-900 border-slate-800 text-indigo-300 hover:bg-slate-800/80'
          }`}
          title="Générer un filtre en langage naturel avec Gemini"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filtre IA</span>
        </button>

        {/* Word wrap toggle button */}
        <button
          onClick={() => setWordWrap(!wordWrap)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 shrink-0 ${
            wordWrap
              ? 'bg-slate-800 border-slate-700 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Retour à la ligne automatique (Wrap)"
        >
          <WrapText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Wrap</span>
        </button>

        {/* Export buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onExport('csv')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
            title="Exporter en CSV"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => onExport('json')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
            title="Exporter en JSON"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* AI Prompt Drawer (collapsible) */}
      {aiPromptOpen && (
        <form
          onSubmit={handleAskAIQuery}
          className="bg-indigo-950/40 border border-indigo-500/40 rounded-lg p-3 space-y-2 animate-in fade-in duration-100"
        >
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Assistant de Recherche en Langage Naturel (Gemini 3.8 Flash)
            </span>
            <button
              type="button"
              onClick={() => setAiPromptOpen(false)}
              className="text-indigo-400 hover:text-indigo-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Montre-moi les erreurs 500 sur le service facturation avec plus de 2s de latence"
              className="flex-1 bg-slate-900 border border-indigo-900/60 focus:border-indigo-400 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isAiLoading || !aiPrompt.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors whitespace-nowrap"
            >
              {isAiLoading ? 'Génération...' : 'Convertir en Filtre'}
            </button>
          </div>
        </form>
      )}

      {/* AI Feedback notification if applied */}
      {aiFeedback && (
        <div className="text-xs bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 px-3 py-1.5 rounded-md flex items-center justify-between">
          <span>{aiFeedback}</span>
          <button
            onClick={() => setAiFeedback(null)}
            className="text-indigo-400 hover:text-indigo-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Row 2: Level Filters, Status filter, Syntax chips, and Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Severity Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3" />
            Niveau :
          </span>

          <button
            type="button"
            onClick={handleSelectAllLevels}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              filter.levels.size === 6
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            TOUS
          </button>

          <button
            type="button"
            onClick={handleSelectOnlyErrors}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              filter.levels.size === 2 && filter.levels.has('FATAL') && filter.levels.has('ERROR')
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-rose-400/80 hover:text-rose-300 bg-slate-900'
            }`}
          >
            ERREURS
          </button>

          <div className="h-3 w-px bg-slate-800 mx-0.5" />

          {(['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as LogLevel[]).map((lvl) => {
            const active = filter.levels.has(lvl);
            const colorClass =
              lvl === 'FATAL'
                ? active ? 'bg-red-950 text-red-300 border-red-700' : 'text-red-500/60'
                : lvl === 'ERROR'
                ? active ? 'bg-rose-950 text-rose-300 border-rose-700' : 'text-rose-500/60'
                : lvl === 'WARN'
                ? active ? 'bg-amber-950 text-amber-300 border-amber-700' : 'text-amber-500/60'
                : lvl === 'INFO'
                ? active ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'text-indigo-400/60'
                : active ? 'bg-slate-800 text-slate-300 border-slate-700' : 'text-slate-500';

            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelToggle(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                  active ? colorClass : 'bg-slate-900 border-transparent hover:border-slate-800'
                }`}
              >
                {lvl}
              </button>
            );
          })}
        </div>

        {/* HTTP Status Code Filter & Quick Syntax Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
            {(['all', '2xx', '3xx', '4xx', '5xx'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter((p) => ({ ...p, statusRange: st }))}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filter.statusRange === st
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFilter((p) => ({ ...p, slowOnly: !p.slowOnly }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              filter.slowOnly
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            &gt; 500ms
          </button>

          {/* Quick Syntax Chips */}
          <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-slate-500">
            <span>Syntaxe :</span>
            <button
              onClick={() => insertSyntaxToken('status:502')}
              className="hover:text-slate-300 underline"
            >
              status:502
            </button>
            <span>·</span>
            <button
              onClick={() => insertSyntaxToken('duration:>1000')}
              className="hover:text-slate-300 underline"
            >
              duration:&gt;1000
            </button>
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 ml-1"
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}

          {/* Counters */}
          <div className="text-[11px] font-mono text-slate-400 pl-2 border-l border-slate-800 tabular-nums">
            <span className="text-white font-semibold">{filteredCount}</span> / {totalCount} logs
          </div>
        </div>
      </div>
    </div>
  );
};
