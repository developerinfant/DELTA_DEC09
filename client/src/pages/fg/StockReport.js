import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';
import { FaSpinner, FaBox, FaTruck, FaClipboardCheck, FaExclamationTriangle, FaRedo, FaSearch, FaEdit, FaCog } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { io } from 'socket.io-client';
import Modal from '../../components/common/Modal';

const FGStockReport = () => {
  const [productStocks, setProductStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [socket, setSocket] = useState(null);
  const [updatedProducts, setUpdatedProducts] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ alertThreshold: '', hsnCode: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); // Add this state for config modal
  const [config, setConfig] = useState({ openingTime: '09:00', closingTime: '21:00' }); // Add this state for config
  const [newConfig, setNewConfig] = useState({ openingTime: '09:00', closingTime: '21:00' }); // Add this state for new config
  const updatedProductTimers = useRef({});

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch product stock data with date filter
      const response = await api.get(`/fg/stock-report?date=${selectedDate}`);
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
    
    // Fetch stock configuration
    const fetchConfig = async () => {
      try {
        const response = await api.get('/fg/stock-config');
        setConfig(response.data);
        setNewConfig(response.data);
      } catch (err) {
        console.error('Error fetching stock configuration:', err);
        // Set default config if fetch fails
        setConfig({ openingTime: '09:00', closingTime: '21:00' });
        setNewConfig({ openingTime: '09:00', closingTime: '21:00' });
      }
    };
    
    fetchConfig();
    
    // Initialize socket connection
    const newSocket = io();
    setSocket(newSocket);
    
    // Listen for stock updates
    newSocket.on('stockUpdate', (updatedStock) => {
      setProductStocks(prevStocks => 
        prevStocks.map(stock => 
          stock.productName === updatedStock.product_name 
            ? { ...stock, ...updatedStock }
            : stock
        )
      );
      
      // Add to updated products set for highlighting
      setUpdatedProducts(prev => new Set(prev).add(updatedStock.product_name));
      
      // Remove highlight after 2 seconds
      if (updatedProductTimers.current[updatedStock.product_name]) {
        clearTimeout(updatedProductTimers.current[updatedStock.product_name]);
      }
      
      updatedProductTimers.current[updatedStock.product_name] = setTimeout(() => {
        setUpdatedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(updatedStock.product_name);
          return newSet;
        });
      }, 2000);
    });
    
    // Clean up socket connection and timers
    return () => {
      newSocket.close();
      Object.values(updatedProductTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [selectedDate]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return productStocks.filter(product => {
      // Search filter
      const matchesSearch = 
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.itemCode && product.itemCode.toLowerCase().includes(searchTerm.toLowerCase())); // Add itemCode to search
      
      // NOTE: We intentionally do NOT filter by date here to show ALL products
      // This matches the behavior of the Packing Materials Stock Report
      // The date selection is used only for calculating the stock values, not for filtering which products to show
      
      return matchesSearch;
    });
  }, [productStocks, searchTerm]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredProducts.reduce((totals, product) => {
      totals.totalProducts += 1;
      totals.totalCartons += product.available_cartons || 0;
      totals.totalPieces += product.broken_carton_pieces || 0;
      totals.availableStock += product.totalAvailable || 0;
      totals.totalOpeningCartons += product.openingCartons || 0;
      totals.totalOpeningPieces += product.openingPieces || 0;
      totals.totalInward += product.inward || 0;
      totals.totalOutwardCartons += product.outwardCartons || 0;
      totals.totalOutwardPieces += product.outwardPieces || 0;
      totals.totalClosingCartons += product.closingCartons || 0;
      totals.totalClosingPieces += product.closingPieces || 0;
      return totals;
    }, {
      totalProducts: 0,
      totalCartons: 0,
      totalPieces: 0,
      availableStock: 0,
      totalOpeningCartons: 0,
      totalOpeningPieces: 0,
      totalInward: 0,
      totalOutwardCartons: 0,
      totalOutwardPieces: 0,
      totalClosingCartons: 0,
      totalClosingPieces: 0
    });
  }, [filteredProducts]);

  // Handle edit button click
  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      alertThreshold: product.alertThreshold || '',
      hsnCode: product.hsnCode || ''
    });
    setShowEditModal(true);
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!editingProduct) return;
    
    setIsSaving(true);
    try {
      const response = await api.put(`/fg/stock/${editingProduct._id}`, editForm);
      
      // Update the product in the state
      setProductStocks(prevStocks => 
        prevStocks.map(stock => 
          stock._id === editingProduct._id 
            ? { ...stock, ...response.data }
            : stock
        )
      );
      
      // Close modal and reset
      setShowEditModal(false);
      setEditingProduct(null);
      setEditForm({ alertThreshold: '', hsnCode: '' });
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditForm({ alertThreshold: '', hsnCode: '' });
  };
  
  // Handle saving stock configuration
  const handleSaveConfig = async () => {
    try {
      await api.post('/fg/configure-stock-times', {
        openingTime: newConfig.openingTime,
        closingTime: newConfig.closingTime
      });
      setConfig(newConfig);
      setIsConfigModalOpen(false);
      // Refresh data to reflect new configuration
      fetchData();
    } catch (err) {
      console.error('Error saving stock configuration:', err);
      alert('Failed to save configuration. Please try again.');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(product => ({
      'Item Code': product.itemCode || 'N/A',
      'Product Name': product.productName,
      'Opening Cartons': product.openingCartons,
      'Opening Pieces': product.openingPieces,
      'Inward (GRN)': product.inward,
      'Outward Cartons': product.outwardCartons,
      'Outward Pieces': product.outwardPieces,
      'Closing Cartons': product.closingCartons,
      'Closing Pieces': product.closingPieces,
      'Total Cartons': product.available_cartons,
      'Broken Pieces': product.broken_carton_pieces,
      'Last Updated': product.lastUpdated ? new Date(product.lastUpdated).toLocaleString() : 'N/A'
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FG Stock Report');
    XLSX.writeFile(workbook, 'FG_Stock_Report.xlsx');
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Finished Goods Stock Report', 14, 22);
    
    // Add summary cards
    doc.setFontSize(12);
    doc.text(`Total Products: ${summaryTotals.totalProducts}`, 14, 32);
    doc.text(`Total Cartons: ${summaryTotals.totalCartons}`, 14, 40);
    doc.text(`Total Broken Pieces: ${summaryTotals.totalPieces}`, 14, 48);
    
    // Add table
    doc.autoTable({
      startY: 55,
      head: [['Item Code', 'Product Name', 'Opening Cartons', 'Opening Pieces', 'Inward (GRN)', 'Outward Cartons', 'Outward Pieces', 'Closing Cartons', 'Closing Pieces', 'Total Cartons', 'Broken Pieces', 'Last Updated']],
      body: filteredProducts.map(product => [
        product.itemCode || 'N/A',
        product.productName,
        product.openingCartons,
        product.openingPieces,
        product.inward,
        product.outwardCartons,
        product.outwardPieces,
        product.closingCartons,
        product.closingPieces,
        product.available_cartons,
        product.broken_carton_pieces,
        product.lastUpdated ? new Date(product.lastUpdated).toLocaleString() : 'N/A'
      ]),
    });
    
    doc.save('FG_Stock_Report.pdf');
  };

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
    { key: 'itemCode', header: 'Item Code' },
    { key: 'productName', header: 'Product Name' },
    { key: 'openingCartons', header: 'Opening Cartons' },
    { key: 'openingPieces', header: 'Opening Pieces' },
    { key: 'inward', header: 'Inward (GRN)' },
    { key: 'outwardCartons', header: 'Outward Cartons' },
    { key: 'outwardPieces', header: 'Outward Pieces' },
    { key: 'closingCartons', header: 'Closing Cartons' },
    { key: 'closingPieces', header: 'Closing Pieces' },
    { key: 'available_cartons', header: 'Total Cartons' },
    { key: 'broken_carton_pieces', header: 'Broken Pieces' },
    { 
      key: 'lastUpdated', 
      header: 'Last Updated', 
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
      }
    }
  ];

  // Define fields for mobile card list
  const mobileFields = [
    { key: 'itemCode', label: 'Item Code' },
    { key: 'productName', label: 'Product', isTitle: true },
    { key: 'openingCartons', label: 'Opening Cartons' },
    { key: 'openingPieces', label: 'Opening Pieces' },
    { key: 'inward', label: 'Inward (GRN)' },
    { key: 'outwardCartons', label: 'Outward Cartons' },
    { key: 'outwardPieces', label: 'Outward Pieces' },
    { key: 'closingCartons', label: 'Closing Cartons' },
    { key: 'closingPieces', label: 'Closing Pieces' },
    { key: 'available_cartons', label: 'Cartons' },
    { key: 'broken_carton_pieces', label: 'Broken Pieces' },
    { 
      key: 'lastUpdated', 
      label: 'Updated', 
      render: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleDateString();
      }
    }
  ];

  return (
    <div className="space-y-6 bg-[#FAF7F2] p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Finished Goods Stock Report</h1>
        <div className="flex space-x-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-[#6A7F3F] text-white rounded-xl hover:bg-[#5a6d35] transition-all shadow-sm hover:shadow-md font-semibold"
          >
            Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-sm hover:shadow-md font-semibold"
          >
            Export PDF
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] transition-all shadow-sm hover:shadow-md font-semibold"
          >
            <FaRedo className="mr-2" />
            Refresh
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
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-[#FAF7F2] text-[#F2C94C] mr-4">
              <FaBox />
            </div>
            <div>
              <p className="text-sm text-[#6D6A62]">Total Products</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{summaryTotals.totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-[#FAF7F2] text-[#F2C94C] mr-4">
              <FaClipboardCheck />
            </div>
            <div>
              <p className="text-sm text-[#6D6A62]">Total Cartons</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{summaryTotals.totalCartons}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-[#FAF7F2] text-[#6A7F3F] mr-4">
              <FaTruck />
            </div>
            <div>
              <p className="text-sm text-[#6D6A62]">Total Broken Pieces</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{summaryTotals.totalPieces}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E7E2D8]">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-[#FAF7F2] text-[#F2C94C] mr-4">
              <FaClipboardCheck />
            </div>
            <div>
              <p className="text-sm text-[#6D6A62]">Available Stock</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{summaryTotals.availableStock}</p>
            </div>
          </div>
        </div>
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
              placeholder="Search by product name or item code..."
              className="block w-full pl-10 pr-3 py-2 border border-[#E7E2D8] rounded-lg leading-5 bg-white placeholder-[#6D6A62] focus:outline-none focus:placeholder-[#1A1A1A] focus:ring-1 focus:ring-[#F2C94C] focus:border-[#F2C94C]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
        </div>
      </div>
      
      {/* Responsive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E7E2D8] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E7E2D8]">
            <thead className="bg-[#FAF7F2]">
              <tr>
                {tableColumns.map(column => (
                  <th 
                    key={column.key} 
                    className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E7E2D8]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="px-6 py-4 text-center text-[#6D6A62]">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr 
                    key={product._id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F2]'} hover:bg-[#FAF7F2] ${
                      updatedProducts.has(product.productName) ? 'bg-green-50 transition-colors duration-1000' : ''
                    }`}
                  >
                    {tableColumns.map(column => (
                      <td 
                        key={column.key} 
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          column.key === 'productName' ? 'font-medium text-[#1A1A1A]' : 'text-[#1A1A1A]'
                        }`}
                      >
                        {column.render ? column.render(product[column.key]) : product[column.key]}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="text-[#F2C94C] hover:text-[#1A1A1A]"
                      >
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#FAF7F2] font-bold">
              <tr>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]"></td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">TOTAL</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalOpeningCartons}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalOpeningPieces}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalInward}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalOutwardCartons}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalOutwardPieces}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalClosingCartons}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalClosingPieces}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalCartons}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]">{summaryTotals.totalPieces}</td>
                <td className="px-6 py-3 text-sm text-[#1A1A1A]"></td>
              </tr>
            </tfoot>

          </table>
        </div>
        <div className="px-6 py-3 bg-[#FAF7F2] border-t border-[#E7E2D8] text-sm text-[#6D6A62]">
          Showing {filteredProducts.length} of {productStocks.length} products
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={handleCancelEdit}
        title="Edit Product"
        size="default"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Product Name</label>
            <input
              type="text"
              value={editingProduct?.productName || ''}
              readOnly
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Item Code</label>
            <input
              type="text"
              value={editingProduct?.itemCode || 'N/A'}
              readOnly
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Total Cartons</label>
            <input
              type="text"
              value={editingProduct?.available_cartons || ''}
              readOnly
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Broken Pieces</label>
            <input
              type="text"
              value={editingProduct?.broken_carton_pieces || ''}
              readOnly
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Alert Threshold</label>
            <input
              type="number"
              name="alertThreshold"
              value={editForm.alertThreshold}
              onChange={handleFormChange}
              min="0"
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all hover:shadow-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">HSN Code</label>
            <input
              type="text"
              name="hsnCode"
              value={editForm.hsnCode}
              onChange={handleFormChange}
              className="mt-1 block w-full px-4 py-3 bg-white border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all hover:shadow-md"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-6 py-2 bg-[#FAF7F2] border border-[#E7E2D8] text-[#1A1A1A] rounded-xl hover:bg-[#E7E2D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6D6A62] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-6 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e0b840] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C94C] disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
      
      {/* Configuration Modal */}
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
      
    </div>
  );
};

export default FGStockReport;