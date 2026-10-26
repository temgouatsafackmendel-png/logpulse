import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Database,
  Terminal,
  FileSpreadsheet,
  Radio,
  Filter,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import { DEMO_DATASETS, DemoDataset } from '../utils/demoData';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (dataset: DemoDataset) => void;
  onTriggerRCA: () => void;
  onFilterErrorsOnly: () => void;
  onFilterReset: () => void;
  onToggleStreaming: () => void;
  isStreaming: boolean;
  onToggleViewMode: () => void;
  viewMode: 'table' | 'terminal';
  onExport: (format: 'csv' | 'json' | 'txt') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectDataset,
  onTriggerRCA,
  onFilterErrorsOnly,
  onFilterReset,
  onToggleStreaming,
  isStreaming,
  onToggleViewMode,
  viewMode,
  onExport,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'rca',
      title: 'Lancer le Diagnostic IA de Cause Racine (RCA)',
      category: 'Intelligence Artificielle',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      run: () => {
        onClose();
        onTriggerRCA();
      },
    },
    {
      id: 'filter-errors',
      title: 'Filtrer uniquement les erreurs critiques (FATAL & ERROR)',
      category: 'Filtres Rapides',
      icon: <Filter className="w-4 h-4 text-rose-400" />,
      run: () => {
        onClose();
        onFilterErrorsOnly();
      },
    },
    {
      id: 'filter-reset',
      title: 'Réinitialiser tous les filtres',
      category: 'Filtres Rapides',
      icon: <X className="w-4 h-4 text-slate-400" />,
      run: () => {
        onClose();
        onFilterReset();
      },
    },
    {
      id: 'toggle-stream',
      title: isStreaming ? 'Suspendre le mode Direct (Live tail)' : 'Activer le flux en direct (Live tail -f)',
      category: 'Mode & Affichage',
      icon: <Radio className="w-4 h-4 text-emerald-400" />,
      run: () => {
        onClose();
        onToggleStreaming();
      },
    },
    {
      id: 'toggle-view',
      title: viewMode === 'table' ? 'Basculer en Vue Console / Terminal brut' : 'Basculer en Vue Tableau Structuré',
      category: 'Mode & Affichage',
      icon: <Terminal className="w-4 h-4 text-sky-400" />,
      run: () => {
        onClose();
        onToggleViewMode();
      },
    },
    {
      id: 'export-csv',
      title: 'Exporter la vue actuelle en fichier CSV',
      category: 'Exportation',
      icon: <FileSpreadsheet className="w-4 h-4 text-amber-400" />,
      run: () => {
        onClose();
        onExport('csv');
      },
    },
  ];

  const datasetActions = DEMO_DATASETS.map((ds) => ({
    id: `ds-${ds.id}`,
    title: `Charger jeu d'essai : ${ds.name}`,
    category: 'Scénarios Incidents SRE',
    icon: <Database className="w-4 h-4 text-indigo-300" />,
    run: () => {
      onClose();
      onSelectDataset(ds);
    },
  }));

  const allItems = [...actions, ...datasetActions];
  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-sans text-xs">
        {/* Search header */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une commande, un filtre, un scénario d'incident..."
            className="flex-1 bg-transparent border-0 outline-hidden text-sm text-slate-100 placeholder-slate-500 font-medium"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Aucune action correspondante
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={item.run}
                className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-slate-200 font-medium group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.category}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 flex items-center justify-between">
          <span>LogPulse Command Palette</span>
          <div className="flex items-center gap-3">
            <span>↑↓ pour naviguer</span>
            <span>Entrée pour valider</span>
          </div>
        </div>
      </div>
    </div>
  );
};
