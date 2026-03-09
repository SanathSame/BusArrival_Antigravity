import React from 'react';
import { MapPin, RotateCcw, Navigation } from 'lucide-react';

const TabSwitcher = ({ activeTab, onTabChange }) => {
    return (
        <div className="tabs animate-fade-in">
            <div
                className={`tab ${activeTab === 'arrivals' ? 'active' : ''}`}
                onClick={() => onTabChange('arrivals')}
            >
                <MapPin size={18} />
                Bus Stop Arrivals
            </div>
            <div
                className={`tab ${activeTab === 'routes' ? 'active' : ''}`}
                onClick={() => onTabChange('routes')}
            >
                <RotateCcw size={18} />
                Bus Routes
            </div>
            <div
                className={`tab ${activeTab === 'journey' ? 'active' : ''}`}
                onClick={() => onTabChange('journey')}
            >
                <Navigation size={18} />
                Journey Planner
            </div>
        </div>
    );
};

export default TabSwitcher;
