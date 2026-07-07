"""Wire the four agents into one compiled LangGraph — the ONLY public entry point.

    from beacon.graph.build import app
    result = app.invoke({"incident_id": "...", "budget": {...}})

Linear pipeline: START → collector → generator → investigator → reporter → END.
The only loop in the whole system lives *inside* the investigator node, not here.

Three callers use this exact line with zero graph changes: the CLI (dev loop),
the FastAPI worker (product), and the GitHub Action container (distribution).
Importing this module constructs the agents but never calls the LLM, so it is
safe to import without an API key — only app.invoke() needs one.
"""

from langgraph.graph import END, START, StateGraph

from beacon.agents import collector, generator, investigator, reporter
from beacon.graph.state import BeaconState


def build_graph():
    g = StateGraph(BeaconState)

    g.add_node("collector", collector.collect)
    g.add_node("generator", generator.generate_hypotheses)
    g.add_node("investigator", investigator.investigate)
    g.add_node("reporter", reporter.write_report)

    g.add_edge(START, "collector")
    g.add_edge("collector", "generator")
    g.add_edge("generator", "investigator")
    g.add_edge("investigator", "reporter")
    g.add_edge("reporter", END)

    return g.compile()


app = build_graph()
