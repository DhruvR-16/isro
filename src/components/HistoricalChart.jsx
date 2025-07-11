import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Filter } from 'lucide-react';

const HistoricalChart = ({ selectedCity }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('line');
  const [selectedMetric, setSelectedMetric] = useState('aqi');
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    if (selectedCity) {
      fetchHistoricalData();
    }
  }, [selectedCity, dateRange]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/historical/${selectedCity.toLowerCase()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHistoricalData(data);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Fallback to mock data if server is unreachable or errors
      const now = new Date();
      const mockData = Array.from({ length: 30 }).map((_, i) => {
        const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        const aqi = 80 + Math.floor(Math.random() * 70 * Math.sin(i * 0.5) + Math.random() * 30);
        return {
          date: date.toISOString().split('T')[0],
          aqi: Math.min(350, Math.max(20, aqi)), // Cap for mock
          pm25: Math.floor(aqi * 0.6),
          pm10: Math.floor(aqi * 0.8),
          no2: Math.floor(aqi * 0.3),
          temperature: 20 + Math.floor(Math.random() * 15),
          humidity: 50 + Math.floor(Math.random() * 30)
        };
      });
      setHistoricalData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (metric) => {
    const colors = {
      aqi: '#3B82F6', // Blue
      pm25: '#EF4444', // Red
      pm10: '#F59E0B', // Orange
      no2: '#10B981', // Green
      temperature: '#8B5CF6', // Purple
      humidity: '#06B6D4' // Cyan
    };
    return colors[metric] || '#6B7280'; // Default gray
  };

  const getMetricLabel = (metric) => {
    const labels = {
      aqi: 'AQI',
      pm25: 'PM2.5 (μg/m³)',
      pm10: 'PM10 (μg/m³)',
      no2: 'NO₂ (μg/m³)',
      temperature: 'Temperature (°C)',
      humidity: 'Humidity (%)'
    };
    return labels[metric] || metric;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getAverageValue = (data, metric) => {
    if (!data.length) return 0;
    const sum = data.reduce((acc, item) => acc + (item[metric] || 0), 0);
    return Math.round(sum / data.length);
  };

  const getTrendDirection = (data, metric) => {
    if (data.length < 7) return 'stable'; // Need at least a week of data for trend
    const recent = data.slice(-7); // Last 7 days
    const older = data.slice(-14, -7); // Previous 7 days
    
    const recentAvg = getAverageValue(recent, metric);
    const olderAvg = getAverageValue(older, metric);
    
    if (recentAvg > olderAvg * 1.1) return 'increasing'; // 10% increase
    if (recentAvg < olderAvg * 0.9) return 'decreasing'; // 10% decrease
    return 'stable';
  };

  const renderChart = () => {
    const chartProps = {
      data: historicalData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value, name) => [value, getMetricLabel(name)]}
            />
            <Area 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke={getMetricColor(selectedMetric)} 
              fill={getMetricColor(selectedMetric)}
              fillOpacity={0.3}
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value, name) => [value, getMetricLabel(name)]}
            />
            <Bar 
              dataKey={selectedMetric} 
              fill={getMetricColor(selectedMetric)}
            />
          </BarChart>
        );
      
      default: // line chart
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              interval="preserveStartEnd"
            />
            <YAxis label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value, name) => [value, getMetricLabel(name)]}
            />
            <Line 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke={getMetricColor(selectedMetric)} 
              strokeWidth={2}
              dot={{ fill: getMetricColor(selectedMetric), strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
    }
  };

  if (loading) {
    return (
      <div className="card-enhanced p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const averageValue = getAverageValue(historicalData, selectedMetric);
  const trendDirection = getTrendDirection(historicalData, selectedMetric);

  return (
    <div className="card-enhanced">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Historical Data - {selectedCity}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Last {dateRange} days</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Metric Selector */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="form-select"
            >
              <option value="aqi">AQI</option>
              <option value="pm25">PM2.5</option>
              <option value="pm10">PM10</option>
              <option value="no2">NO₂</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
            </select>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
            {['line', 'area', 'bar'].map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  chartType === type
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="form-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
            <option value="365">Last 365 days</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{averageValue}</div>
            <div className="text-sm text-gray-600">Average {getMetricLabel(selectedMetric)}</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              trendDirection === 'increasing' ? 'text-red-600' :
              trendDirection === 'decreasing' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trendDirection === 'increasing' ? '↗' : 
               trendDirection === 'decreasing' ? '↘' : '→'}
            </div>
            <div className="text-sm text-gray-600">
              Trend: {trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{historicalData.length}</div>
            <div className="text-sm text-gray-600">Data Points</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Quality Info */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-600">
          <span className="font-medium">Data Source:</span> Simulated data based on real-world patterns. 
          In production, this would connect to CPCB/ISRO satellite data and ground monitoring stations.
        </p>
        {/* Placeholder for Satellite Images over time */}
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-medium">Visual Correlation:</span> Satellite images over time for visual correlation would be displayed here (Future Enhancement).
        </p>
      </div>
    </div>
  );
};

export default HistoricalChart;
