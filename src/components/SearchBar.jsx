import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Bus } from 'lucide-react';

const SearchBar = ({ onSearch, loading, activeTab, busStops = [] }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        setQuery('');
        setSuggestions([]);
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (activeTab === 'arrivals' && value.length >= 2) {
            const filtered = busStops
                .filter(stop =>
                    stop.Description.toLowerCase().includes(value.toLowerCase()) ||
                    stop.BusStopCode.includes(value)
                )
                .slice(0, 10);
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (stop) => {
        setQuery(stop.BusStopCode);
        setSuggestions([]);
        setShowSuggestions(false);
        onSearch(stop.BusStopCode, 'arrivals');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim(), activeTab);
            setShowSuggestions(false);
        }
    };

    return (
        <div className="card animate-fade-in" style={{ position: 'relative' }}>
            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder={activeTab === 'arrivals' ? "Enter Bus Stop Code or Name..." : "Enter Bus Number (e.g. 15)..."}
                    value={query}
                    onChange={handleInputChange}
                    disabled={loading}
                    autoComplete="off"
                />
                <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        top: '8px',
                        bottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 1rem'
                    }}
                >
                    <Search size={18} />
                    {loading ? 'Searching...' : 'Search'}
                </button>

                {showSuggestions && suggestions.length > 0 && (
                    <div className="suggestions-list" ref={suggestionsRef}>
                        {suggestions.map(stop => (
                            <div
                                key={stop.BusStopCode}
                                className="suggestion-item"
                                onClick={() => handleSuggestionClick(stop)}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={14} color="var(--primary)" />
                                        <span className="suggestion-name" style={{ fontWeight: 600 }}>{stop.Description}</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '22px' }}>
                                        {stop.RoadName} • {stop.BusStopCode}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </form>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {activeTab === 'arrivals'
                    ? "Tip: Search by name (e.g. 'VivoCity') or 5-digit code."
                    : "Tip: Enter a bus service number to see its full route."}
            </p>
        </div>
    );
};

export default SearchBar;
