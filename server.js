import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const PORT = 3000;
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

app.listen(PORT, () => {
    console.log(`✅ Backend proxy running at http://localhost:${PORT}`);
    console.log(`   - Bus Arrival: http://localhost:${PORT}/api/busArrival?BusStopCode=83139`);
    console.log(`   - Bus Routes: http://localhost:${PORT}/api/busRoutes?ServiceNo=10`);

    // Eagerly fetch metadata on startup
    fetchAllBusStops();
    fetchAllBusRoutes();
});
