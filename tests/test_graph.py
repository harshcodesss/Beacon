"""Graph wiring tests — verify the pipeline compiles and is wired in the right
order, without invoking any LLM (no API key needed)."""

from beacon.graph.build import app, build_graph


def test_graph_compiles_with_all_four_nodes():
    graph = build_graph().get_graph()
    node_ids = set(graph.nodes)
    for expected in ("collector", "generator", "investigator", "reporter"):
        assert expected in node_ids


def test_pipeline_is_linear_in_order():
    edges = {(e.source, e.target) for e in build_graph().get_graph().edges}
    assert ("collector", "generator") in edges
    assert ("generator", "investigator") in edges
    assert ("investigator", "reporter") in edges


def test_app_is_importable_without_api_key():
    # the backend's beacon_client auto-detects this exact object
    assert app is not None
    assert hasattr(app, "invoke")
