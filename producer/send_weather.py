import json
import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from azure.eventhub import EventData
from azure.eventhub.aio import EventHubProducerClient


def build_payload_from_open_meteo() -> dict:
    """
    Uses Open-Meteo (no API key required) for Casablanca.
    Docs: https://open-meteo.com/
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 33.5731,
        "longitude": -7.5898,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,pressure_msl",
        "timezone": "UTC",
    }

    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    cur = data.get("current", {})

    # Normalize schema (simple & consistent)
    return {
        "city": "Casablanca",
        "country": "MA",
        "ts_utc": cur.get("time") or datetime.now(timezone.utc).isoformat(),
        "temp_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kph": cur.get("wind_speed_10m"),
        "precip_mm": cur.get("precipitation"),
        "pressure_msl_hpa": cur.get("pressure_msl"),
        "source": "open-meteo",
        "schema_version": 1,
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