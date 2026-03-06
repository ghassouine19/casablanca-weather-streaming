import json
import os
from datetime import datetime, timezone

import requests
from azure.eventhub import EventHubProducerClient, EventData

CITY = "Casablanca"


def get_weather():
    # Exemple simple via Open-Meteo (pas besoin de clé)
    # Casablanca ~ lat 33.5731, lon -7.5898
    lat, lon = 33.5731, -7.5898
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
    )
    data = requests.get(url, timeout=20).json()
    cur = data.get("current", {})
    return {
        "city": CITY,
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "temp_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kph": cur.get("wind_speed_10m"),
        "raw": cur,
    }


def main():
    conn = os.environ["EVENTHUB_SEND_CONNECTION"]  # à définir
    eventhub_name = os.environ.get("EVENTHUB_NAME", "weather")

    payload = get_weather()
    body = json.dumps(payload)

    producer = EventHubProducerClient.from_connection_string(
        conn_str=conn,
        eventhub_name=eventhub_name,
    )

    with producer:
        batch = producer.create_batch()
        batch.add(EventData(body))
        producer.send_batch(batch)

    print("Sent:", body)


if __name__ == "__main__":
    main()