# 🌦️ Casablanca Weather Streaming

**Real-time weather dashboard for Casablanca powered by an Azure streaming data pipeline.**

This project demonstrates how to build an **end-to-end real-time data streaming architecture** using modern cloud technologies. Weather data is collected from a public API, streamed through an event platform, processed serverlessly, stored in cloud storage, and broadcast live to a web dashboard.

---

# 🌐 Live Demo

You can view the live dashboard here:

👉 https://stcasaweather.z28.web.core.windows.net/

The dashboard updates in **real time** using Azure SignalR and displays weather information for **Casablanca**.

---

# 📐 Architecture

```
Open-Meteo API (free, no API key)
        │
        ▼
┌──────────────────────────────┐
│ Producer (Python)            │
│ send_weather.py              │
└──────────┬───────────────────┘
           │ JSON Event
           ▼
┌──────────────────────────────┐
│ Azure Event Hubs             │
│ (event streaming platform)   │
└──────────┬───────────────────┘
           │ Trigger
           ▼
┌──────────────────────────────┐
│ Azure Functions (Python)     │
│ Event processing             │
│ ├── Store in Blob Storage    │
│ └── Broadcast via SignalR    │
└──────────┬───────────────────┘
           │ WebSocket
           ▼
┌──────────────────────────────┐
│ Web Dashboard                │
│ HTML / CSS / JavaScript      │
│ Real-time weather display    │
└──────────────────────────────┘
```

---

# 📦 Project Structure

```
casablanca-weather-streaming/

├── producer/
│   ├── send_weather.py
│   ├── send_loop.py
│   ├── send_once.py
│   ├── requirements.txt
│   └── .env.example
│
├── processor/
│   ├── function_app.py
│   ├── host.json
│   ├── requirements.txt
│   │
│   ├── timer_to_eh/
│   ├── eh_to_blob/
│   ├── publish_now/
│   └── negotiate/
│
└── web/
    ├── index.html
    ├── styles.css
    └── app.js
```

---

# 🔄 Data Pipeline

## 1️⃣ Producer (Python)

The producer retrieves weather data from the **Open-Meteo API** and publishes events to **Azure Event Hubs**.

The published message contains structured weather data such as:

```json
{
  "city": "Casablanca",
  "temp_c": 18.5,
  "humidity": 65,
  "wind_kph": 12.3,
  "pressure_msl_hpa": 1015.2,
  "weather_code": 1,
  "source": "open-meteo"
}
```

---

## 2️⃣ Processor (Azure Functions)

The backend uses **serverless Azure Functions** to process incoming events.

| Function | Trigger | Description |
|--------|--------|-------------|
| timer_to_eh | Timer | Sends weather updates every 5 minutes |
| eh_to_blob | Event Hub | Stores events in Blob Storage and broadcasts updates |
| publish_now | HTTP | Manually trigger a weather update |
| negotiate | HTTP | SignalR negotiation endpoint |

---

## 3️⃣ Data Storage

Weather events are stored in **Azure Blob Storage** using a partitioned structure:

```
bronze/weather/
  city=casablanca/
  year=YYYY/
  month=MM/
  day=DD/
  timestamp.json
```

This structure makes the data easy to use later for **data analytics or data lake pipelines**.

---

## 4️⃣ Web Dashboard

The frontend is a **static web dashboard** built using:

- HTML
- CSS
- JavaScript

It connects to the backend using **Azure SignalR Service** to receive live weather updates.

### Dashboard features

- 🌡️ Current temperature
- 📊 Hourly forecast
- 📅 7-day forecast
- 💧 Humidity
- 💨 Wind speed
- 🌧️ Precipitation
- 🔵 Atmospheric pressure
- 🎨 Dynamic weather background
- ⚡ Live activity log

---

# 🚀 Quick Start

## Prerequisites

You need:

- Python **3.9+**
- Azure subscription
- Azure Event Hubs
- Azure Storage Account
- Azure SignalR Service
- Azure Functions

---

# 1️⃣ Configure the Producer

Install dependencies:

```
cd producer
pip install -r requirements.txt
```

Create environment file:

```
cp .env.example .env
```

Edit `.env`:

```
EVENTHUB_CONNECTION_STRING=your_connection_string
EVENTHUB_NAME=weather
```

Send one event:

```
python send_weather.py
```

Send events continuously:

```
python send_loop.py
```

---

# 2️⃣ Deploy Azure Functions

Install dependencies:

```
cd processor
pip install -r requirements.txt
```

Required environment variables:

| Variable | Description |
|--------|-------------|
| AzureWebJobsStorage | Azure storage connection |
| EVENTHUB_CONNECTION_STRING | Event Hub connection |
| STORAGE_CONNECTION | Blob storage connection |
| AzureSignalRConnectionString | SignalR service connection |

Deploy using Azure Functions Core Tools:

```
func azure functionapp publish <function-app-name>
```

---

# 3️⃣ Deploy the Web Dashboard

The `web` folder is a **static website**.

It can be hosted using:

- Azure Static Web Apps
- Azure Storage Static Website
- GitHub Pages
- Netlify

Update the SignalR endpoint in:

```
web/app.js
```

Example:

```javascript
const negotiateUrl = "https://<your-function-app>.azurewebsites.net/api/negotiate";
```

---

# 🛠️ Technologies

| Component | Technology |
|-----------|------------|
| Weather Data | Open-Meteo API |
| Streaming | Azure Event Hubs |
| Processing | Azure Functions |
| Storage | Azure Blob Storage |
| Real-Time Messaging | Azure SignalR |
| Frontend | HTML / CSS / JavaScript |

---

# 🌍 Weather Codes (WMO)

The project uses **WMO weather codes** from the Open-Meteo API.

| Code | Description |
|----|----|
| 0 | Clear sky |
| 1-3 | Partly cloudy |
| 45-48 | Fog |
| 51-67 | Rain |
| 71-77 | Snow |
| 80-82 | Showers |
| 95-99 | Thunderstorm |

---

# 📄 License

This project is provided **for educational and demonstration purposes**.

---

# 👨‍💻 Author

**Abderrahmane Ghassouine**

Big data and Cloud Computing Master's Student

GitHub  
https://github.com/ghassouine19
