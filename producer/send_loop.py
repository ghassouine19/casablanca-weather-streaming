import json
import os
import time
from datetime import datetime, timezone

import requests
from azure.eventhub import EventHubProducerClient, EventData

CITY = "Casablanca"
LAT, LON = 33.5731, -7.5898  # Casablanca


def get_weather():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
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


def send(payload):
    conn = os.environ["EVENTHUB_SEND_CONNECTION"]
    eventhub_name = os.environ.get("EVENTHUB_NAME", "weather")

    producer = EventHubProducerClient.from_connection_string(
        conn_str=conn,
        eventhub_name=eventhub_name,
    )

    body = json.dumps(payload)
    with producer:
        batch = producer.create_batch()
        batch.add(EventData(body))
        producer.send_batch(batch)


def main():
    interval_s = int(os.environ.get("INTERVAL_SECONDS", "60"))
    print(f"Sending weather every {interval_s}s... Ctrl+C to stop.")

    while True:
        try:
            payload = get_weather()
            send(payload)
            print("Sent:", json.dumps(payload))
        except Exception as e:
            print("ERROR:", str(e))

        time.sleep(interval_s)


if __name__ == "__main__":
    main()