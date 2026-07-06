"""The Investigator's three tools.

Thin @tool wrappers over the already-tested adapters. Each returns a plain
string the LLM reads back as a ToolMessage. Tool docstrings matter — the model
picks tools by reading them, so they state what the tool is FOR and what its
output looks like (especially the citation format).
"""

import json

from langchain_core.tools import tool

from beacon.adapters.git_diff import read_commit_patch
from beacon.adapters.logs_file import grep_logs
from beacon.adapters.metrics_stub import get_metric as _get_metric


@tool
def search_logs(pattern: str, window_minutes: int = 30) -> str:
    """Search recent application logs for a regex pattern.

    Use this to CONFIRM or REFUTE whether an error signature is present and how
    often. Returns up to 20 matching lines, each prefixed with a citation of
    the form 'app.log:1042' (real file line number) — cite these verbatim in
    your evidence.
    """
    matches = grep_logs(pattern, minutes=window_minutes)
    if not matches:
        return f"no log lines matched /{pattern}/ in the last {window_minutes}m"
    return "\n".join(matches)


@tool
def read_diff(commit: str) -> str:
    """Return the code patch for a specific commit hash (truncated).

    Use this to check whether a suspected commit actually made the change your
    hypothesis claims. Cite as the commit hash plus file, e.g. 'a1b2c3 auth.py'.
    """
    return read_commit_patch(commit)


@tool
def get_metric(name: str, window_minutes: int = 30) -> str:
    """Return a recent time series for a named metric (e.g. 'payment_latency_ms',
    'http_5xx_rate').

    NOTE: currently a STUB returning canned, clearly-labeled data — weight it
    accordingly and prefer logs/diffs as hard evidence.
    """
    return json.dumps(_get_metric(name, window_minutes))


TOOLS = [search_logs, read_diff, get_metric]
TOOLS_BY_NAME = {t.name: t for t in TOOLS}
