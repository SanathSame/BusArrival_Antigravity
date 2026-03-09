import React, { useState } from 'react';
import { MapPin, ArrowRightLeft } from 'lucide-react';
import BusRouteMap from './BusRouteMap';

const BusRouteResults = ({ serviceNo, routeData, busStops = [] }) => {
    const [direction, setDirection] = useState(1);

    if (!routeData || routeData.length === 0) return null;

    const filteredStops = routeData
        .filter(stop => stop.Direction === direction)
        .sort((a, b) => a.StopSequence - b.StopSequence);

    const hasDirection2 = routeData.some(stop => stop.Direction === 2);

    const getStopInfo = (code) => {
        const stop = busStops.find(s => s.BusStopCode === code);
        if (!stop) return { name: code, road: '' };
        return { name: stop.Description, road: stop.RoadName };
    };

    const formatTime = (t) => {
        if (!t || t === '-') return '—';
        return t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
    };

    return (
        <div className="animate-fade-in route-layout">

            {/* ── LEFT: Route header + stop timeline ── */}
            <div className="route-left">

                {/* Header row */}
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>Bus {serviceNo}</span>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--primary)' }}>
                                {filteredStops.length} Stops · {direction === 1 ? 'Go' : 'Return'}
                            </span>
                        </div>
                        {filteredStops.length > 0 && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {getStopInfo(filteredStops[0].BusStopCode).name}
                                {' → '}
                                {getStopInfo(filteredStops[filteredStops.length - 1].BusStopCode).name}
                            </div>
                        )}
                    </div>
                    {hasDirection2 && (
                        <button
                            className="btn-primary"
                            onClick={() => setDirection(direction === 1 ? 2 : 1)}
                            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, height: 'fit-content' }}
                        >
                            <ArrowRightLeft size={13} />
                            Switch
                        </button>
                    )}
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative', paddingLeft: '2rem', overflowY: 'auto' }}>
                    {/* Vertical line */}
                    <div style={{
                        position: 'absolute', left: '7px', top: '10px', bottom: '10px',
                        width: '2px',
                        background: 'linear-gradient(to bottom, #10b981, #6366f1, #ef4444)',
                        opacity: 0.6
                    }} />

                    {filteredStops.map((stop, index) => {
                        const { name, road } = getStopInfo(stop.BusStopCode);
                        const isFirst = index === 0;
                        const isLast = index === filteredStops.length - 1;
                        return (
                            <div key={`${stop.BusStopCode}-${stop.StopSequence}`}
                                className="card"
                                style={{ marginBottom: '0.6rem', marginLeft: '0.5rem', padding: '0.75rem 1rem', position: 'relative' }}
                            >
                                {/* Timeline dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-2.1rem', top: '50%', transform: 'translateY(-50%)',
                                    width: isFirst || isLast ? '14px' : '10px',
                                    height: isFirst || isLast ? '14px' : '10px',
                                    borderRadius: '50%',
                                    background: isFirst ? '#10b981' : isLast ? '#ef4444' : '#6366f1',
                                    border: '2px solid var(--bg-dark)',
                                    zIndex: 2
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <MapPin size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '17px' }}>
                                            {road} · {stop.BusStopCode} · {stop.Distance} km
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0, lineHeight: 1.6 }}>
                                        <div>WD {formatTime(stop.WD_FirstBus)}–{formatTime(stop.WD_LastBus)}</div>
                                        <div>SAT {formatTime(stop.SAT_FirstBus)}–{formatTime(stop.SAT_LastBus)}</div>
                                        <div>SUN {formatTime(stop.SUN_FirstBus)}–{formatTime(stop.SUN_LastBus)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── RIGHT: Route map ── */}
            <div className="route-right">
                <BusRouteMap stops={filteredStops} busStops={busStops} />
            </div>
        </div>
    );
};

export default BusRouteResults;
