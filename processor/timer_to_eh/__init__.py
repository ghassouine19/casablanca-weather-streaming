import json
import logging
import os
from datetime import datetime, timezone

import azure.functions as func
import requests

CITY = os.environ.get("CITY", "Casablanca")
LAT = float(os.environ.get("CITY_LAT", "33.5731"))
LON = float(os.environ.get("CITY_LON", "-7.5898"))

def _get_weather():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
    )
    data = requests.get(url, timeout=20).json()
    cur = data.get("current", {}) or {}
    return {
        "city": CITY,
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "temp_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kph": cur.get("wind_speed_10m"),
        "raw": cur,
    }

def main(mytimer: func.TimerRequest, event: func.Out[str]) -> None:
    if mytimer.past_due:
        logging.warning("Timer is past due!")

    payload = _get_weather()
    body = json.dumps(payload)
    event.set(body)
    logging.info("Timer sent weather to Event Hub: %s", body)