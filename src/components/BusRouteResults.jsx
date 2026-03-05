import React, { useState } from 'react';
import { MapPin, Info, ArrowRightLeft } from 'lucide-react';

const BusRouteResults = ({ serviceNo, routeData, busStops = [] }) => {
    const [direction, setDirection] = useState(1);

    if (!routeData || routeData.length === 0) return null;

    // Filter by direction and sort by StopSequence
    const filteredStops = routeData
        .filter(stop => stop.Direction === direction)
        .sort((a, b) => a.StopSequence - b.StopSequence);

    const hasDirection2 = routeData.some(stop => stop.Direction === 2);

    const getStopInfo = (code) => {
        const stop = busStops.find(s => s.BusStopCode === code);
        if (!stop) return { name: 'Unknown Stop', road: '' };
        return { name: stop.Description, road: stop.RoadName };
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    Route for: <span style={{ color: 'var(--primary)' }}>{serviceNo}</span>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--primary)' }}>
                        {filteredStops.length} Stops
                    </span>
                </h2>

                {hasDirection2 && (
                    <button
                        className="btn-primary"
                        onClick={() => setDirection(direction === 1 ? 2 : 1)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <ArrowRightLeft size={14} />
                        Switch Direction ({direction === 1 ? 'Go' : 'Return'})
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                {/* Timeline Line */}
                <div style={{
                    position: 'absolute',
                    left: '7px',
                    top: '10px',
                    bottom: '10px',
                    width: '2px',
                    background: 'linear-gradient(to bottom, var(--primary), var(--accent))',
                    opacity: 0.5
                }}></div>

                {filteredStops.map((stop, index) => (
                    <div key={`${stop.BusStopCode}-${stop.StopSequence}`} className="card" style={{
                        marginBottom: '1rem',
                        marginLeft: '0.5rem',
                        padding: '1rem',
                        position: 'relative'
                    }}>
                        {/* Dot on line */}
                        <div style={{
                            position: 'absolute',
                            left: '-2.1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            border: '2px solid var(--bg-dark)',
                            zIndex: 2
                        }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MapPin size={14} color="var(--accent)" />
                                    {getStopInfo(stop.BusStopCode).name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {getStopInfo(stop.BusStopCode).road} • {stop.BusStopCode} • {stop.Distance} km
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {stop.WD_FirstBus && (
                                    <>
                                        <div>WD: {stop.WD_FirstBus} - {stop.WD_LastBus}</div>
                                        <div>SAT: {stop.SAT_FirstBus} - {stop.SAT_LastBus}</div>
                                        <div>SUN: {stop.SUN_FirstBus} - {stop.SUN_LastBus}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BusRouteResults;
