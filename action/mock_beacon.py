"""Stand-in for the beacon agent core inside the GitHub Action container.

Exposes `app` with the exact interface of `beacon.graph.build.app`:

    result = app.invoke({"incident_id": ..., "budget": {...}})
    # result["report"]      -> markdown string
    # result["verdicts"], result["hypotheses"], result["context_pack"]
    # result["budget"]      -> {"tool_calls_used": ..., "tokens_used": ...}

Unlike the real graph it does no tool calls: it clusters error lines from the
collected log window (passed as the extra `raw_log` state key) into a summary
report so the delivery pipeline — webhook ingest, dashboard render, PR
comment — is exercised end to end before the agent core ships.
"""

import re
from collections import Counter

_ERROR_LINE = re.compile(r"\b(ERROR|CRITICAL|FATAL|Traceback|Exception|panic)\b")
_NOISE = re.compile(r"\b\d[\d:.TZ+-]*\b|0x[0-9a-f]+|[0-9a-f]{8,}")


def _template(line: str) -> str:
    """Collapse timestamps/ids so identical errors cluster together."""
    return _NOISE.sub("<n>", line).strip()[:160]


class _MockBeaconGraph:
    def invoke(self, state: dict) -> dict:
        raw_log = str(state.get("raw_log", ""))
        budget = state.get("budget") or {}
        max_tool_calls = int(budget.get("max_tool_calls", 15))

        lines = raw_log.splitlines()
        error_lines = [ln for ln in lines if _ERROR_LINE.search(ln)]
        clusters = Counter(_template(ln) for ln in error_lines)
        top = clusters.most_common(3)

        if top:
            headline = top[0][0]
            summary = (
                f"`{headline}` — {top[0][1]} occurrence(s) in the collected window."
            )
        else:
            headline = "no error-level lines found"
            summary = (
                "No error-level lines were found in the collected window; "
                "the failure likely happened outside this log source."
            )

        cluster_md = (
            "\n".join(f"- `{tpl}` — {count}x" for tpl, count in top)
            or "- (no error clusters)"
        )
        report_md = f"""# Incident report — deploy failure triage

**Root cause (one line):** {summary}

**Confidence:** 0.40 (log clustering only — agent core not yet enabled in this action)

## Evidence

Collected {len(lines)} log lines; {len(error_lines)} at error level.
Top error templates:

{cluster_md}

## Suggested next step

Open the incident in the Beacon dashboard for the full log window, or
re-run once the agent core is enabled for verified hypotheses.
"""

        hypotheses = [
            {
                "id": "h1",
                "statement": f"The dominant error template ({headline}) is the failure cause.",
                "prior": 0.4,
                "confirms_if": ["Template first appears at the deploy timestamp"],
                "refutes_if": ["Template predates the deploy window"],
            }
        ]
        verdicts = [
            {
                "hypothesis_id": "h1",
                "verdict": "uncertain",
                "confidence": 0.4,
                "reasoning": "Clustering only; no verification tool calls were made.",
                "evidence": [f"log window ({len(lines)} lines)"],
            }
        ]
        return {
            "report": report_md,
            "verdicts": verdicts,
            "hypotheses": hypotheses,
            "context_pack": {
                "log_lines": len(lines),
                "error_lines": len(error_lines),
                "clusters": [{"template": tpl, "count": count} for tpl, count in top],
            },
            "budget": {
                "tool_calls_used": min(1, max_tool_calls),
                "tokens_used": 0,
            },
        }


app = _MockBeaconGraph()
