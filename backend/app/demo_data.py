"""Realistic triage scenarios.

Used in two places:
  * app.mock_beacon — stands in for beacon.graph.build until the agent core lands
  * app.seed — seeds a demo project with 3 finished incidents for new users

Shapes mirror the beacon core contract exactly: hypotheses from the Generator,
verdicts from the Investigator, markdown report from the Reporter.
"""

SCENARIOS: list[dict] = [
    {
        "slug": "missing-env-var",
        "title": "API crash-loop after config refactor (missing DB_URL)",
        "hypotheses": [
            {
                "id": "h1",
                "statement": (
                    "Commit 9f3c2e1 ('refactor: centralize settings loading') dropped the "
                    "DB_URL fallback, so the API crashes at startup when the env var is unset."
                ),
                "suspected_component": "api/config.py",
                "evidence_to_confirm": [
                    "Startup traceback referencing DB_URL or settings validation in recent logs",
                    "Commit 9f3c2e1 diff removes the DB_URL default or os.environ fallback",
                ],
                "evidence_to_refute": [
                    "DB_URL present in the runtime environment dump",
                    "API healthy after 9f3c2e1 deployed",
                ],
                "prior_confidence": 0.7,
            },
            {
                "id": "h2",
                "statement": "The Postgres instance itself is down or unreachable from the API pod.",
                "suspected_component": "postgres",
                "evidence_to_confirm": [
                    "Connection-refused or timeout errors against the DB host in logs",
                    "db_up metric at 0 during the incident window",
                ],
                "evidence_to_refute": [
                    "Other services connected to the same DB are healthy",
                    "Errors are validation errors, not network errors",
                ],
                "prior_confidence": 0.2,
            },
            {
                "id": "h3",
                "statement": "A bad image was deployed (dependency mismatch), unrelated to configuration.",
                "suspected_component": "deploy pipeline",
                "evidence_to_confirm": ["ImportError/ModuleNotFoundError during startup in logs"],
                "evidence_to_refute": ["Traceback points at settings validation, not imports"],
                "prior_confidence": 0.1,
            },
        ],
        "verdicts": [
            {
                "hypothesis_id": "h1",
                "verdict": "accept",
                "confidence": 0.93,
                "evidence": ["app.log:1042", "app.log:1044", "commit 9f3c2e1 api/config.py:18"],
                "reasoning": (
                    "Logs show pydantic ValidationError: 'DB_URL field required' repeating on "
                    "every restart, first occurrence 90s after the 9f3c2e1 deploy. The diff for "
                    "9f3c2e1 removes the os.environ fallback for DB_URL."
                ),
            },
            {
                "hypothesis_id": "h2",
                "verdict": "reject",
                "confidence": 0.88,
                "evidence": ["app.log:1042", "metric db_up=1.0 (30m window)"],
                "reasoning": (
                    "No network errors present; the failure is a settings validation error "
                    "raised before any connection attempt, and db_up stayed at 1.0 throughout."
                ),
            },
            {
                "hypothesis_id": "h3",
                "verdict": "reject",
                "confidence": 0.85,
                "evidence": ["app.log:1040-1060"],
                "reasoning": "No ImportError anywhere in the window; the process reaches settings "
                "validation, which rules out a broken image.",
            },
        ],
        "report_md": """# Incident report — api crash-loop after deploy

**Root cause (one line):** Commit `9f3c2e1` removed the `DB_URL` environment-variable fallback in `api/config.py`, so the API fails settings validation and crash-loops on startup.

**Confidence:** 0.93

## Evidence
- `app.log:1042` — `pydantic.ValidationError: 1 validation error for Settings — DB_URL: field required`, repeating on every supervisor restart.
- `app.log:1044` — first occurrence at 14:02:31 UTC, ~90 s after the `9f3c2e1` deploy finished.
- `commit 9f3c2e1 api/config.py:18` — the diff deletes `os.environ.get("DB_URL", DEFAULT_DB_URL)` in favor of a required settings field.

## Ruled out
- **Postgres outage (h2):** `db_up` metric held at 1.0 for the whole window and no connection errors appear — the process dies before ever dialing the database.
- **Broken image / dependency mismatch (h3):** no `ImportError` in the window; startup reaches settings validation, so the image itself is fine.

## Suggested next step
Set `DB_URL` in the deployment environment (or restore the fallback in `api/config.py`) and redeploy. Longer term: add a config-validation step to CI so required-variable regressions fail before rollout.
""",
        "context_pack": {
            "window": "last 30m",
            "error_clusters": [
                {
                    "template": "pydantic.ValidationError: 1 validation error for Settings DB_URL field required",
                    "count": 214,
                    "new_vs_baseline": True,
                    "examples": ["app.log:1042", "app.log:1044", "app.log:1051"],
                },
                {
                    "template": "supervisor: process exited too quickly, backing off",
                    "count": 71,
                    "new_vs_baseline": True,
                    "examples": ["app.log:1046"],
                },
            ],
            "recent_deploys": [
                {
                    "commit": "9f3c2e1",
                    "author": "harsh",
                    "message": "refactor: centralize settings loading",
                    "files": ["api/config.py", "api/main.py"],
                },
                {
                    "commit": "5b81d09",
                    "author": "harsh",
                    "message": "chore: bump fastapi to 0.115",
                    "files": ["requirements.txt"],
                },
            ],
        },
        "tokens_used": 18342,
        "tool_calls_used": 7,
        "accuracy_meta": {"scenario": "missing_env_var", "top1": True, "top3": True},
    },
    {
        "slug": "pool-exhaustion",
        "title": "p99 latency spike — DB connection pool exhaustion",
        "hypotheses": [
            {
                "id": "h1",
                "statement": (
                    "Commit c4d77aa ('feat: per-request analytics writes') opens a second DB "
                    "session per request without closing it, exhausting the connection pool."
                ),
                "suspected_component": "api/analytics.py",
                "evidence_to_confirm": [
                    "QueuePool limit / connection timeout errors in logs after c4d77aa",
                    "Diff shows Session() created outside the request-scoped dependency",
                ],
                "evidence_to_refute": [
                    "Pool errors predate c4d77aa",
                    "db_connections_active metric flat across the deploy",
                ],
                "prior_confidence": 0.6,
            },
            {
                "id": "h2",
                "statement": "Traffic surge pushed the service past normal capacity.",
                "suspected_component": "load balancer / traffic",
                "evidence_to_confirm": ["requests_per_minute significantly above baseline"],
                "evidence_to_refute": ["Traffic flat while latency and pool errors climb"],
                "prior_confidence": 0.25,
            },
            {
                "id": "h3",
                "statement": "A slow query introduced by a recent schema/index change is holding connections.",
                "suspected_component": "postgres / migrations",
                "evidence_to_confirm": ["Slow-query log entries or lock waits in the window"],
                "evidence_to_refute": ["No migrations in recent deploys; query times unchanged"],
                "prior_confidence": 0.15,
            },
        ],
        "verdicts": [
            {
                "hypothesis_id": "h1",
                "verdict": "accept",
                "confidence": 0.87,
                "evidence": [
                    "app.log:2210",
                    "app.log:2287",
                    "commit c4d77aa api/analytics.py:31",
                    "metric db_connections_active 8→20 (30m window)",
                ],
                "reasoning": (
                    "sqlalchemy QueuePool 'limit of size 20 overflow reached' errors start 12 "
                    "minutes after c4d77aa; its diff instantiates SessionLocal() in "
                    "track_event() with no close/context manager, leaking one connection per request."
                ),
            },
            {
                "hypothesis_id": "h2",
                "verdict": "reject",
                "confidence": 0.82,
                "evidence": ["metric requests_per_minute flat at ~240 (60m window)"],
                "reasoning": "Traffic is flat against baseline while active connections climb "
                "monotonically — the classic leak signature, not a surge.",
            },
            {
                "hypothesis_id": "h3",
                "verdict": "inconclusive",
                "confidence": 0.5,
                "evidence": ["app.log:2200-2300"],
                "reasoning": "No slow-query log lines found, but statement timing metrics are not "
                "collected in this environment, so a marginal contribution can't be fully excluded.",
            },
        ],
        "report_md": """# Incident report — p99 latency spike on /api/*

**Root cause (one line):** Commit `c4d77aa` opens an unclosed second SQLAlchemy session per request in `api/analytics.py`, leaking connections until the pool (size 20) is exhausted.

**Confidence:** 0.87

## Evidence
- `app.log:2210` — `sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 10 reached, connection timed out` — first occurrence 12 min after the `c4d77aa` deploy.
- `app.log:2287` — same template recurring at increasing frequency (41 occurrences in 30 m).
- `commit c4d77aa api/analytics.py:31` — `db = SessionLocal()` inside `track_event()` with no `close()` or context manager.
- metric `db_connections_active` — climbs 8 → 20 and pins at the cap; `requests_per_minute` flat at ~240.

## Ruled out
- **Traffic surge (h2):** request rate is flat against the 24 h baseline; monotonic connection growth under flat load indicates a leak.
- **Slow query / lock contention (h3):** inconclusive — no slow-query evidence found, but per-statement timing isn't instrumented here. Not needed to explain the outage.

## Suggested next step
Wrap the analytics write in the request-scoped session (or `with SessionLocal() as db:`), deploy, and confirm `db_connections_active` returns to baseline. Consider a pool-usage alert at 80 % of capacity.
""",
        "context_pack": {
            "window": "last 30m",
            "error_clusters": [
                {
                    "template": "sqlalchemy.exc.TimeoutError QueuePool limit of size <N> overflow <N> reached",
                    "count": 41,
                    "new_vs_baseline": True,
                    "examples": ["app.log:2210", "app.log:2287"],
                },
                {
                    "template": "uvicorn request timeout after 30s <PATH>",
                    "count": 18,
                    "new_vs_baseline": True,
                    "examples": ["app.log:2251"],
                },
            ],
            "recent_deploys": [
                {
                    "commit": "c4d77aa",
                    "author": "harsh",
                    "message": "feat: per-request analytics writes",
                    "files": ["api/analytics.py", "api/routes/events.py"],
                },
                {
                    "commit": "e19b3f2",
                    "author": "harsh",
                    "message": "style: format with ruff",
                    "files": ["api/*"],
                },
            ],
        },
        "tokens_used": 24817,
        "tool_calls_used": 11,
        "accuracy_meta": {"scenario": "connection_pool_exhaustion", "top1": True, "top3": True},
    },
    {
        "slug": "null-deref",
        "title": "500s on /auth/refresh — NoneType attribute error in fresh commit",
        "hypotheses": [
            {
                "id": "h1",
                "statement": (
                    "Commit a1b2c3d ('feat: remember-me sessions') dereferences "
                    "session.remember_until without a null check, causing AttributeError for "
                    "pre-existing sessions."
                ),
                "suspected_component": "api/auth.py",
                "evidence_to_confirm": [
                    "AttributeError: 'NoneType' object has no attribute traceback in logs citing auth.py",
                    "Diff for a1b2c3d adds the remember_until access without a guard",
                ],
                "evidence_to_refute": [
                    "Errors began before a1b2c3d was deployed",
                    "Traceback points at a different module",
                ],
                "prior_confidence": 0.65,
            },
            {
                "id": "h2",
                "statement": "The token-signing key was rotated and old refresh tokens fail verification.",
                "suspected_component": "auth secrets",
                "evidence_to_confirm": ["InvalidSignatureError entries in the window"],
                "evidence_to_refute": ["Failures are AttributeError, not signature errors"],
                "prior_confidence": 0.2,
            },
            {
                "id": "h3",
                "statement": "Redis session store evictions are returning partial session objects.",
                "suspected_component": "redis",
                "evidence_to_confirm": ["Redis OOM/eviction warnings; memory metric near maxmemory"],
                "evidence_to_refute": ["Redis memory flat and no eviction log lines"],
                "prior_confidence": 0.15,
            },
        ],
        "verdicts": [
            {
                "hypothesis_id": "h1",
                "verdict": "accept",
                "confidence": 0.91,
                "evidence": ["app.log:3471", "app.log:3473", "commit a1b2c3d api/auth.py:88"],
                "reasoning": (
                    "Traceback 'AttributeError: NoneType object has no attribute "
                    "timestamp' at auth.py:88 appears only after the a1b2c3d deploy; the diff "
                    "adds session.remember_until.timestamp() with no None guard, and sessions "
                    "created before the migration have remember_until = NULL."
                ),
            },
            {
                "hypothesis_id": "h2",
                "verdict": "reject",
                "confidence": 0.9,
                "evidence": ["app.log:3400-3500"],
                "reasoning": "Zero signature/verification errors in the window; failures occur "
                "after successful token decode, inside session handling.",
            },
            {
                "hypothesis_id": "h3",
                "verdict": "reject",
                "confidence": 0.8,
                "evidence": ["metric redis_memory_used 41% (30m window)"],
                "reasoning": "Redis memory is well under maxmemory with no eviction warnings; "
                "sessions load successfully, one field is simply NULL.",
            },
        ],
        "report_md": """# Incident report — 500s on /auth/refresh

**Root cause (one line):** Commit `a1b2c3d` calls `session.remember_until.timestamp()` in `api/auth.py:88` without a `None` guard; sessions created before the remember-me migration have `remember_until = NULL` and now raise `AttributeError`.

**Confidence:** 0.91

## Evidence
- `app.log:3471` — `AttributeError: 'NoneType' object has no attribute 'timestamp'` in `refresh_session`, `api/auth.py:88`.
- `app.log:3473` — 500 response logged for `/auth/refresh`; 156 occurrences in 30 m, all post-deploy.
- `commit a1b2c3d api/auth.py:88` — new line `expiry = session.remember_until.timestamp()` with no null check; the accompanying migration backfills only *new* sessions.

## Ruled out
- **Signing-key rotation (h2):** no `InvalidSignatureError` in the window; failures happen after successful decode.
- **Redis evictions (h3):** memory at 41 % of `maxmemory`, no eviction warnings — the session object loads fine, one column is legitimately NULL.

## Suggested next step
Guard the access (`if session.remember_until is None: fall back to default TTL`) or backfill `remember_until` for pre-existing sessions. Add a regression test covering legacy sessions through `/auth/refresh`.
""",
        "context_pack": {
            "window": "last 30m",
            "error_clusters": [
                {
                    "template": "AttributeError 'NoneType' object has no attribute 'timestamp' api/auth.py:<N>",
                    "count": 156,
                    "new_vs_baseline": True,
                    "examples": ["app.log:3471", "app.log:3473"],
                },
            ],
            "recent_deploys": [
                {
                    "commit": "a1b2c3d",
                    "author": "harsh",
                    "message": "feat: remember-me sessions",
                    "files": ["api/auth.py", "migrations/012_remember_me.py"],
                },
            ],
        },
        "tokens_used": 15904,
        "tool_calls_used": 6,
        "accuracy_meta": {"scenario": "exception_in_fresh_commit", "top1": True, "top3": True},
    },
]
