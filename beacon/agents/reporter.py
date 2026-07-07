"""Agent 4 — Reporter. One LLM call + one deterministic Python gate.

The LLM turns the verdicts into a markdown incident report; then a pure-Python
citation gate re-checks every citation the report makes against the evidence
the pipeline actually gathered. Any citation the Reporter invented — a log line
or commit hash not backed by a verdict — is flagged [unverified]. The LLM
proposes prose; deterministic code guarantees the evidence. This gate is the
anti-hallucination backstop and does not itself call the model.
"""

import json
import logging
import os
import re

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from beacon.graph.state import BeaconState
from beacon.llm import MAX_RETRIES, get_rate_limiter

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY = os.environ.get("GEMINI_API_KEY")
# per-agent override first (cost tiering), then the pipeline-wide default
MODEL = os.environ.get("REPORTER_MODEL") or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

llm = ChatGoogleGenerativeAI(
    model=MODEL,
    temperature=0.3,
    google_api_key=API_KEY,
    rate_limiter=get_rate_limiter(MODEL), max_retries=MAX_RETRIES,
)

# citation shapes the gate recognises
_LOG_CITE = re.compile(r"[\w.-]+\.log:\d+")   # e.g. app.log:1042
# commit hashes: require at least one a-f letter so plain 7+ digit numbers
# (order ids, timestamps) aren't false-flagged as unverified commits
_COMMIT = re.compile(r"\b(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b")


REPORT_PROMPT = """\
You are writing an incident root-cause report for an on-call engineer. You are
given the investigated hypotheses, their verdicts (accept / reject /
inconclusive) with evidence citations, and the incident context.

Write the report in markdown with EXACTLY these sections:
1. **Root cause** — one line. If no hypothesis was accepted, say so plainly.
2. **Confidence** — high / medium / low, from the accepted verdict.
3. **Evidence** — bullet list, each citing the exact tokens from the verdicts
   (log citations like `app.log:1042`, commit hashes). Cite ONLY things present
   in the verdict evidence below — never invent a citation.
4. **Ruled out** — the rejected/inconclusive hypotheses and one line each on why.
5. **Suggested next step** — for the human. Diagnosis only; NEVER propose an
   automated remediation or claim you fixed anything.

Be concise. A stranger should be able to act on this report.
"""


def _report_prompt(verdicts: list[dict], hypotheses: list[dict], context_pack: dict) -> str:
    slim_pack = {k: context_pack.get(k) for k in ("service", "error_rate", "recent_deploys")}
    return (
        REPORT_PROMPT
        + "\n\nHYPOTHESES:\n" + json.dumps(hypotheses, indent=2, default=str)
        + "\n\nVERDICTS (with evidence citations):\n" + json.dumps(verdicts, indent=2, default=str)
        + "\n\nCONTEXT:\n" + json.dumps(slim_pack, indent=2, default=str)
    )


def _valid_citations(state: BeaconState) -> tuple[set[str], set[str]]:
    """The pool of citations the pipeline actually produced: log citations that
    appear in verdict evidence, and commit hashes from the recent deploys."""
    log_cites: set[str] = set()
    for verdict in state.get("verdicts") or []:
        for ev in verdict.get("evidence", []):
            log_cites.update(_LOG_CITE.findall(str(ev)))
    commits = {c["hash"] for c in (state.get("context_pack") or {}).get("recent_deploys", [])}
    return log_cites, commits


def verify_citations(markdown: str, state: BeaconState) -> str:
    """Flag every citation in the report not backed by gathered evidence, and
    append a citation-gate audit line. Pure, deterministic, no LLM."""
    valid_logs, valid_commits = _valid_citations(state)
    unverified: list[str] = []

    def _flag_log(m: re.Match) -> str:
        cite = m.group(0)
        if cite in valid_logs:
            return cite
        unverified.append(cite)
        return f"{cite} [unverified]"

    def _flag_commit(m: re.Match) -> str:
        h = m.group(0)
        if any(h == c or c.startswith(h) or h.startswith(c) for c in valid_commits):
            return h
        unverified.append(h)
        return f"{h} [unverified]"

    total = len(_LOG_CITE.findall(markdown)) + len(_COMMIT.findall(markdown))
    checked = _LOG_CITE.sub(_flag_log, markdown)
    checked = _COMMIT.sub(_flag_commit, checked)

    verified = total - len(unverified)
    footer = f"\n\n---\n*Citation gate: {verified}/{total} citations verified against gathered evidence.*"
    if unverified:
        # ops signal: how often the model invents citations
        logger.warning("citation gate flagged %d unverified citation(s): %s",
                       len(unverified), sorted(set(unverified)))
        footer += f" *Flagged: {', '.join(sorted(set(unverified)))}.*"
    return checked + footer


def _as_text(content) -> str:
    """AIMessage.content is str for some models but a list of content blocks
    for others (e.g. gemini-3.1-flash-lite). Normalise to a plain string so the
    citation gate's regex always has text to work on."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [p if isinstance(p, str) else p.get("text", "") for p in content
                 if isinstance(p, (str, dict))]
        return "".join(parts)
    return str(content)


def write_report(state: BeaconState) -> dict:
    prompt = _report_prompt(
        verdicts=state.get("verdicts") or [],
        hypotheses=state.get("hypotheses") or [],
        context_pack=state.get("context_pack") or {},
    )
    raw = _as_text(llm.invoke(prompt).content)
    return {"report": verify_citations(raw, state)}
