import React, { useState, useEffect } from 'react';
import api from '../api';

const StockCaptureConfig = () => {
  // State for hour and minute selections
  const [openingHour, setOpeningHour] = useState(9);
  const [openingMinute, setOpeningMinute] = useState(0);
  const [closingHour, setClosingHour] = useState(21);
  const [closingMinute, setClosingMinute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Generate options for hours (0-23) and minutes (0-59)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Load current configuration when component mounts
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await api.get('/packing/stock-config');
        
        // Parse cron expression to extract hours and minutes
        const openingCron = response.data.openingTime.split(' ');
        const closingCron = response.data.closingTime.split(' ');
        
        // Extract hour and minute from cron expression (format: "minute hour day month dayOfWeek")
        const openingHour = parseInt(openingCron[1]);
        const openingMinute = parseInt(openingCron[0]);
        const closingHour = parseInt(closingCron[1]);
        const closingMinute = parseInt(closingCron[0]);
        
        // Update state
        setOpeningHour(isNaN(openingHour) ? 9 : openingHour);
        setOpeningMinute(isNaN(openingMinute) ? 0 : openingMinute);
        setClosingHour(isNaN(closingHour) ? 21 : closingHour);
        setClosingMinute(isNaN(closingMinute) ? 0 : closingMinute);
      } catch (err) {
        console.error('Error loading stock capture configuration:', err);
        // Keep default values
      }
    };

    loadConfig();
  }, []);

  // Convert hours and minutes to cron format
  const formatCronExpression = (minute, hour) => {
    return `${minute} ${hour} * * *`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // Convert selected time to cron format
      const openingTime = formatCronExpression(openingMinute, openingHour);
      const closingTime = formatCronExpression(closingMinute, closingHour);
      
      await api.post('/packing/configure-stock-times', {
        openingTime,
        closingTime
      });
      
      setMessage('Stock capture times configured successfully!');
    } catch (err) {
      setError('Failed to configure stock capture times');
      console.error('Error configuring stock capture times:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Stock Capture Configuration</h2>
      
      {message && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Time (Opening Stock Capture)
            </label>
            <div className="flex space-x-2">
              <select
                value={openingHour}
                onChange={(e) => setOpeningHour(parseInt(e.target.value))}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {hours.map(hour => (
                  <option key={hour} value={hour}>
                    {hour.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="flex items-center text-gray-500">:</span>
              <select
                value={openingMinute}
                onChange={(e) => setOpeningMinute(parseInt(e.target.value))}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {minutes.map(minute => (
                  <option key={minute} value={minute}>
                    {minute.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Current: {openingHour.toString().padStart(2, '0')}:{openingMinute.toString().padStart(2, '0')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Time (Closing Stock Capture)
            </label>
            <div className="flex space-x-2">
              <select
                value={closingHour}
                onChange={(e) => setClosingHour(parseInt(e.target.value))}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {hours.map(hour => (
                  <option key={hour} value={hour}>
                    {hour.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="flex items-center text-gray-500">:</span>
              <select
                value={closingMinute}
                onChange={(e) => setClosingMinute(parseInt(e.target.value))}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {minutes.map(minute => (
                  <option key={minute} value={minute}>
                    {minute.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Current: {closingHour.toString().padStart(2, '0')}:{closingMinute.toString().padStart(2, '0')}
            </p>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockCaptureConfig;