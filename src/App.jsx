import React, { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import TabSwitcher from './components/TabSwitcher';
import BusStopResults from './components/BusStopResults';
import BusRouteResults from './components/BusRouteResults';
import JourneyPlanner from './components/JourneyPlanner';
import { fetchBusArrivals, fetchBusRoutes, fetchBusStops } from './services/api';
import { AlertCircle, BusFront } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('arrivals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchType, setSearchType] = useState(null); // 'stop' or 'route'
  const [searchQuery, setSearchQuery] = useState('');
  const [busStops, setBusStops] = useState([]);

  // Load bus stops metadata on mount for search suggestions
  useEffect(() => {
    const loadStops = async () => {
      try {
        const stops = await fetchBusStops();
        setBusStops(stops);
      } catch (err) {
        console.error("Could not load bus stops metadata", err);
      }
    };
    loadStops();
  }, []);

  const handleSearch = async (query, type) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSearchQuery(query);

    try {
      if (type === 'arrivals') {
        let finalCode = query;
        // If query is not a 5-digit code, try to find it by name
        if (!/^\d{5}$/.test(query)) {
          let match = busStops.find(s => s.Description.toLowerCase() === query.toLowerCase());
          if (!match) {
            match = busStops.find(s => s.Description.toLowerCase().includes(query.toLowerCase()));
          }
          if (match) {
            finalCode = match.BusStopCode;
            setSearchQuery(match.Description);
          } else {
            throw new Error(`Bus stop "${query}" not found. Try searching by code if name fails.`);
          }
        }
        const result = await fetchBusArrivals(finalCode);
        setData(result);
        setSearchType('stop');
      } else {
        const result = await fetchBusRoutes(query);
        if (result.length === 0) {
          throw new Error('No route found for this bus number.');
        }
        setData(result);
        setSearchType('route');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setData(null);
    setError(null);
    setSearchType(null);
  };

  const isJourneyTab = activeTab === 'journey';

  return (
    <div className="App">
      <header>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
          <BusFront size={40} color="var(--primary)" />
          <h1>BuSG</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Real-time Singapore bus timings, routes, and journey planning
        </p>
      </header>

      <main>
        <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Journey Planner handles its own UI */}
        {isJourneyTab && <JourneyPlanner />}

        {/* Bus Stop Arrivals + Bus Routes share the SearchBar */}
        {!isJourneyTab && (
          <>
            <SearchBar
              onSearch={handleSearch}
              loading={loading}
              activeTab={activeTab}
              busStops={busStops}
            />

            {error && (
              <div className="card animate-fade-in" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)' }}>
                  <AlertCircle size={20} />
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', margin: '3rem 0' }}>
                <div className="loader" style={{
                  width: '40px', height: '40px',
                  border: '4px solid var(--glass-border)',
                  borderTopColor: 'var(--primary)',
                  borderRadius: '50%', margin: '0 auto',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching live data...</p>
              </div>
            )}

            {!loading && !error && searchType === 'stop' && (
              <BusStopResults data={data} query={searchQuery} busStops={busStops} />
            )}

            {!loading && !error && searchType === 'route' && (
              <BusRouteResults serviceNo={searchQuery} routeData={data} busStops={busStops} />
            )}
          </>
        )}
      </main>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>Data provided by LTA DataMall & OneMap</p>
      </footer>
    </div>
  );
}

export default App;
