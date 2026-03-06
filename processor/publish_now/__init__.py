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
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation"
    )
    r = requests.get(url, timeout=8)
    r.raise_for_status()
    data = r.json()
    cur = data.get("current", {}) or {}

    return {
        "city": CITY,
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "temp_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kph": cur.get("wind_speed_10m"),
        "precip_mm": cur.get("precipitation"),  # <-- ajouté
        "source": "open-meteo",
        "schema_version": 1,
    }

def main(req: func.HttpRequest, event: func.Out[str]) -> func.HttpResponse:
    try:
        payload = _get_weather()
        event.set(json.dumps(payload))
        return func.HttpResponse(
            json.dumps({"ok": True, "sent": payload}),
            status_code=200,
            mimetype="application/json",
        )
    except Exception as e:
        logging.exception("publish_now failed")
        return func.HttpResponse(
            json.dumps({"ok": False, "error": str(e)}),
            status_code=500,
            mimetype="application/json",
        )