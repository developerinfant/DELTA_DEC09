import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { FaSpinner, FaRedo, FaSearch, FaDownload, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DamagedStockReport = () => {
  const [damagedStockEntries, setDamagedStockEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Add state for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [currentMaterialName, setCurrentMaterialName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    supplier: '',
    product: '',
    material: '',
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [summary, setSummary] = useState({
    pendingRequests: 0,
    totalDamagedQty: 0,
    lastUpdated: null
  });
  const navigate = useNavigate();

  // Fetch damaged stock entries
  const fetchDamagedStockEntries = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await api.get('/damaged-stock', { params });
      setDamagedStockEntries(response.data.data);
      setPagination(response.data.pagination);
      setError('');
    } catch (err) {
      setError('Failed to load damaged stock report data. Please refresh.');
      console.error('Error fetching damaged stock report data:', err);
      toast.error('Failed to load damaged stock report data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch summary data
  const fetchSummary = async () => {
    try {
      const response = await api.get('/damaged-stock/summary');
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching damaged stock summary:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDamagedStockEntries();
    fetchSummary();
  }, [pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchDamagedStockEntries();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      supplier: '',
      product: '',
      material: '',
      status: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchDamagedStockEntries();
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // View history
  const viewHistory = async (materialName) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    setCurrentMaterialName(materialName);
    try {
      const response = await api.get(`/damaged-stock-master/history/${materialName}`);
      setHistoryData(response.data);
    } catch (err) {
      toast.error('Failed to load history data');
      console.error('Error fetching history:', err);
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

  // Handle approve/reject action
  const handleAction = async (id, action, remarks = '') => {
    try {
      await api.put(`/damaged-stock/${id}`, { action, remarks });
      toast.success(`Damaged stock entry ${action}ed successfully`);
      fetchDamagedStockEntries();
      fetchSummary();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to process damaged stock entry';
      toast.error(errorMessage);
      console.error(`Error ${action}ing damaged stock entry:`, err);
    }
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

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      'Approved': { color: 'bg-red-100 text-red-800', icon: '🔴' },
      'Rejected': { color: 'bg-white text-gray-800 border border-gray-300', icon: '⚪' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: '' };
    
    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
        {config.icon} {status}
      </span>
    );
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = [
        'Date', 'DC No', 'GRN No', 'Product', 'Material', 
        'Total Received', 'Damaged Qty', 'Stock Deducted', 'Status', 
        'Entered By', 'Approved By'
      ].join(',');

      const rows = damagedStockEntries.map(entry => [
        formatDate(entry.entered_on),
        entry.dc_no,
        entry.grnNumber || 'N/A',
        entry.product_name,
        entry.material_name,
        entry.received_qty,
        entry.damaged_qty,
        entry.deducted_from_stock ? 'Yes' : 'No',
        entry.status,
        entry.entered_by,
        entry.approved_by || 'N/A'
      ].map(field => `"${field}"`).join(','));

      const csvContent = [headers, ...rows].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'damaged_stock_report.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Damaged stock report exported successfully');
    } catch (err) {
      toast.error('Failed to export damaged stock report');
      console.error('Error exporting to CSV:', err);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = damagedStockEntries.map(entry => ({
        'Date': formatDate(entry.entered_on),
        'DC No': entry.dc_no,
        'GRN No': entry.grnNumber || 'N/A',
        'Product': entry.product_name,
        'Material': entry.material_name,
        'Total Received': entry.received_qty,
        'Damaged Qty': entry.damaged_qty,
        'Stock Deducted': entry.deducted_from_stock ? 'Yes' : 'No',
        'Status': entry.status,
        'Entered By': entry.entered_by,
        'Approved By': entry.approved_by || 'N/A'
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Damaged Stock Report');
      
      // Generate buffer
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for download
      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `damaged_stock_report_${dateStr}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Damaged stock report exported successfully');
    } catch (err) {
      toast.error('Failed to export damaged stock report');
      console.error('Error exporting to Excel:', err);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      // Create new jsPDF instance
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Damaged Stock Report', 14, 22);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      
      // Prepare table data
      const tableColumn = [
        'Date', 'DC No', 'GRN No', 'Product', 'Material', 
        'Received', 'Damaged', 'Deducted', 'Status', 
        'Entered By', 'Approved By'
      ];
      
      const tableRows = damagedStockEntries.map(entry => [
        formatDate(entry.entered_on),
        entry.dc_no,
        entry.grnNumber || 'N/A',
        entry.product_name,
        entry.material_name,
        entry.received_qty,
        entry.damaged_qty,
        entry.deducted_from_stock ? 'Yes' : 'No',
        entry.status,
        entry.entered_by,
        entry.approved_by || 'N/A'
      ]);
      
      // Add table
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [26, 86, 158] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      // Save the PDF
      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`damaged_stock_report_${dateStr}.pdf`);
      
      toast.success('Damaged stock report exported successfully');
    } catch (err) {
      toast.error('Failed to export damaged stock report');
      console.error('Error exporting to PDF:', err);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Damaged Stock Report</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/packing/damaged-stock-master')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Damaged Stock Summary
          </button>
          <button 
            onClick={fetchDamagedStockEntries}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors self-end md:self-auto"
          >
            <FaRedo className="mr-2" />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending Requests</h3>
          <p className="text-3xl font-bold text-yellow-600">{summary.pendingRequests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Total Damaged Qty</h3>
          <p className="text-3xl font-bold text-red-600">{summary.totalDamagedQty}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Last Updated</h3>
          <p className="text-lg font-medium text-gray-600">
            {summary.lastUpdated ? formatDate(summary.lastUpdated) : 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={filters.supplier}
              onChange={(e) => handleFilterChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Supplier name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <input
              type="text"
              value={filters.product}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Product name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <input
              type="text"
              value={filters.material}
              onChange={(e) => handleFilterChange('material', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Material name"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Search by DC No, GRN No..."
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
      
      {/* Export Buttons */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={exportToCSV}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          <FaDownload className="mr-1" /> CSV
        </button>
        <button
          onClick={exportToExcel}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <FaDownload className="mr-1" /> Excel
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          <FaDownload className="mr-1" /> PDF
        </button>
      </div>
      
      {/* Damaged Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Received</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Deducted</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {damagedStockEntries.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-4 text-center text-gray-500">
                    No damaged stock entries found.
                  </td>
                </tr>
              ) : (
                damagedStockEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.entered_on)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.dc_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.grnNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.material_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {entry.received_qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                      {entry.damaged_qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {entry.deducted_from_stock ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.entered_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.approved_by || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {entry.status === 'Pending' && (
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter remarks for approval:');
                              if (remarks !== null) {
                                handleAction(entry._id, 'accept', remarks);
                              }
                            }}
                            className="p-2 text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => {
                              const remarks = prompt('Enter remarks for rejection:');
                              if (remarks !== null) {
                                handleAction(entry._id, 'reject', remarks);
                              }
                            }}
                            className="p-2 text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      )}
                      {entry.status !== 'Pending' && (
                        <button
                          onClick={() => viewHistory(entry.material_name)}
                          className="p-2 text-blue-600 hover:text-blue-900"
                          title="View History"
                        >
                          <FaEye />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`px-3 py-1 rounded-md ${pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className={`px-3 py-1 rounded-md ${pagination.page === pagination.pages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-xl font-bold text-gray-800">
                Damaged Stock History for {currentMaterialName}
              </h2>
              <button 
                onClick={closeHistoryModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Received</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historyData.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                          No history entries found.
                        </td>
                      </tr>
                    ) : (
                      historyData.map((entry) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(entry.entered_on)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.dc_no}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.grnNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {entry.received_qty}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DamagedStockReport;