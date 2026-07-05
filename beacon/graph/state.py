"""The shared whiteboard every agent reads from and writes to.

Agents never call each other. Each node returns a dict containing only the
keys it wants to update; LangGraph merges that into this state and decides
which node runs next.

total=False because the graph is invoked with a partial state — only
incident_id and budget exist at START; each agent fills in its own key.
"""

from typing import TypedDict


class BeaconState(TypedDict, total=False):
    incident_id: str
    context_pack: dict      # written by Collector
    hypotheses: list[dict]  # written by Hypothesis Generator
    verdicts: list[dict]    # written by Investigator
    report: str             # written by Reporter
    budget: dict            # tool-call / token caps, decremented by Investigator
