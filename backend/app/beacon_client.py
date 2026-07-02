"""Single integration point with the beacon agent core.

When Harsh's `beacon` package lands in the repo (or on PYTHONPATH), the real
compiled graph is picked up automatically; until then the mock with the exact
same interface is used. Nothing else in this codebase may import beacon
internals.
"""

import logging

logger = logging.getLogger(__name__)

try:
    from beacon.graph.build import app as beacon_graph  # type: ignore[import-not-found]

    logger.info("beacon agent core loaded (beacon.graph.build)")
except ModuleNotFoundError:
    from app.mock_beacon import app as beacon_graph

    logger.info("beacon package not found; using mock agent core")

__all__ = ["beacon_graph"]
