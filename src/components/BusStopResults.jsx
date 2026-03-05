import React from 'react';
import { Clock, Users, MapPin } from 'lucide-react';
import BusStopMap from './BusStopMap';

const BusStopResults = ({ data, query, busStops = [] }) => {
    if (!data || !data.Services) return null;

    const stopMetadata = busStops.find(s => s.BusStopCode === data.BusStopCode);

    const getLoadClass = (load) => {
        switch (load) {
            case 'SEA': return 'load-sea'; // Seats Available
            case 'SDA': return 'load-sda'; // Standing Available
            case 'LSR': return 'load-lsr'; // Limited Standing
            default: return '';
        }
    };

    const getArrivalMinutes = (dateStr) => {
        if (!dateStr) return 'N/A';
        const arrival = new Date(dateStr);
        const now = new Date();
        const diffMs = arrival - now;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins <= 0) return 'Arr';
        return `${diffMins}m`;
    };

    return (
        <div className="animate-fade-in">
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '12px' }}>
                        <MapPin size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>
                                {stopMetadata ? stopMetadata.Description : 'Bus Stop'} ({data.BusStopCode})
                            </h2>
                            {stopMetadata && stopMetadata.IsWheelchairAccessible && (
                                <span title="Wheelchair Accessible Stop" style={{ color: 'var(--primary)', fontSize: '1rem' }}>♿</span>
                            )}
                        </div>
                        {stopMetadata && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {stopMetadata.RoadName}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {stopMetadata && stopMetadata.Latitude && stopMetadata.Longitude && (
                <BusStopMap
                    lat={stopMetadata.Latitude}
                    lng={stopMetadata.Longitude}
                    description={stopMetadata.Description}
                />
            )}

            {data.Services.map((service, index) => (
                <div key={index} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                            {service.ServiceNo}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {service.Operator}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', textAlign: 'right', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[service.NextBus, service.NextBus2, service.NextBus3].map((bus, i) => {
                            const hasArrival = bus && bus.EstimatedArrival;
                            return (
                                <div key={i} style={{ minWidth: '60px' }}>
                                    <div className={`arrival-time ${hasArrival && getArrivalMinutes(bus.EstimatedArrival) === 'Arr' ? 'imminent' : ''}`}>
                                        {hasArrival ? getArrivalMinutes(bus.EstimatedArrival) : 'N/A'}
                                    </div>
                                    {hasArrival && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div className={`load-level ${getLoadClass(bus.Load)}`}></div>
                                                {bus.Type === 'DD' ? 'Double' : 'Single'}
                                            </div>
                                            {bus.Feature === 'WAB' && (
                                                <div style={{ color: 'var(--primary)', fontSize: '0.6rem' }}>♿ Accessible</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {data.Services.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No arrival data found for this stop.</p>
            )}
        </div>
    );
};

export default BusStopResults;
