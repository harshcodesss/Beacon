#!/bin/sh
set -e
exec rq worker --url "$REDIS_URL" triage
