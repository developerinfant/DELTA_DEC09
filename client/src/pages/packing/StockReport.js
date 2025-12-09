import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { FaSpinner, FaBox, FaTruck, FaClipboardCheck, FaExclamationTriangle, FaRedo, FaSearch } from 'react-icons/fa';
import StockSummaryCard from '../../components/StockSummaryCard';
import ResponsiveTable from '../../components/common/ResponsiveTable';

const StockReport = () => {
  const [productStocks, setProductStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [recentlyUpdated, setRecentlyUpdated] = useState(new Set());

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch product stock data
      const response = await api.get('/product-stock');
      setProductStocks(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load stock report data. Please refresh.');
      console.error('Error fetching stock report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Listen for GRN updates to refresh the stock report
    const handleGRNUpdate = () => {
      console.log('GRN updated, refreshing stock report...');
      fetchData();
    };
    
    window.addEventListener('grnUpdated', handleGRNUpdate);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('grnUpdated', handleGRNUpdate);
    };
  }, []);

  // Handle item click (for viewing details)
  const handleItemClick = (item) => {
    // In a real implementation, this would open a modal or navigate to a detail page
    console.log('View details for:', item);
  };

  // Check if stock data is stale (older than 24 hours)
  const isStockDataStale = (lastUpdated) => {
    if (!lastUpdated) return true;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(lastUpdated) < oneDayAgo;
  };

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return productStocks.filter(product => {
      // Search filter
      const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Source filter
      let matchesSource = true;
      if (filterSource === 'own-unit') {
        matchesSource = product.lastUpdatedFrom === 'Own Unit';
      } else if (filterSource === 'jobber') {
        matchesSource = product.lastUpdatedFrom === 'Jobber';
      }
      
      return matchesSearch && matchesSource;
    });
  }, [productStocks, searchTerm, filterSource]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredProducts.reduce((totals, product) => {
      totals.totalProducts += 1;
      totals.ownUnitStock += product.ownUnitStock || 0;
      totals.jobberStock += product.jobberStock || 0;
      totals.totalAvailable += product.totalAvailable || 0;
      return totals;
    }, {
      totalProducts: 0,
      ownUnitStock: 0,
      jobberStock: 0,
      totalAvailable: 0
    });
  }, [filteredProducts]);

  // Add flash effect for recently updated items
  useEffect(() => {
    if (recentlyUpdated.size > 0) {
      const timer = setTimeout(() => {
        setRecentlyUpdated(new Set());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdated]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#FAF7F2]">
        <FaSpinner className="animate-spin text-[#F2C94C]" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md alert alert-error">
        {error}
      </div>
    );
  }

  // Define columns for desktop table
  const tableColumns = [
    { key: 'productName', header: 'Product Name' },
    { key: 'ownUnitStock', header: 'Own Unit Stock' },
    { key: 'jobberStock', header: 'Jobber Stock' },
    { key: 'totalAvailable', header: 'Total Available' },
    { 
      key: 'lastUpdated', 
      header: 'Last Updated', 
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString();
      }
    },
    { 
      key: 'lastUpdatedFrom', 
      header: 'Source', 
      render: (value) => {
        if (!value) return 'N/A';
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value === 'Own Unit' ? 'bg-blue-100 text-blue-800' : 
            value === 'Jobber' ? 'bg-green-100 text-green-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {value}
          </span>
        );
      }
    }
  ];

  // Define fields for mobile card list
  const mobileFields = [
    { key: 'productName', label: 'Product', isTitle: true },
    { key: 'ownUnitStock', label: 'Own Unit' },
    { key: 'jobberStock', label: 'Jobber' },
    { key: 'totalAvailable', label: 'Total' },
    { 
      key: 'lastUpdated', 
      label: 'Updated', 
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString();
      }
    },
    { 
      key: 'lastUpdatedFrom', 
      label: 'Source', 
      render: (value) => {
        if (!value) return 'N/A';
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value === 'Own Unit' ? 'bg-blue-100 text-blue-800' : 
            value === 'Jobber' ? 'bg-green-100 text-green-800' : 
            'bg-gray-100 text-gray-800'
          }`}>
            {value}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Stock Report</h1>
        <button 
          onClick={fetchData}
          className="flex items-center px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] transition-all self-end md:self-auto shadow-sm hover:shadow-md font-semibold"
        >
          <FaRedo className="mr-2" />
          Sync Now
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StockSummaryCard 
          title="Total Products" 
          value={summaryTotals.totalProducts} 
          icon={FaBox} 
          bgColor="bg-white" 
          textColor="text-[#1A1A1A]"
          tooltip="Total number of products in inventory"
          className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
        />
        <StockSummaryCard 
          title="Own Unit Stock" 
          value={summaryTotals.ownUnitStock} 
          icon={FaClipboardCheck} 
          bgColor="bg-white" 
          textColor="text-[#1A1A1A]"
          tooltip="Stock produced in-house (Own Unit)"
          className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
        />
        <StockSummaryCard 
          title="Jobber Stock" 
          value={summaryTotals.jobberStock} 
          icon={FaTruck} 
          bgColor="bg-white" 
          textColor="text-[#1A1A1A]"
          tooltip="Stock received from external suppliers (Jobber)"
          className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
        />
        <StockSummaryCard 
          title="Total Available" 
          value={summaryTotals.totalAvailable} 
          icon={FaClipboardCheck} 
          bgColor="bg-white" 
          textColor="text-[#1A1A1A]"
          tooltip="Total available stock (Own Unit + Jobber)"
          className="rounded-xl border border-[#E7E2D8] shadow-sm hover:shadow-md transition-all"
        />
      </div>
      
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-[#6D6A62]" />
            </div>
            <input
              type="text"
              placeholder="Search by product name..."
              className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <select
              className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border-[#E7E2D8] focus:outline-none focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C] sm:text-sm rounded-lg bg-white text-[#1A1A1A]"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="own-unit">Own Unit</option>
              <option value="jobber">Jobber</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Warning for stale data */}
      {filteredProducts.some(item => isStockDataStale(item.lastUpdated)) && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-lg flex items-center">
          <FaExclamationTriangle className="mr-2" />
          <span>Some stock data may be outdated. Last updated more than 24 hours ago.</span>
        </div>
      )}
      
      {/* Responsive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
        <ResponsiveTable
          data={filteredProducts}
          columns={tableColumns}
          mobileFields={mobileFields}
          itemKey="productName"
          onItemClick={handleItemClick}
          tableTitle="Product Stock Summary"
          rowClassName={(item) => recentlyUpdated.has(item.productName) ? 'bg-green-50 animate-pulse' : ''}
        />
      </div>
    </div>
  );
};

export default StockReport;