"""Traffic generator for the demo target service.

Produces a steady, realistic request mix (including some 404s) so the log has
a believable baseline. Stdlib only — no dependencies.

    python traffic.py --seconds 60 --rps 5 --base-url http://localhost:9000
"""

import argparse
import json
import random
import time
import urllib.error
import urllib.request


def _request(method: str, url: str, body: dict | None = None) -> int:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except urllib.error.URLError:
        return -1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:9000")
    parser.add_argument("--seconds", type=int, default=60)
    parser.add_argument("--rps", type=float, default=5.0)
    args = parser.parse_args()

    deadline = time.time() + args.seconds
    sent = 0
    while time.time() < deadline:
        roll = random.random()
        if roll < 0.65:
            # user lookups; ids above 20 don't exist -> occasional 404s
            _request("GET", f"{args.base_url}/users/{random.randint(1, 25)}")
        elif roll < 0.90:
            _request("POST", f"{args.base_url}/orders",
                     {"user_id": random.randint(1, 22), "amount": round(random.uniform(5, 500), 2)})
        else:
            _request("GET", f"{args.base_url}/orders/{random.randint(1, 200)}")
        sent += 1
        time.sleep(1.0 / args.rps)

    print(f"sent {sent} requests over {args.seconds}s")


if __name__ == "__main__":
    main()
