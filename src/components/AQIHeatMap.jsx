import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, Info } from 'lucide-react';

const AQIHeatMap = ({ currentLocation, onLocationSelect }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatmapLayer = useRef(null);
  const markers = useRef([]); // To keep track of individual city markers
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // 1. Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps && mapLoaded) {
      console.log('Google Maps script already loaded and mapLoaded is true.');
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (!window.google || !window.google.maps) {
        console.log('Google Maps script exists but not fully loaded, waiting...');
        existingScript.onload = () => {
          console.log('Google Maps script loaded via existing script.');
          setMapLoaded(true);
        };
      } else {
        console.log('Google Maps script already exists and is loaded.');
        setMapLoaded(true);
      }
      return;
    }

    console.log('Appending Google Maps script to head...');
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    // Ensure the key and libraries are correct
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAoKk7dHcJoF7H2tRb_dREOO_dSByRDgzw&libraries=visualization,geometry`; // Added geometry for utility
    script.async = true;
    script.onload = () => {
      console.log('Google Maps script successfully loaded!');
      setMapLoaded(true);
    };
    script.onerror = (e) => console.error("Failed to load Google Maps script:", e);
    document.head.appendChild(script);
  }, []); // Runs once on component mount

  // 2. Initialize map when script is loaded and mapRef is available
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      console.log('Initializing Google Map instance...');
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: currentLocation,
        zoom: 6, // Initial zoom to show more of India
        mapTypeId: 'roadmap',
        disableDefaultUI: true, // Disable default UI for custom controls
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add click listener for location selection (reverse geocoding)
      mapInstance.current.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const locationName = results[0].formatted_address;
            onLocationSelect({ lat, lng, name: locationName.split(',')[0].trim() });
          } else {
            console.error('Geocoder failed due to: ' + status);
            onLocationSelect({ lat, lng, name: `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}` });
          }
        });
      });
    }
  }, [mapLoaded, currentLocation, onLocationSelect]); // Depend on mapLoaded to ensure map is ready

  // 3. Fetch heatmap data and create/update markers
  useEffect(() => {
    if (mapInstance.current && mapLoaded) {
      const fetchHeatmapAndMarkers = async () => {
        try {
          const response = await fetch('http://localhost:3001/api/heatmap-data');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log(`AQIHeatMap: Received ${data.length} raw heatmap data points from backend.`);
          
          // Clear existing markers
          markers.current.forEach(marker => marker.setMap(null));
          markers.current = [];

          const bounds = new window.google.maps.LatLngBounds();
          const newHeatmapPoints = [];

          // Process data for heatmap and markers
          data.forEach(city => {
            const position = { lat: city.lat, lng: city.lng };
            bounds.extend(position); // Extend bounds for each city

            // Add point for heatmap layer
            newHeatmapPoints.push({
              location: new window.google.maps.LatLng(city.lat, city.lng),
              weight: city.aqi / 100 // Ensure weight is normalized
            });

            // Create and add marker for each city
            const marker = new window.google.maps.Marker({
              position: position,
              map: mapInstance.current,
              title: `${city.city}: AQI ${city.aqi}`,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: getAQIColor(city.aqi),
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: '#fff',
                scale: 10 // Increased scale for better visibility
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 5px; font-family: sans-serif;">
                        <h4 style="margin: 0; font-size: 1.1em; color: #333;">${city.city}</h4>
                        <p style="margin: 5px 0 0; font-size: 0.9em; color: #555;">AQI: <strong>${city.aqi}</strong></p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(mapInstance.current, marker);
                onLocationSelect({ lat: city.lat, lng: city.lng, name: city.city });
            });
            markers.current.push(marker);
          });

          setHeatmapData(newHeatmapPoints); // Update state for heatmap layer

          // Fit map to bounds of all cities
          if (!bounds.isEmpty()) {
            mapInstance.current.fitBounds(bounds);
            // Optionally, set a max zoom level after fitting bounds to prevent over-zooming on few close points
            const listener = window.google.maps.event.addListener(mapInstance.current, 'idle', function() {
              if (mapInstance.current.getZoom() > 10) { // Max zoom level 10
                mapInstance.current.setZoom(10);
              }
              window.google.maps.event.removeListener(listener);
            });
          }

        } catch (error) {
          console.error('Error fetching heatmap data or creating markers:', error);
          // Fallback to mock data if backend is not running or errors
          const mockData = [
            { lat: 28.7041, lng: 77.1025, city: 'Delhi', aqi: 185, weight: 1.8 },
            { lat: 19.0760, lng: 72.8777, city: 'Mumbai', aqi: 120, weight: 1.2 },
            { lat: 12.9716, lng: 77.5946, city: 'Bengaluru', aqi: 95, weight: 0.95 },
            { lat: 13.0827, lng: 80.2707, city: 'Chennai', aqi: 110, weight: 1.1 },
            { lat: 22.5726, lng: 88.3639, city: 'Kolkata', aqi: 165, weight: 1.65 },
            { lat: 17.3850, lng: 78.4867, city: 'Hyderabad', aqi: 88, weight: 0.88 },
            { lat: 18.5204, lng: 73.8567, city: 'Pune', aqi: 102, weight: 1.02 },
            { lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', aqi: 145, weight: 1.45 }
          ].map(point => ({
            location: new window.google.maps.LatLng(point.lat, point.lng),
            weight: point.weight
          }));
          setHeatmapData(mockData);
        }
      };

      fetchHeatmapAndMarkers();
    }
  }, [mapLoaded, mapInstance.current]); // Re-run when map is ready or data is needed

  // 4. Create/Update Heatmap Layer
  useEffect(() => {
    if (!mapInstance.current || !window.google || !window.google.maps.visualization || heatmapData.length === 0) {
      console.log('Heatmap not ready: mapInstance, google.maps.visualization, or heatmapData missing.');
      return;
    }

    // Clear existing heatmap layer if it exists
    if (heatmapLayer.current) {
      console.log('Clearing existing heatmap layer.');
      heatmapLayer.current.setMap(null);
      heatmapLayer.current = null;
    }

    if (showHeatmap) {
      console.log(`Creating new heatmap layer with ${heatmapData.length} points.`);
      heatmapLayer.current = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstance.current,
        radius: 35, // Adjusted radius for better spread
        opacity: 0.9, // Adjusted opacity for more prominence
        gradient: [
          'rgba(0, 228, 0, 0)', // Good (Green, transparent)
          'rgba(0, 228, 0, 1)', // Good (Green)
          'rgba(255, 255, 0, 1)', // Moderate (Yellow)
          'rgba(255, 126, 0, 1)', // Unhealthy for Sensitive (Orange)
          'rgba(255, 0, 0, 1)', // Unhealthy (Red)
          'rgba(143, 63, 151, 1)', // Very Unhealthy (Purple)
          'rgba(126, 0, 35, 1)' // Hazardous (Maroon)
        ]
      });
    } else {
      console.log('Heatmap is toggled off.');
    }
  }, [heatmapData, showHeatmap, mapInstance.current]); // Depend on heatmapData, showHeatmap, and mapInstance

  // Helper functions for AQI colors and categories
  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#00E400'; // Good (Green)
    if (aqi <= 100) return '#FFFF00'; // Moderate (Yellow)
    if (aqi <= 150) return '#FF7E00'; // Unhealthy for Sensitive Groups (Orange)
    if (aqi <= 200) return '#FF0000'; // Unhealthy (Red)
    if (aqi <= 300) return '#8F3F97'; // Very Unhealthy (Purple)
    return '#7E0023'; // Hazardous (Maroon)
  };

  const getAQICategory = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  // Toggle heatmap visibility
  const toggleHeatmap = () => {
    setShowHeatmap(prev => !prev);
  };

  return (
    <div className="relative w-full h-full flex flex-col rounded-lg overflow-hidden">
      <div ref={mapRef} style={{ height: '400px', width: '100%' }} className="flex-grow rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Loading Interactive Map...</p>
            </div>
          </div>
        )}

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
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              ></div>
              <span>{item.range} - {item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={toggleHeatmap}
            className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-300 transition-colors"
          >
            <Layers className="h-3 w-3 mr-1" /> {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </button>
        </div>
      </div>
    </div>
  );
};

export default AQIHeatMap;
