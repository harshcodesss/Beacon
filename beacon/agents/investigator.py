"""Agent 3 — Investigator. The real agent: an LLM in a loop with tools.

For each hypothesis it runs a ReAct loop — call tools to gather the evidence
the hypothesis declared, observe the results — then emits a structured verdict
(accept / reject / inconclusive) with citations. The loop is leashed by a hard
tool-call budget enforced IN CODE, not in the prompt: an agent without a leash
spirals. The budget is shared across ALL hypotheses for the incident, so later
hypotheses may get less investigation if earlier ones burned the budget.
"""

import json
import logging
from typing import Literal

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from pydantic import BaseModel, Field

from beacon.agents.tools import TOOLS, TOOLS_BY_NAME
from beacon.graph.state import BeaconState
from beacon.llm import build_chat_model, resolve_model

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_MAX_TOOL_CALLS = 15

# temperature low: investigation rewards precision, not creativity
MODEL = resolve_model("INVESTIGATOR")
llm = build_chat_model(MODEL, temperature=0.1, tools=TOOLS)


class Verdict(BaseModel):
    hypothesis_id: str
    verdict: Literal["accept", "reject", "inconclusive"]
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(
        description="citations backing the verdict, e.g. 'app.log:1042', "
        "'4c32d7f payments.py' — only things you actually observed via tools"
    )
    reasoning: str = Field(description="2-3 sentences, no more")


# built once, after Verdict is defined
_verdict_llm = llm.with_structured_output(Verdict)


SYSTEM_PROMPT = """\
You are an incident investigator. You are given ONE hypothesis that declares
what evidence would confirm or refute it. Use the tools to gather that evidence,
then decide.

- Call tools to check the declared evidence_to_confirm and evidence_to_refute.
- Be frugal: you share a strict tool-call budget across all hypotheses. Do not
  re-run a tool you already ran. Stop calling tools once you can decide.
- Cite only evidence you actually observed in tool output (real log citations
  like 'app.log:1042', real commit hashes). Never invent a citation.
- Precision over recall: if the evidence is weak or mixed, return 'inconclusive'
  rather than forcing an accept/reject.
"""

_VERDICT_INSTRUCTION = (
    "Based only on the tool evidence gathered above, return your verdict for "
    "hypothesis {hid}. Set hypothesis_id to '{hid}'."
)


def _run_tool(tool_call: dict) -> str:
    tool = TOOLS_BY_NAME.get(tool_call["name"])
    if tool is None:
        return f"unknown tool: {tool_call['name']}"
    try:
        return str(tool.invoke(tool_call["args"]))
    except Exception as e:  # noqa: BLE001 — a tool failure is evidence, not a crash
        return f"tool error: {e}"


def _hypothesis_prompt(hyp: dict, context_pack: dict) -> str:
    return (
        "HYPOTHESIS:\n" + json.dumps(hyp, indent=2)
        + "\n\nRELEVANT CONTEXT (error clusters + recent deploys):\n"
        + json.dumps(
            {k: context_pack.get(k) for k in ("error_clusters", "recent_deploys")},
            indent=2, default=str,
        )
    )


def investigate(state: BeaconState) -> dict:
    hypotheses = state.get("hypotheses") or []
    context_pack = state.get("context_pack") or {}
    budget = dict(state.get("budget") or {})
    max_calls = int(budget.get("max_tool_calls", DEFAULT_MAX_TOOL_CALLS))

    verdicts: list[dict] = []
    calls_used = 0

    for hyp in hypotheses:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=_hypothesis_prompt(hyp, context_pack)),
        ]

        while calls_used < max_calls:

            response: AIMessage = llm.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                break  # model is done reasoning -> go to verdict

            for tc in response.tool_calls:
                if calls_used >= max_calls:
                    messages.append(ToolMessage(
                        content="tool-call budget exhausted for this incident",
                        tool_call_id=tc["id"],
                    ))
                    continue
                messages.append(ToolMessage(
                    content=_run_tool(tc), tool_call_id=tc["id"]
                ))
                calls_used += 1

        hid = hyp.get("id", "")

        verdict: Verdict | None = _verdict_llm.invoke(
            messages + [HumanMessage(content=_VERDICT_INSTRUCTION.format(hid=hid))]
        )
        if verdict is None:
            # a failed verdict parse must not sink the whole investigation:
            # fall back to an honest inconclusive and keep going
            logger.warning("verdict parse failed for hypothesis %s; marking inconclusive", hid)
            verdict = Verdict(
                hypothesis_id=hid, verdict="inconclusive", confidence=0.0,
                evidence=[], reasoning="verdict generation failed to parse; not scored",
            )
        
        result = verdict.model_dump()
        result["hypothesis_id"] = hid or result.get("hypothesis_id", "")
        verdicts.append(result)

    budget["tool_calls_used"] = calls_used
    return {"verdicts": verdicts, "budget": budget}
