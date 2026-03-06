const logEl = document.getElementById("log");
const log = (msg) => (logEl.textContent += msg + "\n");

async function start() {
  const negotiateUrl =
    "https://func-casa-weather-ghassouine19-c9gndudeg5a9anb5.francecentral-01.azurewebsites.net/api/negotiate";

  log("Appel negotiate...");
  const r = await fetch(negotiateUrl, { method: "POST" });
  if (!r.ok) throw new Error(`negotiate failed: ${r.status} ${r.statusText}`);

  const { url, accessToken } = await r.json();

  log("Connexion SignalR...");
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // (Optionnel mais utile) logs de reconnexion
  connection.onclose((err) => log("SignalR fermé: " + (err?.message ?? "no error")));
  connection.onreconnecting((err) => log("Reconnecting: " + (err?.message ?? "no error")));
  connection.onreconnected((id) => log("Reconnected: " + id));

  // Event que le backend doit envoyer (target = "weatherUpdate")
  connection.on("weatherUpdate", (payload) => {
    const ts = new Date().toISOString();
    log(`[${ts}] weatherUpdate: ${JSON.stringify(payload)}`);
  });

  // Si jamais ton backend utilise un autre "target", ajoute-le ici aussi
  connection.on("weather", (payload) => log("weather: " + JSON.stringify(payload)));
  connection.on("message", (payload) => log("message: " + JSON.stringify(payload)));

  await connection.start();
  log("Connecté.");
}

start().catch((e) => log("ERREUR: " + (e?.message ?? String(e))));