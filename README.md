# Dota 2 Match Analyzer

Full‑stack app that ingests your recent Dota 2 matches (Steam/OpenDota), optionally parses replays (Clarity), and generates per‑match findings + aggregate insights.

**Stack**
- Backend: FastAPI, SQLAlchemy (async), Postgres
- Workers: Celery + Redis
- Replay parsing: `clarity.jar` (Java)
- Frontend: React (Vite) + Tailwind

## Quickstart (Docker)
1. Download the replay parser JAR (optional but required for replay timelines/analysis):
```bash
bash scripts/download_clarity.sh
```

2. Start everything:
```bash
docker compose up --build
```

3. Open:
- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Celery Flower: `http://localhost:5555`

## Configuration
`docker-compose.yml` has defaults so it can boot without a `.env`.

If you want Steam login + match ingestion, set `STEAM_API_KEY` (Steam Web API key). You can do this either:
- Export env vars in your shell before `docker compose up`, or
- Create a local `.env` (see `.env.example`)

## Useful Commands
- Backend tests:
```bash
pytest -q
```

- Seed sample baselines (used by detectors for comparisons):
```bash
python scripts/seed_baselines.py
```

## Notes
- Replay parsing depends on `parser/clarity.jar`. If it’s missing, match ingestion still works, but replay event timelines and some detectors won’t have data.
- Replay downloads are cached in the `replay_data` volume and cleaned up by retention settings.
