import json
import azure.functions as func


def main(req: func.HttpRequest, connectionInfo: func.SignalRConnectionInfo):
    return func.HttpResponse(
        body=json.dumps({
            "url": connectionInfo.url,
            "accessToken": connectionInfo.access_token
        }),
        mimetype="application/json",
        status_code=200
    )