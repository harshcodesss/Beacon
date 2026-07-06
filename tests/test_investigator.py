"""Investigator loop tests — no API key. A fake scripted model drives the
ReAct loop so we can verify termination, the shared budget cap, and one
verdict per hypothesis without touching Gemini.
"""

import itertools

from langchain_core.messages import AIMessage

from beacon.agents import investigator
from beacon.agents.investigator import Verdict, _run_tool

_ids = itertools.count()


def _tool_call(name="search_logs", args=None):
    return {"name": name, "args": args or {"pattern": "x"}, "id": f"c{next(_ids)}"}


class _ScriptedModel:
    """Returns queued AIMessages in order (each a loop turn)."""
    def __init__(self, responses):
        self.responses = list(responses)
        self.i = 0

    def invoke(self, _messages):
        r = self.responses[self.i]
        self.i += 1
        return r


class _AlwaysToolModel:
    """Never stops asking for tools — proves the code leash, not the prompt, halts it."""
    def invoke(self, _messages):
        return AIMessage(content="", tool_calls=[_tool_call()])


class _FakeVerdictLLM:
    def __init__(self):
        self.calls = 0

    def invoke(self, _messages):
        self.calls += 1
        return Verdict(hypothesis_id="", verdict="inconclusive",
                       confidence=0.5, evidence=[], reasoning="r")


def _patch(monkeypatch, model, verdict_llm=None):
    # `llm` is the tool-bound model the ReAct loop invokes
    monkeypatch.setattr(investigator, "llm", model)
    monkeypatch.setattr(investigator, "_verdict_llm", verdict_llm or _FakeVerdictLLM())
    # keep tools cheap + offline
    monkeypatch.setattr(investigator, "_run_tool", lambda tc: "canned tool result")


def test_loop_stops_when_model_emits_no_tool_calls(monkeypatch):
    model = _ScriptedModel([
        AIMessage(content="", tool_calls=[_tool_call()]),  # one tool call
        AIMessage(content="done", tool_calls=[]),           # then finished
    ])
    _patch(monkeypatch, model)
    out = investigator.investigate({"hypotheses": [{"id": "H1"}], "context_pack": {}})
    assert out["budget"]["tool_calls_used"] == 1
    assert len(out["verdicts"]) == 1
    assert out["verdicts"][0]["hypothesis_id"] == "H1"  # id stamped from hyp


def test_budget_cap_is_enforced_in_code(monkeypatch):
    _patch(monkeypatch, _AlwaysToolModel())
    budget = {"max_tool_calls": 3}
    out = investigator.investigate({
        "hypotheses": [{"id": "H1"}, {"id": "H2"}],  # two hyps SHARE the budget
        "context_pack": {},
        "budget": budget,
    })
    # never exceeds the leash despite a model that would loop forever
    assert out["budget"]["tool_calls_used"] == 3
    assert len(out["verdicts"]) == 2  # every hypothesis still gets a verdict


def test_one_verdict_per_hypothesis(monkeypatch):
    # model finishes immediately (no tools) for every hypothesis
    model = _ScriptedModel([AIMessage(content="done", tool_calls=[]) for _ in range(3)])
    verdict_llm = _FakeVerdictLLM()
    _patch(monkeypatch, model, verdict_llm)
    out = investigator.investigate({
        "hypotheses": [{"id": "H1"}, {"id": "H2"}, {"id": "H3"}],
        "context_pack": {},
    })
    assert [v["hypothesis_id"] for v in out["verdicts"]] == ["H1", "H2", "H3"]
    assert verdict_llm.calls == 3
    assert out["budget"]["tool_calls_used"] == 0


def test_run_tool_handles_unknown_and_errors():
    assert "unknown tool" in _run_tool({"name": "nope", "args": {}, "id": "1"})
