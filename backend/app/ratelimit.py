import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis.from_url(settings.redis_url)
    return _redis_client


def check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> bool:
    """Fixed-window rate limit. Returns True if the request is allowed.

    Fails open on Redis errors: the demo path must not die because the
    rate limiter's backing store hiccuped.
    """
    bucket = f"ratelimit:{key}"
    try:
        client = get_redis()
        pipe = client.pipeline()
        pipe.incr(bucket)
        pipe.expire(bucket, window_seconds)
        count, _ = pipe.execute()
        return int(count) <= limit
    except redis.RedisError:
        logger.warning("rate limiter unavailable; allowing request")
        return True
