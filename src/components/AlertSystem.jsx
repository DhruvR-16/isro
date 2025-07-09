import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import io from 'socket.io-client';

const AlertSystem = () => {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to socket server
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Listen for real-time alerts
    newSocket.on('aqiAlert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 19)]);
      showNotification(alert);
      
      if (soundEnabled) {
        playAlertSound(alert.type);
      }
    });

    // Listen for alerts updates
    newSocket.on('alertsUpdate', (alertsData) => {
      setAlerts(alertsData);
    });

    // Fetch initial alerts
    fetchAlerts();

    return () => {
      newSocket.close();
    };
  }, [soundEnabled]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const showNotification = (alert) => {
    const notification = {
      id: Date.now(),
      ...alert,
      show: true
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]);

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, show: false } : n)
      );
    }, 5000);

    // Remove notification after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5500);

    // Browser notification (if permission granted)
    if (Notification.permission === 'granted') {
      new Notification(`AQI Alert - ${alert.city}`, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.city
      });
    }
  };

  const playAlertSound = (type) => {
    // Create audio context for alert sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different alert types
    oscillator.frequency.setValueAtTime(
      type === 'critical' ? 800 : 600, 
      audioContext.currentTime
    );
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const dismissNotification = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, show: false } : n)
    );
  };

  const getAlertIcon = (type) => {
    return type === 'critical' ? (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-orange-600" />
    );
  };

  const getAlertBgColor = (type) => {
    return type === 'critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
  };

  const getAlertTextColor = (type) => {
    return type === 'critical' ? 'text-red-800' : 'text-orange-800';
  };

  return (
    <>
      {/* Floating Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`transform transition-all duration-500 ${
              notification.show 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-full opacity-0'
            }`}
          >
            <div className={`max-w-sm rounded-lg shadow-lg border-l-4 p-4 ${getAlertBgColor(notification.type)}`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getAlertIcon(notification.type)}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${getAlertTextColor(notification.type)}`}>
                    {notification.city} - AQI Alert
                  </p>
                  <p className={`text-sm ${getAlertTextColor(notification.type)} opacity-90`}>
                    AQI: {notification.aqi} ({notification.category})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="ml-2 flex-shrink-0"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert System Panel */}
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Alert System</h3>
            {alerts.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-md ${
                soundEnabled 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 bg-gray-50'
              }`}
              title={soundEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={requestNotificationPermission}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Enable Browser Notifications
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent alerts</p>
              <p className="text-sm text-gray-400 mt-1">
                You'll be notified when AQI levels exceed healthy thresholds
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.city}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.type === 'critical' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {alert.type === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        AQI: {alert.aqi} - {alert.category}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert Settings */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Alert Thresholds</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
              <span>Warning: AQI &gt; 150</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>Critical: AQI &gt; 200</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertSystem;