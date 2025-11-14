import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';
import { FaSpinner, FaBox, FaTruck, FaClipboardCheck, FaExclamationTriangle, FaRedo, FaSearch } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { io } from 'socket.io-client';

const FGStockReport = () => {
  const [productStocks, setProductStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [socket, setSocket] = useState(null);
  const [updatedProducts, setUpdatedProducts] = useState(new Set());
  const updatedProductTimers = useRef({});

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch product stock data
      const response = await api.get('/fg/stock-report');
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
  }, []);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return productStocks.filter(product => {
      // Search filter
      const matchesSearch = 
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.itemCode && product.itemCode.toLowerCase().includes(searchTerm.toLowerCase())); // Add itemCode to search
      
      // Date range filter
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        const productDate = new Date(product.lastUpdated);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        matchesDate = productDate >= startDate && productDate <= endDate;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [productStocks, searchTerm, dateRange]);

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    return filteredProducts.reduce((totals, product) => {
      totals.totalProducts += 1;
      totals.totalInward += product.totalInward || 0;
      totals.totalOutward += product.totalOutward || 0;
      totals.availableStock += product.availableStock || 0;
      totals.totalCartons += product.available_cartons || 0;
      totals.totalPieces += product.broken_carton_pieces || 0;
      return totals;
    }, {
      totalProducts: 0,
      totalInward: 0,
      totalOutward: 0,
      availableStock: 0,
      totalCartons: 0,
      totalPieces: 0
    });
  }, [filteredProducts]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md alert alert-error">
        {error}
      </div>
    );
  }

  // Define columns for desktop table
  const tableColumns = [
    { key: 'itemCode', header: 'Item Code' }, // Add Item Code column
    { key: 'productName', header: 'Product Name' },
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
    { key: 'itemCode', label: 'Item Code' }, // Add Item Code field
    { key: 'productName', label: 'Product', isTitle: true },
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

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(product => ({
      'Item Code': product.itemCode || 'N/A', // Add Item Code to export
      'Product Name': product.productName,
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
      head: [['Item Code', 'Product Name', 'Total Cartons', 'Broken Pieces', 'Last Updated']], // Add Item Code to PDF header
      body: filteredProducts.map(product => [
        product.itemCode || 'N/A', // Add Item Code to PDF
        product.productName,
        product.available_cartons,
        product.broken_carton_pieces,
        product.lastUpdated ? new Date(product.lastUpdated).toLocaleString() : 'N/A'
      ]),
    });
    
    doc.save('FG_Stock_Report.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Finished Goods Stock Report</h1>
        <div className="flex space-x-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Export PDF
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <FaRedo className="mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
              <FaBox />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold">{summaryTotals.totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <FaClipboardCheck />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cartons</p>
              <p className="text-2xl font-bold">{summaryTotals.totalCartons}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FaTruck />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Broken Pieces</p>
              <p className="text-2xl font-bold">{summaryTotals.totalPieces}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <FaClipboardCheck />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Stock</p>
              <p className="text-2xl font-bold">{summaryTotals.availableStock}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by product name or item code..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <input
              type="date"
              placeholder="Start Date"
              className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
            <input
              type="date"
              placeholder="End Date"
              className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
        </div>
      </div>
      
      {/* Responsive Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                {tableColumns.map(column => (
                  <th 
                    key={column.key} 
                    className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="px-6 py-4 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr 
                    key={product._id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 ${
                      updatedProducts.has(product.productName) ? 'bg-green-100 transition-colors duration-1000' : ''
                    }`}
                  >
                    {tableColumns.map(column => (
                      <td 
                        key={column.key} 
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          column.key === 'productName' ? 'font-medium text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {column.render ? column.render(product[column.key]) : product[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer with totals */}
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td className="px-6 py-3 text-sm text-gray-700"></td> {/* Empty cell for Item Code */}
                <td className="px-6 py-3 text-sm text-gray-700">TOTAL</td>
                <td className="px-6 py-3 text-sm text-gray-700">{summaryTotals.totalCartons}</td>
                <td className="px-6 py-3 text-sm text-gray-700">{summaryTotals.totalPieces}</td>
                <td className="px-6 py-3 text-sm text-gray-700"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          Showing {filteredProducts.length} of {productStocks.length} products
        </div>
      </div>
    </div>
  );
};

export default FGStockReport;