# KSP CrimeBot 🚔

An AI-powered crime intelligence assistant for the Karnataka State Police (KSP) — combining a conversational chatbot (in English & Kannada), crime statistics dashboards, a geographic hotspot map, a criminal-network graph, and an early-warning alert system, all built on a synthetic crime dataset.

**Live app:** https://ksp-crimebot.vercel.app

**Repository:** https://github.com/likith007156/ksp-crimebot

> ⚠️ **Note:** This is a demo/prototype system built on **synthetic, illustrative crime data** (100 sample cases) — not real KSP case records.

---

## 1. What the Project Does

KSP CrimeBot is a role-based web dashboard for police personnel that lets a user:

- **Chat** with an AI crime analyst (LLM-powered) about cases, suspects, modus operandi, and trends — in English or Kannada, with responses automatically matching the query's language.
- **View aggregate statistics** — total cases, arrests, cases under investigation, and breakdowns by crime type and district (animated bar charts).
- **Explore a hotspot map** of Karnataka — districts are plotted with color-coded, size-scaled circles based on crime density.
- **Visualize a criminal network graph** — a force-directed graph showing associations (co-accused, gang members, etc.) between known offenders.
- **See an early-warning panel** — automatically generated alerts for districts with unusually high crime counts.
- **Export the chat conversation** as a text file.

Access is gated behind a role-based login screen (no real authentication/backend user database — see Section 5), and the UI adapts based on the selected role.

---

## 2. Architecture

```
┌─────────────────────────┐        HTTPS/JSON         ┌───────────────────────────┐
│   React Frontend (SPA)  │ ────────────────────────▶ │   Flask Backend (REST API)│
│   Hosted on Vercel      │ ◀──────────────────────── │   Hosted on Render        │
│   react-app/             │                           │   backend/                │
└─────────────────────────┘                            └──────────────┬────────────┘
                                                                      │
                                                          ┌────────────▼────────────┐
                                                          │  Groq LLM API             │
                                                          │  (Llama 3.3 70B Versatile)│
                                                          └────────────┬────────────┘
                                                                       │
                                                          ┌────────────▼────────────┐
                                                          │  crime_data.json          │
                                                          │  (100 synthetic records,  │
                                                          │  network links, lookups)  │
                                                          └───────────────────────────┘
```

The repo also contains a second, parallel backend under `functions/ksp_crimebot_function/` written for Zoho Catalyst (serverless functions), with its own copy of the crime data plus precomputed `crime_stats.json`, `hotspot_zones.json`, and `offender_profiles.json`. This appears to be an alternate/earlier deployment target (Catalyst `advancedio`, Python 3.12) alongside the currently-live Render+Vercel deployment.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 (Create React App / `react-scripts`) |
| Maps | `react-leaflet` + `leaflet`, CartoDB Dark Matter tile layer |
| Network graph | `react-force-graph-2d` (Canvas-based force-directed graph, lazy-loaded) |
| Icons | `lucide-react` |
| Frontend hosting | Vercel |
| Backend framework | Flask + `flask-cors` |
| LLM provider | Groq API — model `llama-3.3-70b-versatile` |
| Backend hosting | Render (via Gunicorn, per the `Procfile`) |
| Data store | Static JSON file (`crime_data.json`) — no database |
| Alt. backend | Zoho Catalyst serverless function (Python 3.12) — parallel implementation |

---

## 4. Repository Structure

```
ksp-crimebot/
├── backend/                              # Flask REST API (deployed on Render)
│   ├── main.py                           # All API routes + Groq LLM logic
│   ├── crime_data.json                   # 100 synthetic crime records + network + lookups
│   ├── fix_dataset.py / fix_dataset2.py  # One-off scripts used to clean/augment the dataset
│   ├── requirements.txt                  # groq, flask, flask-cors, gunicorn
│   └── Procfile                          # gunicorn start command for Render
│
├── functions/ksp_crimebot_function/      # Parallel Zoho Catalyst serverless function
│   ├── main.py
│   ├── catalyst-config.json
│   ├── crime_data.json
│   ├── crime_stats.json
│   ├── hotspot_zones.json
│   ├── offender_profiles.json
│   └── requirements.txt
│
├── react-app/                            # React frontend (deployed on Vercel)
│   ├── public/                           # ksp-emblem.png, bot-avatar.jpg, favicon, manifest
│   ├── src/
│   │   ├── App.js                        # Main app: tabs, chat, stats, map, network, warnings
│   │   ├── App.css                       # All styling (light/dark theme)
│   │   ├── LoginScreen.js                # Role-based badge-number login gate
│   │   ├── index.js / index.css          # React entry point
│   │   └── reportWebVitals.js / setupTests.js / App.test.js
│   ├── package.json                      # React 19, leaflet, force-graph, lucide-react
│   └── README.md                         # Default Create React App README
│
└── vercel-trigger.txt                    # Empty placeholder file used to force Vercel redeploys
```

---

## 5. Authentication Model (Important Caveat)

Login is **client-side only** — there is no backend user database, password, or session token:

- `LoginScreen.js` presents four roles: **Investigator, Analyst, Supervisor, Policymaker.**
- The user types any Badge Number / Officer ID.
- A small in-memory `Map` (`badgeRoleRegistry`), seeded with a few example badges (e.g. `PM-4001` → Policymaker), tracks which role a badge has been used with during that browser session only — it resets on page reload and is never sent to the server.
- Badge prefixes (`INV`, `ANA`, `SUP`, `PM`/`POLICY`) are used to sanity-check that the badge format matches the selected role.
- Once "authenticated," the app simply stores `{ role, badgeNumber }` in React state and uses it to:
  - Show a reduced tab set for **Policymaker** (only "Stats" and "Map" — no raw case chat or network data).
  - Show the full tab set (Chat, Stats, Map, Network, Warnings) for the other three roles.

This is a **UI/UX role-simulation layer, not a security mechanism** — any badge number will "work," and there's no verification against a real KSP personnel database.

---

## 6. Backend — API Reference (`backend/main.py`)

**Base URL** (as hardcoded in the frontend): `https://ksp-crimebot-backend.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Main chatbot endpoint. Body: `{ message, history }`. Returns AI response + relevant case IDs + network connections + top hotspots + warnings. |
| `GET` | `/api/stats` | Aggregate counts by crime type, district, and case status. |
| `GET` | `/api/network` | Full criminal-network link list (`from`, `to`, `relationship`, `cases`). |
| `GET` | `/api/repeat-offenders` | Accused persons appearing in more than one case, with case counts. |
| `GET` | `/api/hotspots` | Districts sorted by crime count (descending). |
| `GET` | `/api/warnings` | Auto-generated high-alert warnings for districts with ≥ 3 crimes. |
| `GET` | `/api/trends` | Monthly crime counts (from `date`/`CrimeRegisteredDate`, grouped `YYYY-MM`). |
| `GET` | `/health` | Simple health check (`{status: "ok"}`). |

### How `/api/chat` Works (Retrieval-Augmented Generation, No Vector DB)

1. `search_crime_data(query)` — a simple keyword/substring search across each crime's type, category, location, district, status, modus operandi, brief facts, and accused names. If nothing matches, it falls back to the first 3 records.
2. `get_criminal_network(name)` — if a word in the user's message matches an accused person's first name, their network connections are pulled in.
3. `build_context(...)` — formats the matched cases and network links into a structured text block.
4. The backend also always computes repeat offenders, hotspots, and early warnings across the entire dataset and injects them into the system prompt.

All of this is assembled into a system prompt instructing the model to act as "KSP CrimeBot," cite Case IDs, reply in the same language as the question (full Kannada script for Kannada queries), prefix urgent matters with `ALERT:`, and never fabricate details.

The full conversation (`history` + new message) is sent to Groq's `llama-3.3-70b-versatile` model (`temperature=0.3`, `max_tokens=1000`) and the reply is returned to the frontend along with metadata (matched case IDs, connections, top 3 hotspots, top 2 warnings).

### Dataset (`crime_data.json`)

Contains four top-level sections:

- **`crimes`** — 100 records, each with a rich schema (police-style fields such as `CaseMasterID`, `CrimeNo`, `PoliceStationName`, `GravityOffence`, `IPC` Act/Section, geo-coordinates, bilingual English/Kannada fields, `BriefFacts`, `modus_operandi`, `economic_loss`, `socio_economic`, accused list, victim, and status).
- **`criminal_network`** — pairwise relationships between accused individuals (`from`, `to`, `relationship` e.g. "Co-accused"/"Gang members", associated `cases`).
- **`lookup_tables`** — reference/lookup data (e.g. category or code mappings).
- **`ncrb_statistics`** — reference statistics, likely modeled after NCRB (National Crime Records Bureau) style aggregates.

---

## 7. Frontend — How It's Built (`react-app/src/App.js`)

- Single-page app, all state managed in the top-level `App` component with `useState`/`useEffect` (no Redux/Context).
- Five tabs: **Chat, Stats, Map, Network, Warnings** (Policymaker role only sees Stats + Map).
- On load, the app fetches `/api/stats`, `/api/network`, `/api/hotspots`, and `/api/warnings` in parallel and stores a "last synced" timestamp.
- **Chat tab:** maintains a message list (with a Kannada-greeting welcome message), sends the full conversation history with each new message to `/api/chat`, and renders returned Case-ID "tags" under bot replies. Includes an onboarding hint suggesting example queries and quick-fill "suggested query" buttons.
- **Stats tab:** four animated counters (Total Cases, Network Links, Arrested, Under Investigation) using a custom `useCounter` hook, plus horizontal bar charts (By Crime Type, By District) with entrance animations and percentage gridlines.
- **Map tab (`HotspotMap`):** uses `react-leaflet` with a dark CartoDB basemap centered on Karnataka; each district is a `CircleMarker` whose radius and color scale with crime count (Low/Medium/High/Critical Zone legend), with a popup showing exact counts.
- **Network tab (`NetworkGraph`):** lazy-loads `react-force-graph-2d` (code-split for performance), builds nodes/edges from the `/api/network` response, and renders a Canvas-based force-directed graph with custom node styling (circle + truncated name label) and relationship labels on links; resizes responsively via `ResizeObserver`.
- **Warnings tab:** renders alert cards color-coded by severity (Medium/High/Critical) with corresponding icons (`AlertTriangle`, `AlertOctagon`, `ShieldAlert`).
- **Export:** `exportPDF()` (despite the name) actually downloads the chat transcript as a plain `.txt` file via a Blob/`<a download>` trick — it does **not** generate a real PDF.
- **Theming:** light/dark mode toggle (`darkMode` state) drives a top-level `.app.dark` CSS class; light mode is the default.
- Header shows a KSP emblem watermark/logo, the logged-in badge/role, "last synced" time, theme toggle, and export button.

---

## 8. Running It Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=your_groq_api_key_here
python main.py          # runs on http://localhost:5000 (debug mode)
```

### Frontend

```bash
cd react-app
npm install
npm start                # runs on http://localhost:3000
```

> **Note:** `App.js` currently hardcodes `FUNCTION_URL` to the deployed Render backend (`https://ksp-crimebot-backend.onrender.com`). To point the frontend at your local Flask server, change `FUNCTION_URL` in `src/App.js` to `http://localhost:5000`.

### Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Backend (Render / local) | Auth key for the Groq LLM API |

---

## 9. Deployment

- **Frontend:** Vercel, auto-deployed from the `react-app/` directory (build via `react-scripts build`). `vercel-trigger.txt` is an empty file kept in the repo purely to force redeploys via trivial commits.
- **Backend:** Render, using the `Procfile` (`gunicorn main:app --bind 0.0.0.0:$PORT`) to serve the Flask app in production.
- CORS on the backend is explicitly restricted to `https://ksp-crimebot.vercel.app` and `http://localhost:3000`.
- An alternate serverless deployment path exists for Zoho Catalyst (`functions/ksp_crimebot_function/`), configured for a Python 3.12 "advancedio" function — this looks like a secondary/experimental hosting option rather than the primary live path.

---

## 10. Known Limitations

- **No real authentication** — the login screen only role-tags a session; it doesn't verify officer identity.
- **No persistent database** — all crime data lives in a static JSON file loaded into memory at server start; there's no way to add/update/delete case records through the app.
- **Simple keyword search, not semantic/vector search** — the RAG-style context retrieval for the chatbot matches on literal word overlap, which can miss paraphrased or semantically related queries.
- **"Export PDF" produces a `.txt` file**, not an actual PDF.
- **Dataset is synthetic/demo data** (100 records), not live police records.
- **Frontend backend URL is hardcoded**, not environment-configured, requiring a code change to point elsewhere.

---

## 11. Suggested Badge Numbers for Testing the Login (From the Pre-Seeded Registry)

| Badge | Role |
|---|---|
| `INV-1001` | Investigator |
| `ANA-2001` | Analyst |
| `SUP-3001` | Supervisor |
| `PM-4001` | Policymaker |
| `KSP-1234` | Investigator |
