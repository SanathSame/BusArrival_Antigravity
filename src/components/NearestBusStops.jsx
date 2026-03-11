import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchBusArrivals } from '../services/api';

// fixes leaflet marker issue
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

const RecenterMap = ({ stops, userLat, userLng }) => {
    const map = useMap();
    useEffect(() => {
        if (stops.length > 0) {
            const bounds = L.latLngBounds(stops.map(s => [s.Latitude, s.Longitude]));
            if (userLat && userLng) bounds.extend([userLat, userLng]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [stops, userLat, userLng, map]);
    return null;
};

// Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

const NearestBusStops = ({ busStops }) => {
    const [nearest, setNearest] = useState([]);
    const [userLoc, setUserLoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [arrivals, setArrivals] = useState({});
    const [openIndex, setOpenIndex] = useState(0); // 0 is the first (nearest)

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLoc({ lat: latitude, lng: longitude });

                if (busStops && busStops.length > 0) {
                    const withDist = busStops.map(s => ({
                        ...s,
                        distance: getDistance(latitude, longitude, s.Latitude, s.Longitude)
                    }));
                    withDist.sort((a, b) => a.distance - b.distance);
                    setNearest(withDist.slice(0, 5));
                } else {
                    setLoading(false);
                }
            },
            (err) => {
                setError('Failed to get your location. Please ensure location services are enabled.');
                setLoading(false);
            }
        );
    }, [busStops]);

    useEffect(() => {
        if (nearest.length > 0) {
            setLoading(true);
            Promise.all(nearest.map(s => fetchBusArrivals(s.BusStopCode)))
                .then(results => {
                    const newArrivals = {};
                    results.forEach((data, idx) => {
                        newArrivals[nearest[idx].BusStopCode] = data;
                    });
                    setArrivals(newArrivals);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching arrivals", err);
                    setLoading(false); // even if fail, show stops
                });
        }
    }, [nearest]);

    const getArrivalMinutes = (dateStr) => {
        if (!dateStr) return null;
        const arrival = new Date(dateStr);
        const now = new Date();
        const diffMins = Math.floor((arrival - now) / 60000);
        if (diffMins <= 0) return 'Arr';
        return `${diffMins} min`;
    };

    const getLoadClass = (load) => {
        switch (load) {
            case 'SEA': return 'load-sea';
            case 'SDA': return 'load-sda';
            case 'LSR': return 'load-lsr';
            default: return '';
        }
    };

    const getLoadLabel = (load) => {
        switch (load) {
            case 'SEA': return 'Seats Avail';
            case 'SDA': return 'Standing';
            case 'LSR': return 'Limited';
            default: return '—';
        }
    };

    if (error && !nearest.length) {
        return <div className="card empty-msg">{error}</div>;
    }

    if (loading && !nearest.length) {
         return (
             <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                 <div className="loader" style={{
                     width: '30px', height: '30px',
                     border: '3px solid var(--glass-border)',
                     borderTopColor: 'var(--primary)',
                     borderRadius: '50%', margin: '0 auto',
                     animation: 'spin 1s linear infinite'
                 }} />
                 <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Finding nearby stops...</p>
             </div>
         );
    }

    if (!nearest.length && !loading) {
        return null;
    }

    return (
        <div className="animate-fade-in nearest-layout">
            <h2 style={{ marginBottom: '1.5rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation size={24} color="var(--primary)" /> Nearest Bus Stops
            </h2>
            
            <div className="arrivals-layout">
                {/* ── LEFT: Accordion List ── */}
                <div className="arrivals-left">
                    {nearest.map((stop, index) => {
                        const isOpen = openIndex === index;
                        const thisArrivals = arrivals[stop.BusStopCode];
                        const distStr = stop.distance < 1 ? `${Math.round(stop.distance * 1000)}m` : `${stop.distance.toFixed(1)}km`;
                        
                        return (
                            <div key={stop.BusStopCode} className={`card ${isOpen ? 'active-stop' : ''}`} style={{ marginBottom: '1rem', border: isOpen ? '2px solid var(--primary)' : '1px solid var(--glass-border)' }}>
                                <div 
                                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isOpen ? '0 0 1rem 0' : '0', borderBottom: isOpen ? '1px dashed var(--glass-border)' : 'none', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="stop-icon-bg" style={{ transform: 'none', background: 'rgba(56, 189, 248, 0.15)' }}>
                                            <MapPin size={20} color="var(--primary)" />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-bright)' }}>{stop.Description}</h3>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {stop.BusStopCode} • {distStr} away
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {isOpen ? <ChevronUp size={20} color="var(--text-muted)"/> : <ChevronDown size={20} color="var(--text-muted)"/>}
                                    </div>
                                </div>
                                
                                {isOpen && (
                                    <div style={{ paddingTop: '1rem' }}>
                                        {!thisArrivals && loading ? (
                                             <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                                <div className="loader" style={{
                                                    width: '20px', height: '20px',
                                                    border: '2px solid var(--glass-border)',
                                                    borderTopColor: 'var(--primary)',
                                                    borderRadius: '50%', margin: '0 auto',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                             </div>
                                        ) : !thisArrivals || thisArrivals.Services?.length === 0 ? (
                                            <p className="empty-msg" style={{ margin: 0, padding: '1rem 0' }}>No arrival data found.</p>
                                        ) : (
                                            <div className="services-list">
                                                {thisArrivals.Services.map((service, sIdx) => {
                                                    const buses = [service.NextBus, service.NextBus2, service.NextBus3];
                                                    return (
                                                        <div key={sIdx} className="service-row card" style={{ background: 'rgba(0,0,0,0.2)', marginBottom: '0.5rem', padding: '0.75rem' }}>
                                                            <div className="service-no-col" style={{ minWidth: '60px' }}>
                                                                <span className="service-number" style={{ fontSize: '1.2rem'}}>{service.ServiceNo}</span>
                                                            </div>
                                                            <div className="buses-col">
                                                                {buses.map((bus, i) => {
                                                                    const arrival = bus && getArrivalMinutes(bus.EstimatedArrival);
                                                                    const isImminent = arrival === 'Arr';
                                                                    return (
                                                                        <div key={i} className="bus-slot">
                                                                            <div className={`arrival-chip ${isImminent ? 'imminent' : ''} ${!arrival ? 'na' : ''}`}>
                                                                                {arrival || 'N/A'}
                                                                            </div>
                                                                            {arrival && bus && (
                                                                                <div className="bus-meta">
                                                                                    <span className={`load-dot ${getLoadClass(bus.Load)}`} title={getLoadLabel(bus.Load)} />
                                                                                    {bus.Feature === 'WAB' && <span className="bus-wab">♿</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── RIGHT: Map ── */}
                <div className="arrivals-right">
                    <div className="map-container card" style={{ padding: 0, overflow: 'hidden', height: '100%', minHeight: '500px' }}>
                        <MapContainer
                            center={[nearest[0]?.Latitude || 1.3521, nearest[0]?.Longitude || 103.8198]}
                            zoom={15}
                            scrollWheelZoom={false}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {userLoc && (
                                <CircleMarker 
                                    center={[userLoc.lat, userLoc.lng]} 
                                    radius={8} 
                                    pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                                >
                                    <Popup>You are here</Popup>
                                </CircleMarker>
                            )}
                            {nearest.map((stop, index) => (
                                <Marker 
                                    key={stop.BusStopCode} 
                                    position={[stop.Latitude, stop.Longitude]}
                                    eventHandlers={{
                                        click: () => setOpenIndex(index),
                                    }}
                                >
                                    <Popup>
                                        <strong>{stop.Description}</strong><br/>
                                        {stop.BusStopCode}
                                    </Popup>
                                </Marker>
                            ))}
                            <RecenterMap stops={nearest} userLat={userLoc?.lat} userLng={userLoc?.lng}/>
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NearestBusStops;
