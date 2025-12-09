import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Modal from '../../components/common/Modal'; // Added Modal import
import { FaSpinner, FaRedo, FaSearch, FaDownload, FaEye, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DamagedStockMaster = () => {
  const [damagedStockEntries, setDamagedStockEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    // Removed brand filter
    startDate: '',
    endDate: ''
  });
  // Add state for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [currentMaterialName, setCurrentMaterialName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const navigate = useNavigate();

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fetch damaged stock entries
  const fetchDamagedStockEntries = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Build query parameters
      const params = {
        status: 'Approved' // Only fetch approved entries
      };
      
      // Add filters if they exist
      if (filters.search) params.search = filters.search;
      // Removed brand filter
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }
      
      // Fetch all approved damaged stock master entries (without pagination)
      const response = await api.get('/damaged-stock-master', { params });
      
      // Update state with data
      setDamagedStockEntries(response.data.data);
    } catch (err) {
      console.error('Error fetching damaged stock data:', err);
      setError('Failed to load damaged stock data. Please try again.');
      toast.error('Failed to load damaged stock data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDamagedStockEntries();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    // Filters are automatically applied via useEffect dependency
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      // Removed brand filter
      startDate: '',
      endDate: ''
    });
  };

  // Handle view history - FIXED FUNCTION
  const handleViewHistory = async (materialName) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    setCurrentMaterialName(materialName);
    
    try {
      // Fetch history data for this material
      const response = await api.get(`/damaged-stock-master/history/${materialName}`);
      
      setHistoryData(response.data);
    } catch (err) {
      console.error('Error fetching history data:', err);
      toast.error('Failed to load history data');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Close history modal
  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setHistoryData([]);
    setCurrentMaterialName('');
  };

  // Removed handleOutsideClick since Modal component handles this

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Damaged Stock Master</h1>
        <button 
          onClick={fetchDamagedStockEntries}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors self-end md:self-auto"
        >
          <FaRedo className="mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Filters - REMOVED BRAND FILTER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Material</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Search by material name or item code"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      
      {/* Damaged Stock Master Table - REMOVED BRAND COLUMN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
          <table className="min-w-full divide-y divide-light-200">
            <thead className="bg-light-200 sticky top-0 z-10">
              <tr>
                {/* Item Code */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider whitespace-nowrap">
                  <span className="hidden md:inline">Item</span>
                  <span className="md:hidden">Code</span>
                </th>
                
                {/* Material Name */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden md:table-cell">
                  Material Name
                </th>
                
                {/* Total Damaged Quantity */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                  Total Damaged Qty
                </th>
                
                {/* Date */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                  Last Approved Date
                </th>
                
                {/* Actions */}
                <th scope="col" className="relative px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-light-100 divide-y divide-light-200">
              {damagedStockEntries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-secondary-500">
                    No damaged stock entries found.
                  </td>
                </tr>
              ) : (
                damagedStockEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-light-200">
                    {/* Item Code */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700 overflow-hidden">
                      <div className="truncate max-w-[80px] md:max-w-[120px]" title={entry.itemCode || 'N/A'}>
                        {entry.itemCode || 'N/A'}
                      </div>
                    </td>
                    
                    {/* Material Name */}
                    <td className="px-4 py-3 text-sm font-medium text-dark-700 overflow-hidden hidden md:table-cell">
                      <div className="truncate max-w-[150px] lg:max-w-xs" title={entry.materialName}>
                        {entry.materialName}
                      </div>
                    </td>
                    
                    {/* Total Damaged Quantity */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 overflow-hidden">
                      <div className="truncate max-w-[80px]" title={entry.totalDamagedQty}>
                        {entry.totalDamagedQty}
                      </div>
                    </td>
                    
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-dark-700 overflow-hidden">
                      <div className="truncate max-w-[120px]" title={formatDate(entry.lastApprovedDate)}>
                        {formatDate(entry.lastApprovedDate)}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewHistory(entry.materialName)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <FaEye className="mr-1" />
                          <span className="truncate md:hidden">View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* History Modal - REPLACED WITH SHARED MODAL COMPONENT */}
      <Modal
        isOpen={showHistoryModal}
        onClose={closeHistoryModal}
        title={`Damaged Stock History for ${currentMaterialName}`}
        size="large"
      >
        {historyLoading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-indigo-600" size={48} />
          </div>
        ) : (
          <div className="overflow-auto flex-grow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN No</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No history entries found.
                    </td>
                  </tr>
                ) : (
                  historyData.map((entry) => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(entry.approved_on || entry.entered_on)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.dc_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.grn_id ? entry.grn_id.substring(0, 8) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                        {entry.damaged_qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'Approved' ? 'bg-red-100 text-red-800' : 
                          entry.status === 'Rejected' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.entered_by}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.approved_by || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={closeHistoryModal}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DamagedStockMaster;