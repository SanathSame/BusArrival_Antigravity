import React from 'react';
import { MapPin } from 'lucide-react';
import BusStopMap from './BusStopMap';

const BusStopResults = ({ data, query, busStops = [] }) => {
    if (!data || !data.Services) return null;

    const stopMetadata = busStops.find(s => s.BusStopCode === data.BusStopCode);

    const getLoadClass = (load) => {
        switch (load) {
            case 'SEA': return 'load-sea';   // Seats Available
            case 'SDA': return 'load-sda';   // Standing Available
            case 'LSR': return 'load-lsr';   // Limited Standing
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

    const getArrivalMinutes = (dateStr) => {
        if (!dateStr) return null;
        const arrival = new Date(dateStr);
        const now = new Date();
        const diffMins = Math.floor((arrival - now) / 60000);
        if (diffMins <= 0) return 'Arr';
        return `${diffMins} min`;
    };

    const hasMap = stopMetadata && stopMetadata.Latitude && stopMetadata.Longitude;

    return (
        <div className="animate-fade-in arrivals-layout">

            {/* ── LEFT: Stop info + service list ── */}
            <div className="arrivals-left">

                {/* Stop header */}
                <div className="card stop-header-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="stop-icon-bg">
                            <MapPin size={22} color="var(--primary)" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 className="stop-title">
                                    {stopMetadata ? stopMetadata.Description : 'Bus Stop'}
                                </h2>
                                {stopMetadata && stopMetadata.IsWheelchairAccessible && (
                                    <span title="Wheelchair Accessible Stop" className="wab-badge">♿ Accessible</span>
                                )}
                            </div>
                            <div className="stop-subtitle">
                                {stopMetadata?.RoadName && <span>{stopMetadata.RoadName}</span>}
                                <span className="stop-code-pill">{data.BusStopCode}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Services */}
                {data.Services.length === 0 ? (
                    <p className="empty-msg">No arrival data found for this stop.</p>
                ) : (
                    <div className="services-list">
                        {data.Services.map((service, index) => {
                            const buses = [service.NextBus, service.NextBus2, service.NextBus3];
                            return (
                                <div key={index} className="service-row card">
                                    {/* Service number */}
                                    <div className="service-no-col">
                                        <span className="service-number">{service.ServiceNo}</span>
                                        <span className="service-operator">{service.Operator}</span>
                                    </div>

                                    {/* Next 3 buses */}
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
                                                            <span className="bus-type">{bus.Type === 'DD' ? '2-deck' : '1-deck'}</span>
                                                            {bus.Feature === 'WAB' && <span className="bus-wab">♿</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── RIGHT: Map ── */}
            {hasMap && (
                <div className="arrivals-right">
                    <BusStopMap
                        lat={stopMetadata.Latitude}
                        lng={stopMetadata.Longitude}
                        description={stopMetadata.Description}
                    />
                </div>
            )}
        </div>
    );
};

export default BusStopResults;
