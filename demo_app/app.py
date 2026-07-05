"""Demo target service — the app Beacon triages.

A deliberately small FastAPI service that writes production-style logs to
logs/app.log. Run it from inside this directory:

    DB_URL=sqlite:///demo.db uvicorn app:app --port 9000
"""

import logging
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

import db
import payments

SLOW_REQUEST_MS = 1000

LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "app.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("demo_app")

app = FastAPI(title="demo-target")


@app.middleware("http")
async def access_log(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request %s %s -> %d in %.0fms",
        request.method, request.url.path, response.status_code, elapsed_ms,
    )
    if elapsed_ms > SLOW_REQUEST_MS:
        logger.warning(
            "slow request %s %s took %.0fms", request.method, request.url.path, elapsed_ms
        )
    return response


class OrderIn(BaseModel):
    user_id: int
    amount: float


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/users/{user_id}")
def get_user(user_id: int):
    try:
        return db.get_user(user_id)
    except KeyError:
        logger.warning("lookup for unknown user %d", user_id)
        raise HTTPException(status_code=404, detail="user not found")
    except RuntimeError:
        logger.exception("database unavailable while fetching user %d", user_id)
        raise HTTPException(status_code=500, detail="database unavailable")


@app.post("/orders")
def create_order(order: OrderIn):
    try:
        user = db.get_user(order.user_id)
        charge = payments.charge(user["id"], order.amount)
        created = db.create_order(user["id"], order.amount, charge["charge_id"])
        logger.info("order %d created for user %d (charge %s)",
                    created["id"], user["id"], charge["charge_id"])
        return created
    except KeyError:
        logger.warning("order rejected: unknown user %d", order.user_id)
        raise HTTPException(status_code=404, detail="user not found")
    except TimeoutError:
        logger.exception("payment provider timeout for user %d", order.user_id)
        raise HTTPException(status_code=504, detail="payment provider timeout")
    except payments.PaymentError:
        logger.exception("payment failed for user %d", order.user_id)
        raise HTTPException(status_code=502, detail="payment failed")
    except RuntimeError:
        logger.exception("database unavailable while creating order")
        raise HTTPException(status_code=500, detail="database unavailable")


@app.get("/orders/{order_id}")
def get_order(order_id: int):
    try:
        return db.get_order(order_id)
    except KeyError:
        logger.warning("lookup for unknown order %d", order_id)
        raise HTTPException(status_code=404, detail="order not found")
    except RuntimeError:
        logger.exception("database unavailable while fetching order %d", order_id)
        raise HTTPException(status_code=500, detail="database unavailable")
