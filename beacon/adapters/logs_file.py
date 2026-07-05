"""File-based log adapter.

Reads time windows out of a log file whose lines start with a
`YYYY-MM-DD HH:MM:SS[,ms]` timestamp (Python logging's default asctime).
Lines with no leading timestamp — tracebacks, continuation lines — inherit
the timestamp of the line above them, so a stack trace never gets split
across a window boundary.
"""

import re
from datetime import datetime, timedelta

from beacon.config import load_config

_TS = re.compile(r"^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})")


def _parse_ts(line: str) -> datetime | None:
    m = _TS.match(line)
    if not m:
        return None
    return datetime.strptime(f"{m.group(1)} {m.group(2)}", "%Y-%m-%d %H:%M:%S")


def read_recent_logs(
    minutes: int = 30,
    until_minutes_ago: int = 0,
    path: str | None = None,
    now: datetime | None = None,
) -> list[str]:
    """Return log lines from the window [now - minutes, now - until_minutes_ago].

    The Collector's baseline comparison is two calls:
        incident = read_recent_logs(minutes=30)
        baseline = read_recent_logs(minutes=150, until_minutes_ago=30)
    """
    if path is None:
        path = load_config()["logs"]["path"]
    now = now or datetime.now()
    start = now - timedelta(minutes=minutes)
    end = now - timedelta(minutes=until_minutes_ago)

    out: list[str] = []
    current_ts: datetime | None = None
    try:
        with open(path, errors="replace") as f:
            for raw in f:
                line = raw.rstrip("\n")
                ts = _parse_ts(line)
                if ts is not None:
                    current_ts = ts
                if current_ts is not None and start <= current_ts <= end:
                    out.append(line)
    except FileNotFoundError:
        return []
    return out
