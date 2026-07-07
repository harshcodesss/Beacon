"""Per-model rate limiting + retry policy for every Gemini call.

Free-tier quotas are per model, so each model id gets its own process-wide
InMemoryRateLimiter; every agent asks for the limiter of the model it runs on,
and pacing holds across the whole pipeline — even when different agents run on
different models. max_retries lets transient 429/503s recover with backoff
instead of killing a run.
"""

from langchain_core.rate_limiters import InMemoryRateLimiter

MAX_RETRIES = 6

# requests-per-minute we pace to — slightly under the AI Studio console limits
_RPM_BY_MODEL = {
    "gemini-3.5-flash": 4,        # console 5 RPM
    "gemini-3-flash-preview": 4,  # console "Gemini 3 Flash", 5 RPM
    "gemini-2.5-flash": 4,        # console 5 RPM
    "gemini-2.5-flash-lite": 8,   # console 10 RPM
    "gemini-3.1-flash-lite": 12,  # console 15 RPM
}
_DEFAULT_RPM = 4  # conservative for models not listed above

_limiters: dict[str, InMemoryRateLimiter] = {}


def get_rate_limiter(model: str) -> InMemoryRateLimiter:
    """One shared limiter per model id (created lazily)."""
    if model not in _limiters:
        rpm = _RPM_BY_MODEL.get(model, _DEFAULT_RPM)
        _limiters[model] = InMemoryRateLimiter(
            requests_per_second=rpm / 60.0,
            check_every_n_seconds=0.1,
            max_bucket_size=1,
        )
    return _limiters[model]
