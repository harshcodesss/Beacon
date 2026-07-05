"""Stub metrics adapter — canned data until a Prometheus adapter exists.

Deterministic per metric name so investigations are reproducible; every
response is clearly labeled as stub data so the LLM can weight it accordingly.
"""

import hashlib


def get_metric(name: str, window_minutes: int = 30) -> dict:
    seed = hashlib.sha256(name.encode()).digest()
    base = 1 + seed[0] % 20
    points = [round(base + (seed[i % 32] % 7) / 10, 1) for i in range(window_minutes // 5 + 1)]
    return {
        "name": name,
        "window_minutes": window_minutes,
        "adapter": "stub",
        "points": points,
        "note": "stub adapter: canned series, not live metrics",
    }
