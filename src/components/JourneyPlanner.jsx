import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Search, Clock, ArrowRight, Bus, Train, PersonStanding } from 'lucide-react';
import { geocodeAddress, planJourney, fetchBusArrivals } from '../services/api';
import JourneyMap from './JourneyMap';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const formatTime = (epochMs) => {
    if (!epochMs) return '';
    const d = new Date(epochMs);
    return d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const MODE_META = {
    WALK: { icon: '🚶', label: 'Walk', colour: '#94a3b8' },
    BUS: { icon: '🚌', label: 'Bus', colour: '#f97316' },
    SUBWAY: { icon: '🚇', label: 'MRT', colour: '#6366f1' },
    TRAM: { icon: '🚋', label: 'LRT', colour: '#748477' },
    RAIL: { icon: '🚇', label: 'Train', colour: '#6366f1' },
};

// ─── Address input with live suggestions ────────────────────────────────────

const AddressInput = ({ label, icon: Icon, placeholder, value, onSelect, onCurrentLocation }) => {
    const [query, setQuery] = useState(value?.name || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);
    const wrapRef = useRef(null);

    useEffect(() => { setQuery(value?.name || ''); }, [value]);

    // Hide dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setSuggestions([]); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleChange = (e) => {
        const q = e.target.value;
        console.log(`[Input] Change: "${q}"`);
        setQuery(q);
        clearTimeout(debounceRef.current);
        if (q.length < 2) { setSuggestions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                console.log(`[Proxy] Searching for: ${q}`);
                const results = await geocodeAddress(q);
                console.log(`[Proxy] Found ${results.length} suggestions`);
                setSuggestions(results.slice(0, 6));
            } catch (err) {
                console.error("[Proxy] Geocode error:", err);
                setSuggestions([]);
            }
            finally { setLoading(false); }
        }, 400);
    };

    const handleSelect = (item) => {
        console.log(`[Input] Selected: ${item.name}`);
        setQuery(item.name);
        setSuggestions([]);
        onSelect(item);
    };

    return (
        <div ref={wrapRef}
            onClick={() => console.log(`[Input] Wrapper clicked: ${label}`)}
            style={{ position: 'relative', marginBottom: '0.75rem', zIndex: 100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon size={13} /> {label}
                </label>
                {onCurrentLocation && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("[Location] Manual trigger clicked");
                            onCurrentLocation();
                        }}
                        className="btn-location"
                        style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            background: 'rgba(99,102,241,0.15)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: '4px',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Use My Location
                    </button>
                )}
            </div>
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={handleChange}
                onFocus={() => console.log(`[Input] Focus: ${label}`)}
                onClick={(e) => {
                    e.stopPropagation();
                    console.log(`[Input] Click: ${label}`);
                }}
                autoComplete="off"
                style={{
                    paddingRight: loading ? '2.5rem' : undefined,
                    cursor: 'text',
                    position: 'relative',
                    zIndex: 101,
                    background: 'rgba(255,255,255,0.05)'
                }}
            />
            {loading && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-20%)', width: '16px', height: '16px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', zIndex: 102 }} />
            )}
            {suggestions.length > 0 && (
                <div className="suggestions-list" style={{ top: '100%', marginTop: '4px', zIndex: 9999, maxHeight: '200px', overflowY: 'auto' }}>
                    {suggestions.map((s, i) => (
                        <div key={i} className="suggestion-item" onClick={() => handleSelect(s)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <MapPin size={13} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.address}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ... ItineraryCard ...

// ─── Journey option card ─────────────────────────────────────────────────────

const ItineraryCard = ({ itinerary, index, selected, onSelect }) => {
    const totalMin = Math.round((itinerary.duration || 0) / 60);
    const legs = itinerary.legs || [];

    return (
        <div
            onClick={() => onSelect(itinerary)}
            className="card"
            style={{
                cursor: 'pointer',
                marginBottom: '0.6rem',
                padding: '0.9rem 1rem',
                borderLeft: selected ? '3px solid var(--primary)' : '3px solid transparent',
                background: selected ? 'rgba(99,102,241,0.12)' : undefined,
                transition: 'all 0.15s'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{totalMin} min</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatTime(itinerary.startTime)} → {formatTime(itinerary.endTime)}
                </span>
            </div>

            {/* Leg chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {legs.map((leg, i) => {
                    const meta = MODE_META[leg.mode?.toUpperCase()] || MODE_META.WALK;
                    const routeStr = typeof leg.route === 'object' ? leg.route?.shortName : leg.route;
                    const label = leg.mode === 'BUS'
                        ? `${meta.icon} ${routeStr || 'Bus'}`
                        : leg.mode === 'SUBWAY' || leg.mode === 'RAIL' || leg.mode === 'TRAM'
                            ? `${meta.icon} ${routeStr || 'MRT'}`
                            : `${meta.icon} ${Math.round((leg.duration || 0) / 60)}m`;
                    return (
                        <React.Fragment key={i}>
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: '6px', background: `${meta.colour}22`, color: meta.colour, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {label}
                            </span>
                            {i < legs.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>›</span>}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Transfers & Fare*/}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '5px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {itinerary.transfers > 0 ? `${itinerary.transfers} transfer${itinerary.transfers > 1 ? 's' : ''}` : 'Direct'}
                    {' · '}
                    {Math.round((itinerary.walkDistance || 0))} m walk
                </div>
                {itinerary.fareInfo?.totalDisplay && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {itinerary.fareInfo.totalDisplay}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Step-by-step itinerary detail ──────────────────────────────────────────

const BusLegArrival = ({ busStopCode, serviceNo }) => {
    const [arrivals, setArrivals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!busStopCode || !serviceNo) return;
        setLoading(true);
        fetchBusArrivals(busStopCode)
            .then(data => {
                const svc = data.Services?.find(s => String(s.ServiceNo) === String(serviceNo));
                if (svc) {
                    const times = [];
                    const now = new Date();

                    // Process NextBus, NextBus2, NextBus3
                    ['NextBus', 'NextBus2', 'NextBus3'].forEach(key => {
                        if (svc[key]?.EstimatedArrival) {
                            const msDiff = new Date(svc[key].EstimatedArrival) - now;
                            const minDiff = Math.max(0, Math.floor(msDiff / 60000));
                            times.push(minDiff);
                        }
                    });
                    setArrivals(times);
                } else {
                    setArrivals([]); // No data
                }
            })
            .catch(err => {
                console.error("Failed to fetch bus arrivals:", err);
                setArrivals([]);
            })
            .finally(() => setLoading(false));
    }, [busStopCode, serviceNo]);

    if (loading) {
        return <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>checking live arrivals...</div>;
    }

    if (arrivals.length === 0) return null;

    return (
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-main)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live</span>
            </div>
            {arrivals.map((min, idx) => {
                let badgeColor = 'var(--text-main)';
                let badgeBg = 'var(--surface-sunken)';
                let borderColor = 'var(--border)';
                let text = min === 0 ? 'Arr' : `${min} min`;

                if (min <= 3) {
                    badgeColor = '#ffffff';
                    badgeBg = 'var(--success)';
                    borderColor = 'var(--success)';
                } else if (min <= 10) {
                    // Changed: Use primary text color, hollow out the background, and use thick colored borders for better legibility.
                    badgeColor = 'var(--text-main)';
                    badgeBg = 'transparent';
                    borderColor = 'var(--warning)';
                } else {
                    // For > 10 mins, ensure text contrast is high (use main text color, but subtly boxed)
                    badgeColor = 'var(--text-main)';
                    badgeBg = 'transparent';
                    borderColor = 'var(--text-muted)';
                }

                return (
                    <span key={idx} style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        color: badgeColor,
                        background: badgeBg,
                        border: `1px solid ${borderColor}`,
                        opacity: idx > 0 ? 0.85 : 1 // Slightly dim the later buses to show hierarchy
                    }}>
                        {text}
                    </span>
                );
            })}
        </div>
    );
};

const ItineraryDetail = ({ itinerary }) => {
    if (!itinerary) return null;

    return (
        <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step by step</div>
            {itinerary.legs.map((leg, i) => {
                const meta = MODE_META[leg.mode?.toUpperCase()] || MODE_META.WALK;
                const durationMin = Math.round((leg.duration || 0) / 60);
                const isTransit = leg.mode !== 'WALK';

                return (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                        {/* Mode icon bubble */}
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${meta.colour}22`, border: `2px solid ${meta.colour}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                            {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: isTransit ? 700 : 400, fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>
                                    {isTransit
                                        ? `${meta.label} ${typeof leg.route === 'object' ? (leg.route?.shortName || '') : (leg.route || '')} → ${leg.to?.name}`
                                        : `Walk to ${leg.to?.name}`}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                {isTransit && leg.intermediateStops?.length ? `${leg.intermediateStops.length} stops · ` : ''}
                                {durationMin} min
                                {isTransit && leg.from?.name ? ` · From ${leg.from.name}` : ''}
                            </div>
                            {leg.mode === 'BUS' && leg.from?.stopId && leg.route && (
                                <BusLegArrival
                                    busStopCode={leg.from.stopId.split(':')[1] || leg.from.stopId}
                                    serviceNo={typeof leg.route === 'object' ? leg.route?.shortName : leg.route}
                                />
                            )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {formatTime(leg.startTime)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main JourneyPlanner component ──────────────────────────────────────────

const JourneyPlanner = () => {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const handleRequestLocation = () => {
        if (!("geolocation" in navigator)) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        console.log("[Location] Requesting geolocation...");
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("[Location] Success:", position.coords);
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    name: 'Your Location'
                };
                setUserLocation(loc);
                setOrigin(loc);
                setLoading(false);
            },
            (err) => {
                console.error("[Location] Error:", err);
                let msg = "Could not get your location. ";
                if (err.code === 1) msg += "Please enable location access in your browser settings.";
                else if (err.code === 2) msg += "Position unavailable.";
                else if (err.code === 3) msg += "Timed out.";
                setError(msg);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSearch = async () => {
        if (!origin || !destination) {
            setError('Please select both an origin and a destination from the suggestions.');
            return;
        }
        if (origin.lat === destination.lat && origin.lng === destination.lng) {
            setError('Origin and destination appear to be the same location.');
            return;
        }
        setLoading(true);
        setError(null);
        setItineraries([]);
        setSelected(null);

        try {
            console.log("Planning journey from", origin, "to", destination);
            const data = await planJourney(origin.lat, origin.lng, destination.lat, destination.lng);
            if (data.error) throw new Error(data.error);
            const plans = data.plan?.itineraries || data.itineraries || [];
            if (!plans.length) throw new Error('No route found between these two locations.');

            const processedPlans = plans.map(plan => {
                let fareDisplay = null;
                if (plan.fare && !isNaN(parseFloat(plan.fare))) {
                    fareDisplay = `$${parseFloat(plan.fare).toFixed(2)}`;
                }
                return {
                    ...plan,
                    fareInfo: fareDisplay ? { totalDisplay: fareDisplay, legBreakdown: [] } : null
                };
            });

            setItineraries(processedPlans);
            setSelected(processedPlans[0]);
        } catch (err) {
            console.error("Search failed:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in journey-layout">

            {/* ── LEFT: Input + results ── */}
            <div className="journey-left" style={{ zIndex: 100 }}>

                {/* Search inputs */}
                <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem', position: 'relative', zIndex: 9999 }}>
                    <AddressInput
                        label="From"
                        icon={Navigation}
                        placeholder="e.g. Tampines MRT, Orchard Road..."
                        value={origin}
                        onSelect={setOrigin}
                        onCurrentLocation={handleRequestLocation}
                    />
                    <AddressInput
                        label="To"
                        icon={MapPin}
                        placeholder="e.g. VivoCity, NUS, Changi Airport..."
                        value={destination}
                        onSelect={setDestination}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleSearch}
                        disabled={loading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem' }}
                    >
                        <Search size={16} />
                        {loading ? 'Planning your journey...' : 'Find Best Route'}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="card" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', padding: '0.9rem', marginBottom: '0.75rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
                        {error}
                        {error.includes('ONEMAP_TOKEN') && (
                            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Register at <a href="https://www.onemap.gov.sg" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>onemap.gov.sg</a> and add <code>ONEMAP_TOKEN=&lt;token&gt;</code> to your <code>.env</code> file, then restart the server.
                            </div>
                        )}
                    </div>
                )}

                {/* Route options */}
                {itineraries.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {itineraries.length} route{itineraries.length > 1 ? 's' : ''} found
                        </div>
                        {itineraries.map((itin, i) => (
                            <ItineraryCard
                                key={i}
                                itinerary={itin}
                                index={i}
                                selected={selected === itin}
                                onSelect={setSelected}
                            />
                        ))}
                        <ItineraryDetail itinerary={selected} />
                    </div>
                )}
            </div>

            {/* ── RIGHT: Map ── */}
            <div className="journey-right">
                <div className="map-container card" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                    <JourneyMap
                        itinerary={selected}
                        origin={origin}
                        destination={destination}
                        userLocation={userLocation}
                    />
                </div>
            </div>
        </div>
    );
};

export default JourneyPlanner;
