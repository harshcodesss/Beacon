#!/bin/sh
set -e
alembic upgrade head
# Worker runs in-process to avoid a second paid Render service. If it dies,
# jobs stop draining until the next container restart (fine for one demo box,
# not for real scale) - move to start-worker.sh as its own service if that matters.
rq worker --url "$REDIS_URL" triage &
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
