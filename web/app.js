const el = (id) => document.getElementById(id);
const logEl = el("log");

// ── Logging ──
function log(msg) {
  const ts = new Date().toISOString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Status indicator ──
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

// ── Formatting helpers ──
function fmt(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function fmtTemp(t) {
  if (t == null) return "—";
  return `${Math.round(t)}°`;
}

function parseTs(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  return `il y a ${h}h`;
}

// ── Payload field pickers (support multiple schemas) ──
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

// ── WMO weather-code helpers ──
const WMO_EMOJI = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 56: "🌦️", 57: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️", 66: "🌧️", 67: "🌧️",
  71: "❄️", 73: "❄️", 75: "❄️", 77: "❄️",
  80: "🌧️", 81: "🌧️", 82: "🌧️",
  85: "❄️", 86: "❄️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

const WMO_DESC_FR = {
  0: "Ciel dégagé",
  1: "Principalement dégagé", 2: "Partiellement nuageux", 3: "Couvert",
  45: "Brouillard", 48: "Brouillard givrant",
  51: "Bruine légère", 53: "Bruine modérée", 55: "Bruine dense",
  56: "Bruine verglaçante légère", 57: "Bruine verglaçante dense",
  61: "Pluie légère", 63: "Pluie modérée", 65: "Pluie forte",
  66: "Pluie verglaçante légère", 67: "Pluie verglaçante forte",
  71: "Neige légère", 73: "Neige modérée", 75: "Neige forte", 77: "Grains de neige",
  80: "Averses légères", 81: "Averses modérées", 82: "Averses violentes",
  85: "Averses de neige légères", 86: "Averses de neige fortes",
  95: "Orage", 96: "Orage avec grêle", 99: "Orage violent avec grêle",
};

function wmoEmoji(code) {
  if (code == null) return "🌡️";
  return WMO_EMOJI[code] ?? WMO_EMOJI[Math.floor(code / 10) * 10] ?? "🌡️";
}

function wmoDesc(code) {
  if (code == null) return "—";
  return WMO_DESC_FR[code] ?? `Code météo ${code}`;
}

// ── Dynamic sky background based on weather code ──
function updateBackground(code) {
  const root = document.documentElement;
  let top, bottom;
  if (code == null) {
    top = "#4a90d9"; bottom = "#1a3c6b";
  } else if (code === 0) {
    top = "#3b87d6"; bottom = "#1352a3";
  } else if (code <= 2) {
    top = "#5a8abf"; bottom = "#2a4a7a";
  } else if (code === 3) {
    top = "#6a7f93"; bottom = "#2e3f50";
  } else if (code >= 45 && code <= 48) {
    top = "#7a8a94"; bottom = "#3a4a54";
  } else if (code >= 61 && code <= 82) {
    top = "#4a5a70"; bottom = "#1a2a3e";
  } else if (code >= 95) {
    top = "#363646"; bottom = "#12121e";
  } else {
    top = "#4a90d9"; bottom = "#1a3c6b";
  }
  root.style.setProperty("--sky-top", top);
  root.style.setProperty("--sky-bottom", bottom);
}

// ── Precipitation mm -> % estimate ──
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

// ── Hourly forecast ──
function formatHourLabel(timeStr) {
  if (!timeStr) return "—";
  const m = timeStr.match(/T(\d{2}):\d{2}/);
  return m ? `${m[1]} h` : timeStr;
}

function buildHourlyRow(hourly) {
  const row = el("hourlyRow");
  if (!hourly || hourly.length === 0) {
    row.innerHTML = '<div class="hourly-item"><div class="hourly-item__time">—</div></div>';
    return;
  }
  row.innerHTML = hourly.slice(0, 12).map((h, i) => {
    const timeLabel = i === 0 ? "Maint." : formatHourLabel(h.time);
    return `<div class="hourly-item">
      <div class="hourly-item__time">${timeLabel}</div>
      <div class="hourly-item__icon">${wmoEmoji(h.weather_code)}</div>
      <div class="hourly-item__temp">${fmtTemp(h.temp_c)}</div>
    </div>`;
  }).join("");
}

// ── Daily forecast ──
const DAYS_FR = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

function formatDayLabel(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return DAYS_FR[d.getDay()];
}

function buildDailyList(daily) {
  const list = el("dailyList");
  if (!daily || daily.length === 0) {
    list.innerHTML = '<div class="daily-row"><span class="daily-row__day">—</span></div>';
    return;
  }

  const slice = daily.slice(0, 7);
  const validMins = slice.map(d => d.temp_min_c).filter(v => v != null);
  const validMaxs = slice.map(d => d.temp_max_c).filter(v => v != null);
  const globalMin = validMins.length ? Math.min(...validMins) : 0;
  const globalMax = validMaxs.length ? Math.max(...validMaxs) : 0;
  const range = globalMax - globalMin || 1;

  list.innerHTML = slice.map((d, i) => {
    const day = i === 0 ? "Auj." : formatDayLabel(d.date);
    const minPct = (((d.temp_min_c ?? globalMin) - globalMin) / range * 100).toFixed(1);
    const maxPct = (100 - (((d.temp_max_c ?? globalMax) - globalMin) / range * 100)).toFixed(1);
    return `<div class="daily-row">
      <span class="daily-row__day">${day}</span>
      <span class="daily-row__icon">${wmoEmoji(d.weather_code)}</span>
      <span class="daily-row__min">${fmtTemp(d.temp_min_c)}</span>
      <div class="daily-row__bar-wrap">
        <div class="daily-row__bar" style="--bar-left:${minPct}%; --bar-right:${maxPct}%"></div>
      </div>
      <span class="daily-row__max">${fmtTemp(d.temp_max_c)}</span>
    </div>`;
  }).join("");
}

// ── Forecast description ──
function buildForecastDesc(p) {
  const code = p.weather_code ?? null;
  const wind = pickWind(p);
  const fl = p.feels_like_c ?? null;
  const t = pickTemp(p);
  const parts = [];

  if (code != null) parts.push(wmoDesc(code));

  if (fl != null && t != null && Math.abs(fl - t) >= 2) {
    let feels = `La température ressentie est de ${fmtTemp(fl)}`;
    if (wind != null && wind > 15) feels += ` en raison du vent à ${Math.round(wind)} km/h`;
    parts.push(feels);
  }

  // Look for clearing in hourly data
  if (p.hourly && code != null && code !== 0) {
    const clear = p.hourly.find((h, i) => i > 0 && (h.weather_code === 0 || h.weather_code === 1));
    if (clear) {
      const m = clear.time?.match(/T(\d{2}):\d{2}/);
      if (m) parts.push(`Éclaircies prévues vers ${m[1]}h00`);
    }
  }

  return parts.join(". ") + (parts.length ? "." : "") || "Météo en temps réel depuis Casablanca.";
}

// ── Main UI update ──
function updateUI(p) {
  // Hero
  el("heroCity").textContent = fmt(p.city || p.name || "Casablanca");

  const t = pickTemp(p);
  el("heroTemp").textContent = fmtTemp(t);

  const code = p.weather_code ?? null;
  el("heroDesc").textContent = wmoDesc(code);

  const fl = p.feels_like_c ?? null;
  el("heroFeelsLike").textContent = fl != null ? `Ressenti : ${fmtTemp(fl)}` : "Ressenti : —";

  const daily0 = p.daily?.[0];
  const tmax = daily0?.temp_max_c ?? p.temp_max_c ?? null;
  const tmin = daily0?.temp_min_c ?? p.temp_min_c ?? null;
  el("heroHighLow").textContent = "\u2191 " + fmtTemp(tmax) + "  \u2193 " + fmtTemp(tmin);

  // Dynamic sky
  updateBackground(code);

  // Forecast description
  el("forecastDesc").textContent = buildForecastDesc(p);

  // Hourly & daily forecasts
  buildHourlyRow(p.hourly || []);
  buildDailyList(p.daily || []);

  // Details
  const h = pickHumidity(p);
  el("humidity").textContent = h != null ? Math.round(h) : "—";

  const w = pickWind(p);
  el("wind").textContent = w != null ? Math.round(w) : "—";

  const mm = pickPrecipMm(p);
  el("precip").textContent = mm != null ? mm : "—";
  const pct = precipMmToPercent(mm);
  el("precipPct").textContent = pct != null ? `${pct}% (est.)` : "—";

  const pres = p.pressure_msl_hpa ?? null;
  el("pressure").textContent = pres != null ? Math.round(pres) : "—";

  // Last update
  const ts = p.ts_utc || p.timestamp || p.time;
  el("lastUpdate").textContent = fmt(ts);
  const d = parseTs(ts);
  el("lastUpdateHuman").textContent = d ? timeAgo(d) : "—";

  // Log-section meta
  el("source").textContent = fmt(p.source || "—");
  el("schema").textContent = fmt(p.schema_version ?? "—");
}

// "time ago" refresh every 10 s
setInterval(() => {
  const ts = el("lastUpdate").textContent;
  const d = parseTs(ts);
  el("lastUpdateHuman").textContent = d ? timeAgo(d) : "—";
}, 10000);

// ── SignalR connection ──
async function start() {
  el("buildInfo").textContent = `build ${new Date().toISOString()}`;

  const negotiateUrl =
    "https://func-casa-weather-ghassouine19-c9gndudeg5a9anb5.francecentral-01.azurewebsites.net/api/negotiate";

  setStatus("connecting", "Connexion\u2026");
  log("Calling negotiate\u2026");

  const r = await fetch(negotiateUrl, { method: "POST" });
  if (!r.ok) throw new Error(`negotiate failed: ${r.status} ${r.statusText}`);
  const { url, accessToken } = await r.json();

  log("Connecting to SignalR\u2026");
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.onreconnecting((err) => {
    setStatus("connecting", "Reconnexion\u2026");
    log("Reconnecting… " + (err?.message || ""));
  });

  connection.onreconnected(() => {
    setStatus("connected", "Connecté");
    log("Reconnected.");
  });

  connection.onclose((err) => {
    setStatus("disconnected", "Déconnecté");
    log("Connection closed. " + (err?.message || ""));
  });

  connection.on("weatherUpdate", (payload) => {
    log("weatherUpdate received");
    updateUI(payload);
  });

  async function triggerPublishNow() {
    const publishNowUrl =
      "https://func-casa-weather-ghassouine19-c9gndudeg5a9anb5.francecentral-01.azurewebsites.net/api/publish_now";
    try {
      log("Triggering publish_now\u2026");
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
  setStatus("connected", "Connecté");
  log("Connected. Waiting for weatherUpdate\u2026");

  await triggerPublishNow();

  el("clear").addEventListener("click", () => (logEl.textContent = ""));

  const toggleBtn = el("toggleLogs");
  let visible = false; // logs hidden by default
  toggleBtn.addEventListener("click", () => {
    visible = !visible;
    logEl.style.display = visible ? "block" : "none";
    toggleBtn.textContent = visible ? "Masquer" : "Afficher";
  });
}

start().catch((e) => {
  setStatus("disconnected", "Erreur");
  log("ERROR: " + (e?.message ?? String(e)));
});
