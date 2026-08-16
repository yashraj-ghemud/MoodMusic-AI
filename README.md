<p align="center">
  <img src="./.github/readme-assets/signal.gif" alt="Animated signal / product visual for MoodMusic-AI" width="100%" />
</p>

<h1 align="center">MoodMusic-AI</h1>

<p align="center"><strong>Full‑stack prototype that infers a user's mood from an uploaded or captured image (or free‑form mood text) and returns a short curated playlist and a curator summary.</strong></p>

<p align="center"><code>REPO//SIGNAL</code> · <code>SIGNAL / PRODUCT</code> · <code>LOOPING README EXPERIENCE</code></p>

## Live signal

| Lens | Readout |
| --- | --- |
| Portfolio lane | **SIGNAL / PRODUCT** |
| Code surface | **24** tracked files observed |
| Primary materials | **Python, Markdown, JavaScript, YAML** |
| Verification | **0** test-related files observed |

> A moving scan of the project surface. The animated frame above is a lightweight visual signature; the sections below remain the source of truth for implementation details.

## Motion map

`SIGNAL` → `SHAPE` → `RELEASE`

Use the animated banner as the first signal, then move into the implementation dossier. The recommended next step is to verify the documented setup command against the repository scripts before extending the project.

<details open>
<summary><strong>Open the full project dossier</strong></summary>

## Overview
MoodMusic-AI is a monolithic Flask backend that serves a single‑page frontend. The backend implements image‑based emotion detection (DeepFace first, with optional FER/ONNX fallbacks) and a MusicFinder component that can optionally call Google Gemini to generate playlist suggestions. A simple SPA provides camera capture, drag‑and‑drop upload, and mood input UI. A Render service manifest (render.yaml) is included for hosting the backend.

## What it does
- Provides APIs to analyze an uploaded or captured image (/api/analyze) and return song recommendations.
- Provides an endpoint (/api/mood) to create recommendations from free‑form mood text.
- Serves a static single‑page frontend from Flask (frontend/template + frontend/static).

## Key capabilities
- Image‑based emotion detection using DeepFace as the default analyzer.
- Optional fallbacks: an FER‑based analyzer (emotion_analyzer_fer.py) and ONNX/FER+ model paths are present in the codebase.
- MusicFinder component that can produce curated track lists and human‑friendly summaries; can optionally integrate with google‑generativeai (Gemini) when an API key is provided.
- Frontend features include camera capture, drag‑and‑drop image upload, mood text input, and result previews.
- Deployment configuration for Render (render.yaml) with a gunicorn start command.

## Technology
Based on the repository evidence:
- Backend: Python 3.10, Flask, Flask‑CORS, DeepFace, TensorFlow, ONNX Runtime, OpenCV (opencv‑python‑headless), Pillow, numpy, requests, fer (alternative analyzer).
- Optional integration: google‑generativeai (Gemini).
- Deployment: gunicorn (render.yaml uses gunicorn to start backend).
- Frontend: vanilla JavaScript, HTML, CSS (served as static assets from Flask).

## Repository structure
Top‑level items (as present in the repo):
- backend/ — Flask backend and model/analysis code (EmotionAnalyzer, music_finder, API endpoints).
- frontend/ — static single‑page frontend (templates and static assets).
- render.yaml — Render service manifest for the backend.
- 3D_ENHANCEMENTS.md, PERFORMANCE_OPTIMIZATIONS.md — project notes.
- tools/ — helper scripts referenced in repo notes.
- bot_logs.txt — log file present in the tree.
- README.md — the repository contains a legacy/garbled README excerpt; see this file for an updated view.

Files of interest in backend (referenced by the audit):
- backend/app.py — Flask application and routes; CORS is configured for /api/*.
- backend/emotion_analyzer.py and backend/emotion_analyzer_fer.py — emotion analysis implementations.
- backend/music_finder.py — logic to assemble curated playlists and use external lookups (Gemini/YouTube/Spotify optional).

## Getting started
The repository does not include a single consolidated setup script or fully documented developer instructions beyond fragments in the existing README excerpt and the Render manifest. Evidence in the repo suggests these developer/quickstart hints:
- The existing README excerpt shows typical local steps for the backend: change into backend/, create/activate a virtual environment, pip install -r requirements.txt, and start the Flask app (the excerpt references running backend/app.py).
- The frontend can be opened directly by loading frontend/template/index.html in a browser or served via the Flask backend static assets.

For contributors who want to inspect or run the project:
- Inspect render.yaml at the repository root for a documented deployment startCommand and buildCommand (the file includes a gunicorn startCommand and a pip install -r requirements.txt build step).
- Open backend/ to review app.py, emotion analyzer modules, and music_finder.py to understand runtime behaviour.
- Open frontend/template/index.html to review the single‑page UI and how it calls the backend APIs.

If you plan to run the app locally, follow the clues in backend/ and the existing README excerpt (create a Python 3.10 virtual environment, install requirements.txt in backend/, then start the Flask app). Those concrete commands are available in the repository text; please inspect backend/ and the README excerpt before running.

## Configuration
Environment variables referenced in the repository evidence and render.yaml:
- GEMINI_API_KEY — optional; used for Gemini/generative AI integration.
- YOUTUBE_API_KEY — optional; referenced by MusicFinder.
- SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET — optional; referenced by MusicFinder.
- FLASK_DEBUG, DISABLE_MODEL_DOWNLOAD, USE_DEEPFACE_ONLY, TF_USE_LEGACY_KERAS, DEEPFACE_BACKEND — provided in render.yaml as environment variables with example/default values.

Notes:
- render.yaml includes DISABLE_MODEL_DOWNLOAD=true and USE_DEEPFACE_ONLY=true as default env vars for the Render service.
- The backend enables CORS for /api/* (in app.py) and expects API keys to be provided via environment when integrations are desired.

## Development and quality notes
- There are no automated tests present in the repository (no tests/ or CI configuration found).
- Requirements and heavy dependencies (tensorflow, DeepFace, onnxruntime) are present in code and may make local setup or CI expensive.
- There is evidence of runtime model downloads in the analyzer code (model URLs in emotion_analyzer.py); the repo notes advise excluding large ML assets from version control and indicate download logs will show exact URLs if required.
- The backend currently exposes permissive CORS for /api/* — consider hardening allowed origins before public deployment.

Suggested short paths for contributors:
- Read backend/app.py to inspect routes (/api/analyze, /api/mood), CORS configuration, and error handling.
- Read backend/emotion_analyzer.py and backend/emotion_analyzer_fer.py to see the analysis strategies and any model download logic.
- Read backend/music_finder.py to see how playlist recommendations are composed and when Gemini/Youtube/Spotify APIs are used.
- Review render.yaml for deployment configuration and the contained environment variable wiring.

## Safety and responsible use
- CORS is configured permissively for /api/* in backend/app.py (increasing potential cross‑origin abuse); harden origins if deploying publicly.
- The app expects sensitive API keys (GEMINI_API_KEY, YOUTUBE_API_KEY, SPOTIFY_*). The repository notes explicit handling to keep those out of version control (render.yaml marks keys with sync:false).
- Runtime model downloads from remote URLs are present in analyzer code paths — downloading binary model artifacts at runtime is a supply‑chain risk unless validated; the repo includes an env var DISABLE_MODEL_DOWNLOAD to control this behaviour.
- No authentication, rate limiting, or quotas are present in the repository evidence; a public deployment could be abused or incur significant downstream costs (e.g., Gemini API calls).
- No documented privacy/data retention controls are present for uploaded images; uploaded images appear handled in memory according to the repo notes, but contributors should implement explicit privacy handling and retention policies before production use.

## Contributing
If you want to contribute:
- Inspect the backend implementation first (backend/app.py, emotion analyzers, music_finder.py) and the Render manifest (render.yaml).
- Priorities identified by the project audit include: adding tests (API health and key error flows), locking down CORS, adding input size/validation checks, and avoiding runtime model downloads by default.
- The repository contains a tools/ folder with helper scripts referenced by the project notes; review those for local asset generation and developer utilities.
- Do not commit secrets or large model binaries; the repository explicitly excludes large ML assets and recommends managing secret env vars outside version control.

## License
No license file or explicit license statement was present in the supplied evidence, so no license is declared here.

</details>

---

<p align="center"><sub>README motion system · visual layer by RepoSignal · implementation details remain project-specific</sub></p>
