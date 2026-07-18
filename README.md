# KSP CrimeBot 🚔

**An AI-powered, bilingual crime-intelligence assistant built for Karnataka State Police** — combining a conversational chatbot (English & Kannada, text and voice), a live analytics dashboard, a geographic hotspot map, a risk-aware criminal-network graph, and an automated early-warning system, all running on a rich synthetic crime dataset.

- **Repository:** https://github.com/likith007156/ksp-crimebot
- **Live app (Vercel):** https://ksp-crimebot-3ngz3rvcn-likith-kumars-projects-7537be6b.vercel.app
- **Live app (Zoho Catalyst):** https://ksp-crimebot-vgzydfhk.onslate.in

> ⚠️ Built on **synthetic, illustrative crime data** (100 sample cases across 12 Karnataka districts) for the KSP Datathon 2026 — not real police records.

Both live links serve the **same React application**, deployed to two different static hosts (Vercel and Zoho Catalyst's web-client hosting). Both currently call the same Flask API on Render.

---

## 1. What the project does

KSP CrimeBot is a role-gated dashboard that lets police personnel:

1. **Chat with an AI crime analyst** — in **English or Kannada**, by typing or speaking. Answers are grounded in the case database and always cite Case IDs.
2. **Talk to it** — record a question by voice; it's transcribed, answered, and can be read back aloud (Kannada/English text-to-speech).
3. View a **live stats dashboard** — animated counters, cases by type/district, and a **High-Risk Cases** table driven by a per-case computed risk score.
4. Explore a **Karnataka hotspot map** — districts plotted with colour/size scaled to crime density.
5. Explore a **criminal network graph** (auto-laid-out with ReactFlow + dagre) where node colour reflects each person's highest tracked **risk level**, with click-through detail.
6. See an **early-warning panel** for districts with unusually high case counts.
7. **Export** the current chat as a formatted, letterhead-styled **PDF report** (Karnataka State Police / SCRB style), including correctly shaped Kannada text.

Access is gated by a **role + badge-number login** (Investigator, Analyst, Supervisor, Policymaker) — see Section 6 for exactly how this works today.

---

## 2. Architecture

```
                          ┌───────────────────────────┐
                          │   React Frontend (SPA)    │
        ┌───────────────▶ │   • Vercel               │◀───────────────┐
        │                 │   • Zoho Catalyst (onslate.in / catalystserverless.in)
        │                 └─────────────┬─────────────┘
        │                               │ HTTPS / JSON (fetch)
        │                               ▼
        │                ┌───────────────────────────┐
        │                │   Flask REST API          │
        │                │   Render (gunicorn)       │
        │                │   backend/main.py         │
        │                └───────┬──────────┬────────┘
        │                        │          │
        │           ┌────────────▼───┐  ┌───▼─────────────┐
        │           │ Groq LLM API   │  │ Sarvam AI       │
        │           │ Llama 3.3 70B  │  │ speech-to-text /│
        │           │(chat reasoning)│  │ text-to-speech  │
        │           └────────────────┘  └─────────────────┘
        │                        │
        │           ┌────────────▼───────────────────────┐
        │           │ crime_data.json (100 cases,        │
        │           │ criminal_network, lookup tables)   │
        │           │ + crime_stats / hotspot_zones /    │
        │           │ offender_profiles (loaded, unused) │
        │           └────────────────────────────────────┘
        │
        │  best-effort logging
        └───────────────────────────────────────────────┐
                                                        ▼
                                          ┌───────────────────────────┐
                                          │ Zoho Catalyst Data Store  │
                                          │ (query/response audit log)│
                                          └───────────────────────────┘
```

A **second, independent backend** exists at `functions/ksp_crimebot_function/` — a Zoho Catalyst serverless Function (Python 3.12, "AdvancedIO" stack). It is an **earlier, smaller fork** of the API (166 lines vs. 671 in the live backend) that calls **Anthropic's Claude API** instead of Groq, and is missing most of the newer endpoints (voice, demographics, risk scores, persons, similar-cases). It does not appear to be the backend actually used by either live frontend today — `FUNCTION_URL` in the React app points at the Render deployment in production. It's best described as a **parallel/legacy serverless implementation**, not the active production path.

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 (Create React App) |
| Maps | `react-leaflet` + `leaflet`, CartoDB Positron/Dark Matter tiles |
| Network graph | `reactflow` + `dagre` (auto-layout), risk-coloured nodes |
| PDF export | `jspdf`, with a custom-embedded Noto Sans Kannada font rendered via off-screen `<canvas>` for correct Kannada glyph shaping |
| Icons | `lucide-react` |
| Frontend hosting | Vercel **and** Zoho Catalyst (web-client hosting, `zcatalyst-cli-plugin-react`) |
| Backend framework | Flask + `flask-cors` |
| Chat LLM | Groq API — `llama-3.3-70b-versatile`, with a same-model retry on rate-limit |
| Voice (STT/TTS) | Sarvam AI (`saaras:v3` speech-to-text, `text-to-speech` with Kannada/English speakers) |
| Backend hosting | Render (Gunicorn, per `Procfile`) |
| Audit logging | Zoho Catalyst Data Store (best-effort, non-blocking) |
| Data store | Static JSON files loaded into memory — no database |
| Legacy backend | Zoho Catalyst Function (Python 3.12) using Anthropic Claude — parallel/older implementation |

---

## 4. Repository structure

```
ksp-crimebot/
├── backend/                          # Flask REST API (deployed on Render)
│   ├── main.py                       # All routes: chat, stats, voice, risk, demographics…
│   ├── crime_data.json               # 100 cases + criminal_network + lookup_tables + ncrb_statistics
│   ├── crime_stats.json              # Loaded at startup but currently unused by any route
│   ├── hotspot_zones.json            # Loaded at startup but currently unused by any route
│   ├── offender_profiles.json        # Loaded at startup but currently unused by any route
│   ├── fix_dataset.py / fix_dataset2.py   # One-off dataset-cleanup scripts
│   ├── requirements.txt              # groq, flask, flask-cors, gunicorn, requests
│   └── Procfile                      # gunicorn start command for Render
│
├── functions/ksp_crimebot_function/  # Legacy/parallel Zoho Catalyst serverless function
│   ├── main.py                       # Smaller, Anthropic-based fork of the API (166 lines)
│   ├── catalyst-config.json          # Python 3.12, AdvancedIO stack
│   ├── crime_data.json / crime_stats.json / hotspot_zones.json / offender_profiles.json
│   └── requirements.txt
│
├── react-app/                        # React frontend (deployed to Vercel + Zoho Catalyst)
│   ├── public/                       # ksp-emblem.png, favicon, manifest
│   ├── src/
│   │   ├── App.js                    # Main app: 5 tabs, chat, voice, PDF export, risk UI (~1,630 lines)
│   │   ├── App.css
│   │   ├── LoginScreen.js            # Fixed badge → role whitelist login gate
│   │   ├── notoSansKannadaFont.js    # Base64-embedded Kannada font for PDF export (~836 KB)
│   │   └── index.js / index.css / reportWebVitals.js / setupTests.js / App.test.js
│   ├── package.json                  # React 19, reactflow, dagre, jspdf, leaflet, lucide-react…
│   └── README.md                     # Default Create React App README
│
└── vercel-trigger.txt                # Empty placeholder file used to force Vercel redeploys
```

---

## 5. Feature detail

### Bilingual, voice-enabled chat
- Text queries in English or Kannada are answered in the **same language as the question**, detected via Unicode range matching on the query text (not the UI toggle).
- **Voice input**: the browser records via `MediaRecorder` (first supported of `audio/webm` → `ogg` → `wav` → `mp4`), uploads to `/api/transcribe`, which forwards to **Sarvam AI's `saaras:v3`** speech-to-text model.
- **Voice output**: assistant replies can be sent to `/api/synthesize`, which calls **Sarvam AI text-to-speech** (`meera` voice for Kannada, `arvind` for English) and plays the returned audio.
- If the primary Groq model (`llama-3.3-70b-versatile`) hits a rate limit, the backend retries once (currently retries the **same** model rather than falling back to a smaller one — see Known limitations).

### Risk scoring & high-risk cases
- Each case carries a computed `risk_assessment` (`risk_score` 0–100, `risk_level`). The Stats tab renders a **High-Risk Cases table** (score ≥ 70) sorted descending, with colour-coded level badges.
- `/api/persons` aggregates **per-accused** risk across all their cases (their single highest risk level/score), which is fed into the Network tab so **graph nodes are coloured by the person's own risk profile**, not just case-level severity.

### Criminal network graph
- Built with **ReactFlow**, laid out automatically with **dagre** (rather than a manual force simulation), so the graph reflows cleanly regardless of node count. Clicking a node shows that person's aggregated risk data and linked case IDs.

### PDF export (real PDF, not plain text)
- Generates a multi-page, **letterhead-styled report** — Karnataka State Police / State Crime Records Bureau header, a red "CONFIDENTIAL" tag, page footers with page numbers, and a generation timestamp.
- **Kannada text is rasterised**: jsPDF's native text renderer doesn't apply the complex-script shaping Kannada needs (conjuncts, vowel signs), so any line containing Kannada characters is drawn to an off-screen `<canvas>` using an embedded Noto Sans Kannada font and inserted as an image; English lines render as normal PDF text. This keeps the file both correctly rendered and reasonably sized.

### Dataset richness
Each of the 100 case records includes, beyond the core case fields (Case ID, IPC Act/Section, district, station, gravity, status): `risk_assessment`, `accused_demographics` (age group, gender, income bracket, risk level), `victim_demographics`, `socio_economic_profile`, and — for the 21 cases flagged as financial crimes — a `financial_crime_details` block with a step-by-step **money-trail transaction list** (accounts, banks, amounts, timestamps).

---

## 6. Authentication model

Login now uses a **fixed, hardcoded whitelist** (`VALID_CREDENTIALS` in `LoginScreen.js`) mapping specific badge numbers to specific roles:

| Badge | Role |
|---|---|
| `INV-1001`, `KSP-1234` | Investigator |
| `ANA-2001` | Analyst |
| `SUP-3001` | Supervisor |
| `PM-4001` | Policemaker |

Entering an unlisted badge is rejected outright; entering a listed badge under the *wrong* selected role gives a specific correction message. This is a step up from the earlier "any badge number works" behaviour, but it's still a **client-side whitelist baked into the bundle** — there's no backend credential store, password, or session token, so it should be treated as a UI role-gate, not real officer authentication.

---

## 7. Backend — API reference (`backend/main.py`)

Base URL: `https://ksp-crimebot-backend.onrender.com` (or `http://localhost:5000` when the frontend itself is running on `localhost`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Main chatbot endpoint. Cites Case IDs, matches query language, logs to Catalyst Data Store. |
| `GET` | `/api/stats` | Case counts by type, district, status. |
| `GET` | `/api/network` | Full criminal-network link list. |
| `GET` | `/api/repeat-offenders` | Accused appearing in 2+ cases. |
| `GET` | `/api/hotspots` | Districts sorted by crime count. |
| `GET` | `/api/warnings` | Districts with ≥ 3 crimes. |
| `GET` | `/api/trends` | Monthly case counts. |
| `GET` | `/api/similar-cases?type=&modus=` | Cases ranked by type match + modus-operandi keyword overlap. |
| `GET` | `/api/persons` | Per-accused aggregated risk level/score and case list. |
| `GET` | `/api/demographics` | Victim/accused demographic breakdowns (fetched by the frontend but not currently displayed). |
| `GET` | `/api/risk-scores` | Risk-level distribution + top 10 high-risk cases. |
| `POST` | `/api/synthesize` | Text → speech via Sarvam AI. |
| `POST` | `/api/transcribe` | Speech → text via Sarvam AI. |
| `GET` | `/health`, `/api/health` | Health check. |

### How `/api/chat` works
1. **Total-count bypass** — if the question matches a "how many cases/crimes" pattern (English or Kannada), the full dataset is handed to the model so it reports the correct total instead of guessing from a keyword-limited subset.
2. **Case-ID exact match** — if the query contains a literal Case ID, that single case is returned.
3. **Keyword search** — otherwise, cases are scored by word overlap across type, category, location, district, status, modus operandi, brief facts, and accused names (top 5, or first 3 as a fallback).
4. **Network linking** — if a word in the query matches an accused person's first name, their network connections are pulled in too.
5. Repeat offenders, hotspots, and warnings are computed over the **entire** dataset and injected into the system prompt regardless of the keyword match, so the model always has global counts available.
6. **Language detection** is done on the query itself (Kannada Unicode range check), not the UI's language toggle, so the model reliably answers in the language actually asked.
7. Sent to Groq's `llama-3.3-70b-versatile` (`temperature=0.3`, `max_tokens=1000`). On a rate-limit error the code retries — currently the **same** model again (see Known limitations).
8. The exchange is logged (best-effort) to a Zoho Catalyst Data Store table for audit purposes.

---

## 8. Deployment

- **Frontend**: the same React build is deployed to **two** static hosts:
  - **Vercel**, auto-deployed from `react-app/` (`vercel-trigger.txt` is an empty file kept in the repo purely to force redeploys via trivial commits).
  - **Zoho Catalyst** web-client hosting, via `zcatalyst-cli-plugin-react`, reachable at the custom domain `onslate.in` and at a default `*.development.catalystserverless.in` address.
- **Backend**: Render, via the `Procfile` (`gunicorn main:app --bind 0.0.0.0:$PORT`).
- **CORS** on the Flask backend explicitly allow-lists all three known frontend origins (Vercel, the Catalyst custom domain, the Catalyst dev domain) plus `localhost:3000`.
- **Audit logging**: successful and failed chat exchanges are posted to a **Zoho Catalyst Data Store** table (`log_to_catalyst`), independent of which frontend the request came from.
- A separate, older **Zoho Catalyst Function** (`functions/ksp_crimebot_function/`) exists as a parallel serverless backend candidate but is not wired up to either live frontend.

### Environment variables (backend)
| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Auth for the Groq chat LLM |
| `SARVAM_API_KEY` | Auth for Sarvam AI speech-to-text / text-to-speech |
| `CATALYST_TOKEN` | OAuth token for posting audit logs to Zoho Catalyst Data Store |

---

## 9. Known limitations

- **Not real authentication** — badge/role checking is a hardcoded whitelist shipped in the frontend bundle, not a verified officer identity system.
- **No persistent database / no write path** — all case data is static JSON loaded into memory at process start; there's no way to add, edit, or delete cases through the app itself.
- **Catalyst audit logging is currently broken**: `log_to_catalyst()` calls `requests.post(...)`, but `requests` is never imported at module scope in `backend/main.py` (it's only imported locally inside the `/api/synthesize` and `/api/transcribe` handlers). Every call to `log_to_catalyst` will raise a `NameError`, which is silently caught and printed — so no audit rows are actually being written despite `requests` being present in `requirements.txt`. A one-line `import requests` at the top of `main.py` would fix this.
- **Three JSON files loaded but unused** — `crime_stats.json`, `hotspot_zones.json`, and `offender_profiles.json` are read into memory on startup but never referenced by any route; they add load time/memory with no current benefit.
- **Rate-limit fallback doesn't actually fall back** — on a Groq 429, the code retries `llama-3.3-70b-versatile` again rather than switching to a smaller/faster model as the comment ("Falling back to Llama 3.1 8B…") implies.
- **`/api/demographics` is fetched but never rendered** — the frontend calls it and stores the result in state, but no UI currently displays it.
- **Simple keyword search**, not semantic/vector search — retrieval matches on literal word overlap and can miss paraphrased or semantically related queries.
- **The Catalyst serverless Function is a stale fork** — it targets Anthropic's Claude API, is missing most newer endpoints (voice, risk, demographics, persons, similar-cases), and isn't the backend either live frontend actually calls.
- **Dataset is synthetic/demo data** (100 records), not live police records.
- **Production backend URL is still a hardcoded literal** for non-localhost origins (`https://ksp-crimebot-backend.onrender.com`), rather than an environment variable — it's dynamic for local dev only.

---

## 10. Running it locally

### Backend
```bash
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=your_groq_api_key_here
export SARVAM_API_KEY=your_sarvam_api_key_here      # optional, needed for voice
export CATALYST_TOKEN=your_catalyst_oauth_token      # optional, needed for audit logging
python main.py          # runs on http://localhost:5000 (debug mode)
```

### Frontend
```bash
cd react-app
npm install
npm start                # runs on http://localhost:3000
```
The frontend automatically points at `http://localhost:5000` when it detects it's running on `localhost`/`127.0.0.1`, and at the Render URL otherwise — no manual edit needed for local development.

---

## 11. Suggested badge numbers for testing the login

| Badge | Role |
|---|---|
| `INV-1001` | Investigator |
| `KSP-1234` | Investigator |
| `ANA-2001` | Analyst |
| `SUP-3001` | Supervisor |
| `PM-4001` | Policemaker |

Any badge not in this list is rejected; a listed badge entered under the wrong role selection prompts you to switch to its correct role.
