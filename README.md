# SG Bus Arrival App 🚌

A modern, high-fidelity React application for real-time Singapore bus arrival timings, routes, and stop mapping — powered by the **LTA DataMall API** and **OpenStreetMap**.

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Smart Bus Stop Search** | Search by 5-digit code or stop name (e.g. "VivoCity", "Orchard") with live suggestions |
| 🕐 **Real-time Arrivals** | See the next 3 buses per service: arrival time, occupancy, bus type, and wheelchair access |
| 🗺️ **Interactive Map** | Leaflet map auto-centers on the searched stop with a marker |
| ♿ **Accessibility Indicators** | Stop-level and bus-level wheelchair accessibility flags |
| 🛣️ **Full Bus Route View** | See every stop on a route, with direction switching, timings, and cumulative distance |
| 🌙 **Dark UI** | Glassmorphism dark mode with smooth animations |

---

## Architecture

The app runs as **two processes**:

```
┌─────────────────────────────────────────────────┐
│  React Frontend (Vite)       localhost:5173      │
│  - Search UI                                     │
│  - BusStopResults + Map                          │
│  - BusRouteResults                               │
└───────────────────┬─────────────────────────────┘
                    │ HTTP (fetch)
┌───────────────────▼─────────────────────────────┐
│  Node.js Backend Proxy       localhost:3000      │
│  - Parses bus_stops.xml on startup               │
│  - Caches 5,000+ stops from LTA DataMall         │
│  - Merges XML metadata (names, coords, WAB)      │
│  - Proxies live bus arrival requests             │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS (AccountKey)
             LTA DataMall API
```

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_LTA_DATAMALL_KEY=your_lta_api_key_here
```

> You can get a free key from [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html).

### 3. Start the Backend Proxy

```bash
node server.js
```

Runs on **http://localhost:3000**. Parses `bus_stops.xml` and caches all bus stop metadata on startup (~5 seconds).

### 4. Start the Frontend

In a separate terminal:

```bash
npm run dev
```

Runs on **http://localhost:5173**.

---

## Project Structure

```
BusArrival_Antigravity/
├── server.js               # Node.js backend proxy (CORS + caching + XML parsing)
├── bus_stops.xml           # Static bus stop metadata (name, coords, WAB)
├── .env                    # LTA API key (gitignored)
├── .gitignore
├── src/
│   ├── App.jsx             # Root component and state management
│   ├── index.css           # Global styles and design tokens
│   ├── components/
│   │   ├── SearchBar.jsx       # Search input with live suggestions
│   │   ├── TabSwitcher.jsx     # Arrivals / Routes tab toggle
│   │   ├── BusStopResults.jsx  # Arrival cards + map
│   │   ├── BusStopMap.jsx      # Leaflet map component
│   │   └── BusRouteResults.jsx # Full route timeline
│   └── services/
│       └── api.js          # fetch wrappers for the backend proxy
└── src/test/               # Vitest unit tests
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + Vite |
| Map | Leaflet + React-Leaflet (OpenStreetMap) |
| Icons | Lucide-React |
| Styling | Vanilla CSS with CSS custom properties |
| Backend | Node.js + Express |
| API | LTA DataMall v3 |
| Testing | Vitest + React Testing Library |

---

## API Endpoints (Backend Proxy)

| Endpoint | Description |
|---|---|
| `GET /api/busArrival?BusStopCode=83139` | Real-time arrivals for a stop |
| `GET /api/busRoutes?ServiceNo=10` | Full route data for a service number |
| `GET /api/busStops` | All bus stops (LTA + XML merged, with coords) |
