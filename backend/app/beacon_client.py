"""Single integration point with the beacon agent core.

When Harsh's `beacon` package lands in the repo (or on PYTHONPATH), the real
compiled graph is picked up automatically; until then the mock with the exact
same interface is used. Nothing else in this codebase may import beacon
internals.

`AGENT_CORE` ("real" | "mock") is surfaced in /healthz so it is always
obvious which one a deployment is running.
"""

import logging

logger = logging.getLogger(__name__)

try:
    from beacon.graph.build import app as beacon_graph  # type: ignore[import-not-found]

    AGENT_CORE = "real"
    logger.info("agent core: REAL graph loaded (beacon.graph.build)")
except ModuleNotFoundError:
    from app.mock_beacon import app as beacon_graph

    AGENT_CORE = "mock"
    logger.warning(
        "agent core: beacon package not found — using the MOCK graph. "
        "Reports are canned scenarios, not real triage."
    )

__all__ = ["beacon_graph", "AGENT_CORE"]
