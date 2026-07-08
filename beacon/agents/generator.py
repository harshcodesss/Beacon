"""Agent 2 — Hypothesis Generator. One structured LLM call.

Reads the Collector's context_pack and proposes 3-5 ranked root-cause
hypotheses. It never investigates or concludes — it hands Agent 3 a set of
theories, each declaring exactly what evidence would confirm or refute it.
Those confirm/refute lists are the contract with the Investigator: vague
hypotheses give it nothing to grep for, so the bar is "specific
commit/component + tool-checkable evidence".
"""

import json
import logging

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from beacon.graph.state import BeaconState
from beacon.llm import build_chat_model, resolve_model

load_dotenv()

logger = logging.getLogger(__name__)

MAX_HYPOTHESES = 5

MODEL = resolve_model("GENERATOR")
llm = build_chat_model(MODEL, temperature=0.4)


class Hypothesis(BaseModel):
    id: str = Field(description="short slug id, e.g. 'H1'")
    statement: str = Field(
        description="one specific sentence naming the suspected cause, "
        "referencing a concrete commit/component where possible"
    )
    suspected_component: str = Field(description="file, service, or subsystem")
    evidence_to_confirm: list[str] = Field(
        description="concrete, tool-checkable claims that would CONFIRM this"
    )
    evidence_to_refute: list[str] = Field(
        description="concrete, tool-checkable claims that would REFUTE this"
    )
    prior_confidence: float = Field(ge=0.0, le=1.0)


class HypothesisList(BaseModel):
    """Wrapper so structured output can return a list (Gemini structured
    output binds to a single object, not a bare array)."""
    hypotheses: list[Hypothesis]


# .with_structured_output makes the model return a validated HypothesisList
_structured_llm = llm.with_structured_output(HypothesisList)


SYSTEM_PROMPT = """\
You are an incident-triage assistant. Given a compressed context pack (error
clusters flagged NEW vs. a baseline window, an error-rate delta, and the most
recent code deploys), propose 3-5 ranked root-cause hypotheses.

Rules:
- Prefer causes that explain the NEW error clusters and the error-rate spike.
- When a recent commit plausibly explains the failure, name it by hash.
- Every hypothesis MUST declare evidence_to_confirm and evidence_to_refute as
  concrete claims a tool could check (a log pattern to grep, a specific commit
  diff to read, a metric to pull) — never vague statements.
- Rank by prior_confidence, highest first.

GOOD hypothesis:
  statement: "Commit 4c32d7f lowered the payment provider timeout to 650ms, so
             slow charges now exceed it and return 504s."
  suspected_component: "payments.py"
  evidence_to_confirm: ["read_diff 4c32d7f shows DEFAULT_TIMEOUT_MS reduced",
                        "search_logs 'payment provider timeout' spikes after deploy"]
  evidence_to_refute: ["timeouts predate 4c32d7f", "no 504s in /orders logs"]

GOOD hypothesis:
  statement: "Downstream payment provider latency rose, unrelated to any deploy."
  suspected_component: "external payment provider"
  evidence_to_confirm: ["get_metric payment_latency_ms trends up",
                        "timeouts present across commits, not just the newest"]
  evidence_to_refute: ["latency flat", "timeouts start exactly at a deploy"]

BAD hypothesis (never produce anything like this):
  statement: "Something is wrong with the database."
  -> too vague: no commit/component, no checkable evidence.
"""


def build_prompt(context_pack: dict) -> str:
    return (
        SYSTEM_PROMPT
        + "\n\nCONTEXT PACK:\n"
        + json.dumps(context_pack, indent=2, default=str)
        + f"\n\nReturn at most {MAX_HYPOTHESES} hypotheses."
    )


def generate_hypotheses(state: BeaconState) -> dict:
    """Generate root-cause hypotheses for the given state."""
    pack = state.get("context_pack") or {}
    prompt = build_prompt(pack)

    # with_structured_output returns None when the model's output fails to
    # parse; one retry with the identical prompt (structured mode usually
    # self-corrects), and the first failure is always logged so prompt-misfire
    # frequency stays visible.
    result: HypothesisList | None = _structured_llm.invoke(prompt)
    if result is None:
        logger.warning("hypothesis generation returned unparseable output; retrying once")
        result = _structured_llm.invoke(prompt)
    if result is None:
        raise RuntimeError(
            "hypothesis generation failed twice: no parseable structured output"
        )

    hyps = result.hypotheses
    for i, h in enumerate(hyps, start=1):
        if not h.id:
            h.id = f"H{i}"
    hyps.sort(key=lambda h: h.prior_confidence, reverse=True)

    return {"hypotheses": [h.model_dump() for h in hyps[:MAX_HYPOTHESES]]}
