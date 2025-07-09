const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for demo (use database in production)
let aqiData = new Map();
let historicalData = new Map();
let alerts = [];

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyAoKk7dHcJoF7H2tRb_dREOO_dSByRDgzw';

// Major Indian cities with coordinates
const INDIAN_CITIES = {
  'delhi': { lat: 28.7041, lng: 77.1025, name: 'Delhi' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru' },
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
  'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
  'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
  'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow' },
  'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur' },
  'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur' },
  'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore' },
  'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal' },
  'vadodara': { lat: 22.3072, lng: 73.1812, name: 'Vadodara' },
  'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat' },
  'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna' },
  'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra' },
  'nashik': { lat: 19.9975, lng: 73.7898, name: 'Nashik' },
  'faridabad': { lat: 28.4089, lng: 77.3178, name: 'Faridabad' }
};

// Generate realistic AQI data based on city characteristics
function generateAQIData(cityKey, cityData) {
  const cityHash = cityKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const timeOfDay = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  
  // Base AQI with city-specific factors
  let baseAQI = 50 + (cityHash % 100);
  
  // Time-based variations (higher during rush hours)
  if (timeOfDay >= 7 && timeOfDay <= 10) baseAQI += 20; // Morning rush
  if (timeOfDay >= 17 && timeOfDay <= 20) baseAQI += 25; // Evening rush
  if (timeOfDay >= 0 && timeOfDay <= 5) baseAQI -= 15; // Night time
  
  // Weekend effect (slightly better air quality)
  if (dayOfWeek === 0 || dayOfWeek === 6) baseAQI -= 10;
  
  // Seasonal variations (winter months have higher pollution)
  const month = new Date().getMonth();
  if (month >= 10 || month <= 2) baseAQI += 30; // Nov-Feb
  
  // Add some randomness
  baseAQI += Math.random() * 40 - 20;
  baseAQI = Math.max(0, Math.min(500, Math.floor(baseAQI)));
  
  const pm25 = Math.floor(baseAQI * 0.6 + Math.random() * 20);
  const pm10 = Math.floor(baseAQI * 0.8 + Math.random() * 30);
  const no2 = Math.floor(baseAQI * 0.4 + Math.random() * 15);
  const so2 = Math.floor(baseAQI * 0.3 + Math.random() * 10);
  const o3 = Math.floor(baseAQI * 0.5 + Math.random() * 25);
  const co = Math.floor(baseAQI * 0.2 + Math.random() * 5);
  
  return {
    city: cityData.name,
    coordinates: { lat: cityData.lat, lng: cityData.lng },
    aqi: baseAQI,
    pm25: Math.max(0, pm25),
    pm10: Math.max(0, pm10),
    no2: Math.max(0, no2),
    so2: Math.max(0, so2),
    o3: Math.max(0, o3),
    co: Math.max(0, co),
    timestamp: new Date().toISOString(),
    category: getAQICategory(baseAQI),
    healthRecommendations: getHealthRecommendations(baseAQI)
  };
}

// Generate weather data
function generateWeatherData(cityKey) {
  const cityHash = cityKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const month = new Date().getMonth();
  
  let baseTemp = 25;
  if (month >= 3 && month <= 5) baseTemp = 35; // Summer
  if (month >= 6 && month <= 9) baseTemp = 28; // Monsoon
  if (month >= 10 || month <= 2) baseTemp = 20; // Winter
  
  return {
    temperature: baseTemp + (cityHash % 10) - 5 + Math.random() * 6 - 3,
    humidity: 50 + (cityHash % 30) + Math.random() * 20 - 10,
    windSpeed: 5 + Math.random() * 15,
    windDirection: Math.random() * 360,
    pressure: 1010 + Math.random() * 20 - 10,
    visibility: 8 + Math.random() * 7
  };
}

// Generate historical data for a city
function generateHistoricalData(cityKey, days = 30) {
  const data = [];
  const now = new Date();
  const cityHash = cityKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const baseAQI = 60 + (cityHash % 80) + Math.sin(i * 0.1) * 20 + Math.random() * 30 - 15;
    const finalAQI = Math.max(0, Math.min(500, Math.floor(baseAQI)));
    
    data.push({
      date: date.toISOString().split('T')[0],
      aqi: finalAQI,
      pm25: Math.floor(finalAQI * 0.6 + Math.random() * 15),
      pm10: Math.floor(finalAQI * 0.8 + Math.random() * 25),
      no2: Math.floor(finalAQI * 0.4 + Math.random() * 12),
      temperature: 25 + Math.sin(i * 0.2) * 8 + Math.random() * 4 - 2,
      humidity: 60 + Math.sin(i * 0.15) * 20 + Math.random() * 10 - 5,
      category: getAQICategory(finalAQI)
    });
  }
  
  return data;
}

// Generate forecast data
function generateForecastData(cityKey, currentAQI) {
  const data = [];
  const now = new Date();
  
  for (let i = 1; i <= 3; i++) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    // Simple trend-based forecast
    const trend = Math.random() * 20 - 10; // -10 to +10 change
    const forecastAQI = Math.max(0, Math.min(500, Math.floor(currentAQI + trend)));
    
    data.push({
      date: date.toISOString().split('T')[0],
      aqi: forecastAQI,
      pm25: Math.floor(forecastAQI * 0.6),
      confidence: Math.floor(Math.random() * 20) + 70, // 70-90% confidence
      category: getAQICategory(forecastAQI)
    });
  }
  
  return data;
}

function getAQICategory(aqi) {
  if (aqi <= 50) return { category: 'Good', color: '#00E400', level: 1 };
  if (aqi <= 100) return { category: 'Moderate', color: '#FFFF00', level: 2 };
  if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: '#FF7E00', level: 3 };
  if (aqi <= 200) return { category: 'Unhealthy', color: '#FF0000', level: 4 };
  if (aqi <= 300) return { category: 'Very Unhealthy', color: '#8F3F97', level: 5 };
  return { category: 'Hazardous', color: '#7E0023', level: 6 };
}

function getHealthRecommendations(aqi) {
  const category = getAQICategory(aqi).category;
  const recommendations = {
    'Good': [
      'Air quality is excellent! Perfect for outdoor activities.',
      'Great day for jogging, cycling, or spending time outdoors.',
      'No special precautions needed.'
    ],
    'Moderate': [
      'Air quality is acceptable for most people.',
      'Unusually sensitive individuals may experience minor symptoms.',
      'Consider reducing prolonged outdoor exertion.'
    ],
    'Unhealthy for Sensitive Groups': [
      'Members of sensitive groups may experience health effects.',
      'Consider wearing a mask during outdoor activities.',
      'Limit prolonged outdoor activities if you have respiratory conditions.'
    ],
    'Unhealthy': [
      'Everyone may experience health effects.',
      'Wear a mask when going outside.',
      'Avoid outdoor jogging and strenuous activities.',
      'Use air purifiers indoors.'
    ],
    'Very Unhealthy': [
      'Health alert: everyone may experience serious health effects.',
      'Avoid all outdoor activities.',
      'Keep windows closed and use air purifiers.',
      'Wear N95 masks if you must go outside.'
    ],
    'Hazardous': [
      'Emergency conditions: everyone is at risk.',
      'Stay indoors with air purifiers running.',
      'Avoid all outdoor activities.',
      'Seek medical attention if experiencing symptoms.'
    ]
  };
  return recommendations[category] || [];
}

// Initialize data for all cities
function initializeAllCitiesData() {
  Object.keys(INDIAN_CITIES).forEach(cityKey => {
    const cityData = INDIAN_CITIES[cityKey];
    const aqiInfo = generateAQIData(cityKey, cityData);
    const weatherInfo = generateWeatherData(cityKey);
    const historical = generateHistoricalData(cityKey);
    
    aqiData.set(cityKey, {
      ...aqiInfo,
      weather: weatherInfo
    });
    
    historicalData.set(cityKey, historical);
  });
}

// Check for alerts and notify clients
function checkAlertsAndNotify() {
  aqiData.forEach((data, cityKey) => {
    if (data.aqi > 150) { // Unhealthy threshold
      const alert = {
        id: Date.now() + Math.random(),
        city: data.city,
        aqi: data.aqi,
        category: data.category.category,
        message: `High AQI Alert in ${data.city}: ${data.aqi} - ${data.category.category}`,
        timestamp: new Date().toISOString(),
        type: data.aqi > 200 ? 'critical' : 'warning'
      };
      
      alerts.unshift(alert);
      alerts = alerts.slice(0, 50); // Keep only last 50 alerts
      
      // Emit to all connected clients
      io.emit('aqiAlert', alert);
    }
  });
}

// Update AQI data every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Updating AQI data...');
  initializeAllCitiesData();
  checkAlertsAndNotify();
  
  // Emit updated data to all connected clients
  io.emit('aqiUpdate', Array.from(aqiData.values()));
});

// API Routes
app.get('/api/cities', (req, res) => {
  res.json(Object.keys(INDIAN_CITIES).map(key => ({
    key,
    ...INDIAN_CITIES[key]
  })));
});

app.get('/api/aqi/all', (req, res) => {
  res.json(Array.from(aqiData.values()));
});

app.get('/api/aqi/:city', (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  const data = aqiData.get(cityKey);
  
  if (!data) {
    return res.status(404).json({ error: 'City not found' });
  }
  
  res.json(data);
});

app.get('/api/historical/:city', (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  const data = historicalData.get(cityKey);
  
  if (!data) {
    return res.status(404).json({ error: 'Historical data not found' });
  }
  
  res.json(data);
});

app.get('/api/forecast/:city', (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  const currentData = aqiData.get(cityKey);
  
  if (!currentData) {
    return res.status(404).json({ error: 'City not found' });
  }
  
  const forecast = generateForecastData(cityKey, currentData.aqi);
  res.json(forecast);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts.slice(0, 20)); // Return last 20 alerts
});

app.get('/api/heatmap-data', (req, res) => {
  const heatmapData = Array.from(aqiData.values()).map(data => ({
    lat: data.coordinates.lat,
    lng: data.coordinates.lng,
    weight: data.aqi / 100, // Normalize for heatmap
    aqi: data.aqi,
    city: data.city
  }));
  
  res.json(heatmapData);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data
  socket.emit('aqiUpdate', Array.from(aqiData.values()));
  socket.emit('alertsUpdate', alerts.slice(0, 20));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize data on server start
initializeAllCitiesData();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});