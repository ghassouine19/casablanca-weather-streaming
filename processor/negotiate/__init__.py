import json
import azure.functions as func

def main(req: func.HttpRequest, connectionInfo):
    # connectionInfo peut être:
    # - un dict {"url": "...", "accessToken": "..."}
    # - ou une string JSON '{
    #     "url": "...",
    #     "accessToken": "..."
    #   }'
    if isinstance(connectionInfo, str):
        try:
            data = json.loads(connectionInfo)
        except Exception:
            # fallback: renvoyer brut si ce n'est pas du JSON
            data = {"raw": connectionInfo}
    elif isinstance(connectionInfo, dict):
        data = connectionInfo
    else:
        # fallback pour d'autres types
        data = {"raw": str(connectionInfo)}

    # Normaliser les clés
    url = data.get("url")
    token = data.get("accessToken") or data.get("access_token")

    return func.HttpResponse(
        body=json.dumps({"url": url, "accessToken": token}),
        mimetype="application/json",
        status_code=200
    )