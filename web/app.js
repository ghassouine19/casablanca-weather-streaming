const el = (id) => document.getElementById(id);
const logEl = el("log");

function log(msg) {
  const ts = new Date().toISOString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(state, text) {
  const s = el("status");
  s.textContent = text;
  s.classList.remove("status--connected", "status--disconnected", "status--connecting");
  s.classList.add(
    state === "connected"
      ? "status--connected"
      : state === "connecting"
      ? "status--connecting"
      : "status--disconnected"
  );
}

function fmt(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

// --- Payload field pickers (support multiple schemas) ---
function pickTemp(p) {
  if (p?.temp_c != null) return p.temp_c;
  if (p?.temperature_c != null) return p.temperature_c;
  if (p?.temperature_2m != null) return p.temperature_2m;
  if (p?.raw?.temperature_2m != null) return p.raw.temperature_2m;
  return null;
}
function pickHumidity(p) {
  if (p?.humidity != null) return p.humidity;
  if (p?.humidity_pct != null) return p.humidity_pct;
  if (p?.relative_humidity_2m != null) return p.relative_humidity_2m;
  if (p?.raw?.relative_humidity_2m != null) return p.raw.relative_humidity_2m;
  return null;
}
function pickWind(p) {
  if (p?.wind_kph != null) return p.wind_kph;
  if (p?.wind_speed_10m != null) return p.wind_speed_10m;
  if (p?.raw?.wind_speed_10m != null) return p.raw.wind_speed_10m;
  return null;
}
function pickPrecipMm(p) {
  if (p?.precip_mm != null) return p.precip_mm;
  if (p?.precipitation_mm != null) return p.precipitation_mm;
  if (p?.precip != null) return p.precip;
  return null;
}

/**
 * Not a real meteorological “probability”.
 * Just a visual % derived from precip mm to make the dashboard easier to read.
 */
function precipMmToPercent(mm) {
  if (mm == null) return null;
  const x = Number(mm);
  if (Number.isNaN(x) || x < 0) return null;
  if (x === 0) return 0;
  if (x < 0.1) return 10;
  if (x < 0.5) return 25;
  if (x < 1) return 40;
  if (x < 2) return 60;
  if (x < 5) return 80;
  if (x < 10) return 90;
  return 100;
}

function updateUI(p) {
  el("city").textContent = fmt(p.city || p.name);

  const t = pickTemp(p);
  el("temp").textContent = t == null ? "—" : `${t} °C`;

  const h = pickHumidity(p);
  el("humidity").textContent = h == null ? "—" : `${h} %`;

  const w = pickWind(p);
  el("wind").textContent = w == null ? "—" : `${w} km/h`;

  const mm = pickPrecipMm(p);
  el("precip").textContent = mm == null ? "—" : `${mm} mm`;

  const pct = precipMmToPercent(mm);
  el("precipPct").textContent = pct == null ? "—" : `${pct}% (est.)`;

  const ts = p.ts_utc || p.timestamp || p.time;
  el("lastUpdate").textContent = fmt(ts);

  const d = parseTs(ts);
  el("lastUpdateHuman").textContent = d ? timeAgo(d) : "—";

  el("source").textContent = fmt(p.source || "—");
  el("schema").textContent = fmt(p.schema_version ?? "—");

  const notes = [];
  if (p.pressure_msl_hpa != null) notes.push(`pressure ${p.pressure_msl_hpa} hPa`);
  el("note").textContent = notes.length ? notes.join(" • ") : "—";
}

// “time ago” refresh
setInterval(() => {
  const ts = el("lastUpdate").textContent;
  const d = parseTs(ts);
  el("lastUpdateHuman").textContent = d ? timeAgo(d) : "—";
}, 10000);

async function start() {
  el("buildInfo").textContent = `build ${new Date().toISOString()}`;

  const negotiateUrl =
    "https://func-casa-weather-ghassouine19-c9gndudeg5a9anb5.francecentral-01.azurewebsites.net/api/negotiate";

  setStatus("connecting", "Connecting");
  log("Calling negotiate…");

  const r = await fetch(negotiateUrl, { method: "POST" });
  if (!r.ok) throw new Error(`negotiate failed: ${r.status} ${r.statusText}`);
  const { url, accessToken } = await r.json();

  log("Connecting to SignalR…");
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.onreconnecting((err) => {
    setStatus("connecting", "Reconnecting");
    log("Reconnecting… " + (err?.message || ""));
  });

  connection.onreconnected(() => {
    setStatus("connected", "Connected");
    log("Reconnected.");
  });

  connection.onclose((err) => {
    setStatus("disconnected", "Disconnected");
    log("Connection closed. " + (err?.message || ""));
  });

  connection.on("weatherUpdate", (payload) => {
    log("weatherUpdate received");
    updateUI(payload);
  });

  async function triggerPublishNow() {
  // Mets ton URL publish_now ici
  const publishNowUrl =
    "https://func-casa-weather-ghassouine19-c9gndudeg5a9anb5.francecentral-01.azurewebsites.net/api/publish_now";

  try {
    log("Triggering publish_now…");
    const r = await fetch(publishNowUrl, { method: "POST" });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`publish_now failed: ${r.status} ${r.statusText} ${txt}`);
    }
    log("publish_now OK (event sent).");
  } catch (e) {
    log("publish_now ERROR: " + (e?.message ?? String(e)));
  }
}

  await connection.start();
  setStatus("connected", "Connected");
  log("Connected. Waiting for weatherUpdate…");

  await triggerPublishNow();

  el("clear").addEventListener("click", () => (logEl.textContent = ""));

  const toggleBtn = el("toggleLogs");
  let visible = true;
  toggleBtn.addEventListener("click", () => {
    visible = !visible;
    logEl.style.display = visible ? "block" : "none";
    toggleBtn.textContent = visible ? "Hide logs" : "Show logs";
  });
}

start().catch((e) => {
  setStatus("disconnected", "Error");
  log("ERROR: " + (e?.message ?? String(e)));
});