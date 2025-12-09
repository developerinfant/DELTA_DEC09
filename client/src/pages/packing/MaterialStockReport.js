import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { FaSpinner, FaBox, FaIndustry, FaUser, FaMoneyBill, FaRedo, FaSearch, FaArrowLeft, FaClipboardList, FaCheck, FaTimes, FaTruck, FaCog, FaDownload, FaCalendar } from 'react-icons/fa';
import StockSummaryCard from '../../components/StockSummaryCard';
import Modal from '../../components/common/Modal';
import * as XLSX from 'xlsx';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const MaterialStockReport = () => {
  const [materialStocks, setMaterialStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeView, setActiveView] = useState(''); // 'job', 'ownUnit', or 'materialRequests'
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [config, setConfig] = useState({ openingTime: '09:00', closingTime: '21:00' });
  const [newConfig, setNewConfig] = useState({ openingTime: '09:00', closingTime: '21:00' });

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch material stock data with date filter
      const response = await api.get(`/packing/material-stock-report?date=${selectedDate}`);
      setMaterialStocks(response.data);
      
      // Fetch delivery challans
      const dcResponse = await api.get('/delivery-challan');
      setDeliveryChallans(dcResponse.data);
      
      setError('');
    } catch (err) {
      setError('Failed to load material stock report data. Please refresh.');
      console.error('Error fetching material stock report data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch material requests
  const fetchMaterialRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await api.get('/material-requests');
      setMaterialRequests(response.data);
    } catch (err) {
      console.error('Error fetching material requests:', err);
      toast.error('Failed to load material requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Fetch stock configuration
    const fetchConfig = async () => {
      try {
        const response = await api.get('/packing/stock-config');
        setConfig(response.data);
        setNewConfig(response.data);
      } catch (err) {
        console.error('Error fetching stock configuration:', err);
        toast.error('Failed to load stock configuration');
      }
    };
    
    fetchConfig();
    
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);
    
    // Listen for DC creation events
    newSocket.on('dcCreated', (data) => {
      console.log('DC created, refreshing material stock report...', data);
      fetchData();
    });
    
    // Listen for DC update events
    newSocket.on('dcUpdated', (data) => {
      console.log('DC updated, refreshing material stock report...', data);
      fetchData();
    });
    
    // Cleanup socket connection
    return () => {
      newSocket.close();
    };
  }, [selectedDate]);
  
  // Fetch material requests when activeView changes to 'materialRequests'
  useEffect(() => {
    if (activeView === 'materialRequests') {
      fetchMaterialRequests();
    }
  }, [activeView]);

  // Handle item click (for viewing details)
  const handleItemClick = (item) => {
    // In a real implementation, this would open a modal or navigate to a detail page
    console.log('View details for:', item);
  };

  // Handle saving stock configuration
  const handleSaveConfig = async () => {
    try {
      await api.post('/packing/configure-stock-times', {
        openingTime: newConfig.openingTime,
        closingTime: newConfig.closingTime
      });
      setConfig(newConfig);
      setIsConfigModalOpen(false);
      toast.success('Configuration saved successfully!');
    } catch (err) {
      console.error('Error saving stock configuration:', err);
      toast.error('Failed to save configuration');
    }
  };

  // Filter materials by search term
  const filteredMaterials = useMemo(() => {
    return materialStocks.filter(material => 
      material.materialName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materialStocks, searchTerm]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredMaterials.reduce((totals, material) => {
      totals.totalMaterials += 1;
      totals.ourStock += material.ourStock || 0;
      totals.ownUnitStock += material.ownUnitStock || 0;
      totals.jobberStock += material.jobberStock || 0;
      totals.totalQty += material.totalQty || 0;
      totals.totalValue += material.totalValue || 0;
      return totals;
    }, {
      totalMaterials: 0,
      ourStock: 0,
      ownUnitStock: 0,
      jobberStock: 0,
      totalQty: 0,
      totalValue: 0
    });
  }, [filteredMaterials]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#FAF7F2]">
        <FaSpinner className="animate-spin text-[#F2C94C]" size={48} />
        <span className="ml-4 text-lg text-[#6D6A62]">Loading material stock report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md alert alert-error shadow-md">
        <div className="flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] transition-all shadow-sm hover:shadow-md font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount) => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(roundedAmount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
      });
  };

  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Packing Materials Stock Report</h1>
        <div className="flex space-x-2">
          <button 
            onClick={fetchData}
            className="flex items-center px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] transition-all shadow-sm hover:shadow-md font-semibold"
          >
            <FaRedo className="mr-2" />
            Sync Now
          </button>
          <button 
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
          >
            <FaCog className="mr-2" />
            Configure Times
          </button>
        </div>
      </div>
      
      {/* Date Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <label htmlFor="dateFilter" className="mr-2 text-[#1A1A1A] font-medium">Date:</label>
            <input
              type="date"
              id="dateFilter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] bg-white text-[#1A1A1A]"
            />
          </div>
          <div className="text-sm text-[#6D6A62]">
            Report for: {new Date(selectedDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>
      
      {/* Report Type Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveView('job')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'job' ? 'bg-[#F2C94C] text-[#1A1A1A] shadow-md' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
        >
          Job Stock Report
        </button>
        <button
          onClick={() => setActiveView('ownUnit')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'ownUnit' ? 'bg-[#F2C94C] text-[#1A1A1A] shadow-md' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
        >
          Own Unit Report
        </button>
        <button
          onClick={() => setActiveView('materialRequests')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeView === 'materialRequests' ? 'bg-[#F2C94C] text-[#1A1A1A] shadow-md' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
        >
          Material Requests
        </button>
      </div>
      
      {activeView === '' && (
        <div className="bg-[#FAF7F2] rounded-xl p-4 border border-[#E7E2D8] shadow-sm">
          <p className="text-[#6D6A62] text-sm">
            Real-time tracking of packing material stock movements between PM Store, Own Unit WIP, and Job work WIP based on created Delivery Challans.
          </p>
          <p className="text-[#6D6A62] text-sm mt-2">
            Select "Job Stock Report" or "Own Unit Report" to view detailed delivery information.
          </p>
        </div>
      )}
      
      {/* Summary Cards */}
      {activeView === '' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StockSummaryCard 
            title="Total Materials" 
            value={summaryTotals.totalMaterials} 
            icon={FaBox} 
            bgColor="bg-white" 
            textColor="text-[#1A1A1A]"
            tooltip="Total number of packing materials"
            className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
          />
          <StockSummaryCard 
            title="PM Store" 
            value={summaryTotals.ourStock} 
            icon={FaBox} 
            bgColor="bg-white" 
            textColor="text-[#1A1A1A]"
            tooltip="Current available quantity in factory store"
            className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
          />
          <StockSummaryCard 
            title="Own Unit WIP" 
            value={summaryTotals.ownUnitStock} 
            icon={FaIndustry} 
            bgColor="bg-white" 
            textColor="text-[#1A1A1A]"
            tooltip="Work in progress issued to Own Unit via DC"
            className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
          />
          <StockSummaryCard 
            title="Job work WIP" 
            value={summaryTotals.jobberStock} 
            icon={FaUser} 
            bgColor="bg-white" 
            textColor="text-[#1A1A1A]"
            tooltip="Work in progress issued to Jobber via DC"
            className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
          />
          <StockSummaryCard 
            title="Total Material Value" 
            value={formatCurrency(summaryTotals.totalValue)} 
            icon={FaMoneyBill} 
            bgColor="bg-white" 
            textColor="text-[#1A1A1A]"
            tooltip="Total value of all materials"
            className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
          />
        </div>
      )}
      
      {/* Search Bar */}
      {activeView !== '' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-[#6D6A62]" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Job Stock Report */}
      {activeView === 'job' && (
        <JobStockReport deliveryChallans={deliveryChallans} onBack={() => setActiveView('')} />
      )}
      
      {/* Own Unit Report */}
      {activeView === 'ownUnit' && (
        <OwnUnitReport deliveryChallans={deliveryChallans} onBack={() => setActiveView('')} />
      )}
      
      {/* Material Requests */}
      {activeView === 'materialRequests' && (
        <MaterialRequestsView 
          requests={materialRequests} 
          loading={requestsLoading} 
          onBack={() => setActiveView('')} 
          onRefresh={fetchMaterialRequests}
        />
      )}
      
      {/* Material Stock Table (default view) */}
      {activeView === '' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
          {/* Configuration Modal - Updated to use shared Modal component */}
          <Modal 
            isOpen={isConfigModalOpen} 
            onClose={() => setIsConfigModalOpen(false)} 
            title="Configure Stock Capture Times"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Opening Stock Capture Time
                </label>
                <input
                  type="time"
                  value={newConfig.openingTime}
                  onChange={(e) => setNewConfig({...newConfig, openingTime: e.target.value})}
                  className="block w-full border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] bg-white text-[#1A1A1A]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Closing Stock Capture Time
                </label>
                <input
                  type="time"
                  value={newConfig.closingTime}
                  onChange={(e) => setNewConfig({...newConfig, closingTime: e.target.value})}
                  className="block w-full border border-[#E7E2D8] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] bg-white text-[#1A1A1A]"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 border border-[#E7E2D8] rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#e0b840]"
              >
                Save
              </button>
            </div>
          </Modal>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E7E2D8]">
              <thead className="bg-[#FAF7F2]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider" style={{ width: '25%' }}>Material Name</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Opening Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Inward (GRN)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Outward (DC)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">PM Store</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">PM Value (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Own Unit WIP</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Own Unit WIP Value (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Job work WIP</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Job work WIP Value (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Closing Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Total Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Total Value (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E7E2D8]">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-4 text-center text-[#6D6A62]">
                      No materials found.
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((material, index) => (
                    <tr 
                      key={material.materialName} 
                      className={index % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-white'}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A] max-w-xs truncate" title={material.materialName}>
                        <div className="truncate" title={material.materialName}>
                          {material.materialName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.openingStock} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.inward} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.outward} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.ourStock} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {formatCurrency(material.ourStockValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.ownUnitStock} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {formatCurrency(material.ownUnitValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.jobberStock} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {formatCurrency(material.jobberValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                        {material.closingStock} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-bold">
                        {material.totalQty} {material.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-bold">
                        {formatCurrency(material.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6D6A62] text-right">
                        {formatDate(material.lastUpdated)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E7E2D8] flex items-center justify-between">
            <div className="text-sm text-[#1A1A1A]">
              Showing {filteredMaterials.length} of {materialStocks.length} materials
            </div>
            <div className="text-sm text-[#6D6A62]">
              Total Items: {materialStocks.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Job Stock Report Component
const JobStockReport = ({ deliveryChallans, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter for jobber DCs
  const jobberDCs = deliveryChallans.filter(dc => dc.unit_type === 'Jobber');
  
  // Filter by search term
  const filteredJobberDCs = jobberDCs.filter(dc => {
    const jobberName = dc.supplier_id?.name || 'Unknown Jobber';
    const matchesSearch = jobberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dc.dc_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dc.products || []).some(product => 
        (product.materials || []).some(material => 
          material.material_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    return matchesSearch;
  });
  
  // Group by jobber name
  const jobberData = filteredJobberDCs.reduce((acc, dc) => {
    const jobberName = dc.supplier_id?.name || 'Unknown Jobber';
    if (!acc[jobberName]) {
      acc[jobberName] = {
        jobberName,
        totalDCs: 0,
        totalMaterialQty: 0,
        totalCartonQty: 0,
        dcs: []
      };
    }
    
    acc[jobberName].totalDCs += 1;
    acc[jobberName].totalCartonQty += (dc.products || []).reduce((sum, product) => sum + (product.carton_qty || 0), 0);
    
    // Calculate total material quantity with defensive checks
    let materialQty = 0;
    (dc.products || []).forEach(product => {
      (product.materials || []).forEach(material => {
        materialQty += material.total_qty || 0;
      });
    });
    
    acc[jobberName].totalMaterialQty += materialQty;
    acc[jobberName].dcs.push(dc);
    
    return acc;
  }, {});
  
  const jobberList = Object.values(jobberData);
  
  // Pagination
  const totalPages = Math.ceil(jobberList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobberList = jobberList.slice(startIndex, startIndex + itemsPerPage);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(roundedAmount);
  };
  
  const [selectedJobber, setSelectedJobber] = useState(null);
  
  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
      >
        <FaArrowLeft className="mr-2" />
        ← Back to Stock Report
      </button>
      
      {!selectedJobber ? (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-[#6D6A62]" />
                </div>
                <input
                  type="text"
                  placeholder="Search by jobber name, DC number, or material..."
                  className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] shadow-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E7E2D8]">
                <thead className="bg-[#FAF7F2]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Jobber Name</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Total DC Sent</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Total Material Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Total Carton Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">View Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E7E2D8]">
                  {paginatedJobberList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-[#6D6A62]">
                        No jobber delivery challans found.
                      </td>
                    </tr>
                  ) : (
                    paginatedJobberList.map((jobber, index) => (
                      <tr 
                        key={jobber.jobberName} 
                        className={index % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-white'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                          {jobber.jobberName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                          {jobber.totalDCs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                          {jobber.totalMaterialQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                          {jobber.totalCartonQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button 
                            onClick={() => setSelectedJobber(jobber)}
                            className="text-[#F2C94C] hover:text-[#1A1A1A] font-semibold"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E7E2D8] flex items-center justify-between">
                <div className="text-sm text-[#1A1A1A]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, jobberList.length)} of {jobberList.length} jobbers
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg ${currentPage === 1 ? 'bg-[#FAF7F2] text-[#6D6A62] cursor-not-allowed' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-[#1A1A1A]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg ${currentPage === totalPages ? 'bg-[#FAF7F2] text-[#6D6A62] cursor-not-allowed' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={() => setSelectedJobber(null)}
            className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
          >
            <FaArrowLeft className="mr-2" />
            Back to Jobber Summary
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E2D8]">
              <h3 className="text-lg font-medium text-[#1A1A1A]">Delivery Challans for {selectedJobber.jobberName}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E7E2D8]">
                <thead className="bg-[#FAF7F2]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">DC No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">DC Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider" style={{ width: '25%' }}>Material Name</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Carton Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E7E2D8]">
                  {selectedJobber.dcs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-[#6D6A62]">
                        No delivery challans found.
                      </td>
                    </tr>
                  ) : (
                    selectedJobber.dcs.flatMap(dc => 
                      (dc.products || []).flatMap(product => 
                        (product.materials || []).map((material, index) => (
                          <tr 
                            key={`${dc._id}-${index}`} 
                            className={index % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-white'}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                              {dc.dc_no}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                              {formatDate(dc.date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#1A1A1A] max-w-xs truncate" title={material.material_name}>
                              <div className="truncate" title={material.material_name}>
                                {material.material_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                              {material.total_qty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                              {(dc.products || []).reduce((sum, product) => sum + (product.carton_qty || 0), 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${dc.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                  dc.status === 'Partial' ? 'bg-orange-100 text-orange-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {dc.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Own Unit Report Component
const OwnUnitReport = ({ deliveryChallans, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter for own unit DCs
  const ownUnitDCs = deliveryChallans.filter(dc => dc.unit_type === 'Own Unit');
  
  // Format data for display with defensive checks
  const ownUnitData = ownUnitDCs.flatMap(dc => 
    (dc.products || []).flatMap(product => 
      (product.materials || []).map(material => ({
        dcId: dc._id,
        dcNo: dc.dc_no,
        personName: dc.person_name || 'N/A',
        productName: product.product_name || 'N/A',
        materialName: material.material_name,
        qty: material.total_qty || 0,
        cartonQty: product.carton_qty || 0,
        updatedAt: dc.updatedAt || dc.createdAt || new Date(),
        status: dc.status
      }))
    )
  );
  
  // Filter by search term
  const filteredOwnUnitData = ownUnitData.filter(item => 
    item.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.dcNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Pagination
  const totalPages = Math.ceil(filteredOwnUnitData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOwnUnitData = filteredOwnUnitData.slice(startIndex, startIndex + itemsPerPage);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
      >
        <FaArrowLeft className="mr-2" />
        ← Back to Stock Report
      </button>
      
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-[#6D6A62]" />
            </div>
            <input
              type="text"
              placeholder="Search by person name, DC number, or material..."
              className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] shadow-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E7E2D8]">
            <thead className="bg-[#FAF7F2]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Person / Unit Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider" style={{ width: '25%' }}>Material Name</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Carton Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Updated On</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E7E2D8]">
              {paginatedOwnUnitData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-[#6D6A62]">
                    No own unit delivery challans found.
                  </td>
                </tr>
              ) : (
                paginatedOwnUnitData.map((item, index) => (
                  <tr 
                    key={`${item.dcId}-${index}`} 
                    className={index % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-white'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                      {item.personName}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#1A1A1A] max-w-xs truncate" title={item.materialName}>
                      <div className="truncate" title={item.materialName}>
                        {item.materialName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                      {item.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                      {item.cartonQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                      {formatDate(item.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${item.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          item.status === 'Partial' ? 'bg-orange-100 text-orange-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E7E2D8] flex items-center justify-between">
            <div className="text-sm text-[#1A1A1A]">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredOwnUnitData.length)} of {filteredOwnUnitData.length} records
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-lg ${currentPage === 1 ? 'bg-[#FAF7F2] text-[#6D6A62] cursor-not-allowed' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-[#1A1A1A]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-lg ${currentPage === totalPages ? 'bg-[#FAF7F2] text-[#6D6A62] cursor-not-allowed' : 'bg-white text-[#1A1A1A] border border-[#E7E2D8] hover:bg-[#FAF7F2]'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Material Requests View Component
const MaterialRequestsView = ({ requests, loading, onBack, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter requests by search term
  const filteredRequests = requests.filter(request => 
    request.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requestId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Handle status update
  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await api.put(`/material-requests/${requestId}/status`, { status: newStatus });
      toast.success(`Request ${newStatus.toLowerCase()} successfully!`);
      onRefresh(); // Refresh the requests list
    } catch (err) {
      console.error(`Error updating request status to ${newStatus}:`, err);
      toast.error(`Failed to ${newStatus.toLowerCase()} request`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#FAF7F2]">
        <FaSpinner className="animate-spin text-[#F2C94C]" size={48} />
        <span className="ml-4 text-lg text-[#6D6A62]">Loading material requests...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      {/* Back Button */}
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
        >
          <FaArrowLeft className="mr-2" />
          ← Back to Stock Report
        </button>
        <button 
          onClick={onRefresh}
          className="flex items-center px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] transition-all shadow-sm hover:shadow-md font-semibold"
        >
          <FaRedo className="mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-[#6D6A62]" />
            </div>
            <input
              type="text"
              placeholder="Search by product, requester, or request ID..."
              className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Material Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E2D8]">
          <h3 className="text-lg font-medium text-[#1A1A1A]">Material Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E7E2D8]">
            <thead className="bg-[#FAF7F2]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Required Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Requested By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E7E2D8]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-[#6D6A62]">
                    No material requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <tr 
                    key={request._id} 
                    className={index % 2 === 0 ? 'bg-white hover:bg-[#FAF7F2]' : 'bg-[#FAF7F2] hover:bg-white'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                      <div className="font-medium">{request.productName}</div>
                      <div className="text-xs text-[#6D6A62]">{request.requestId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] text-right font-medium">
                      {request.requiredQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                      {request.requester}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${request.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          request.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                          request.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 
                          request.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex space-x-2">
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request._id, 'Approved')}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-lg shadow-sm text-[#1A1A1A] bg-[#F2C94C] hover:bg-[#e0b840]"
                            >
                              <FaCheck className="mr-1" size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request._id, 'Rejected')}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-red-500 hover:bg-red-600"
                            >
                              <FaTimes className="mr-1" size={12} />
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'Approved' && (
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'Completed')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600"
                          >
                            <FaTruck className="mr-1" size={12} />
                            Mark Completed
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // In a real implementation, this would show request details
                            console.log('View details for request:', request);
                          }}
                          className="inline-flex items-center px-3 py-1 border border-[#E7E2D8] text-xs font-medium rounded-lg text-[#1A1A1A] bg-white hover:bg-[#FAF7F2]"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E7E2D8]">
          <div className="text-sm text-[#1A1A1A]">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialStockReport;