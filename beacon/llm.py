"""Provider-agnostic chat-model factory + per-model rate limiting and retry.

Every agent builds its model through `build_chat_model`, so the pipeline runs
on any LangChain-supported provider via a single provider-prefixed model string
(e.g. "google_genai:gemini-3.1-flash-lite", "openai:gpt-4o"). Users bring their
own key by setting that provider's standard env var (GOOGLE_API_KEY,
OPENAI_API_KEY, ...); the model string is chosen with BEACON_MODEL (or the
per-agent BEACON_{GENERATOR,INVESTIGATOR,REPORTER}_MODEL overrides).

Backward compatibility: the older Gemini-only knobs still work —
GEMINI_API_KEY is mapped to GOOGLE_API_KEY, and a bare GEMINI_MODEL /
GENERATOR_MODEL / ... is treated as a google_genai model.
"""

import os

from langchain.chat_models import init_chat_model
from langchain_core.rate_limiters import InMemoryRateLimiter

MAX_RETRIES = 6
DEFAULT_MODEL = "google_genai:gemini-3.1-flash-lite"

# requests-per-minute we pace each model to — slightly under the free-tier
# console limits. Keyed on the bare model name (provider prefix stripped).
_RPM_BY_MODEL = {
    "gemini-3.5-flash": 4,
    "gemini-3-flash-preview": 4,
    "gemini-2.5-flash": 4,
    "gemini-2.5-flash-lite": 8,
    "gemini-3.1-flash-lite": 12,
}
_DEFAULT_RPM = 4  # conservative for models not listed (covers paid tiers safely)

_limiters: dict[str, InMemoryRateLimiter] = {}


def _apply_key_compat() -> None:
    """Let existing GEMINI_API_KEY users keep working: init_chat_model's
    google_genai provider reads GOOGLE_API_KEY."""
    gem = os.environ.get("GEMINI_API_KEY")
    if gem and not os.environ.get("GOOGLE_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = gem


def get_rate_limiter(model: str) -> InMemoryRateLimiter:
    """One shared limiter per model id (created lazily). Accepts a bare or
    provider-prefixed name; RPM is looked up on the bare name."""
    bare = model.split(":", 1)[-1]
    if bare not in _limiters:
        rpm = _RPM_BY_MODEL.get(bare, _DEFAULT_RPM)
        _limiters[bare] = InMemoryRateLimiter(
            requests_per_second=rpm / 60.0,
            check_every_n_seconds=0.1,
            max_bucket_size=1,
        )
    return _limiters[bare]


def resolve_model(agent: str) -> str:
    """Provider-prefixed model string for one agent, honouring overrides.

    Precedence: BEACON_<AGENT>_MODEL > BEACON_MODEL > (legacy) <AGENT>_MODEL /
    GEMINI_MODEL as google_genai shorthand > DEFAULT_MODEL.
    """
    explicit = os.environ.get(f"BEACON_{agent}_MODEL") or os.environ.get("BEACON_MODEL")
    if explicit:
        return explicit
    legacy = os.environ.get(f"{agent}_MODEL") or os.environ.get("GEMINI_MODEL")
    if legacy:
        return legacy if ":" in legacy else f"google_genai:{legacy}"
    return DEFAULT_MODEL


def build_chat_model(model: str, temperature: float, tools=None):
    """Construct a rate-limited, retrying chat model for `model`
    ("provider:name" or a bare google_genai name), optionally tool-bound."""
    _apply_key_compat()
    provider, _, name = model.partition(":")
    if not name:  # bare name -> default provider
        provider, name = "google_genai", provider
    llm = init_chat_model(
        name,
        model_provider=provider,
        temperature=temperature,
        rate_limiter=get_rate_limiter(model),
        max_retries=MAX_RETRIES,
    )
    return llm.bind_tools(tools) if tools else llm
