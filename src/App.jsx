import React, { useState, useEffect } from 'react';
import { Wind, MapPin, TrendingUp, Calendar, Heart, Bell, Search, Thermometer, Droplets, Eye, Activity } from 'lucide-react';
import io from 'socket.io-client';
import AQIHeatMap from './components/AQIHeatMap';
import AlertSystem from './components/AlertSystem';
import HistoricalChart from './components/HistoricalChart';
import ForecastChart from './components/ForecastChart';
import HealthAdvisory from './components/HealthAdvisory';
import './index.css';

const App = () => {
  const [currentLocation, setCurrentLocation] = useState({ lat: 28.7041, lng: 77.1025, name: 'Delhi' });
  const [currentAQI, setCurrentAQI] = useState(null);
  const [allCitiesData, setAllCitiesData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [searchInput, setSearchInput] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection and fetch initial data
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      timeout: 5000,
      forceNew: true
    });
    setSocket(newSocket);

    // Listen for real-time AQI updates
    newSocket.on('aqiUpdate', (data) => {
      setAllCitiesData(data);
      
      // Update current city data if it matches
      const currentCityData = data.find(city => 
        city.city.toLowerCase() === currentLocation.name.toLowerCase()
      );
      if (currentCityData) {
        setCurrentAQI(currentCityData);
        setWeatherData(currentCityData.weather);
      }
    });

    // Fetch initial data
    setTimeout(() => {
      fetchInitialData();
    }, 1000); // Give server time to start
    fetchAvailableCities();

    return () => {
      newSocket.close();
    };
  }, []);

  // Update current city data when location changes
  useEffect(() => {
    if (allCitiesData.length > 0) {
      const cityData = allCitiesData.find(city => 
        city.city.toLowerCase() === currentLocation.name.toLowerCase()
      );
      if (cityData) {
        setCurrentAQI(cityData);
        setWeatherData(cityData.weather);
      } else {
        // If city not found in real-time data, fetch it specifically
        fetchCityData(currentLocation.name);
      }
    }
  }, [currentLocation, allCitiesData]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('http://localhost:3001/api/aqi/all', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setAllCitiesData(data);
        
        // Set initial city data
        const delhiData = data.find(city => city.city === 'Delhi');
        if (delhiData) {
          setCurrentAQI(delhiData);
          setWeatherData(delhiData.weather);
        }
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching initial data, using fallback:', error);
      // Fallback data
      const fallbackData = [{
        city: 'Delhi',
        aqi: 185,
        pm25: 110,
        pm10: 150,
        no2: 45,
        so2: 20,
        o3: 85,
        co: 15,
        timestamp: new Date().toISOString(),
        category: { category: 'Unhealthy', color: '#FF0000', level: 4 },
        healthRecommendations: ['Avoid outdoor activities', 'Wear masks when outside'],
        weather: {
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
          visibility: 5
        }
      }];
      setAllCitiesData(fallbackData);
      setCurrentAQI(fallbackData[0]);
      setWeatherData(fallbackData[0].weather);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCities = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://localhost:3001/api/cities', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const cities = await response.json();
        setAvailableCities(cities);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching cities, using fallback:', error);
      // Fallback cities data
      const fallbackCities = [
        { key: 'delhi', name: 'Delhi', lat: 28.7041, lng: 77.1025 },
        { key: 'mumbai', name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
        { key: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
        { key: 'chennai', name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        { key: 'kolkata', name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
      ];
      setAvailableCities(fallbackCities);
    }
  };

  const fetchCityData = async (cityName) => {
    // First, try to find a direct match in available cities
    let targetCity = availableCities.find(city => 
      city.name.toLowerCase() === cityName.toLowerCase() ||
      city.key.toLowerCase() === cityName.toLowerCase()
    );
    
    // If no direct match, try partial match
    if (!targetCity) {
      targetCity = availableCities.find(city => 
        city.name.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(city.name.toLowerCase())
      );
    }
    
    // If still no match, default to Delhi
    if (!targetCity) {
      targetCity = availableCities.find(city => city.key === 'delhi') || 
                   { key: 'delhi', name: 'Delhi', lat: 28.7041, lng: 77.1025 };
      
      // Update current location to reflect the fallback city
      setCurrentLocation({
        lat: targetCity.lat,
        lng: targetCity.lng,
        name: targetCity.name
      });
    }
    
    const apiCityName = targetCity.key || targetCity.name.toLowerCase();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://localhost:3001/api/aqi/${apiCityName}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Ensure the data reflects the actual city name being displayed
        data.city = targetCity.name;
        setCurrentAQI(data);
        setWeatherData(data.weather);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error fetching city data for ${targetCity.name}, using fallback:`, error);
      // Use fallback data for the requested city
      const fallbackData = {
        city: targetCity.name,
        aqi: 120,
        pm25: 75,
        pm10: 95,
        no2: 35,
        so2: 15,
        o3: 65,
        co: 10,
        timestamp: new Date().toISOString(),
        category: { category: 'Moderate', color: '#FFFF00', level: 2 },
        healthRecommendations: ['Air quality is acceptable for most people'],
        weather: {
          temperature: 28,
          humidity: 55,
          windSpeed: 8,
          visibility: 7
        }
      };
      setCurrentAQI(fallbackData);
      setWeatherData(fallbackData.weather);
    }
  };

  const handleLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Current Location'
          });
          setSearchInput('');
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please search for a city instead.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSearchCity = () => {
    const city = availableCities.find(c => 
      c.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      c.key.toLowerCase().includes(searchInput.toLowerCase())
    );
    
    if (city) {
      setCurrentLocation({
        lat: city.lat,
        lng: city.lng,
        name: city.name
      });
    } else {
      alert(`City "${searchInput}" not found. Available cities: ${availableCities.map(c => c.name).join(', ')}`);
    }
  };

  const handleLocationSelect = (location) => {
    setCurrentLocation(location);
  };

  const getAQICategory = (aqi) => {
    if (aqi <= 50) return { category: 'Good', color: 'bg-green-500', textColor: 'text-green-700' };
    if (aqi <= 100) return { category: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', textColor: 'text-orange-700' };
    if (aqi <= 200) return { category: 'Unhealthy', color: 'bg-red-500', textColor: 'text-red-700' };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: 'bg-purple-500', textColor: 'text-purple-700' };
    return { category: 'Hazardous', color: 'bg-red-900', textColor: 'text-red-900' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading air quality data...</p>
        </div>
      </div>
    );
  }

  const displayAQI = currentAQI?.aqi || 0;
  const aqiCategory = getAQICategory(displayAQI);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="header-glass shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Wind className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">AirWatch Pro</h1>
                  <p className="text-xs text-gray-600">Real-time Air Quality Monitoring</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">{currentLocation.name}</span>
              </div>
              <button
                onClick={handleLocationUpdate}
                className="btn-primary flex items-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span>Current Location</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="search-container fade-in-up">
          <div className="flex items-center space-x-4">
            <div className="flex-grow relative">
          <input
            type="text"
            placeholder="Search for a city (e.g., Mumbai, Delhi, Bengaluru)"
                className="input-enhanced pl-12"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearchCity(); }}
          />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          <button
            onClick={handleSearchCity}
              className="btn-primary flex items-center space-x-2"
          >
              <Search className="h-5 w-5" />
              <span>Search</span>
          </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 mb-6">
        <nav className="flex space-x-2 bg-white/60 backdrop-blur-sm rounded-xl p-2 shadow-lg">
          {[
            { id: 'current', label: 'Current AQI', icon: Activity },
            { id: 'historical', label: 'Historical Data', icon: TrendingUp },
            { id: 'forecast', label: 'Forecast', icon: Calendar },
            { id: 'health', label: 'Health Advisory', icon: Heart },
            { id: 'alerts', label: 'Alert System', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? 'active' : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'}`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Current AQI Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {/* Interactive Map */}
            <div className="card-enhanced fade-in-up">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Real-time Air Quality Map</h3>
                </div>
              <AQIHeatMap 
                currentLocation={currentLocation} 
                onLocationSelect={handleLocationSelect}
              />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main AQI Card */}
              <div className="lg:col-span-2 card-enhanced fade-in-left">
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="relative inline-block mb-6">
                      <div className={`aqi-badge text-5xl ${aqiCategory.color.replace('bg-', 'aqi-').replace('-500', '')}`}>
                        <span className="font-bold mr-2">{displayAQI}</span>
                        <span className="text-xl">AQI</span>
                      </div>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">{aqiCategory.category}</h2>
                    <div className="flex items-center justify-center space-x-2 text-lg text-gray-600 mb-2">
                      <MapPin className="h-5 w-5" />
                      <span>{currentLocation.name}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                    Last updated: {currentAQI?.timestamp ? new Date(currentAQI.timestamp).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>

                {/* Pollutant Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { name: 'PM2.5', value: currentAQI?.pm25, unit: 'μg/m³', color: 'bg-red-100 text-red-800' },
                    { name: 'PM10', value: currentAQI?.pm10, unit: 'μg/m³', color: 'bg-orange-100 text-orange-800' },
                    { name: 'NO₂', value: currentAQI?.no2, unit: 'μg/m³', color: 'bg-blue-100 text-blue-800' },
                    { name: 'SO₂', value: currentAQI?.so2, unit: 'μg/m³', color: 'bg-green-100 text-green-800' },
                    { name: 'O₃', value: currentAQI?.o3, unit: 'μg/m³', color: 'bg-purple-100 text-purple-800' },
                    { name: 'CO', value: currentAQI?.co, unit: 'mg/m³', color: 'bg-yellow-100 text-yellow-800' }
                  ].map(pollutant => (
                      <div key={pollutant.name} className={`pollutant-card ${pollutant.color}`}>
                        <div className="text-center">
                          <div className="text-sm font-semibold mb-2">{pollutant.name}</div>
                          <div className="text-3xl font-bold mb-1">{pollutant.value || 'N/A'}</div>
                          <div className="text-xs opacity-75">{pollutant.unit}</div>
                        </div>
                    </div>
                  ))}
                </div>
                </div>
              </div>

              {/* Weather & Info Sidebar */}
              <div className="space-y-6 fade-in-right">
                {/* Weather Card */}
                <div className="card-enhanced">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg">
                        <Thermometer className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                    Weather Conditions
                      </h3>
                    </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="weather-item w-full">
                          <span className="flex items-center text-gray-600">
                        <Thermometer className="h-4 w-4 mr-2" />
                        Temperature
                      </span>
                          <span className="font-bold text-lg text-gray-900">{weatherData?.temperature?.toFixed(1)}°C</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="weather-item w-full">
                          <span className="flex items-center text-gray-600">
                        <Droplets className="h-4 w-4 mr-2" />
                        Humidity
                      </span>
                          <span className="font-bold text-lg text-gray-900">{weatherData?.humidity?.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="weather-item w-full">
                          <span className="flex items-center text-gray-600">
                        <Wind className="h-4 w-4 mr-2" />
                        Wind Speed
                      </span>
                          <span className="font-bold text-lg text-gray-900">{weatherData?.windSpeed?.toFixed(1)} km/h</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="weather-item w-full">
                          <span className="flex items-center text-gray-600">
                        <Eye className="h-4 w-4 mr-2" />
                        Visibility
                      </span>
                          <span className="font-bold text-lg text-gray-900">{weatherData?.visibility?.toFixed(1)} km</span>
                        </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Quick Health Tips */}
                <div className="card-enhanced">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-green-400 to-teal-500 rounded-lg">
                        <Heart className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Quick Health Tips</h3>
                    </div>
                  <ul className="space-y-3 text-sm text-gray-600">
                    {currentAQI?.healthRecommendations?.slice(0, 3).map((tip, index) => (
                        <li key={index} className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>

                {/* Top Cities */}
                <div className="card-enhanced">
                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Other Cities</h3>
                    </div>
                  <div className="space-y-3">
                    {allCitiesData.slice(0, 5).map((city, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                          <span className="text-sm font-medium text-gray-700">{city.city}</span>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          city.aqi <= 50 ? 'bg-green-100 text-green-800' :
                          city.aqi <= 100 ? 'bg-yellow-100 text-yellow-800' :
                          city.aqi <= 150 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {city.aqi}
                        </div>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Data Tab */}
        {activeTab === 'historical' && (
          <HistoricalChart selectedCity={currentLocation.name} />
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <ForecastChart selectedCity={currentLocation.name} />
        )}

        {/* Health Advisory Tab */}
        {activeTab === 'health' && (
          <HealthAdvisory selectedCity={currentLocation.name} currentAQI={displayAQI} />
        )}

        {/* Alert System Tab */}
        {activeTab === 'alerts' && (
          <AlertSystem />
        )}
      </div>
    </div>
  );
};

export default App;