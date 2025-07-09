import React, { useState, useEffect } from 'react';
import { Heart, Settings as Lungs, Shield, AlertTriangle, Users, Phone, Info } from 'lucide-react';

const HealthAdvisory = ({ selectedCity, currentAQI }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [sensitiveGroups, setSensitiveGroups] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    if (currentAQI !== null) { // Ensure currentAQI is not null
      generateHealthRecommendations(currentAQI);
      setSensitiveGroupsInfo(currentAQI);
      setEmergencyContactsInfo();
    }
  }, [currentAQI]);

  const getAQICategory = (aqi) => {
    if (aqi <= 50) return { category: 'Good', color: 'bg-green-500', level: 1 };
    if (aqi <= 100) return { category: 'Moderate', color: 'bg-yellow-500', level: 2 };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: 'bg-orange-500', level: 3 };
    if (aqi <= 200) return { category: 'Unhealthy', color: 'bg-red-500', level: 4 };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: 'bg-purple-500', level: 5 };
    return { category: 'Hazardous', color: 'bg-red-900', level: 6 };
  };

  const generateHealthRecommendations = (aqi) => {
    const category = getAQICategory(aqi);
    
    const allRecommendations = {
      1: [ // Good (0-50)
        {
          icon: Heart,
          title: 'Perfect for Outdoor Activities',
          description: 'Air quality is excellent! Great day for jogging, cycling, or any outdoor exercise.',
          priority: 'low'
        },
        {
          icon: Lungs,
          title: 'No Restrictions',
          description: 'No special precautions needed. Enjoy fresh air and outdoor activities.',
          priority: 'low'
        }
      ],
      2: [ // Moderate (51-100)
        {
          icon: Shield,
          title: 'Generally Safe',
          description: 'Air quality is acceptable for most people. Sensitive individuals should monitor symptoms.',
          priority: 'low'
        },
        {
          icon: Heart,
          title: 'Light Precautions',
          description: 'Consider reducing prolonged outdoor exertion if you experience symptoms.',
          priority: 'medium'
        }
      ],
      3: [ // Unhealthy for Sensitive Groups (101-150)
        {
          icon: Users,
          title: 'Sensitive Groups Take Care',
          description: 'Children, elderly, and people with respiratory conditions should limit outdoor activities.',
          priority: 'medium'
        },
        {
          icon: Shield,
          title: 'Consider Masks',
          description: 'Wear a mask during outdoor activities, especially if you have respiratory conditions.',
          priority: 'medium'
        },
        {
          icon: Lungs,
          title: 'Limit Strenuous Activities',
          description: 'Reduce prolonged or heavy outdoor exertion.',
          priority: 'medium'
        }
      ],
      4: [ // Unhealthy (151-200)
        {
          icon: AlertTriangle,
          title: 'Everyone Should Take Precautions',
          description: 'Everyone may experience health effects. Limit outdoor activities.',
          priority: 'high'
        },
        {
          icon: Shield,
          title: 'Wear Masks Outside',
          description: 'Use N95 or equivalent masks when going outdoors.',
          priority: 'high'
        },
        {
          icon: Heart,
          title: 'Avoid Outdoor Exercise',
          description: 'Avoid jogging, cycling, and other strenuous outdoor activities.',
          priority: 'high'
        },
        {
          icon: Info,
          title: 'Use Air Purifiers',
          description: 'Keep windows closed and use air purifiers indoors.',
          priority: 'high'
        }
      ],
      5: [ // Very Unhealthy (201-300)
        {
          icon: AlertTriangle,
          title: 'Health Alert',
          description: 'Everyone may experience serious health effects. Avoid all outdoor activities.',
          priority: 'critical'
        },
        {
          icon: Shield,
          title: 'Stay Indoors',
          description: 'Remain indoors with windows closed and air purifiers running.',
          priority: 'critical'
        },
        {
          icon: Lungs,
          title: 'N95 Masks Essential',
          description: 'Wear N95 masks if you must go outside for essential activities only.',
          priority: 'critical'
        }
      ],
      6: [ // Hazardous (301+)
        {
          icon: AlertTriangle,
          title: 'Emergency Conditions',
          description: 'Hazardous air quality. Everyone is at risk of serious health effects.',
          priority: 'critical'
        },
        {
          icon: Phone,
          title: 'Seek Medical Attention',
          description: 'Contact healthcare providers if experiencing breathing difficulties or chest pain.',
          priority: 'critical'
        },
        {
          icon: Shield,
          title: 'Complete Indoor Isolation',
          description: 'Stay indoors with all windows and doors sealed. Use multiple air purifiers.',
          priority: 'critical'
        }
      ]
    };

    setRecommendations(allRecommendations[category.level] || []);
  };

  const setSensitiveGroupsInfo = (aqi) => {
    const groups = [
      {
        icon: Users,
        title: 'Children & Elderly',
        description: 'Most vulnerable to air pollution effects due to developing or weakened immune systems.',
        risk: aqi > 100 ? 'high' : aqi > 50 ? 'medium' : 'low',
        advice: aqi > 150 ? 'Stay indoors, avoid all outdoor activities' : 
                aqi > 100 ? 'Limit outdoor time, wear masks' : 
                'Monitor air quality, normal activities OK'
      },
      {
        icon: Lungs,
        title: 'Respiratory Conditions',
        description: 'People with asthma, COPD, or other lung diseases are at higher risk.',
        risk: aqi > 100 ? 'high' : aqi > 50 ? 'medium' : 'low',
        advice: aqi > 150 ? 'Emergency inhaler ready, stay indoors' : 
                aqi > 100 ? 'Limit outdoor exposure, use medications as prescribed' : 
                'Normal precautions, carry rescue inhaler'
      },
      {
        icon: Heart,
        title: 'Heart Conditions',
        description: 'Cardiovascular patients may experience increased symptoms.',
        risk: aqi > 150 ? 'high' : aqi > 100 ? 'medium' : 'low',
        advice: aqi > 150 ? 'Avoid all strenuous activities, monitor symptoms' : 
                aqi > 100 ? 'Reduce outdoor exercise intensity' : 
                'Normal activities with regular monitoring'
      },
      {
        icon: Users,
        title: 'Pregnant Women',
        description: 'Air pollution can affect both maternal and fetal health.',
        risk: aqi > 100 ? 'high' : aqi > 50 ? 'medium' : 'low',
        advice: aqi > 150 ? 'Stay indoors, consult healthcare provider' : 
                aqi > 100 ? 'Limit outdoor activities, wear masks' : 
                'Normal activities with awareness'
      }
    ];

    setSensitiveGroups(groups);
  };

  const setEmergencyContactsInfo = () => {
    const contacts = [
      {
        title: 'Emergency Medical Services',
        number: '108',
        description: 'For immediate medical emergencies and ambulance services'
      },
      {
        title: 'National Health Helpline',
        number: '104',
        description: 'Free health advice and information'
      },
      {
        title: 'Pollution Control Board',
        number: '1800-11-0333',
        description: 'Report pollution incidents and get information'
      },
      {
        title: 'Disaster Management',
        number: '1078',
        description: 'For disaster-related emergencies and alerts'
      }
    ];

    setEmergencyContacts(contacts);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-green-500 bg-green-50';
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-800';
      case 'high': return 'text-orange-800';
      case 'medium': return 'text-yellow-800';
      default: return 'text-green-800';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (currentAQI === null) {
    return (
      <div className="card-enhanced p-6">
        <div className="text-center text-gray-500">
          <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Select a city to view health recommendations</p>
        </div>
      </div>
    );
  }

  const aqiCategory = getAQICategory(currentAQI);

  return (
    <div className="space-y-6">
      {/* Current AQI Status */}
      <div className="card-enhanced p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Health Advisory - {selectedCity}</h3>
          <div className={`${aqiCategory.color} text-white px-4 py-2 rounded-full`}>
            <span className="text-lg font-bold">{currentAQI}</span>
            <span className="text-sm ml-1">AQI</span>
          </div>
        </div>
        <div className="text-center mb-6">
          <h4 className="text-xl font-semibold text-gray-900 mb-2">{aqiCategory.category}</h4>
          <p className="text-gray-600">Current air quality status for {selectedCity}</p>
        </div>
      </div>

      {/* Health Recommendations */}
      <div className="card-enhanced p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Recommended Actions
        </h4>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div 
              key={index} 
              className={`border-l-4 p-4 rounded-r-lg ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start">
                <rec.icon className={`h-6 w-6 mr-3 mt-1 ${getPriorityTextColor(rec.priority)}`} />
                <div>
                  <h5 className={`font-semibold ${getPriorityTextColor(rec.priority)}`}>
                    {rec.title}
                  </h5>
                  <p className={`text-sm mt-1 ${getPriorityTextColor(rec.priority)} opacity-90`}>
                    {rec.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitive Groups */}
      <div className="card-enhanced p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Sensitive Groups Advisory
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensitiveGroups.map((group, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <group.icon className="h-5 w-5 text-gray-600 mr-2" />
                  <h5 className="font-semibold text-gray-900">{group.title}</h5>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(group.risk)}`}>
                  {group.risk.toUpperCase()} RISK
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{group.description}</p>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-sm font-medium text-gray-900">Recommended Action:</p>
                <p className="text-sm text-gray-700 mt-1">{group.advice}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="card-enhanced p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Phone className="h-5 w-5 mr-2" />
          Emergency Contacts
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyContacts.map((contact, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900">{contact.title}</h5>
                <a 
                  href={`tel:${contact.number}`}
                  className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  {contact.number}
                </a>
              </div>
              <p className="text-sm text-gray-600">{contact.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* General Health Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          General Health Protection Tips
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-2 list-disc list-inside">
            <li>Keep windows closed during high pollution periods</li>
            <li>Use air purifiers with HEPA filters indoors</li>
            <li>Avoid outdoor exercise during peak pollution hours</li>
          </ul>
          <ul className="space-y-2 list-disc list-inside">
            <li>Stay hydrated and maintain a healthy diet</li>
            <li>Consider indoor plants that help purify air</li>
            <li>Monitor AQI regularly and plan activities accordingly</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthAdvisory;
