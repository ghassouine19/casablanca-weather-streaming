import json
import logging
import os
from datetime import datetime, timezone

import azure.functions as func
from azure.storage.blob import BlobServiceClient


def _build_blob_name(payload: dict) -> str:
    now = datetime.now(timezone.utc)
    city = (payload.get("city") or "unknown").lower().replace(" ", "-")
    ts = payload.get("ts_utc") or now.isoformat()
    ts_safe = str(ts).replace(":", "").replace("/", "-")
    return f"bronze/weather/city={city}/year={now:%Y}/month={now:%m}/day={now:%d}/{ts_safe}.json"


def main(event: func.EventHubEvent, signalRMessages: func.Out[func.SignalRMessage]):
    raw = event.get_body().decode("utf-8")
    payload = json.loads(raw)

    # Write to Blob
    storage_conn = os.environ["STORAGE_CONNECTION"]
    container = os.environ.get("BLOB_CONTAINER", "weather")

    blob_service = BlobServiceClient.from_connection_string(storage_conn)
    blob_name = _build_blob_name(payload)

    blob_client = blob_service.get_blob_client(container=container, blob=blob_name)
    blob_client.upload_blob(raw.encode("utf-8"), overwrite=True)

    logging.info("Stored blob: %s", blob_name)

    # Broadcast to SignalR
    msg = func.SignalRMessage(
        target="weatherUpdate",
        arguments=[payload]
    )
    signalRMessages.set(msg)