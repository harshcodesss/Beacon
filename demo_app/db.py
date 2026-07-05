"""Fake in-memory database for the demo target service.

Reads DB_URL from the environment on every call — it never connects anywhere,
but requiring the variable means the "missing env var" fault scenario produces
a realistic error signature.
"""

import itertools
import os

_USERS = {
    i: {"id": i, "name": f"user{i}", "plan": "pro" if i % 3 == 0 else "free"}
    for i in range(1, 21)
}
_ORDERS: dict[int, dict] = {}
_order_ids = itertools.count(1)


def _require_db() -> None:
    if not os.environ.get("DB_URL"):
        raise RuntimeError("DB_URL is not configured; refusing to open connection")


def get_user(user_id: int) -> dict:
    _require_db()
    user = _USERS.get(user_id)
    if user is None:
        raise KeyError(f"user {user_id} not found")
    return user


def create_order(user_id: int, amount: float, charge_id: str) -> dict:
    _require_db()
    order_id = next(_order_ids)
    order = {"id": order_id, "user_id": user_id, "amount": amount, "charge_id": charge_id}
    _ORDERS[order_id] = order
    return order


def get_order(order_id: int) -> dict:
    _require_db()
    order = _ORDERS.get(order_id)
    if order is None:
        raise KeyError(f"order {order_id} not found")
    return order
