const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

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
let aqiData = new Map(); // Stores current AQI for each city
let historicalData = new Map(); // Stores historical data for each city
let alerts = []; // Stores recent alerts

// Google Maps API Key (used by frontend and now backend for geocoding)
const GOOGLE_MAPS_API_KEY = 'AIzaSyAoKk7dHcJoF7H2tRb_dREOO_dSByRDgzw';

// Comprehensive list of Major Indian cities with coordinates
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
  'faridabad': { lat: 28.4089, lng: 77.3178, name: 'Faridabad' },
  'ghaziabad': { lat: 28.6692, lng: 77.4538, name: 'Ghaziabad' },
  'ludhiana': { lat: 30.9010, lng: 75.8573, name: 'Ludhiana' },
  'amritsar': { lat: 31.6340, lng: 74.8723, name: 'Amritsar' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, name: 'Chandigarh' },
  'kochi': { lat: 9.9312, lng: 76.2673, name: 'Kochi' },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram' },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam' },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar' },
  'guwahati': { lat: 26.1445, lng: 91.7362, name: 'Guwahati' },
  'mysuru': { lat: 12.2958, lng: 76.6394, name: 'Mysuru' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, name: 'Coimbatore' },
  'madurai': { lat: 9.9252, lng: 78.1198, name: 'Madurai' },
  'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal' },
  'ranchi': { lat: 23.3441, lng: 85.3096, name: 'Ranchi' },
  'jamshedpur': { lat: 22.8045, lng: 86.2029, name: 'Jamshedpur' },
  'dhanbad': { lat: 23.7957, lng: 86.4304, name: 'Dhanbad' },
  'srinagar': { lat: 34.0837, lng: 74.7973, name: 'Srinagar' },
  'shimla': { lat: 31.1048, lng: 77.1734, name: 'Shimla' }
};

// Function to generate simulated AQI data for ANY location
const generateSimulatedAQI = (name, lat, lng, latestAQI = null) => {
  let aqi;
  if (latestAQI !== null) {
    // Simulate slight variations around the latest known AQI
    aqi = Math.max(20, latestAQI + Math.floor(Math.random() * 40) - 20);
  } else {
    // Generate a random AQI for initial load or new city
    aqi = Math.floor(Math.random() * 200) + 50; // Between 50 and 250
  }

  const getAQICategory = (aqiValue) => {
    if (aqiValue <= 50) return { category: 'Good', color: 'bg-green-500', level: 1 };
    if (aqiValue <= 100) return { category: 'Moderate', color: 'bg-yellow-500', level: 2 };
    if (aqiValue <= 150) return { category: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', level: 3 };
    if (aqiValue <= 200) return { category: 'Unhealthy', color: 'bg-red-500', level: 4 };
    if (aqiValue <= 300) return { category: 'Very Unhealthy', color: 'bg-purple-500', level: 5 };
    return { category: 'Hazardous', color: 'bg-red-900', level: 6 };
  };

  const category = getAQICategory(aqi);

  // Simulate other pollutants based on AQI
  const pm25 = Math.max(10, Math.min(250, Math.floor(aqi * 0.6 + Math.random() * 30 - 15)));
  const pm10 = Math.max(20, Math.min(400, Math.floor(aqi * 0.8 + Math.random() * 40 - 20)));
  const no2 = Math.max(5, Math.min(80, Math.floor(aqi * 0.2 + Math.random() * 10 - 5)));
  const so2 = Math.max(2, Math.min(50, Math.floor(aqi * 0.1 + Math.random() * 5 - 2)));
  const o3 = Math.max(10, Math.min(120, Math.floor(aqi * 0.3 + Math.random() * 15 - 7)));
  const co = Math.max(0.5, Math.min(15, parseFloat((aqi * 0.05 + Math.random() * 2 - 1).toFixed(1))));

  // Simulate weather data based on general location (can be improved with real weather API)
  // For demo, apply some variation based on latitude/season
  const baseTemp = 25 - Math.abs(lat - 20) * 0.5 + Math.random() * 5 - 2.5; // Colder further from equator
  const baseHumidity = 60 + Math.random() * 20 - 10;
  const baseWind = 10 + Math.random() * 8 - 4;
  const baseVisibility = 7 + Math.random() * 4 - 2;

  const temperature = Math.floor(baseTemp);
  const humidity = Math.floor(baseHumidity);
  const windSpeed = Math.floor(baseWind);
  const visibility = Math.floor(baseVisibility);

  return {
    city: name,
    coordinates: { lat, lng },
    aqi,
    pm25,
    pm10,
    no2,
    so2,
    o3,
    co,
    timestamp: new Date().toISOString(),
    category,
    healthRecommendations: ['Simulated recommendation based on AQI'],
    weather: { temperature, humidity, windSpeed, visibility }
  };
};

// Function to generate simulated historical data
const generateHistoricalData = (name) => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) { // Last 30 days
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Use a simpler AQI generation for historical to show trend
    const aqi = 50 + Math.floor(Math.sin(i / 5) * 40) + Math.floor(Math.random() * 30);
    const pm25 = Math.floor(aqi * 0.6);
    const no2 = Math.floor(aqi * 0.2);
    data.push({
      date: date.toISOString().split('T')[0], //YYYY-MM-DD
      aqi: Math.max(20, aqi),
      pm25: Math.max(10, pm25),
      no2: Math.max(5, no2),
      temperature: 20 + Math.floor(Math.random() * 15),
      humidity: 50 + Math.floor(Math.random() * 30),
      windSpeed: 5 + Math.floor(Math.random() * 10),
    });
  }
  return data;
};

// Function to generate simulated alerts
const generateAlert = (city, aqi, category) => {
  const timestamp = new Date().toISOString();
  let type = 'warning';
  let message = `AQI in ${city} is elevated to ${aqi} (${category.category}).`;

  if (aqi > 200) {
    type = 'critical';
    message = `Critical alert! AQI in ${city} has reached ${aqi} (${category.category}). Take precautions.`;
  } else if (aqi > 150) {
    type = 'warning';
    message = `Warning: AQI in ${city} is ${aqi} (${category.category}). Sensitive groups should be cautious.`;
  }
  return { id: Date.now() + Math.random(), city, aqi, category: category.category, type, message, timestamp };
};

// Initialize data for all INDIAN_CITIES
Object.keys(INDIAN_CITIES).forEach(cityKey => {
  const cityInfo = INDIAN_CITIES[cityKey];
  const initialAQI = generateSimulatedAQI(cityInfo.name, cityInfo.lat, cityInfo.lng);
  if (initialAQI) {
    aqiData.set(cityKey, initialAQI);
    historicalData.set(cityKey, generateHistoricalData(cityInfo.name));
    // Generate initial alerts if AQI is high
    if (initialAQI.aqi > 150) {
      alerts.unshift(generateAlert(initialAQI.city, initialAQI.aqi, initialAQI.category));
    }
  }
});

// Update AQI data and alerts every minute
cron.schedule('* * * * *', () => {
  console.log('Updating AQI data...');
  const updatedAqiDataArray = [];
  aqiData.forEach((data, cityKey) => {
    const newAqi = generateSimulatedAQI(data.city, data.coordinates.lat, data.coordinates.lng, data.aqi);
    if (newAqi) {
      aqiData.set(cityKey, newAqi);
      updatedAqiDataArray.push(newAqi); // Collect for broadcast

      // Update historical data (add new entry, keep last 30 days)
      let cityHistorical = historicalData.get(cityKey) || [];
      cityHistorical.push({
        date: new Date().toISOString().split('T')[0],
        aqi: newAqi.aqi,
        pm25: newAqi.pm25,
        no2: newAqi.no2,
        temperature: newAqi.weather.temperature,
        humidity: newAqi.weather.humidity,
        windSpeed: newAqi.weather.windSpeed,
      });
      if (cityHistorical.length > 30) {
        cityHistorical = cityHistorical.slice(-30);
      }
      historicalData.set(cityKey, cityHistorical);

      // Check for alerts
      if (newAqi.aqi > 150) {
        const newAlert = generateAlert(newAqi.city, newAqi.aqi, newAqi.category);
        alerts.unshift(newAlert); // Add to the beginning
        if (alerts.length > 20) { // Keep only latest 20 alerts
          alerts = alerts.slice(0, 20);
        }
        io.emit('aqiAlert', newAlert); // Emit individual alert
      }
    }
  });
  io.emit('aqiUpdate', updatedAqiDataArray); // Broadcast all updated AQI data
  io.emit('alertsUpdate', alerts); // Broadcast updated alerts list
});


// API Endpoints
app.get('/api/aqi/all', (req, res) => {
  res.json(Array.from(aqiData.values()));
});

// New endpoint for server-side geocoding
app.get('/api/geocode', async (req, res) => {
  const address = req.query.address;
  if (!address) {
    return res.status(400).json({ error: 'Address parameter is required.' });
  }
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      const formattedAddress = result.formatted_address;
      res.json({
        lat: location.lat,
        lng: location.lng,
        name: formattedAddress.split(',')[0].trim(), // Extract primary name
        full_address: formattedAddress
      });
    } else {
      res.status(404).json({ error: 'Location not found', status: response.data.status });
    }
  } catch (error) {
    console.error('Geocoding API error:', error.message);
    res.status(500).json({ error: 'Failed to geocode address', details: error.message });
  }
});


app.get('/api/aqi/:city', async (req, res) => {
  const cityQuery = req.params.city.toLowerCase();
  let cityData = aqiData.get(cityQuery);

  if (cityData) {
    return res.json(cityData);
  }

  // If not in our in-memory map, try to geocode and generate dynamic data
  try {
    const geocodeResponse = await axios.get(`http://localhost:3001/api/geocode?address=${cityQuery}`);
    const { lat, lng, name } = geocodeResponse.data;

    // Generate simulated data for this new city
    const newCityData = generateSimulatedAQI(name, lat, lng);
    // Store it temporarily for future requests during this session
    aqiData.set(cityQuery, newCityData); 
    historicalData.set(cityQuery, generateHistoricalData(name)); // Also generate historical
    
    res.json(newCityData);

  } catch (error) {
    console.error(`Error fetching or generating data for ${cityQuery}:`, error.message);
    // If geocoding fails or data generation has issues
    res.status(404).json({ error: `City data not found for ${cityQuery}` });
  }
});


app.get('/api/cities', (req, res) => {
  // This endpoint now returns all cities currently in aqiData, including dynamically added ones
  res.json(Array.from(aqiData.values()).map(data => ({
    key: data.city.toLowerCase(),
    name: data.city,
    lat: data.coordinates.lat,
    lng: data.coordinates.lng
  })));
});

app.get('/api/historical/:city', (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  const data = historicalData.get(cityKey);
  
  if (!data) {
    return res.status(404).json({ error: 'Historical data not found' });
  }
  
  res.json(data);
});

// Modified: Integrate Python ML model for forecast
app.get('/api/forecast/:city', (req, res) => {
  const cityKey = req.params.city.toLowerCase();
  
  // Path to your Python script
  const pythonScriptPath = path.join(__dirname, 'aqi.py'); 

  const pythonProcess = spawn('python3', [pythonScriptPath, cityKey]); // Use 'python3' or 'python' based on your environment
  let forecastData = '';
  let errorData = '';

  pythonProcess.stdout.on('data', (data) => {
    forecastData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const forecast = JSON.parse(forecastData);
        res.json(forecast);
      } catch (e) {
        console.error(`Failed to parse Python script output for ${cityKey}:`, e);
        console.error('Python stdout:', forecastData);
        console.error('Python stderr:', errorData);
        res.status(500).json({ error: 'Failed to parse forecast data from ML model', details: errorData });
      }
    } else {
      console.error(`Python script exited with code ${code} for city ${cityKey}.`);
      console.error('Python stdout:', forecastData); // In case some partial JSON was printed
      console.error('Python stderr:', errorData);
      res.status(500).json({ error: `ML forecast failed for ${cityKey}`, details: errorData });
    }
  });

  pythonProcess.on('error', (err) => {
    console.error(`Failed to start Python subprocess: ${err.message}`);
    res.status(500).json({ error: 'Failed to execute ML forecast script', details: err.message });
  });
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
  
  console.log(`Sending ${heatmapData.length} heatmap data points to frontend.`); // Log data count
  res.json(heatmapData);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data to new client
  socket.emit('aqiUpdate', Array.from(aqiData.values()));
  socket.emit('alertsUpdate', alerts);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Initial AQI data loaded and real-time updates scheduled.');
});
