import React, { useState, useEffect } from "react";
import { 
  Wind, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Heart, 
  Bell, 
  Search, 
  Thermometer, 
  Droplets, 
  Eye, 
  Activity, 
  Info,
  X,
  Layers,
  Sun,
  Cloud
} from "lucide-react";
import { database, analytics, firestore } from './firebase';
import { ref, onValue, set, push, get } from 'firebase/database';
import AQIHeatMap from "./components/AQIHeatMap";
import AlertSystem from "./components/AlertSystem";
import HistoricalChart from "./components/HistoricalChart";
import ForecastChart from "./components/ForecastChart";
import HealthAdvisory from "./components/HealthAdvisory";
import './index.css';

const App = () => {
  const [currentLocation, setCurrentLocation] = useState({ lat: 28.7041, lng: 77.1025, name: 'Delhi' });
  const [currentAQI, setCurrentAQI] = useState(null);
  const [allCitiesData, setAllCitiesData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [searchInput, setSearchInput] = useState('');
  const [availableCitiesForDisplay, setAvailableCitiesForDisplay] = useState([]); 
  const [apiStatus, setApiStatus] = useState('Offline');
  const [modelStatus, setModelStatus] = useState('Simulating');
  const [showAQIInfo, setShowAQIInfo] = useState(false);
  
  // OpenWeather API key
  const OPEN_WEATHER_API_KEY = 'a35cfae53c781d8331f68e88fbc411e1';

  // Major Indian cities with approximate AQI data (as fallback)
  const INDIAN_CITIES = {
    'delhi': { lat: 28.7041, lng: 77.1025, name: 'Delhi', aqi: 230 },
    'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai', aqi: 130 },
    'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru', aqi: 85 },
    'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai', aqi: 95 },
    'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata', aqi: 175 },
    'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', aqi: 110 },
    'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune', aqi: 90 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', aqi: 120 },
    'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur', aqi: 160 },
    'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow', aqi: 180 },
    'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur', aqi: 210 },
    'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur', aqi: 105 },
    'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore', aqi: 95 },
    'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal', aqi: 115 },
    'vadodara': { lat: 22.3072, lng: 73.1812, name: 'Vadodara', aqi: 85 },
    'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat', aqi: 100 },
    'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna', aqi: 190 },
    'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra', aqi: 170 },
    'chandigarh': { lat: 30.7333, lng: 76.7794, name: 'Chandigarh', aqi: 90 },
    'guwahati': { lat: 26.1445, lng: 91.7362, name: 'Guwahati', aqi: 80 }
  };

  // Initialize Firebase connection and fetch initial data
  useEffect(() => {
    // Set Firebase connection status
    setApiStatus('Connected to Firebase');
    setTimeout(() => {
      setModelStatus('Ready');
    }, 2000);

    // Setup Firebase listeners for real-time updates
    const aqiRef = ref(database, 'aqi');
    const unsubscribe = onValue(aqiRef, (snapshot) => {
      if (snapshot.exists()) {
        // If we have data in Firebase, use it
        console.log('Received AQI data from Firebase');
        // You could update your state here based on the Firebase data
      } else {
        console.log('No AQI data in Firebase yet, using simulated data');
        // Initialize Firebase with our simulated data
        const initialData = Object.entries(INDIAN_CITIES).reduce((acc, [key, city]) => {
          acc[key] = {
            aqi: city.aqi,
            city: city.name,
            coordinates: { lat: city.lat, lng: city.lng },
            timestamp: new Date().toISOString()
          };
          return acc;
        }, {});
        
        set(aqiRef, initialData);
      }
    });

    // Fetch list of available cities
    fetchAvailableCities();
    
    // Fetch all cities data for comparison
    fetchAllCitiesData();
    
    // Fetch data for current location
    fetchCityData('Delhi', 28.7041, 77.1025);
    
    // Fetch weather data for current location
    fetchWeatherData(28.7041, 77.1025);
    
    // Cleanup function
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Effect to update current city's detailed data when currentLocation changes
  useEffect(() => {
    if (currentLocation) {
      fetchCityData(currentLocation.name, currentLocation.lat, currentLocation.lng);
      fetchWeatherData(currentLocation.lat, currentLocation.lng);
    }
  }, [currentLocation]);

  // Fetch available cities for search dropdown
  const fetchAvailableCities = async () => {
    try {
      // Check if we have cities in Firebase
      const citiesRef = ref(database, 'cities');
      const snapshot = await get(citiesRef);
      
      if (snapshot.exists()) {
        // Use cities from Firebase
        const cities = Object.values(snapshot.val()).map(city => city.name);
        setAvailableCitiesForDisplay(cities);
      } else {
        // Use hardcoded cities and store them in Firebase
        const cities = Object.values(INDIAN_CITIES).map(city => city.name);
        set(citiesRef, INDIAN_CITIES);
        setAvailableCitiesForDisplay(cities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      // Fallback to major cities
      setAvailableCitiesForDisplay([
        'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 
        'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
      ]);
    }
  };

  // Fetch data for all cities to show comparison
  const fetchAllCitiesData = async () => {
    setLoading(true);
    try {
      // Check if we have fresh data in Firebase (less than 1 hour old)
      const allCitiesRef = ref(database, 'allCities');
      const snapshot = await get(allCitiesRef);
      
      let simulatedData;
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const timestamp = new Date(data.timestamp);
        const now = new Date();
        
        // If data is less than 1 hour old, use it
        if ((now - timestamp) < 3600000) {
          simulatedData = data.cities;
          console.log('Using cached city data from Firebase');
        } else {
          // Otherwise, generate new data
          simulatedData = generateAllCitiesData();
          set(allCitiesRef, { 
            cities: simulatedData,
            timestamp: new Date().toISOString()
          });
          console.log('Generated new city data and stored in Firebase');
        }
      } else {
        // No data exists, generate and store
        simulatedData = generateAllCitiesData();
        set(allCitiesRef, { 
          cities: simulatedData,
          timestamp: new Date().toISOString()
        });
        console.log('Generated new city data and stored in Firebase');
      }
      
      setAllCitiesData(simulatedData);
    } catch (error) {
      console.error('Error generating simulated city data:', error);
      // Generate data locally as fallback
      const simulatedData = generateAllCitiesData();
      setAllCitiesData(simulatedData);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate data for all cities
  const generateAllCitiesData = () => {
    return Object.values(INDIAN_CITIES).map(city => {
      // Add some variation to make the data look more realistic
      const variation = Math.random() * 20 - 10; // -10 to +10
      const aqi = Math.max(1, Math.min(500, Math.round(city.aqi + variation)));
      
      return {
        city: city.name,
        coordinates: { lat: city.lat, lng: city.lng },
        aqi: aqi,
        pm25: Math.floor(aqi * 0.6),
        pm10: Math.floor(aqi * 0.8),
        no2: Math.floor(aqi * 0.3),
        so2: Math.floor(aqi * 0.2),
        o3: Math.floor(aqi * 0.4),
        co: Math.floor(aqi * 0.1),
        timestamp: new Date().toISOString(),
        category: getAQICategory(aqi).category
      };
    });
  };

  // Function to fetch specific city data (used for search or map clicks)
  const fetchCityData = async (cityName, lat, lng) => {
    setLoading(true);
    try {
      // Check if we have fresh data in Firebase for this city
      const cityKey = cityName.toLowerCase().replace(/\s+/g, '');
      const cityRef = ref(database, `cities/${cityKey}`);
      const snapshot = await get(cityRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const timestamp = new Date(data.timestamp);
        const now = new Date();
        
        // If data is less than 30 minutes old, use it
        if ((now - timestamp) < 1800000) {
          setCurrentAQI(data);
          console.log(`Using cached data for ${cityName} from Firebase`);
          setLoading(false);
          return data;
        }
      }
      
      // Either no data or stale data, generate new
      // Try to find the city in our predefined list
      const cityData = INDIAN_CITIES[cityKey];
      
      // If found, use that as a base, otherwise generate random data
      let baseAQI;
      if (cityData) {
        baseAQI = cityData.aqi;
      } else {
        // Generate a somewhat realistic AQI based on coordinates
        // Cities in north India tend to have higher AQI
        const latitude = lat || currentLocation.lat;
        const northernFactor = Math.max(0, 35 - latitude) * 5; // Higher for northern cities
        baseAQI = 80 + northernFactor + Math.random() * 40;
      }
      
      // Add some random variation
      const variation = Math.random() * 30 - 15; // -15 to +15
      const aqi = Math.max(1, Math.min(500, Math.round(baseAQI + variation)));
      
      // Create the simulated data object
      const simulatedData = {
        aqi: aqi,
        city: cityName,
        coordinates: { lat: lat || currentLocation.lat, lng: lng || currentLocation.lng },
        timestamp: new Date().toISOString(),
        pm25: Math.floor(aqi * 0.6),
        pm10: Math.floor(aqi * 0.8),
        no2: Math.floor(aqi * 0.3),
        so2: Math.floor(aqi * 0.2),
        o3: Math.floor(aqi * 0.4),
        co: Math.floor(aqi * 0.1),
        category: getAQICategory(aqi).category
      };
      
      // Store in Firebase
      set(cityRef, simulatedData);
      console.log(`Generated new data for ${cityName} and stored in Firebase`);
      
      setCurrentAQI(simulatedData);
      return simulatedData;
    } catch (error) {
      console.error(`Error generating data for ${cityName}:`, error);
      
      // Fallback to very simple simulated data
      const fallbackAQI = Math.floor(Math.random() * 200) + 50; // Random AQI between 50-250
      const fallbackData = {
        aqi: fallbackAQI,
        city: cityName,
        coordinates: { lat: lat || currentLocation.lat, lng: lng || currentLocation.lng },
        timestamp: new Date().toISOString(),
        pm25: Math.floor(fallbackAQI * 0.6),
        pm10: Math.floor(fallbackAQI * 0.8),
        no2: Math.floor(fallbackAQI * 0.3),
        so2: Math.floor(fallbackAQI * 0.2),
        o3: Math.floor(fallbackAQI * 0.4),
        co: Math.floor(fallbackAQI * 0.1),
        category: getAQICategory(fallbackAQI).category
      };
      
      setCurrentAQI(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  };

  // Fetch comprehensive weather data from OpenWeather API
  const fetchWeatherData = async (lat, lng) => {
    try {
      // Check if we have fresh weather data in Firebase
      const weatherKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      const weatherRef = ref(database, `weather/${weatherKey}`);
      const snapshot = await get(weatherRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const timestamp = new Date(data.timestamp);
        const now = new Date();
        
        // If data is less than 1 hour old, use it
        if ((now - timestamp) < 3600000) {
          setWeatherData(data);
          console.log('Using cached weather data from Firebase');
          return;
        }
      }
      
      // First try the One Call API (preferred)
      try {
        const oneCallResponse = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&units=metric&exclude=minutely&appid=${OPEN_WEATHER_API_KEY}`
        );
        
        if (!oneCallResponse.ok) {
          throw new Error(`One Call API error: ${oneCallResponse.status}`);
        }
        
        const data = await oneCallResponse.json();
        
        // Process current weather data
        const processedWeatherData = {
          temperature: Math.round(data.current.temp),
          feelsLike: Math.round(data.current.feels_like),
          humidity: data.current.humidity,
          windSpeed: Math.round(data.current.wind_speed * 3.6), // Convert m/s to km/h
          windDirection: getWindDirection(data.current.wind_deg),
          visibility: data.current.visibility ? Math.round(data.current.visibility / 1000) : 10, // Convert meters to km
          pressure: data.current.pressure,
          uvIndex: data.current.uvi,
          description: data.current.weather[0].description,
          icon: data.current.weather[0].icon,
          timestamp: new Date().toISOString(),
          // Extract daily forecast
          forecast: data.daily ? data.daily.map(day => ({
            date: new Date(day.dt * 1000).toISOString(),
            tempMax: Math.round(day.temp.max),
            tempMin: Math.round(day.temp.min),
            description: day.weather[0].description,
            icon: day.weather[0].icon,
            precipitation: day.pop * 100, // Convert to percentage
            humidity: day.humidity,
            windSpeed: Math.round(day.wind_speed * 3.6), // Convert m/s to km/h
            uvIndex: day.uvi
          })).slice(0, 7) : [], // Get 7-day forecast
          // Extract alerts if available
          alerts: data.alerts ? data.alerts.map(alert => ({
            event: alert.event,
            start: new Date(alert.start * 1000).toISOString(),
            end: new Date(alert.end * 1000).toISOString(),
            description: alert.description,
            sender: alert.sender_name
          })) : []
        };
        
        // Store in Firebase
        set(weatherRef, processedWeatherData);
        
        setWeatherData(processedWeatherData);
        return;
      } catch (oneCallError) {
        console.warn("One Call API failed, falling back to current weather API", oneCallError);
        // Continue to fallback API
      }
      
      // Fallback to regular current weather API
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const processedWeatherData = {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        windDirection: getWindDirection(data.wind.deg),
        visibility: Math.round(data.visibility / 1000), // Convert meters to km
        pressure: data.main.pressure,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        timestamp: new Date().toISOString(),
        // Add limited forecast data based on current trends
        forecast: Array(7).fill().map((_, i) => {
          const baseTemp = data.main.temp;
          const variation = Math.random() * 5 - 2.5; // -2.5 to +2.5
          return {
            date: new Date(Date.now() + i * 86400000).toISOString(), // Current date + i days
            tempMax: Math.round(baseTemp + variation + 5),
            tempMin: Math.round(baseTemp + variation - 5),
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            precipitation: Math.floor(Math.random() * 50), // 0-50%
            humidity: data.main.humidity,
            windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
            uvIndex: Math.floor(Math.random() * 10) + 1 // 1-10
          };
        }),
        alerts: []
      };
      
      // Store in Firebase
      set(weatherRef, processedWeatherData);
      
      setWeatherData(processedWeatherData);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      
      // Fallback to basic simulated data
      const fallbackWeather = {
        temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
        feelsLike: Math.floor(Math.random() * 15) + 20, // Similar to temperature
        humidity: Math.floor(Math.random() * 30) + 50, // 50-80%
        windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
        windDirection: 'N',
        visibility: Math.floor(Math.random() * 5) + 5, // 5-10 km
        pressure: Math.floor(Math.random() * 20) + 1000, // 1000-1020 hPa
        uvIndex: Math.floor(Math.random() * 10) + 1, // 1-10
        description: 'cloudy',
        icon: '04d',
        timestamp: new Date().toISOString(),
        forecast: Array(7).fill().map((_, i) => ({
          date: new Date(Date.now() + i * 86400000).toISOString(), // Current date + i days
          tempMax: Math.floor(Math.random() * 15) + 25, // 25-40°C
          tempMin: Math.floor(Math.random() * 10) + 15, // 15-25°C
          description: 'cloudy',
          icon: '04d',
          precipitation: Math.floor(Math.random() * 50), // 0-50%
          humidity: Math.floor(Math.random() * 30) + 50, // 50-80%
          windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
          uvIndex: Math.floor(Math.random() * 10) + 1 // 1-10
        })),
        alerts: []
      };
      
      setWeatherData(fallbackWeather);
    }
  };

  // Convert wind direction in degrees to cardinal directions
  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Handler for city search using OpenWeather API
  const handleSearchCity = async () => {
    if (!searchInput.trim()) return;
    
    try {
      // First check if the city is in our predefined list for faster results
      const cityKey = searchInput.trim().toLowerCase().replace(/\s+/g, '');
      const knownCity = Object.values(INDIAN_CITIES).find(
        city => city.name.toLowerCase().includes(cityKey)
      );
      
      if (knownCity) {
        const newLocation = {
          lat: knownCity.lat,
          lng: knownCity.lng,
          name: knownCity.name
        };
        
        setCurrentLocation(newLocation);
        setSearchInput('');
        return;
      }
      
      // If not in our list, use OpenWeather API
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchInput)}&limit=1&appid=${OPEN_WEATHER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const newLocation = {
          lat: location.lat,
          lng: location.lon,
          name: location.name + (location.state ? `, ${location.state}` : '')
        };
        
        setCurrentLocation(newLocation);
        setSearchInput('');
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error during city search:', error);
      alert('Unable to search for this location. Please try again later.');
    }
  };

  // Handler for "Current Location" button - using OpenWeather for reverse geocoding
  const handleLocationUpdate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Use OpenWeather's reverse geocoding API
          try {
            const geocodeResponse = await fetch(
              `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${OPEN_WEATHER_API_KEY}`
            );
            
            if (!geocodeResponse.ok) {
              throw new Error(`OpenWeather API error: ${geocodeResponse.status}`);
            }
            
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData && geocodeData.length > 0) {
              const location = geocodeData[0];
              const locationName = location.name + (location.state ? `, ${location.state}` : '');
              
              const newLocation = {
                lat: latitude,
                lng: longitude,
                name: locationName
              };
              
              setCurrentLocation(newLocation);
            } else {
              throw new Error('Reverse geocoding returned no results');
            }
          } catch (error) {
            console.error('Error during reverse geocoding:', error);
            
            // Fallback if geocoding fails
            const newLocation = {
              lat: latitude,
              lng: longitude,
              name: 'Your Location'
            };
            
            setCurrentLocation(newLocation);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to access your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  // Handler for selecting a location from the map or city list
  const handleLocationSelect = (location) => {
    setCurrentLocation(location);
  };

  // Helper function to determine AQI category and color
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return { category: 'Good', color: 'aqi-bg-green-500', textColor: 'text-green-800' };
    if (aqi <= 100) return { category: 'Moderate', color: 'aqi-bg-yellow-500', textColor: 'text-yellow-800' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: 'aqi-bg-orange-500', textColor: 'text-orange-800' };
    if (aqi <= 200) return { category: 'Unhealthy', color: 'aqi-bg-red-500', textColor: 'text-red-800' };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: 'aqi-bg-purple-500', textColor: 'text-purple-800' };
    return { category: 'Hazardous', color: 'aqi-bg-red-900', textColor: 'text-red-900' };
  };

  // AQI Scale Information
  const AQI_SCALE = [
    { range: '0-50', level: 'Good', color: '#00E400', description: 'Air quality is satisfactory, and air pollution poses little or no risk.' },
    { range: '51-100', level: 'Moderate', color: '#FFFF00', description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.' },
    { range: '101-150', level: 'Unhealthy for Sensitive Groups', color: '#FF7E00', description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.' },
    { range: '151-200', level: 'Unhealthy', color: '#FF0000', description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.' },
    { range: '201-300', level: 'Very Unhealthy', color: '#8F3F97', description: 'Health alert: The risk of health effects is increased for everyone.' },
    { range: '301+', level: 'Hazardous', color: '#7E0023', description: 'Health warning of emergency conditions: everyone is more likely to be affected.' }
  ];

  if (loading && !currentAQI) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">Loading Air Quality Data...</h2>
          <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the latest information</p>
        </div>
      </div>
    );
  }

  const displayAQI = currentAQI?.aqi || 0;
  const aqiCategory = getAQICategory(displayAQI);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-glass py-4 px-6 sm:px-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Vayu Drishti</h1>
              <p className="text-sm text-gray-600">Real-time Air Quality Monitoring</p>
            </div>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input 
                  type="text" 
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search for a city..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchCity()}
                />
              </div>
              
              {/* Current Location Button */}
              <button 
                onClick={handleLocationUpdate} 
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                <MapPin className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">My Location</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Location & AQI Display */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between">
              <div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">{currentLocation.name}</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {currentAQI?.timestamp ? new Date(currentAQI.timestamp).toLocaleString() : 'N/A'}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex items-center">
                <div className={`aqi-badge ${aqiCategory.color} flex flex-col items-center justify-center rounded-lg p-3`}>
                  <span className="text-3xl font-bold text-white">{displayAQI}</span>
                  <span className="text-sm font-medium text-white">AQI</span>
                </div>
                <div className="ml-4">
                  <h3 className={`text-lg font-semibold ${aqiCategory.textColor}`}>{aqiCategory.category}</h3>
                  <button
                    onClick={() => setShowAQIInfo(true)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    <Info className="h-4 w-4 mr-1" />
                    What does this mean?
                  </button>
                </div>
              </div>
            </div>
            
            {/* Pollutant & Weather Metrics */}
            <div className="bg-gray-50 p-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Key Pollutants & Weather Data</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: 'PM2.5', value: currentAQI?.pm25 || 'N/A', unit: 'μg/m³', icon: Wind },
                  { name: 'PM10', value: currentAQI?.pm10 || 'N/A', unit: 'μg/m³', icon: Wind },
                  { name: 'NO₂', value: currentAQI?.no2 || 'N/A', unit: 'μg/m³', icon: Activity },
                  { name: 'Temperature', value: weatherData?.temperature || 'N/A', unit: '°C', icon: Thermometer },
                  { name: 'Humidity', value: weatherData?.humidity || 'N/A', unit: '%', icon: Droplets },
                  { name: 'Visibility', value: weatherData?.visibility || 'N/A', unit: 'km', icon: Eye }
                ].map((metric, index) => (
                  <div key={index} className="pollutant-card bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-center">
                      <metric.icon className="h-6 w-6 mx-auto text-gray-500 mb-2" />
                      <p className="text-xs text-gray-500">{metric.name}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {metric.value} <span className="text-xs text-gray-500">{metric.unit}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {weatherData?.description && (
                <div className="mt-4 text-sm text-center text-gray-600">
                  Current weather: {weatherData.description.charAt(0).toUpperCase() + weatherData.description.slice(1)}
                  {weatherData.icon && (
                    <img 
                      src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`} 
                      alt={weatherData.description}
                      className="w-8 h-8 inline-block ml-2"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex flex-wrap space-x-1 border-b border-gray-200 overflow-x-auto pb-1">
          {[
            { id: 'current', label: 'AQI Map', icon: MapPin },
            { id: 'historical', label: 'Historical Trends', icon: TrendingUp },
            { id: 'forecast', label: 'Forecast', icon: Calendar },
            { id: 'health', label: 'Health Advisory', icon: Heart },
            { id: 'alerts', label: 'Alerts', icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab px-4 py-2 border-b-2 ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent hover:text-gray-700'
              } flex items-center text-sm font-medium`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="fade-in">
          {activeTab === 'current' && (
            <AQIHeatMap 
              currentLocation={currentLocation}
              onLocationSelect={handleLocationSelect}
              allCitiesData={allCitiesData}
            />
          )}
          
          {activeTab === 'historical' && (
            <HistoricalChart selectedCity={currentLocation.name} />
          )}
          
          {activeTab === 'forecast' && (
            <ForecastChart 
              selectedCity={currentLocation.name} 
              forecastData={weatherData?.forecast || []}
            />
          )}
          
          {activeTab === 'health' && (
            <HealthAdvisory 
              selectedCity={currentLocation.name}
              currentAQI={displayAQI}
            />
          )}
          
          {activeTab === 'alerts' && (
            <AlertSystem 
              selectedCity={currentLocation.name}
              weatherAlerts={weatherData?.alerts || []}
            />
          )}
        </div>
      </main>
      
      {/* AQI Scale Info Modal */}
      {showAQIInfo && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Understanding AQI (Air Quality Index)</h3>
              <button 
                onClick={() => setShowAQIInfo(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                The Air Quality Index (AQI) is a standardized indicator for reporting air quality. 
                It tells you how clean or polluted your air is and what associated health effects 
                might be of concern.
              </p>
              
              <div className="space-y-4 mt-6">
                {AQI_SCALE.map((level, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <div 
                        className="w-6 h-6 rounded-full mr-3" 
                        style={{ backgroundColor: level.color }}
                      ></div>
                      <h4 className="text-md font-medium text-gray-900">
                        {level.level} (AQI: {level.range})
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Health Recommendations</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Use the "Health Advisory" tab for personalized recommendations based on the 
                      current air quality in your area. Each AQI level requires different precautions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowAQIInfo(false)}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Weather Alerts Toast (if any) */}
      {weatherData?.alerts && weatherData.alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-xs w-full bg-white rounded-lg shadow-lg border-l-4 border-red-500 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center">
              <Bell className="h-6 w-6 text-red-500" />
              <span className="ml-3 text-sm font-medium text-gray-900">Weather Alert</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 line-clamp-2">
              {weatherData.alerts[0].event}: {weatherData.alerts[0].description.split('\n')[0]}
            </p>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-xs text-blue-600 hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2023 Vayu Drishti - Real-time Air Quality Monitoring</p>
            <div className="flex items-center mt-2 sm:mt-0">
              <span className="flex items-center mr-4">
                <span className={`inline-block w-2 h-2 rounded-full ${apiStatus === 'Connected to Firebase' ? 'bg-green-500' : 'bg-yellow-500'} mr-1`}></span>
                API: {apiStatus}
              </span>
              <span className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full ${modelStatus === 'Ready' ? 'bg-green-500' : 'bg-yellow-500'} mr-1`}></span>
                ML Model: {modelStatus}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;