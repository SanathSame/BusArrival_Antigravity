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

export default { fetchBusArrivals, fetchBusRoutes, fetchBusStops };
