# 🌦️ Casablanca Weather Streaming

**Real-time weather dashboard for Casablanca powered by an Azure streaming data pipeline.**

This project demonstrates how to build an **end-to-end real-time data streaming architecture** using Azure services. Weather data is collected from a public API, streamed through an event platform, processed serverlessly, stored in cloud storage, and broadcast live to a web dashboard.

---

# 📐 Architecture

```
Open-Meteo API (free, no API key)
        │
        ▼
┌──────────────────────────────┐
│ Producer (Python)            │
│ send_weather.py / timer      │
└──────────┬───────────────────┘
           │  JSON Event
           ▼
┌──────────────────────────────┐
│ Azure Event Hubs             │
│ (hub: weather)               │
└──────────┬───────────────────┘
           │  Trigger
           ▼
┌──────────────────────────────┐
│ Azure Functions (Python)     │
│ eh_to_blob                   │
│ ├── Blob Storage (bronze/)   │
│ └── SignalR Broadcast        │
└──────────┬───────────────────┘
           │  WebSocket
           ▼
┌──────────────────────────────┐
│ Web Dashboard (HTML/CSS/JS)  │
│ Live weather visualization   │
└──────────────────────────────┘
```

---

# 📦 Project Structure

```
casablanca-weather-streaming/

├── producer/                # Python scripts that publish weather events
│   ├── send_weather.py      # Async producer (recommended)
│   ├── send_loop.py         # Periodic sending loop
│   ├── send_once.py         # Single test event
│   ├── requirements.txt
│   └── .env.example
│
├── processor/               # Azure Functions backend
│   ├── function_app.py
│   ├── host.json
│   ├── requirements.txt
│   │
│   ├── timer_to_eh/         # Timer → Event Hub (every 5 minutes)
│   ├── eh_to_blob/          # Event Hub → Blob Storage + SignalR
│   ├── publish_now/         # HTTP trigger for manual publish
│   └── negotiate/           # SignalR negotiation endpoint
│
└── web/                     # Static frontend dashboard
    ├── index.html
    ├── styles.css
    └── app.js
```

---

# 🔄 Data Pipeline

## 1️⃣ Producer (`producer/`)

The producer fetches weather data from the **Open-Meteo API** and publishes a JSON event to **Azure Event Hubs**.

Example payload:

```json
{
  "city": "Casablanca",
  "country": "MA",
  "ts_utc": "2024-01-15T14:30:00+00:00",
  "temp_c": 18.5,
  "feels_like_c": 17.2,
  "weather_code": 1,
  "humidity": 65,
  "wind_kph": 12.3,
  "precip_mm": 0.0,
  "pressure_msl_hpa": 1015.2,
  "temp_max_c": 21.0,
  "temp_min_c": 14.5,
  "hourly": [...],
  "daily": [...],
  "source": "open-meteo",
  "schema_version": 2
}
```

---

## 2️⃣ Processor (`processor/`)

The backend is implemented using **Azure Functions**.

| Function | Trigger | Description |
|--------|--------|-------------|
| `timer_to_eh` | Timer (5 min) | Retrieves weather data and sends it to Event Hub |
| `eh_to_blob` | Event Hub | Stores JSON events in Blob Storage and broadcasts via SignalR |
| `publish_now` | HTTP POST | Triggers an immediate weather update |
| `negotiate` | HTTP POST | SignalR negotiation endpoint |

### Blob Storage Structure

Events are stored using a **partitioned data lake structure**:

```
bronze/weather/
  city=casablanca/
  year=YYYY/
  month=MM/
  day=DD/
  <timestamp>.json
```

---

## 3️⃣ Web Dashboard (`web/`)

The frontend is a **static dashboard** connected in real-time using **Azure SignalR Service**.

Features:

- 🌡️ Current temperature and feels-like
- 📊 Hourly forecast (next 12 hours)
- 📅 7-day forecast
- 💧 Humidity
- 💨 Wind speed
- 🌧️ Precipitation
- 🔵 Atmospheric pressure
- 🎨 Dynamic background based on WMO weather codes
- ⚡ Live activity log

---

# 🚀 Quick Start

## Prerequisites

- Python **3.9+**
- Azure subscription with:

- Azure Event Hubs  
- Azure Storage Account  
- Azure SignalR Service  
- Azure Functions (Python v2)

---

# 1️⃣ Configure the Producer

```
cd producer
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```
EVENTHUB_CONNECTION_STRING=your_connection_string
EVENTHUB_NAME=weather
```

Send a single event:

```
python send_weather.py
```

Send events continuously:

```
INTERVAL_SECONDS=60 python send_loop.py
```

---

# 2️⃣ Deploy Azure Functions

```
cd processor
pip install -r requirements.txt
```

Required environment variables:

| Variable | Description |
|--------|-------------|
| AzureWebJobsStorage | Azure storage connection |
| EVENTHUB_CONNECTION_STRING | Event Hub connection |
| EVENTHUB_NAME | Hub name |
| STORAGE_CONNECTION | Blob storage connection |
| BLOB_CONTAINER | Blob container |
| AzureSignalRConnectionString | SignalR service connection |

Deploy:

```
func azure functionapp publish <function-app-name>
```

---

# 3️⃣ Deploy the Web Dashboard

The `web/` folder is a **pure static website**.

You can host it on:

- Azure Static Web Apps
- Azure Storage Static Website
- GitHub Pages
- Netlify

Update the endpoint in `web/app.js`:

```javascript
const negotiateUrl = "https://<your-function-app>.azurewebsites.net/api/negotiate";
```

---

# 🛠️ Technologies

| Layer | Technology |
|------|-----------|
| Weather Data | Open-Meteo API |
| Streaming | Azure Event Hubs |
| Processing | Azure Functions (Python) |
| Storage | Azure Blob Storage |
| Real-Time Updates | Azure SignalR Service |
| Frontend | HTML / CSS / JavaScript |
| Messaging Client | microsoft-signalr |

---

# 🌍 Weather Codes (WMO)

The project uses **WMO weather codes** from Open-Meteo.

| Code | Description |
|----|----|
| 0 | Clear sky ☀️ |
| 1-3 | Partly cloudy ⛅ |
| 45-48 | Fog 🌫️ |
| 51-67 | Rain / drizzle 🌧️ |
| 71-77 | Snow ❄️ |
| 80-82 | Showers 🌧️ |
| 95-99 | Thunderstorm ⛈️ |

---

# 📄 License

This project is provided **for educational and demonstration purposes**.

---

# 👨‍💻 Author

**Abderrahmane Ghassouine**

Data Engineering / Data Science Student

GitHub  
https://github.com/ghassouine19
