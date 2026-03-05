import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon being missing in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center the map when coordinates change
const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], 16);
    }, [lat, lng, map]);
    return null;
};

const BusStopMap = ({ lat, lng, description }) => {
    if (!lat || !lng) return null;

    return (
        <div className="map-container card" style={{ padding: 0, overflow: 'hidden', height: '300px', marginBottom: '1.5rem' }}>
            <MapContainer
                center={[lat, lng]}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]}>
                    <Popup>
                        {description}
                    </Popup>
                </Marker>
                <RecenterMap lat={lat} lng={lng} />
            </MapContainer>
        </div>
    );
};

export default BusStopMap;
