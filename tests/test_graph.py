"""Graph wiring tests — verify the pipeline compiles and is wired in the right
order, without invoking any LLM (no API key needed)."""

import os
import subprocess
import sys
from pathlib import Path

from beacon.graph.build import app, build_graph

REPO_ROOT = Path(__file__).resolve().parents[1]


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


def test_import_requires_no_key_and_no_dotenv(tmp_path):
    """CI regression: importing the compiled graph must work with NO provider
    key and NO .env on disk (models are built lazily at first invoke). Run in
    a subprocess from a bare directory so load_dotenv() finds nothing."""
    env = {k: v for k, v in os.environ.items()
           if not (k.endswith("_API_KEY") or k in ("GOOGLE_API_KEY",))}
    env["PYTHONPATH"] = str(REPO_ROOT)
    result = subprocess.run(
        [sys.executable, "-c", "from beacon.graph.build import app; print('ok')"],
        cwd=tmp_path, env=env, capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr[-800:]
    assert "ok" in result.stdout
