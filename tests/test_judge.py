"""Judge tests — deterministic matching + scoring, all offline (use_llm=False)."""

from beacon.eval.faults import FAULTS, FAULTS_BY_NAME
from beacon.eval.judge import accepted_ranked, judge_scenario, matches_truth, score_suite


def _state(*accepted):
    """Build a pipeline-result state from (id, component, statement, confidence)."""
    hyps, verds = [], []
    for hid, comp, stmt, conf in accepted:
        hyps.append({"id": hid, "suspected_component": comp, "statement": stmt})
        verds.append({"hypothesis_id": hid, "verdict": "accept", "confidence": conf})
    return {"hypotheses": hyps, "verdicts": verds}


def test_accepted_ranked_filters_and_sorts():
    state = {
        "hypotheses": [{"id": "H1"}, {"id": "H2"}, {"id": "H3"}],
        "verdicts": [
            {"hypothesis_id": "H1", "verdict": "reject", "confidence": 0.9},
            {"hypothesis_id": "H2", "verdict": "accept", "confidence": 0.5},
            {"hypothesis_id": "H3", "verdict": "accept", "confidence": 0.8},
        ],
    }
    ranked = accepted_ranked(state)
    assert [h["id"] for h in ranked] == ["H3", "H2"]  # rejects dropped, sorted by conf


def test_component_match_by_stem():
    truth = {"guilty_component": "payments.py", "description": "provider timeout"}
    hyp = {"suspected_component": "payments.py", "statement": "timeout in charge()"}
    assert matches_truth(hyp, truth, use_llm=False)


def test_commit_hash_match():
    truth = {"guilty_component": "x.py", "guilty_commit": "4c32d7f20303"}
    hyp = {"suspected_component": "?", "statement": "commit 4c32d7f broke it"}
    assert matches_truth(hyp, truth, use_llm=False)


def test_no_match_stays_false_without_llm():
    truth = {"guilty_component": "payments.py", "description": "timeout"}
    hyp = {"suspected_component": "auth.py", "statement": "login is slow"}
    assert matches_truth(hyp, truth, use_llm=False) is False


def test_judge_scenario_top1_and_top3():
    truth = FAULTS_BY_NAME["missing_db_url"].ground_truth()
    # right answer sits at rank 3: top1 miss, top3 hit
    state = _state(
        ("H1", "payments.py", "provider slow", 0.9),
        ("H2", "auth.py", "token issue", 0.7),
        ("H3", "db.py", "DB_URL not configured", 0.6),
    )
    result = judge_scenario(state, truth, use_llm=False)
    assert result["matched_top1"] is False
    assert result["matched_top3"] is True
    assert result["n_accepted"] == 3


def test_score_suite_aggregates():
    results = [
        {"matched_top1": True, "matched_top3": True},
        {"matched_top1": False, "matched_top3": True},
    ]
    score = score_suite(results)
    assert score["top1_accuracy"] == 0.5
    assert score["top3_accuracy"] == 1.0


def test_two_scenarios_are_held_out():
    # overfitting guard: some scenarios never seen during prompt iteration
    assert sum(f.holdout for f in FAULTS) >= 2
