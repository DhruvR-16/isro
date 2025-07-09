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
      setAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20
      showNotification(alert);
      
      if (soundEnabled) {
        playAlertSound(alert.type);
      }
    });

    // Listen for alerts updates (e.g., initial fetch)
    newSocket.on('alertsUpdate', (alertsData) => {
      setAlerts(alertsData);
    });

    // Fetch initial alerts
    fetchAlerts();

    return () => {
      newSocket.close();
    };
  }, [soundEnabled]); // Re-run if soundEnabled changes to update socket listener behavior

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Fallback if alerts cannot be fetched
      setAlerts([]);
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

    // Remove notification from DOM after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5500);

    // Browser notification (if permission granted)
    if (Notification.permission === 'granted') {
      new Notification(`AQI Alert - ${alert.city}`, {
        body: `AQI: ${alert.aqi} (${alert.category}) - ${alert.message}`,
        icon: '/favicon.ico', // Ensure you have a favicon.ico in your public folder
        tag: alert.city // Group notifications by city
      });
    }
  };

  const playAlertSound = (type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(
        type === 'critical' ? 800 : 600, 
        audioContext.currentTime
      );
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      } else if (Notification.permission === 'denied') {
        alert("Browser notification permission denied. Please enable it in your browser settings."); // Consider custom modal
      }
    } else {
      alert("This browser does not support desktop notifications."); // Consider custom modal
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
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"> {/* Added pointer-events-none */}
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`transform transition-all duration-500 ${
              notification.show 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-full opacity-0'
            } pointer-events-auto`} // Re-enabled pointer events for the notification itself
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
                  className="ml-2 flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert System Panel */}
      <div className="card-enhanced">
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
              className={`p-2 rounded-md transition-colors ${
                soundEnabled 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
              }`}
              title={soundEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={requestNotificationPermission}
              className="btn-secondary text-sm"
            >
              Enable Browser Notifications
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No recent alerts</p>
              <p className="text-sm mt-1">
                You'll be notified when AQI levels exceed healthy thresholds
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
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
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
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




;