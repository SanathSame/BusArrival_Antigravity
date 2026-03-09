import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── MRT line colour map ────────────────────────────────────────────────────
const MRT_COLOURS = {
    'NSL': '#e2231a',   // North-South Line (Red)
    'NS': '#e2231a',
    'EWL': '#009645',   // East-West Line (Green)
    'EW': '#009645',
    'CGL': '#009645',   // Changi Branch
    'NEL': '#9900aa',   // North-East Line (Purple)
    'NE': '#9900aa',
    'CCL': '#fa9e0d',   // Circle Line (Orange-Yellow)
    'CC': '#fa9e0d',
    'CEL': '#fa9e0d',
    'DTL': '#005ec4',   // Downtown Line (Blue)
    'DT': '#005ec4',
    'TEL': '#9D5B25',   // Thomson-East Coast Line (Brown)
    'TE': '#9D5B25',
    'JRL': '#0099AA',   // Jurong Region Line (Teal)
    'JR': '#0099AA',
    'CPL': '#748477',   // Cross Island Line (Cyan)
    'CR': '#748477',
    'LRT': '#748477',   // LRT (Gray-Teal)
    'BP': '#748477',
    'SK': '#748477',
    'PG': '#748477',
};

const LEG_COLOURS = {
    WALK: '#94a3b8',   // muted grey dashed
    BUS: '#f97316',   // orange
    SUBWAY: '#6366f1',   // fallback purple (overridden by line code)
    TRAM: '#748477',
};

const LEGEND_ITEMS = [
    { label: 'Bus', color: LEG_COLOURS.BUS, style: 'solid' },
    { label: 'Walk', color: LEG_COLOURS.WALK, style: 'dashed' },
    { label: 'NSL (Red)', color: MRT_COLOURS.NSL, style: 'solid' },
    { label: 'EWL (Green)', color: MRT_COLOURS.EWL, style: 'solid' },
    { label: 'NEL (Purple)', color: MRT_COLOURS.NEL, style: 'solid' },
    { label: 'CCL (Orange)', color: MRT_COLOURS.CCL, style: 'solid' },
    { label: 'DTL (Blue)', color: MRT_COLOURS.DTL, style: 'solid' },
    { label: 'TEL (Brown)', color: MRT_COLOURS.TEL, style: 'solid' },
];

/** Identify MRT line colour from the route's shortName or routeId */
const getMrtColour = (leg) => {
    if (!leg) return LEG_COLOURS.SUBWAY;
    const id = (leg.route?.shortName || leg.routeId || leg.route?.id || '').toUpperCase();
    for (const [key, colour] of Object.entries(MRT_COLOURS)) {
        if (id.includes(key)) return colour;
    }
    return LEG_COLOURS.SUBWAY;
};

/** Convert OneMap encoded polyline points array to Leaflet latLng pairs */
const legPoints = (leg) => {
    try {
        const pts = leg?.legGeometry?.points;
        if (!pts) return [];
        if (Array.isArray(pts)) return pts.map(p => [p.lat, p.lon]);
        return decodePolyline(pts);
    } catch { return []; }
};

const decodePolyline = (encoded) => {
    const coords = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : result >> 1;
        shift = 0; result = 0;
        do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : result >> 1;
        coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
};

const MapFitBounds = ({ itinerary, origin, destination, userLocation }) => {
    const map = useMap();
    useEffect(() => {
        const pts = [];
        if (itinerary) {
            itinerary.legs?.forEach(leg => { legPoints(leg).forEach(p => pts.push(p)); });
        } else {
            if (origin?.lat) pts.push([origin.lat, origin.lng]);
            if (destination?.lat) pts.push([destination.lat, destination.lng]);
            if (userLocation?.lat) pts.push([userLocation.lat, userLocation.lng]);
        }

        if (pts.length > 1) {
            map.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
        } else if (pts.length === 1) {
            map.setView(pts[0], 15);
        }
    }, [itinerary, origin, destination, userLocation, map]);
    return null;
};

const makeIcon = (emoji, color) => L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${emoji}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], className: ''
});

const makeMarkerIcon = (emoji, color) => L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${emoji}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], className: ''
});

const Legend = () => (
    <div style={{
        position: 'absolute', bottom: '24px', left: '12px', zIndex: 1000,
        background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)',
        borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)',
        fontSize: '0.72rem', color: '#f8fafc', minWidth: '140px'
    }}>
        <div style={{ fontWeight: 700, marginBottom: '7px', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>Legend</div>
        {LEGEND_ITEMS.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <svg width="28" height="6" style={{ flexShrink: 0 }}>
                    <line x1="0" y1="3" x2="28" y2="3" stroke={item.color} strokeWidth="3"
                        strokeDasharray={item.style === 'dashed' ? '5,4' : undefined} />
                </svg>
                <span>{item.label}</span>
            </div>
        ))}
    </div>
);

const JourneyMap = ({ itinerary, origin, destination, userLocation }) => {
    const defaultCenter = [1.3521, 103.8198];
    const initialCenter = itinerary?.legs?.[0]?.from
        ? [itinerary.legs[0].from.lat, itinerary.legs[0].from.lon]
        : origin?.lat ? [origin.lat, origin.lng]
            : userLocation?.lat ? [userLocation.lat, userLocation.lng]
                : defaultCenter;

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            <MapContainer center={initialCenter} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%', minHeight: '450px' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation?.lat && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={makeMarkerIcon('📍', '#3b82f6')}>
                        <Popup>Your Location</Popup>
                    </Marker>
                )}

                {origin?.lat && (
                    <Marker position={[origin.lat, origin.lng]} icon={makeMarkerIcon('🚩', '#10b981')}>
                        <Popup>Origin: {origin.name}</Popup>
                    </Marker>
                )}

                {destination?.lat && (
                    <Marker position={[destination.lat, destination.lng]} icon={makeMarkerIcon('🏁', '#ef4444')}>
                        <Popup>Destination: {destination.name}</Popup>
                    </Marker>
                )}

                {itinerary && itinerary.legs.map((leg, i) => {
                    const pts = legPoints(leg);
                    if (!pts.length) return null;
                    const mode = leg.mode?.toUpperCase() || 'WALK';
                    const colour = mode === 'WALK' ? LEG_COLOURS.WALK
                        : mode === 'BUS' ? LEG_COLOURS.BUS : getMrtColour(leg);

                    return (
                        <Polyline
                            key={i}
                            positions={pts}
                            color={colour}
                            weight={mode === 'WALK' ? 3 : 5}
                            opacity={mode === 'WALK' ? 0.6 : 0.9}
                            dashArray={mode === 'WALK' ? '8 6' : undefined}
                        />
                    );
                })}

                {itinerary && itinerary.legs.filter(l => l.mode !== 'WALK').map((leg, i) => {
                    if (!leg.from?.lat) return null;
                    const mode = leg.mode?.toUpperCase();
                    const colour = mode === 'BUS' ? LEG_COLOURS.BUS : getMrtColour(leg);
                    const emoji = mode === 'BUS' ? '🚌' : '🚇';
                    return (
                        <Marker key={`icon-${i}`} position={[leg.from.lat, leg.from.lon]} icon={makeIcon(emoji, colour)}>
                            <Popup>
                                <strong>{mode === 'BUS' ? `Bus ${leg.route?.shortName || ''}` : leg.route?.shortName || 'Train'}</strong><br />
                                From: {leg.from.name}<br />
                                To: {leg.to.name}
                            </Popup>
                        </Marker>
                    );
                })}

                <MapFitBounds
                    itinerary={itinerary}
                    origin={origin}
                    destination={destination}
                    userLocation={userLocation}
                />
            </MapContainer>
            {itinerary && <Legend />}
        </div>
    );
};

export default JourneyMap;
