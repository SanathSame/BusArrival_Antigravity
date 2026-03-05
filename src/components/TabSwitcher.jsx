import React from 'react';
import { MapPin, RotateCcw } from 'lucide-react';

const TabSwitcher = ({ activeTab, onTabChange }) => {
    return (
        <div className="tabs animate-fade-in">
            <div
                className={`tab ${activeTab === 'arrivals' ? 'active' : ''}`}
                onClick={() => onTabChange('arrivals')}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} />
                    Bus Stop Arrivals
                </div>
            </div>
            <div
                className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
                onClick={() => onTabChange('routes')}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RotateCcw size={18} />
                    Bus Routes
                </div>
            </div>
        </div>
    );
};

export default TabSwitcher;
