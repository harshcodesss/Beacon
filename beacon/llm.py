"""Shared rate limiter + retry policy for every Gemini call in the pipeline.

The investigator loop (and a full eval suite) fires calls in bursts; the free
tier caps requests-per-minute. One process-wide limiter, imported by all
agents, paces the WHOLE pipeline under that ceiling, and max_retries lets a
transient 429 recover with backoff instead of killing the run.
"""

from langchain_core.rate_limiters import InMemoryRateLimiter

# ~12 requests/min — comfortably under the free-tier 15 RPM ceiling. Shared, so
# pacing holds across agent boundaries, not just within one agent.
RATE_LIMITER = InMemoryRateLimiter(
    requests_per_second=0.2,
    check_every_n_seconds=0.1,
    max_bucket_size=2,
)

# langchain retries transient errors (incl. 429) with exponential backoff.
MAX_RETRIES = 6
