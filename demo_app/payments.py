"""Fake external payment provider client.

Simulated latency and failure are controlled by environment variables so the
fault-injection scripts can break this dependency without code changes:

  PAYMENT_TIMEOUT_MS   client-side timeout (default DEFAULT_TIMEOUT_MS)
  PAYMENT_LATENCY_MS   mean simulated provider latency (default 60)
  PAYMENT_FAIL_RATE    probability [0..1] of a provider-side error (default 0)
"""

import os
import random
import time
import uuid

DEFAULT_TIMEOUT_MS = 800


class PaymentError(Exception):
    pass


def charge(user_id: int, amount: float) -> dict:
    timeout_ms = float(os.environ.get("PAYMENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS))
    mean_latency_ms = float(os.environ.get("PAYMENT_LATENCY_MS", "60"))
    fail_rate = float(os.environ.get("PAYMENT_FAIL_RATE", "0"))

    latency_ms = random.uniform(0.5 * mean_latency_ms, 1.5 * mean_latency_ms)
    time.sleep(min(latency_ms, timeout_ms) / 1000.0)

    if latency_ms > timeout_ms:
        raise TimeoutError(
            f"payment provider timed out after {timeout_ms:.0f}ms "
            f"(simulated latency {latency_ms:.0f}ms)"
        )
    if random.random() < fail_rate:
        raise PaymentError(f"payment provider rejected charge for user {user_id}")

    return {"charge_id": uuid.uuid4().hex[:12], "amount": amount}
