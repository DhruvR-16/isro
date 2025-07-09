import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, Info } from 'lucide-react';

const AQIHeatMap = ({ currentLocation, onLocationSelect }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatmapLayer = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already being loaded or exists
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      // If script exists but maps not loaded yet, wait for it
      if (!window.google || !window.google.maps) {
        existingScript.onload = () => setMapLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAoKk7dHcJoF7H2tRb_dREOO_dSByRDgzw'}&libraries=visualization`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 6,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add click listener for location selection
      mapInstance.current.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Reverse geocoding to get location name
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const locationName = results[0].formatted_address;
            onLocationSelect({
              lat,
              lng,
              name: locationName
            });
          }
        });
      });

      fetchHeatmapData();
    }
  }, [mapLoaded, currentLocation]);

  // Update map center when location changes
  useEffect(() => {
    if (mapInstance.current && currentLocation) {
      mapInstance.current.setCenter(currentLocation);
      mapInstance.current.setZoom(10);
    }
  }, [currentLocation]);

  // Fetch heatmap data
  const fetchHeatmapData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/heatmap-data');
      const data = await response.json();
      setHeatmapData(data);
      updateHeatmapLayer(data);
      updateMarkers(data);
    } catch (error) {
      console.error('Error fetching heatmap data, using fallback:', error);
      // Fallback to mock data
      const mockData = [
        { lat: 28.7041, lng: 77.1025, city: 'Delhi', aqi: 185, weight: 1.8 },
        { lat: 19.0760, lng: 72.8777, city: 'Mumbai', aqi: 120, weight: 1.2 },
        { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', aqi: 95, weight: 0.95 },
        { lat: 13.0827, lng: 80.2707, city: 'Chennai', aqi: 110, weight: 1.1 },
        { lat: 22.5726, lng: 88.3639, city: 'Kolkata', aqi: 165, weight: 1.65 },
        { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', aqi: 88, weight: 0.88 },
        { lat: 18.5204, lng: 73.8567, city: 'Pune', aqi: 102, weight: 1.02 },
        { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', aqi: 145, weight: 1.45 }
      ];
      setHeatmapData(mockData);
      updateHeatmapLayer(mockData);
      updateMarkers(mockData);
    }
  };

  // Update heatmap layer
  const updateHeatmapLayer = (data) => {
    if (!mapInstance.current || !window.google) return;

    // Remove existing heatmap
    if (heatmapLayer.current) {
      heatmapLayer.current.setMap(null);
    }

    if (!showHeatmap) return;

    // Create heatmap data points
    const heatmapPoints = data.map(point => ({
      location: new window.google.maps.LatLng(point.lat, point.lng),
      weight: point.weight
    }));

    // Create heatmap layer
    heatmapLayer.current = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapPoints,
      map: mapInstance.current,
      radius: 50,
      opacity: 0.6,
      gradient: [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });
  };

  // Update markers
  const updateMarkers = (data) => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Add new markers
    data.forEach(point => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstance.current,
        title: `${point.city}: AQI ${point.aqi}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: getAQIColor(point.aqi),
          fillOpacity: 0.8,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold text-gray-900">${point.city}</h3>
            <p class="text-sm">AQI: <span class="font-semibold" style="color: ${getAQIColor(point.aqi)}">${point.aqi}</span></p>
            <p class="text-xs text-gray-600">${getAQICategory(point.aqi)}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markers.current.push(marker);
    });
  };

  // Get AQI color
  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#00E400';
    if (aqi <= 100) return '#FFFF00';
    if (aqi <= 150) return '#FF7E00';
    if (aqi <= 200) return '#FF0000';
    if (aqi <= 300) return '#8F3F97';
    return '#7E0023';
  };

  // Get AQI category
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Toggle heatmap
  const toggleHeatmap = () => {
    setShowHeatmap(!showHeatmap);
    if (heatmapLayer.current) {
      heatmapLayer.current.setMap(showHeatmap ? null : mapInstance.current);
    }
  };

  // Refresh data
  const refreshData = () => {
    fetchHeatmapData();
  };

  return (
    <div className="relative">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <button
          onClick={toggleHeatmap}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium shadow-md ${
            showHeatmap 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-300'
          }`}
        >
          <Layers className="h-4 w-4 mr-1" />
          Heatmap
        </button>
        <button
          onClick={refreshData}
          className="flex items-center px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium shadow-md hover:bg-gray-50"
        >
          <Info className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg shadow-sm"
        style={{ minHeight: '400px' }}
      >
        {!mapLoaded && (
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Loading Interactive Map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">AQI Scale</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {[
            { range: '0-50', label: 'Good', color: '#00E400' },
            { range: '51-100', label: 'Moderate', color: '#FFFF00' },
            { range: '101-150', label: 'Unhealthy for Sensitive', color: '#FF7E00' },
            { range: '151-200', label: 'Unhealthy', color: '#FF0000' },
            { range: '201-300', label: 'Very Unhealthy', color: '#8F3F97' },
            { range: '301+', label: 'Hazardous', color: '#7E0023' }
          ].map((item, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: item.color }}
              ></div>
              <div>
                <div className="font-medium">{item.range}</div>
                <div className="text-gray-600">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AQIHeatMap;