# SG Bus Arrival App

A modern, high-fidelity React application to search for real-time bus arrival timings and bus routes in Singapore using the LTA DataMall API.

## Features
- **Search by Bus Stop:** Enter a 5-digit bus stop code to see all incoming buses, their estimated arrival times, and passenger load levels.
- **Search by Bus Number:** Enter a bus service number (e.g., "15", "190") to view the full sequence of stops and distance for that route.
- **Modern UI:** Glassmorphism design with dark mode support, smooth animations, and responsive layout.
- **Reliable Networking:** Built-in proxy to handle CORS and axios for robust API interactions.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   - Create a `.env` file in the root directory.
   - Add your LTA DataMall API key:
     ```env
     VITE_LTA_DATAMALL_KEY=your_actual_key_here
     ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

4. **Run Tests:**
   ```bash
   npm test
   ```

## Technical Details
- **Framework:** React 18 + Vite
- **HTTP Client:** Axios
- **State Management:** React Hooks (useState)
- **Styling:** Vanilla CSS (Custom tokens + Glassmorphism)
- **Icons:** Lucide-React
- **Testing:** Vitest + React Testing Library

## API Endpoints Used
- `BusArrival` (v3): Real-time arrival information via `/v3/BusArrival`.
- `BusRoutes`: Static route information filtered by service number.
