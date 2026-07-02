import type { Hypothesis, VerdictItem } from "@/lib/types";

/** Example report rendered on the landing page and used by the smoke tests.
 *  Mirrors the mock agent core's "missing env var" scenario. */
export const EXAMPLE_REPORT_MD = `# Incident report — api crash-loop after deploy

**Root cause (one line):** Commit \`9f3c2e1\` removed the \`DB_URL\` environment-variable fallback in \`api/config.py\`, so the API fails settings validation and crash-loops on startup.

**Confidence:** 0.93

## Evidence
- \`app.log:1042\` — \`pydantic.ValidationError: 1 validation error for Settings — DB_URL: field required\`, repeating on every supervisor restart.
- \`app.log:1044\` — first occurrence at 14:02:31 UTC, ~90 s after the \`9f3c2e1\` deploy finished.
- \`commit 9f3c2e1 api/config.py:18\` — the diff deletes \`os.environ.get("DB_URL", DEFAULT_DB_URL)\` in favor of a required settings field.

## Ruled out
- **Postgres outage:** \`db_up\` metric held at 1.0 for the whole window — the process dies before ever dialing the database.
- **Broken image / dependency mismatch:** no \`ImportError\` in the window; startup reaches settings validation, so the image itself is fine.

## Suggested next step
Set \`DB_URL\` in the deployment environment (or restore the fallback in \`api/config.py\`) and redeploy.
`;

export const EXAMPLE_HYPOTHESES: Hypothesis[] = [
  {
    id: "h1",
    statement:
      "Commit 9f3c2e1 ('refactor: centralize settings loading') dropped the DB_URL fallback, so the API crashes at startup when the env var is unset.",
    suspected_component: "api/config.py",
    evidence_to_confirm: [
      "Startup traceback referencing DB_URL or settings validation in recent logs",
      "Commit 9f3c2e1 diff removes the DB_URL default or os.environ fallback",
    ],
    evidence_to_refute: ["DB_URL present in the runtime environment dump"],
    prior_confidence: 0.7,
  },
  {
    id: "h2",
    statement: "The Postgres instance itself is down or unreachable from the API pod.",
    suspected_component: "postgres",
    evidence_to_confirm: ["Connection-refused or timeout errors against the DB host in logs"],
    evidence_to_refute: ["Errors are validation errors, not network errors"],
    prior_confidence: 0.2,
  },
];

export const EXAMPLE_VERDICTS: VerdictItem[] = [
  {
    hypothesis_id: "h1",
    verdict: "accept",
    confidence: 0.93,
    evidence: ["app.log:1042", "app.log:1044", "commit 9f3c2e1 api/config.py:18"],
    reasoning:
      "Logs show pydantic ValidationError: 'DB_URL field required' repeating on every restart, first occurrence 90s after the 9f3c2e1 deploy.",
  },
  {
    hypothesis_id: "h2",
    verdict: "reject",
    confidence: 0.88,
    evidence: ["app.log:1042", "metric db_up=1.0 (30m window)"],
    reasoning:
      "No network errors present; the failure is a settings validation error raised before any connection attempt.",
  },
];
