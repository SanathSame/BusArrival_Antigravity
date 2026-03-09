/**
 * React API services that call our local Node.js backend proxy
 * to bypass CORS restrictions.
 */

const BACKEND_URL = 'http://localhost:3000/api';

/**
 * Fetch bus arrival times for a specific bus stop via local backend.
 */
export const fetchBusArrivals = async (busStopCode) => {
    try {
        const response = await fetch(`${BACKEND_URL}/busArrival?BusStopCode=${busStopCode}`);

        if (!response.ok) {
            throw new Error(`Backend error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching bus arrivals:', error);
        throw error;
    }
};

/**
 * Fetch bus route information for a specific bus service via local backend.
 */
export const fetchBusRoutes = async (serviceNo) => {
    try {
        const response = await fetch(`${BACKEND_URL}/busRoutes?ServiceNo=${serviceNo}`);

        if (!response.ok) {
            throw new Error(`Backend error! status: ${response.status}`);
        }

        const result = await response.json();
        return result.value || [];
    } catch (error) {
        console.error('Error fetching bus routes:', error);
        throw error;
    }
};

/**
 * Fetch all bus stops metadata via local backend (used for name searching).
 */
export const fetchBusStops = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/busStops`);
        if (!response.ok) {
            throw new Error(`Backend error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching bus stops metadata:', error);
        throw error;
    }
};

/**
 * Geocode an address string using OneMap's free search endpoint.
 * Returns an array of { name, lat, lng, address } suggestions.
 */
export const geocodeAddress = async (query) => {
    try {
        const response = await fetch(`${BACKEND_URL}/geocode?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`Backend error: ${response.status}`);
        const data = await response.json();
        return (data.results || []).map(r => ({
            name: r.SEARCHVAL,
            address: r.ADDRESS,
            lat: parseFloat(r.LATITUDE),
            lng: parseFloat(r.LONGITUDE)
        }));
    } catch (error) {
        console.error('Error geocoding address:', error);
        throw error;
    }
};

/**
 * Plan a public-transport journey between two lat/lng points via OneMap PT routing.
 */
export const planJourney = async (originLat, originLng, destLat, destLng) => {
    try {
        const url = `${BACKEND_URL}/journey?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`;
        const response = await fetch(url);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Backend error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error planning journey:', error);
        throw error;
    }
};

export default { fetchBusArrivals, fetchBusRoutes, fetchBusStops, geocodeAddress, planJourney };
