import React, { useState, useEffect } from 'react';
import api from '../api';

const PackingMaterialStockReport = () => {
  const [reportData, setReportData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return formatDate(today);
  };

  // Get first day of current month in YYYY-MM-DD format
  const getFirstDayOfMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return formatDate(firstDay);
  };

  // Initialize dates
  useEffect(() => {
    const today = getTodayDate();
    const firstDay = getFirstDayOfMonth();
    setFromDate(firstDay);
    setToDate(today);
    setSelectedDate(today);
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    if (!fromDate || !toDate) {
      setError('Please select both From Date and To Date');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/packing/material-stock-report-range?fromDate=${fromDate}&toDate=${toDate}`);
      setReportData(response.data);
    } catch (err) {
      setError('Failed to load stock report data');
      console.error('Error fetching stock report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchReportData();
    }
  }, [fromDate, toDate]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  // Render report table for a specific date
  const renderDateReport = (date, materials) => {
    return (
      <div key={date} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Date: {new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })}</h3>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Inward</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outward</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.map((material, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.materialName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{material.openingStock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{material.inward}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{material.outward}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{material.closingStock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{material.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading report data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Packing Materials Stock Report</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              id="fromDate"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              max={toDate || getTodayDate()}
            />
          </div>
          
          <div>
            <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              id="toDate"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              min={fromDate}
              max={getTodayDate()}
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate Report
            </button>
          </div>
        </form>
        
        <div className="text-sm text-gray-500 mb-4">
          Showing data from {fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : '...'} to {toDate ? new Date(toDate).toLocaleDateString('en-IN') : '...'}
        </div>
      </div>
      
      {Object.keys(reportData).length > 0 ? (
        Object.entries(reportData).map(([date, materials]) => renderDateReport(date, materials))
      ) : !loading && !error && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No data available for the selected date range.</p>
        </div>
      )}
    </div>
  );
};

export default PackingMaterialStockReport;