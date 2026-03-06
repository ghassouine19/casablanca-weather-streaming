# 🌤️ Casablanca Weather Streaming

Tableau de bord météo en temps réel pour Casablanca, alimenté par un pipeline de streaming sur Azure.

---

## 📐 Architecture

```
Open-Meteo API (gratuit, sans clé)
        │
        ▼
┌──────────────────────────────┐
│  Producer (Python)           │
│  send_weather.py / timer     │
└──────────┬───────────────────┘
           │  Event JSON
           ▼
┌──────────────────────────────┐
│  Azure Event Hubs            │
│  (hub: weather)              │
└──────────┬───────────────────┘
           │  Trigger
           ▼
┌──────────────────────────────┐
│  Azure Functions (Python)    │
│  eh_to_blob/__init__.py      │
│  ├── Blob Storage (bronze/)  │
│  └── SignalR broadcast       │
└──────────┬───────────────────┘
           │  WebSocket
           ▼
┌──────────────────────────────┐
│  Web (HTML / CSS / JS)       │
│  Dashboard météo live        │
└──────────────────────────────┘
```

---

## 📦 Structure du projet

```
casablanca-weather-streaming/
├── producer/                    # Scripts Python pour envoyer des données météo
│   ├── send_weather.py          # Producteur async (recommandé)
│   ├── send_loop.py             # Envoi en boucle à intervalle régulier
│   ├── send_once.py             # Envoi unique (test rapide)
│   ├── requirements.txt
│   └── .env.example
│
├── processor/                   # Azure Functions App
│   ├── function_app.py
│   ├── host.json
│   ├── requirements.txt
│   ├── timer_to_eh/             # Timer → Event Hub (toutes les 5 min)
│   ├── eh_to_blob/              # Event Hub → Blob Storage + SignalR
│   ├── publish_now/             # HTTP trigger (déclenchement manuel)
│   └── negotiate/               # Endpoint de négociation SignalR
│
└── web/                         # Interface web statique
    ├── index.html
    ├── styles.css
    └── app.js
```

---

## 🔄 Pipeline de données

### 1. Producteur (`producer/`)

Récupère les données météo de l'API **[Open-Meteo](https://open-meteo.com/)** (gratuit, aucune clé API requise) et publie un événement JSON vers **Azure Event Hubs**.

Le payload publié contient :

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

### 2. Processor (`processor/`)

Quatre Azure Functions constituent le backend :

| Fonction       | Trigger        | Rôle                                                         |
|----------------|----------------|--------------------------------------------------------------|
| `timer_to_eh`  | Timer (5 min)  | Récupère la météo et l'envoie vers Event Hub                 |
| `eh_to_blob`   | Event Hub      | Persiste le JSON dans Blob Storage et diffuse via SignalR    |
| `publish_now`  | HTTP POST      | Déclenchement manuel d'un envoi immédiat                     |
| `negotiate`    | HTTP POST      | Endpoint de négociation pour la connexion SignalR client     |

**Stockage Blob** : les fichiers sont stockés avec le chemin partitionné :
```
bronze/weather/city=casablanca/year=YYYY/month=MM/day=DD/<timestamp>.json
```

### 3. Interface web (`web/`)

Dashboard statique connecté en temps réel via **Azure SignalR Service** :

- 🌡️ Température actuelle, ressentie, min/max du jour
- 📊 Prévisions horaires (12 prochaines heures)
- 📅 Prévisions sur 7 jours avec graphe de plage thermique
- 💧 Humidité, 💨 Vent, 🌧️ Précipitations, 🔵 Pression
- 🎨 Arrière-plan dynamique selon le code météo WMO
- ⚡ Journal d'activité en direct

---

## 🚀 Démarrage rapide

### Prérequis

- Python 3.9+
- Un abonnement Azure avec :
  - Azure Event Hubs (namespace + hub nommé `weather`)
  - Azure Storage Account
  - Azure SignalR Service
  - Azure Functions (Python v2, plan Consumption)

---

### 1. Configurer le producteur

```bash
cd producer
pip install -r requirements.txt
cp .env.example .env
# Éditer .env avec votre chaîne de connexion Event Hubs
```

Contenu de `.env` :
```env
EVENTHUB_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...
EVENTHUB_NAME=weather
```

Envoyer un événement unique :
```bash
python send_weather.py
```

Envoyer en boucle toutes les 60 secondes :
```bash
INTERVAL_SECONDS=60 EVENTHUB_SEND_CONNECTION=<conn_str> python send_loop.py
```

---

### 2. Déployer les Azure Functions

```bash
cd processor
pip install -r requirements.txt

# Configurer les variables d'application (local.settings.json ou Azure Portal)
```

Variables d'environnement requises pour les Functions :

| Variable                    | Description                                        |
|-----------------------------|----------------------------------------------------|
| `AzureWebJobsStorage`       | Connexion au compte de stockage Azure              |
| `EVENTHUB_CONNECTION_STRING`| Chaîne de connexion Event Hubs (écoute)            |
| `EVENTHUB_NAME`             | Nom du hub (défaut : `weather`)                    |
| `STORAGE_CONNECTION`        | Connexion au compte de stockage pour les blobs     |
| `BLOB_CONTAINER`            | Nom du conteneur blob (défaut : `weather`)         |
| `AzureSignalRConnectionString` | Chaîne de connexion Azure SignalR Service       |
| `CITY`                      | Nom de la ville (défaut : `Casablanca`)            |
| `CITY_LAT`                  | Latitude (défaut : `33.5731`)                      |
| `CITY_LON`                  | Longitude (défaut : `-7.5898`)                     |

Déployer avec Azure Functions Core Tools :
```bash
func azure functionapp publish <nom-de-votre-function-app>
```

---

### 3. Déployer le site web

Le dossier `web/` est un site statique pur (HTML + CSS + JS). Il peut être hébergé sur :

- **Azure Static Web Apps**
- **Azure Storage** (site web statique)
- Tout autre hébergeur web (GitHub Pages, Netlify, etc.)

Avant de déployer, mettre à jour l'URL du endpoint dans `web/app.js` :

```javascript
const negotiateUrl = "https://<votre-function-app>.azurewebsites.net/api/negotiate";
```

---

## 🔧 Variables d'environnement

### Producer (`.env`)

| Variable                      | Requis | Description                           | Défaut     |
|-------------------------------|--------|---------------------------------------|------------|
| `EVENTHUB_CONNECTION_STRING`  | ✅     | Chaîne de connexion avec droits Send  | —          |
| `EVENTHUB_NAME`               | ❌     | Nom du hub                            | `weather`  |
| `INTERVAL_SECONDS`            | ❌     | Intervalle pour `send_loop.py`        | `60`       |

### Processor (Azure Functions)

| Variable                         | Requis | Description                              | Défaut        |
|----------------------------------|--------|------------------------------------------|---------------|
| `EVENTHUB_CONNECTION_STRING`     | ✅     | Connexion Event Hubs (Listen)            | —             |
| `STORAGE_CONNECTION`             | ✅     | Connexion Azure Blob Storage             | —             |
| `AzureSignalRConnectionString`   | ✅     | Connexion Azure SignalR Service          | —             |
| `EVENTHUB_NAME`                  | ❌     | Nom du hub                               | `weather`     |
| `BLOB_CONTAINER`                 | ❌     | Conteneur de stockage                    | `weather`     |
| `CITY`                           | ❌     | Nom de la ville                          | `Casablanca`  |
| `CITY_LAT`                       | ❌     | Latitude                                 | `33.5731`     |
| `CITY_LON`                       | ❌     | Longitude                                | `-7.5898`     |

---

## 🛠️ Technologies utilisées

| Composant         | Technologie                                      |
|-------------------|--------------------------------------------------|
| Données météo     | [Open-Meteo API](https://open-meteo.com/) (WMO) |
| Messagerie        | Azure Event Hubs                                 |
| Backend           | Azure Functions (Python 3.9+, v2)                |
| Stockage          | Azure Blob Storage                               |
| Temps réel        | Azure SignalR Service                            |
| Frontend          | HTML5 / CSS3 / JavaScript (Vanilla)              |
| Client SignalR    | microsoft-signalr 7.x                            |

---

## 📋 Codes météo WMO

Le projet utilise les codes météo WMO (World Meteorological Organization) retournés par Open-Meteo :

| Code   | Description              |
|--------|--------------------------|
| 0      | Ciel dégagé ☀️            |
| 1–3    | Partiellement nuageux ⛅  |
| 45–48  | Brouillard 🌫️             |
| 51–67  | Bruine / Pluie 🌧️         |
| 71–77  | Neige ❄️                  |
| 80–82  | Averses 🌧️                |
| 95–99  | Orage ⛈️                  |

---

## 📄 Licence

Ce projet est fourni à des fins éducatives et de démonstration.
