"""Reporter tests. The citation gate is pure Python — fully tested offline.
The LLM call in write_report is monkeypatched (no API key needed)."""

from types import SimpleNamespace

from beacon.agents import reporter
from beacon.agents.reporter import verify_citations, write_report

# state where the investigator cited app.log:140 and commit 4c32d7f
_STATE = {
    "verdicts": [
        {"hypothesis_id": "H1", "verdict": "accept", "confidence": 0.8,
         "evidence": ["app.log:140", "4c32d7f payments.py"], "reasoning": "r"},
    ],
    "context_pack": {"recent_deploys": [{"hash": "4c32d7f20303"}]},
}


def test_verified_citations_pass_clean():
    md = "Root cause: timeout. See app.log:140 and commit 4c32d7f."
    out = verify_citations(md, _STATE)
    assert "[unverified]" not in out
    assert "2/2 citations verified" in out


def test_hallucinated_log_citation_is_flagged():
    md = "Evidence: app.log:9999 shows the error."  # never gathered
    out = verify_citations(md, _STATE)
    assert "app.log:9999 [unverified]" in out
    assert "0/1 citations verified" in out
    assert "Flagged: app.log:9999" in out


def test_bogus_commit_hash_is_flagged():
    md = "Introduced by commit deadbeef1234."  # not in recent_deploys
    out = verify_citations(md, _STATE)
    assert "deadbeef1234 [unverified]" in out


def test_abbreviated_commit_hash_matches_full_deploy():
    # report abbreviates the deploy hash — prefix match still verifies
    md = "Caused by 4c32d7f."
    out = verify_citations(md, _STATE)
    assert "[unverified]" not in out


def test_write_report_runs_gate_on_llm_output(monkeypatch):
    fake_md = "Root cause: X. Evidence: app.log:140, app.log:9999."
    monkeypatch.setattr(reporter, "llm",
                        SimpleNamespace(invoke=lambda _p: SimpleNamespace(content=fake_md)))
    out = write_report(_STATE)["report"]
    assert "app.log:140" in out and "app.log:9999 [unverified]" in out
    assert "Citation gate:" in out
