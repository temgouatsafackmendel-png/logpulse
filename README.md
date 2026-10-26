# 🛡️ LogPulse - Analyseur de Logs Professionnel & Observabilité IA

> **Plateforme d'ingestion, d'analyse et d'observabilité de logs en temps réel avec diagnostic de cause racine (RCA) propulsé par Gemini 3.8 Flash.**

[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-3.8_Flash-4285f4?logo=google&logoColor=white)](https://ai.google.dev/)

---

## 🚀 Accès & Déploiement

- **URL de l'application (AI Studio Dev)** : [https://ais-dev-csn2kzkfja3yovzy3ursv2-310900528305.us-west1.run.app](https://ais-dev-csn2kzkfja3yovzy3ursv2-310900528305.us-west1.run.app)
- **URL Partagée (Production)** : [https://ais-pre-csn2kzkfja3yovzy3ursv2-310900528305.us-west1.run.app](https://ais-pre-csn2kzkfja3yovzy3ursv2-310900528305.us-west1.run.app)

---

## 📑 Sommaire

1. [Aperçu & Architecture](#-aperçu--architecture)
2. [Fonctionnalités Principales](#-fonctionnalités-principales)
3. [Moteur de Parsing & Formats Supportés](#-moteur-de-parsing--formats-supportés)
4. [Intelligence Artificielle & Diagnostic RCA](#-intelligence-artificielle--diagnostic-rca)
5. [Structure du Projet](#-structure-du-projet)
6. [Installation & Lancement Local](#-installation--lancement-local)
7. [Synchronisation GitHub](#-synchronisation-sur-votre-compte-github)

---

## 🏛️ Aperçu & Architecture

LogPulse a été conçu selon les standards des consoles d'observabilité leaders (Datadog, Grafana Loki, Splunk, Honeycomb). L'application combine une interface réactive haute densité en front-end (React 19 + TypeScript + Tailwind CSS v4) et un serveur Express full-stack qui encapsule les interactions avec l'API Gemini côté serveur afin de garantir la sécurité des clés d'API.

```
┌─────────────────────────────────────────────────────────────┐
│                       INTERFACE UTILISATEUR                 │
│  - Palette de commandes (⌘K)      - Volet de facettes SRE   │
│  - Histogramme temporel interactif- Vue Tableau / Console   │
│  - Tiroir d'inspection contextuelle- Agrégation d'empreintes │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                    SERVEUR BACKEND (server.ts)              │
│  - POST /api/analyze-incident   (RCA & Détection pannes)   │
│  - POST /api/explain-single-log (Explication d'exception)  │
│  - POST /api/natural-language-query (Conversion prompt->filtre)
└──────────────────────────────┬──────────────────────────────┘
                               │ SDK @google/genai
┌──────────────────────────────▼──────────────────────────────┐
│                   GEMINI 3.8 FLASH (Google AI)              │
│  - Diagnostic corrélé des traces de piles et dépendances    │
│  - Génération de plans d'action SRE & commandes shell/SQL   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌟 Fonctionnalités Principales

### 1. Ingestion de Logs Polyvalente
- **4 Scénarios d'incidents d'entreprise préchargés** :
  - *Panne Microservices Cloud & Pool PostgreSQL (HikariCP exhaustion, OOM, Deadlocks)*
  - *Cluster Web Nginx & Ingress (Attaque par balayage, codes HTTP 502/504 Bad Gateway)*
  - *Audit de Sécurité Syslog (Attaques automatisées brute-force SSH, rejets sudo, pare-feu UFW)*
  - *Cloud API Gateway JSON (Traces distribuées traceId/spanId, dépassement de quota 429)*
- **Import de fichiers** : Glisser-déposer de fichiers `.log`, `.txt`, `.json`, `.csv`.
- **Mode direct (`tail -f`)** : Simulation de flux en temps réel avec injection régulière de nouveaux événements.

### 2. Triage & Filtrage de Haute Précision
- **Volet de Facettes SRE latéral** : Répartition dynamique par microservices, codes HTTP (`2xx`, `4xx`, `5xx`) et niveaux de gravité (`FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`).
- **Moteur de recherche syntaxique** :
  - `level:ERROR`
  - `service:payment-gateway`
  - `status:>=500` ou `status:502`
  - `duration:>500`
  - `ip:192.168.1.1`
- **Assistant IA en langage naturel** : Posez une question en français (*"Montre-moi les erreurs de base de données de plus de 2 secondes"*) et obtenez instantanément le filtre syntaxique configuré.

### 3. Double Mode d'Affichage
- **Vue Tableau Haute Densité** : Chiffres tabulaires (`tabular-nums`), horodatage précis à la milliseconde, badges de statut discrets et raccourcis d'actions rapides.
- **Vue Console / Terminal Brut** : Rendu type terminal ANSI avec suivi automatique du flux en direct et bascule du retour à la ligne (*Wrap*).

### 4. Diagnostic de Cause Racine IA (RCA)
- Synthèse d'incident exécutif.
- Détermination formelle de la cause racine première.
- Identification des microservices touchés.
- Checklist ordonnée du plan de remédiation technique (commandes bash, correctifs de configuration, requêtes SQL).
- Recommandations préventives d'architecture.
- Export direct au format Markdown.

### 5. Agrégation d'Empreintes d'Erreurs (Clustering)
- Algorithme de normalisation masquant les identifiants uniques (UUIDs, adresses IP, timestamps, valeurs numériques) pour regrouper les erreurs similaires en modèles types d'anomalies.

### 6. Constructeur de Parser Regex Personnalisé
- Testeur interactif avec drapeaux (`flags`) et groupes de capture nommés (`(?<timestamp>...)`, `(?<level>...)`, `(?<service>...)`, `(?<message>...)`) applicable à l'ensemble du jeu de logs.

---

## 📂 Structure du Projet

```
.
├── .env.example             # Déclaration des variables d'environnement
├── .gitignore               # Exclusions Git standards (node_modules, dist, .env)
├── index.html               # Point d'entrée HTML avec typographies professionnelles
├── metadata.json            # Configuration et métadonnées de l'application AI Studio
├── package.json             # Dépendances et scripts de démarrage
├── server.ts                # Serveur Express full-stack avec routes Gemini AI
├── tsconfig.json            # Configuration TypeScript stricte
├── vite.config.ts           # Configuration Vite et Tailwind CSS
└── src/
    ├── main.tsx             # Point de montage React 19
    ├── index.css            # Feuille de style globale et polices
    ├── App.tsx              # Composant racine orchestrant l'application
    ├── types/
    │   └── log.ts           # Types TypeScript (LogEntry, LogFilter, IncidentReport...)
    ├── utils/
    │   ├── parser.ts        # Parseur haute performance (JSON, Nginx, Syslog, Spring, etc.)
    │   ├── clustering.ts    # Algorithme d'agrégation d'empreintes d'erreurs
    │   └── demoData.ts      # Générateurs de jeux d'essai d'incidents réels
    └── components/
        ├── Header.tsx             # Barre de navigation supérieure (Top Bar Contract)
        ├── KPIStrip.tsx           # Bandeau de métriques télémétriques
        ├── LogHistogram.tsx       # Histogramme temporel interactif
        ├── FacetSidebar.tsx       # Volet latéral des facettes (services, statuts, niveaux)
        ├── QueryBar.tsx           # Barre de requête et filtres avec assistant IA
        ├── LogTable.tsx           # Tableau de logs haute densité
        ├── LogTerminalView.tsx    # Vue console terminal brut
        ├── LogDrawer.tsx          # Volet d'inspection contextuelle et stack traces
        ├── IncidentAIModal.tsx    # Fenêtre modale de diagnostic RCA par Gemini
        ├── IngestionModal.tsx     # Modale d'ingestion (jeux d'essai, upload, collage)
        ├── ErrorSignaturesView.tsx# Vue triée des signatures d'erreurs récurrentes
        ├── CustomRegexBuilder.tsx # Constructeur interactif de regex personnalisées
        └── CommandPalette.tsx     # Palette de commandes globale (⌘K)
```

---

## 💻 Installation & Lancement Local

### Prérequis
- **Node.js** >= 18.0.0
- **npm** ou **bun**

### 1. Cloner le projet
```bash
git clone <URL_DU_DEPOT>
cd logpulse
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```
Ajoutez votre clé d'API Google Gemini :
```env
GEMINI_API_KEY="votre_cle_api_gemini"
PORT=3000
```

### 4. Lancer l'application
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

---

## 🔗 Synchronisation sur votre compte GitHub

Pour exporter ce projet complet sur votre propre compte GitHub (`AI ENGINEERING`) :

### Méthode 1 : Export direct depuis Google AI Studio (Recommandé)
1. Dans l'interface de **Google AI Studio**, repérez le bouton de synchronisation **GitHub** ou **Export** dans la barre d'outils supérieure.
2. Connectez votre compte GitHub.
3. Sélectionnez votre organisation ou dépôt cible et lancez l'exportation automatique.

### Méthode 2 : Ligne de commande Git
Depuis votre machine locale :
```bash
# 1. Initialiser le dépôt git
git init
git add .
git commit -m "feat: initial commit of LogPulse professional log analyzer"

# 2. Associer votre dépôt distant GitHub
git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/VOTRE_DEPOT.git

# 3. Pousser la branche principale
git branch -M main
git push -u origin main
```

---

## 📄 Licence
Sous licence Apache 2.0. Conçu pour les ingénieurs DevOps, SRE et développeurs Cloud.
