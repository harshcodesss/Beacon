# demo-target

The small FastAPI service Beacon triages during development and eval. It is
copied into `<repo-root>/.demo_target` (its own throwaway git repo) by
`seed_target.py`; faults are injected and commits are made **there**, never
here.

## Run it

```bash
# from the Beacon repo root
python demo_app/seed_target.py

cd .demo_target
DB_URL=sqlite:///demo.db ../.venv/bin/uvicorn app:app --port 9000

# in another terminal — generate baseline traffic
cd .demo_target
python traffic.py --seconds 120 --rps 5
```

Logs land in `.demo_target/logs/app.log` in the classic
`YYYY-MM-DD HH:MM:SS,ms LEVEL name message` format — that file is what
`beacon.adapters.logs_file` reads (see the root `beacon.yml`).

## Fault levers (for `beacon/eval/faults/` scripts)

| Lever | Effect |
| --- | --- |
| unset `DB_URL` | every request 500s with "DB_URL is not configured" |
| `PAYMENT_LATENCY_MS=2000` | payment timeouts → 504s + tracebacks |
| `PAYMENT_FAIL_RATE=0.5` | provider errors → 502s |
| commit a bad change to `.demo_target` | "exception in fresh commit" scenario |
