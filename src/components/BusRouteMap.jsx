import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Fits the map to show all route stops on initial render and whenever points change.
 */
const FitBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 1) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [points, map]);
    return null;
};

/**
 * BusRouteMap renders a purple polyline through all route stops
 * with circle markers at each stop showing name and code.
 */
const BusRouteMap = ({ stops, busStops }) => {
    // Build list of [lat, lng] for all stops that have coordinates
    const points = stops
        .map(stop => {
            const meta = busStops.find(s => s.BusStopCode === stop.BusStopCode);
            if (!meta || !meta.Latitude || !meta.Longitude) return null;
            return {
                lat: meta.Latitude,
                lng: meta.Longitude,
                name: meta.Description,
                road: meta.RoadName,
                code: stop.BusStopCode,
                seq: stop.StopSequence,
                isFirst: stop.StopSequence === stops[0]?.StopSequence,
                isLast: stop.StopSequence === stops[stops.length - 1]?.StopSequence
            };
        })
        .filter(Boolean);

    if (points.length < 2) return null;

    const latLngs = points.map(p => [p.lat, p.lng]);

    return (
        <div className="map-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <MapContainer
                center={latLngs[0]}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', minHeight: '450px' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Purple route line */}
                <Polyline
                    positions={latLngs}
                    color="#6366f1"
                    weight={4}
                    opacity={0.85}
                />

                {/* Stop markers */}
                {points.map((p, i) => (
                    <CircleMarker
                        key={`${p.code}-${i}`}
                        center={[p.lat, p.lng]}
                        radius={p.isFirst || p.isLast ? 10 : 5}
                        fillColor={p.isFirst ? '#10b981' : p.isLast ? '#ef4444' : '#6366f1'}
                        color="#fff"
                        weight={p.isFirst || p.isLast ? 2.5 : 1.5}
                        fillOpacity={1}
                    >
                        <Popup>
                            <strong>{p.name}</strong><br />
                            {p.road}<br />
                            <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{p.code}</span>
                            {p.isFirst && <><br /><em>Start</em></>}
                            {p.isLast && <><br /><em>End</em></>}
                        </Popup>
                    </CircleMarker>
                ))}

                <FitBounds points={latLngs} />
            </MapContainer>
        </div>
    );
};

export default BusRouteMap;
