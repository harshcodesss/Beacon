"""Generator tests that don't hit the API — the LLM call is monkeypatched,
so we verify prompt assembly and post-processing (id fill, ranking, cap)."""

from beacon.agents import generator
from beacon.agents.generator import Hypothesis, HypothesisList, _build_prompt


def _h(id, conf):
    return Hypothesis(
        id=id, statement="s", suspected_component="c",
        evidence_to_confirm=["e"], evidence_to_refute=["e"], prior_confidence=conf,
    )


class _FakeLLM:
    """Stands in for the RunnableSequence (which is frozen and can't be patched)."""
    def __init__(self, result):
        self.result = result

    def invoke(self, _prompt):
        return self.result


def test_build_prompt_embeds_pack_and_rules():
    prompt = _build_prompt({"service": "demo-target", "error_clusters": []})
    assert "demo-target" in prompt          # pack serialized in
    assert "evidence_to_confirm" in prompt   # the contract rule is stated
    assert "Something is wrong with the database" in prompt  # the BAD anti-example


def test_generate_ranks_and_caps(monkeypatch):
    many = HypothesisList(hypotheses=[_h(f"H{i}", i / 10) for i in range(7)])
    monkeypatch.setattr(generator, "_structured_llm", _FakeLLM(many))

    out = generator.generate_hypotheses({"context_pack": {"service": "x"}})["hypotheses"]
    assert len(out) == generator.MAX_HYPOTHESES        # capped to 5
    confs = [h["prior_confidence"] for h in out]
    assert confs == sorted(confs, reverse=True)         # highest confidence first


def test_generate_fills_missing_ids(monkeypatch):
    two = HypothesisList(hypotheses=[_h("", 0.9), _h("", 0.5)])
    monkeypatch.setattr(generator, "_structured_llm", _FakeLLM(two))

    out = generator.generate_hypotheses({"context_pack": {}})["hypotheses"]
    assert all(h["id"] for h in out)  # blank ids were backfilled
