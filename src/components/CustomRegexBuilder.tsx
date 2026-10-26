import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types/log';
import { parseWithCustomRegex } from '../utils/parser';
import { Code, CheckCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

interface CustomRegexBuilderProps {
  logs: LogEntry[];
  onApplyCustomRegex: (pattern: string, flags: string) => void;
}

const PRESET_PATTERNS = [
  {
    name: 'Log personnalisé avec Timestamp ISO + Niveau + Service',
    pattern: '^(?<timestamp>\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}:\\d{2})\\s+\\[(?<level>[A-Z]+)\\]\\s+\\[(?<service>[^\\]]+)\\]\\s+(?<message>.*)',
    sample: '2026-10-26 14:30:15 [ERROR] [auth-microservice] User authentication failed: token expired',
  },
  {
    name: 'Format Web Personnalisé (IP, Méthode, Chemin, Statut, Durée)',
    pattern: '^(?<ip>\\S+)\\s+-\\s+(?<method>[A-Z]+)\\s+(?<path>\\S+)\\s+(?<status>\\d{3})\\s+(?<duration>\\d+)ms\\s+(?<message>.*)',
    sample: '192.168.1.45 - POST /api/checkout 502 1450ms Upstream gateway connection refused',
  },
  {
    name: 'Syslog personnalisé avec PID',
    pattern: '^(?<timestamp>[A-Za-z]{3}\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2})\\s+(?<host>\\S+)\\s+(?<service>[^\\[]+)\\[(?<pid>\\d+)\\]:\\s+(?<message>.*)',
    sample: 'Oct 26 14:15:20 server-prod-01 kernel[18492]: Out of memory: Kill process 8492 (java) score 850',
  },
];

export const CustomRegexBuilder: React.FC<CustomRegexBuilderProps> = ({
  logs,
  onApplyCustomRegex,
}) => {
  const [pattern, setPattern] = useState(PRESET_PATTERNS[0].pattern);
  const [flags, setFlags] = useState('i');
  const [testLine, setTestLine] = useState(PRESET_PATTERNS[0].sample);

  // Evaluate regex live on test line
  const regexResult = useMemo(() => {
    try {
      const reg = new RegExp(pattern, flags);
      const match = reg.exec(testLine);
      if (!match) {
        return { isValid: true, matched: false, groups: null, error: null };
      }
      return {
        isValid: true,
        matched: true,
        groups: match.groups || null,
        fullMatch: match[0],
        error: null,
      };
    } catch (err: any) {
      return {
        isValid: false,
        matched: false,
        groups: null,
        error: err.message,
      };
    }
  }, [pattern, flags, testLine]);

  const insertNamedGroup = (groupName: string, subPattern: string) => {
    setPattern((prev) => `${prev}(?<${groupName}>${subPattern})`);
  };

  const loadPreset = (preset: typeof PRESET_PATTERNS[0]) => {
    setPattern(preset.pattern);
    setTestLine(preset.sample);
  };

  const handleApplyToAll = () => {
    if (!regexResult.isValid) return;
    onApplyCustomRegex(pattern, flags);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 font-sans text-xs text-slate-200">
      {/* Title */}
      <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-400" />
            Constructeur de Parser Regex Personnalisé
          </h3>
          <p className="text-xs text-slate-400">
            Créez ou testez des expressions régulières avec groupes de capture nommés pour extraire vos propres formats de logs propriétaires.
          </p>
        </div>

        <button
          onClick={handleApplyToAll}
          disabled={!regexResult.isValid || !regexResult.matched}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
        >
          <span>Appliquer aux {logs.length} logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-300">Modèles Prédéfinis :</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {PRESET_PATTERNS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(p)}
              className="p-3 bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-lg text-left transition-colors space-y-1"
            >
              <div className="font-semibold text-white text-xs">{p.name}</div>
              <div className="text-[11px] text-slate-400 truncate font-mono">{p.pattern}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pattern Editor */}
      <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200 flex items-center gap-1.5">
            Expression Régulière (avec groupes nommés) :
          </label>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Flags :</span>
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center font-mono text-indigo-300"
            />
          </div>
        </div>

        <textarea
          rows={3}
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-3 font-mono text-xs text-indigo-200 leading-relaxed"
          placeholder="^(?<timestamp>...)\s+(?<level>...)\s+(?<message>.*)"
        />

        {/* Quick insertion chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400">Insérer un groupe nommé :</span>
          <button
            onClick={() => insertNamedGroup('timestamp', '\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}:\\d{2}')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + timestamp
          </button>
          <button
            onClick={() => insertNamedGroup('level', '[A-Z]+')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + level
          </button>
          <button
            onClick={() => insertNamedGroup('service', '[\\w.-]+')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + service
          </button>
          <button
            onClick={() => insertNamedGroup('status', '\\d{3}')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + status
          </button>
          <button
            onClick={() => insertNamedGroup('duration', '\\d+')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + duration
          </button>
          <button
            onClick={() => insertNamedGroup('ip', '(?:\\d{1,3}\\.){3}\\d{1,3}')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + ip
          </button>
          <button
            onClick={() => insertNamedGroup('message', '.*')}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            + message
          </button>
        </div>
      </div>

      {/* Test Sample Line Input */}
      <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-200">
            Ligne de test en temps réel :
          </label>
          {logs.length > 0 && (
            <button
              onClick={() => {
                const sample = logs[Math.floor(Math.random() * logs.length)];
                setTestLine(sample.raw);
              }}
              className="text-xs text-indigo-400 hover:underline"
            >
              Charger un log aléatoire du jeu actuel
            </button>
          )}
        </div>

        <input
          type="text"
          value={testLine}
          onChange={(e) => setTestLine(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 font-mono text-xs text-slate-200"
        />
      </div>

      {/* Live Match Results */}
      <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200">Résultat de la correspondance :</span>
          {regexResult.isValid ? (
            regexResult.matched ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Correspondance réussie
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Aucune correspondance
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 font-medium">
              Erreur de syntaxe Regex : {regexResult.error}
            </span>
          )}
        </div>

        {regexResult.groups && Object.keys(regexResult.groups).length > 0 ? (
          <div className="border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800 font-mono">
            {Object.entries(regexResult.groups).map(([grp, val]) => (
              <div key={grp} className="flex items-center justify-between p-2.5 bg-slate-950">
                <span className="text-indigo-400 font-semibold">{grp}</span>
                <span className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {val !== undefined ? String(val) : '<vide>'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-xs italic">
            {regexResult.matched
              ? 'La ligne correspond, mais aucun groupe nommé (?<nom>...) n’a été capturé.'
              : 'Ajustez votre regex ou la ligne de test ci-dessus.'}
          </div>
        )}
      </div>
    </div>
  );
};
