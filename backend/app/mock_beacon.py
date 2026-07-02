"""Mock of the beacon agent core.

Exposes `app` with the exact interface of `beacon.graph.build.app`:

    result = app.invoke({"incident_id": ..., "budget": {...}})
    # result["report"]      -> markdown string
    # result["verdicts"], result["hypotheses"], result["context_pack"] -> dicts/lists

Selected automatically by app.beacon_client when the real `beacon` package is
not importable. Do not add behavior here that the real graph won't have.
"""

import hashlib
import os
import time

from app.demo_data import SCENARIOS


class _MockBeaconGraph:
    def invoke(self, state: dict) -> dict:
        incident_id = str(state.get("incident_id", ""))
        budget = state.get("budget") or {}

        # Simulate agent latency so the UI's live polling is visible in demos.
        delay = float(os.environ.get("MOCK_BEACON_DELAY_SECONDS", "4"))
        time.sleep(max(0.0, delay))

        # Deterministic per incident: same id always yields the same scenario.
        digest = hashlib.sha256(incident_id.encode()).digest()
        scenario = SCENARIOS[digest[0] % len(SCENARIOS)]

        max_tool_calls = int(budget.get("max_tool_calls", 15))
        return {
            "report": scenario["report_md"],
            "verdicts": scenario["verdicts"],
            "hypotheses": scenario["hypotheses"],
            "context_pack": scenario["context_pack"],
            "budget": {
                "tool_calls_used": min(scenario["tool_calls_used"], max_tool_calls),
                "tokens_used": scenario["tokens_used"],
            },
        }


app = _MockBeaconGraph()
