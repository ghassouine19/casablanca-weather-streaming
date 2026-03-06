import json
import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from azure.eventhub import EventData
from azure.eventhub.aio import EventHubProducerClient


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


def build_payload_from_open_meteo() -> dict:
    """
    Uses Open-Meteo (no API key required) for Casablanca.
    Docs: https://open-meteo.com/
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 33.5731,
        "longitude": -7.5898,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,pressure_msl,weather_code",
        "hourly": "temperature_2m,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
        "forecast_days": 7,
        "timezone": "Africa/Casablanca",
    }

    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    cur = data.get("current", {})
    hourly_raw = data.get("hourly", {}) or {}
    daily_raw = data.get("daily", {}) or {}

    current_time = cur.get("time", "")
    hourly = _build_hourly(hourly_raw, current_time)
    daily = _build_daily(daily_raw)

    # Normalize schema (simple & consistent)
    return {
        "city": "Casablanca",
        "country": "MA",
        "ts_utc": cur.get("time") or datetime.now(timezone.utc).isoformat(),
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


async def main():
    load_dotenv()

    conn_str = os.environ["EVENTHUB_CONNECTION_STRING"]
    eventhub_name = os.environ.get("EVENTHUB_NAME", "weather")

    producer = EventHubProducerClient.from_connection_string(
        conn_str=conn_str,
        eventhub_name=eventhub_name,
    )

    payload = build_payload_from_open_meteo()
    body = json.dumps(payload, ensure_ascii=False)

    async with producer:
        batch = await producer.create_batch()
        batch.add(EventData(body))
        await producer.send_batch(batch)

    print("Sent event:", body)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())