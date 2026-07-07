"""The Judge — scores a Beacon result against a fault's ground truth.

For each scenario it takes the pipeline's accepted hypotheses (verdict ==
'accept', ranked by the verdict's confidence) and asks: does the top one match
the known cause (top-1)? does any of the top three (top-3)? Matching is
deterministic first — component-name and commit-hash string checks — with a
single Gemini call as a fuzzy fallback only when the strings don't settle it.
The LLM fallback fails safe: if there's no API key it returns False, so the
harness still runs deterministically.
"""

import os
import re


def accepted_ranked(state: dict) -> list[dict]:
    """Hypotheses whose verdict is 'accept', highest verdict-confidence first."""
    verdicts = {v.get("hypothesis_id"): v for v in state.get("verdicts") or []}
    accepted = []
    for hyp in state.get("hypotheses") or []:
        v = verdicts.get(hyp.get("id"))
        if v and v.get("verdict") == "accept":
            accepted.append({**hyp, "_verdict_confidence": v.get("confidence", 0.0)})
    accepted.sort(key=lambda h: h["_verdict_confidence"], reverse=True)
    return accepted


def _stems(component: str) -> set[str]:
    # "payments.py" -> {"payments"}; "auth-service" -> {"auth", "service"};
    # keep 2-char stems too ("db" is a real component name)
    base = re.sub(r"\.(py|js|ts)$", "", component.lower())
    return {t for t in re.split(r"[^a-z0-9]+", base) if len(t) >= 2}


def _deterministic_match(hypothesis: dict, truth: dict) -> bool | None:
    """True/False when the strings settle it, None when it's genuinely fuzzy."""
    hay = " ".join([
        hypothesis.get("suspected_component", ""),
        hypothesis.get("statement", ""),
    ]).lower()

    commit = (truth.get("guilty_commit") or "").lower()
    if commit and commit[:7] in hay:
        return True

    stems = _stems(truth.get("guilty_component") or "")
    if stems and stems & _stems(hay.replace(" ", "_")):
        return True
    if stems and any(s in hay for s in stems):
        return True

    # nothing matched deterministically -> let the LLM arbitrate (fuzzy)
    return None


def _llm_match(hypothesis: dict, truth: dict) -> bool:
    """One Gemini call as a fuzzy arbiter. Fails safe to False (e.g. no key)."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from pydantic import BaseModel

        class _Match(BaseModel):
            matches: bool

        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            return False
        from beacon.llm import MAX_RETRIES, get_rate_limiter
        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        llm = ChatGoogleGenerativeAI(
            model=model, temperature=0, google_api_key=key,
            rate_limiter=get_rate_limiter(model), max_retries=MAX_RETRIES,
        )
        prompt = (
            "Does this hypothesis identify the same root cause as the ground truth?\n"
            f"HYPOTHESIS: {hypothesis.get('statement')} "
            f"(component: {hypothesis.get('suspected_component')})\n"
            f"GROUND TRUTH: {truth.get('description')} "
            f"(component: {truth.get('guilty_component')})\n"
            "Answer strictly whether they point at the same underlying cause."
        )
        return bool(llm.with_structured_output(_Match).invoke(prompt).matches)
    except Exception:
        return False


def matches_truth(hypothesis: dict, truth: dict, use_llm: bool = True) -> bool:
    decided = _deterministic_match(hypothesis, truth)
    if decided is not None:
        return decided
    return _llm_match(hypothesis, truth) if use_llm else False


def judge_scenario(state: dict, truth: dict, use_llm: bool = True) -> dict:
    accepted = accepted_ranked(state)
    top1 = bool(accepted) and matches_truth(accepted[0], truth, use_llm)
    top3 = any(matches_truth(h, truth, use_llm) for h in accepted[:3])
    return {
        "scenario": truth.get("fault_type"),
        "matched_top1": bool(top1),
        "matched_top3": bool(top3),
        "n_accepted": len(accepted),
    }


def score_suite(results: list[dict]) -> dict:
    n = len(results)
    if n == 0:
        return {"scenarios": 0, "top1_accuracy": 0.0, "top3_accuracy": 0.0}
    return {
        "scenarios": n,
        "top1_accuracy": round(sum(r["matched_top1"] for r in results) / n, 3),
        "top3_accuracy": round(sum(r["matched_top3"] for r in results) / n, 3),
    }
