import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const KEY = process.env.VITE_LTA_DATAMALL_KEY;

if (!KEY) {
    console.error("ERROR: VITE_LTA_DATAMALL_KEY is not defined in .env file");
    process.exit(1);
}

import fs from 'fs';
import path from 'path';

// In-memory cache for bus stops metadata
let busStopsCache = [];
let lastFetchedStops = 0;

// In-memory cache for bus routes
let busRoutesCache = [];
let lastFetchedRoutes = 0;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parses the provided bus_stops.xml file for extra mappings.
 */
function parseBusStopsXML() {
    const xmlPath = path.join(process.cwd(), 'bus_stops.xml');
    if (!fs.existsSync(xmlPath)) {
        console.warn("⚠️ bus_stops.xml not found, skipping XML integration.");
        return {};
    }

    try {
        console.log("Parsing bus_stops.xml...");
        const content = fs.readFileSync(xmlPath, 'utf-8');
        // Capture CODE, WAB, NAME, LAT, LONG
        const stopRegex = /<busstop name="([^"]*)" wab="([^"]*)"[^>]*>\s*<details>([^<]*)<\/details>\s*<coordinates>\s*<lat>([^<]*)<\/lat>\s*<long>([^<]*)<\/long>/g;
        const xmlMappings = {};

        let match;
        while ((match = stopRegex.exec(content)) !== null) {
            xmlMappings[match[1]] = {
                description: match[3].trim(),
                wab: match[2] === 'true',
                lat: parseFloat(match[4]),
                lng: parseFloat(match[5])
            };
        }

        console.log(`✅ Parsed ${Object.keys(xmlMappings).length} mappings with coordinates from XML`);
        return xmlMappings;
    } catch (error) {
        console.error("Error parsing bus_stops.xml:", error);
        return {};
    }
}

async function fetchAllBusStops() {
    console.log("Fetching bus stops metadata from LTA...");
    const xmlMappings = parseBusStopsXML();
    let allStops = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetch(
                `https://datamall2.mytransport.sg/ltaodataservice/BusStops?$skip=${skip}`,
                {
                    headers: { 'AccountKey': KEY, 'Accept': 'application/json' }
                }
            );
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                // Enrich LTA data with XML descriptions, WAB status, and coordinates if available
                const enrichedBatch = data.value.map(stop => {
                    const xml = xmlMappings[stop.BusStopCode];
                    return {
                        ...stop,
                        Description: xml ? xml.description : stop.Description,
                        IsWheelchairAccessible: xml ? xml.wab : false,
                        Latitude: stop.Latitude || (xml ? xml.lat : 0),
                        Longitude: stop.Longitude || (xml ? xml.lng : 0)
                    };
                });
                allStops = [...allStops, ...enrichedBatch];
                skip += 500;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error("Error fetching bus stops batch:", error);
            hasMore = false;
        }
    }

    // Add any stops from XML that WEREN'T in LTA (e.g. private/premium stops)
    const ltaCodes = new Set(allStops.map(s => s.BusStopCode));
    Object.entries(xmlMappings).forEach(([code, mapping]) => {
        if (!ltaCodes.has(code)) {
            allStops.push({
                BusStopCode: code,
                RoadName: 'External Mapping',
                Description: mapping.description,
                IsWheelchairAccessible: mapping.wab,
                Latitude: mapping.lat,
                Longitude: mapping.lng
            });
        }
    });

    busStopsCache = allStops;
    lastFetchedStops = Date.now();
    console.log(`✅ Loaded ${allStops.length} bus stops into cache (LTA + XML)`);
}

async function fetchAllBusRoutes() {
    console.log("Fetching bus routes data...");
    let allRoutes = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetch(
                `https://datamall2.mytransport.sg/ltaodataservice/BusRoutes?$skip=${skip}`,
                {
                    headers: { 'AccountKey': KEY, 'Accept': 'application/json' }
                }
            );
            const data = await response.json();
            if (data.value && data.value.length > 0) {
                allRoutes = [...allRoutes, ...data.value];
                skip += 500;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error("Error fetching bus routes batch:", error);
            hasMore = false;
        }
    }

    busRoutesCache = allRoutes;
    lastFetchedRoutes = Date.now();
    console.log(`✅ Loaded ${allRoutes.length} bus route segments into cache`);
}

// Endpoint for all Bus Stops (metadata)
app.get('/api/busStops', async (req, res) => {
    if (busStopsCache.length === 0 || (Date.now() - lastFetchedStops > CACHE_DURATION)) {
        await fetchAllBusStops();
    }
    res.json(busStopsCache);
});

// Endpoint for Bus Arrivals
app.get('/api/busArrival', async (req, res) => {
    const { BusStopCode } = req.query;
    if (!BusStopCode) {
        return res.status(400).json({ error: "BusStopCode is required" });
    }

    try {
        const response = await fetch(
            `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${BusStopCode}`,
            {
                headers: {
                    'AccountKey': KEY,
                    'Accept': 'application/json'
                }
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching arrivals:", error);
        res.status(500).json({ error: "Failed to fetch from DataMall" });
    }
});

// Endpoint for Bus Routes (filtered by ServiceNo)
app.get('/api/busRoutes', async (req, res) => {
    const { ServiceNo } = req.query;

    if (busRoutesCache.length === 0 || (Date.now() - lastFetchedRoutes > CACHE_DURATION)) {
        await fetchAllBusRoutes();
    }

    if (ServiceNo) {
        const filtered = busRoutesCache.filter(r => r.ServiceNo.toUpperCase() === ServiceNo.toUpperCase());
        return res.json({ value: filtered });
    }

    res.json({ value: busRoutesCache });
});

// ─── Journey Planner endpoints ───────────────────────────────────────────────

let IN_MEMORY_ONEMAP_TOKEN = process.env.ONEMAP_TOKEN || null;

/**
 * Helper to fetch a fresh token from OneMap if credentials are provided in .env
 */
async function fetchNewOneMapToken() {
    const email = process.env.ONEMAP_API_EMAIL;
    const password = process.env.ONEMAP_API_PASSWORD;

    if (!email || !password) {
        throw new Error("Missing ONEMAP_API_EMAIL or ONEMAP_API_PASSWORD in .env");
    }

    console.log("[OneMap Auth] Fetching new access token...");
    try {
        const response = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.access_token) {
            console.log("[OneMap Auth] Token fetched successfully.");
            IN_MEMORY_ONEMAP_TOKEN = data.access_token;
            return data.access_token;
        } else {
            throw new Error(data.error || "Invalid credentials or OneMap API error");
        }
    } catch (err) {
        console.error("[OneMap Auth] Failed to refresh token:", err.message);
        throw err;
    }
}

/**
 * GET /api/geocode?query=Tampines+MRT
 * Uses OneMap free search (no token needed) to resolve an address to lat/lng.
 */
app.get('/api/geocode', async (req, res) => {
    const { query } = req.query;
    console.log(`[Proxy] Geocoding query: "${query}"`);
    if (!query) return res.status(400).json({ error: 'query is required' });

    try {
        const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Geocode error:', err);
        res.status(500).json({ error: 'Geocoding failed' });
    }
});

/**
 * GET /api/journey?originLat=1.35&originLng=103.9&destLat=1.28&destLng=103.8&date=03-06-2026&time=08:00:00
 * Calls OneMap PT routing API and returns the full plans array.
 */
app.get('/api/journey', async (req, res) => {
    // If no token exists at all in memory, try fetching one before failing.
    if (!IN_MEMORY_ONEMAP_TOKEN) {
        try {
            await fetchNewOneMapToken();
        } catch (authErr) {
            return res.status(503).json({
                error: 'ONEMAP_TOKEN or API credentials not configured properly.',
                setup: 'Add ONEMAP_API_EMAIL and ONEMAP_API_PASSWORD to your .env file.',
                details: authErr.message
            });
        }
    }

    const { originLat, originLng, destLat, destLng, date, time } = req.query;
    if (!originLat || !originLng || !destLat || !destLng) {
        return res.status(400).json({ error: 'originLat, originLng, destLat, destLng are required' });
    }

    // Format: MM-DD-YYYY and HH:MM:SS (in SGT, UTC+8)
    const now = new Date();
    const sgDate = date || `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
    const sgTime = time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    const makeRouteRequest = async (token) => {
        const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${originLat}%2C${originLng}&end=${destLat}%2C${destLng}&routeType=pt&date=${sgDate}&time=${sgTime}&mode=TRANSIT&maxWalkDistance=800&numItineraries=3`;
        return fetch(url, {
            headers: { 'Authorization': token }
        });
    };

    try {
        let response = await makeRouteRequest(IN_MEMORY_ONEMAP_TOKEN);

        // If Unauthorized (Token likely expired), automatically retry with a fresh token
        if (response.status === 401) {
            console.log("[OneMap] 401 Unauthorized. Attempting token refresh...");
            try {
                const refreshedToken = await fetchNewOneMapToken();
                response = await makeRouteRequest(refreshedToken);
            } catch (refreshErr) {
                console.error("[OneMap] Token refresh failed during journey request.", refreshErr.message);
                return res.status(401).json({ error: "OneMap Token expired and could not be refreshed." });
            }
        }

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.json(data);
    } catch (err) {
        console.error('Journey planning error:', err);
        res.status(500).json({ error: 'Journey planning failed' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend proxy running at http://localhost:${PORT}`);
    console.log(`   - Bus Arrival: http://localhost:${PORT}/api/busArrival?BusStopCode=83139`);
    console.log(`   - Bus Routes:  http://localhost:${PORT}/api/busRoutes?ServiceNo=10`);
    console.log(`   - Geocode:     http://localhost:${PORT}/api/geocode?query=Tampines+MRT`);
    console.log(`   - Journey:     http://localhost:${PORT}/api/journey?originLat=...&destLat=...`);

    // Eagerly fetch metadata on startup
    fetchAllBusStops();
    fetchAllBusRoutes();
});
