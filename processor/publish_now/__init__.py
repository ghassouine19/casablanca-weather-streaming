import json
import logging
import os
from datetime import datetime, timezone

import azure.functions as func
import requests

CITY = os.environ.get("CITY", "Casablanca")
LAT = float(os.environ.get("CITY_LAT", "33.5731"))
LON = float(os.environ.get("CITY_LON", "-7.5898"))


def _build_hourly(hourly_raw: dict, current_time: str) -> list:
    times = hourly_raw.get("time", [])
    temps = hourly_raw.get("temperature_2m", [])
    codes = hourly_raw.get("weather_code", [])
    try:
        start = next(i for i, t in enumerate(times) if t >= current_time)
    except StopIteration:
        start = 0
    result = []
    for i in range(start, min(start + 24, len(times))):
        result.append({
            "time": times[i],
            "temp_c": temps[i] if i < len(temps) else None,
            "weather_code": codes[i] if i < len(codes) else None,
        })
    return result


def _build_daily(daily_raw: dict) -> list:
    times = daily_raw.get("time", [])
    t_max = daily_raw.get("temperature_2m_max", [])
    t_min = daily_raw.get("temperature_2m_min", [])
    codes = daily_raw.get("weather_code", [])
    result = []
    for i in range(len(times)):
        result.append({
            "date": times[i],
            "temp_max_c": t_max[i] if i < len(t_max) else None,
            "temp_min_c": t_min[i] if i < len(t_min) else None,
            "weather_code": codes[i] if i < len(codes) else None,
        })
    return result


def _get_weather():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,pressure_msl,weather_code",
        "hourly": "temperature_2m,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
        "forecast_days": 7,
        "timezone": "Africa/Casablanca",
    }
    r = requests.get(url, params=params, timeout=8)
    r.raise_for_status()
    data = r.json()
    cur = data.get("current", {}) or {}
    hourly_raw = data.get("hourly", {}) or {}
    daily_raw = data.get("daily", {}) or {}

    current_time = cur.get("time", "")
    hourly = _build_hourly(hourly_raw, current_time)
    daily = _build_daily(daily_raw)

    return {
        "city": CITY,
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "temp_c": cur.get("temperature_2m"),
        "feels_like_c": cur.get("apparent_temperature"),
        "weather_code": cur.get("weather_code"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kph": cur.get("wind_speed_10m"),
        "precip_mm": cur.get("precipitation"),
        "pressure_msl_hpa": cur.get("pressure_msl"),
        "temp_max_c": daily[0]["temp_max_c"] if daily else None,
        "temp_min_c": daily[0]["temp_min_c"] if daily else None,
        "hourly": hourly,
        "daily": daily,
        "source": "open-meteo",
        "schema_version": 2,
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