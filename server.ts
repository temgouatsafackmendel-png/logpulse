import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '20mb' }));

// Initialisation SDK Gemini officiel côté serveur
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint 1 : Analyse complète de Cause Racine (RCA) et Détection d'Incidents
app.post('/api/analyze-incident', async (req, res) => {
  try {
    const { logs, stats, incidentQuestion } = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'Aucun journal fourni pour analyse.' });
    }

    if (!ai) {
      return res.status(500).json({
        error: 'Clé API Gemini non configurée sur le serveur.',
        details: 'Vérifiez la variable GEMINI_API_KEY dans vos paramètres.',
      });
    }

    const logSummary = logs.slice(0, 35).map((l, idx) => {
      return `[#${idx + 1}] [${l.timestamp || 'N/A'}] [${l.level || 'INFO'}] [Service: ${l.service || 'unknown'}] ${l.message || ''} ${l.status ? `(Status: ${l.status})` : ''} ${l.stackTrace ? `\nStackTrace: ${l.stackTrace.substring(0, 300)}...` : ''}`;
    }).join('\n');

    const prompt = `Tu es un Ingénieur SRE & Observabilité d'élite (Site Reliability Engineering).
Analyse l'échantillon de logs suivant et génère un rapport d'incident professionnel et précis en français.

STATISTIQUES DE LA PÉRIODE :
- Total de logs analysés : ${stats?.total || logs.length}
- Erreurs critiques (FATAL/ERROR) : ${stats?.errors || 0}
- Avertissements (WARN) : ${stats?.warnings || 0}
- Services détectés : ${stats?.services?.join(', ') || 'Non spécifiés'}
${incidentQuestion ? `QUESTION DE L'UTILISATEUR : ${incidentQuestion}` : ''}

EXTRAIT DE JOURNAUX REPRÉSENTATIFS :
${logSummary}

RÉPONDS STRICTEMENT AU FORMAT JSON avec cette structure :
{
  "title": "Titre clair et concis de l'incident (ex: Défaillance en cascade du pool de connexions PostgreSQL)",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "Résumé exécutif en 2-3 phrases expliquant la situation et la chronologie.",
  "rootCause": "Explication technique détaillée de la cause racine première.",
  "impactedServices": ["liste", "des", "services"],
  "immediateActions": [
    "Action 1 immédiate concrète (ex: redémarrer le service X, agrandir le pool min_size)",
    "Action 2...",
    "Action 3..."
  ],
  "preventiveMeasures": [
    "Mesure d'architecture ou de monitoring recommandée à long terme"
  ],
  "technicalDetails": "Détails techniques additionnels pertinents (requêtes, codes d'erreur HTTP, exceptions)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        title: "Analyse d'incident",
        severity: "HIGH",
        summary: text,
        rootCause: "Analyse textuelle retournée par le modèle",
        impactedServices: stats?.services || [],
        immediateActions: ["Inspecter les logs d'erreurs récents", "Vérifier la connectivité réseau"],
        preventiveMeasures: ["Ajouter des métriques d'alerting"],
        technicalDetails: ""
      };
    }

    return res.json({ success: true, report: parsed });
  } catch (error: any) {
    console.error('Erreur /api/analyze-incident:', error);
    return res.status(500).json({
      error: "Erreur lors de l'analyse IA de l'incident.",
      details: error?.message || String(error),
    });
  }
});

// Endpoint 2 : Explication d'une ligne d'erreur ou d'une stacktrace spécifique
app.post('/api/explain-single-log', async (req, res) => {
  try {
    const { log } = req.body;

    if (!log) {
      return res.status(400).json({ error: 'Log manquant.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Clé API Gemini non configurée.' });
    }

    const prompt = `Tu es un expert système et développeur senior.
Explique cette ligne de log ou cette exception de manière ultra-claire et pédagogique en français pour un développeur ou un DevOps :

Timestamp: ${log.timestamp || 'Inconnu'}
Niveau: ${log.level || 'INFO'}
Service / Hôte: ${log.service || log.host || 'Inconnu'}
Message: ${log.message || 'Aucun'}
Code HTTP: ${log.status || 'N/A'}
StackTrace ou Détails:
${log.stackTrace || log.raw || 'Aucune stack trace'}

RÉPONDS STRICTEMENT AU FORMAT JSON :
{
  "meaning": "Explication simple et directe de ce que cette erreur signifie concrètement.",
  "probableCause": "Pourquoi cela s'est produit dans ce contexte.",
  "resolutionSteps": [
    "Étape 1 pour corriger ou débugger",
    "Étape 2..."
  ],
  "commandOrCodeFix": "Exemple de commande bash, requête SQL ou correction de configuration (ou vide si non pertinent)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, explanation: parsed });
  } catch (error: any) {
    console.error('Erreur /api/explain-single-log:', error);
    return res.status(500).json({
      error: "Erreur lors de l'explication IA.",
      details: error?.message || String(error),
    });
  }
});

// Endpoint 3 : Transformation langage naturel -> syntaxe de filtre de logs
app.post('/api/natural-language-query', async (req, res) => {
  try {
    const { userPrompt, availableServices } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ error: 'Requête manquante.' });
    }

    if (!ai) {
      // Fallback simple si pas d'API key
      return res.json({
        success: true,
        query: userPrompt,
        explanation: 'Recherche textuelle brute',
        levelFilter: 'ALL',
      });
    }

    const prompt = `L'utilisateur utilise un outil de recherche de logs d'observabilité.
Il pose une question ou fait une demande en langage naturel (français ou anglais).
Convertis sa demande en syntaxe de recherche précise pour notre moteur de filtre.

SYNTAXE SUPPORTÉE :
- Mots-clés libres : texte brut (ex: timeout, failed)
- Filtre niveau : level:ERROR, level:WARN, level:FATAL, level:INFO, level:DEBUG
- Filtre service : service:nom-du-service (services connus : ${availableServices?.join(', ') || 'inconnus'})
- Filtre status HTTP : status:500, status:>=400, status:>=500, status:404
- Filtre IP : ip:192.168.1.1
- Filtre durée ms : duration:>500

Demande de l'utilisateur : "${userPrompt}"

RÉPONDS STRICTEMENT AU FORMAT JSON :
{
  "query": "la requête syntaxique construite (ex: level:ERROR service:auth status:>=500)",
  "explanation": "brève explication en français de la requête générée",
  "recommendedLevel": "ALL" | "ERROR" | "WARN" | "INFO"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Erreur /api/natural-language-query:', error);
    return res.status(500).json({
      error: 'Erreur de génération de requête.',
      details: error?.message || String(error),
    });
  }
});

// Configuration Vite ou Statique
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LogPulse server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
