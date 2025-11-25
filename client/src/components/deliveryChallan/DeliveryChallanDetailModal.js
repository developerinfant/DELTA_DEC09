import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

const DeliveryChallanDetailModal = ({ isOpen, onClose, deliveryChallanId, onStatusUpdate }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dc, setDc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDeliveryChallan = useCallback(async () => {
        if (!deliveryChallanId) return;
        
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/delivery-challan/${deliveryChallanId}`);
            setDc(data);
        } catch (err) {
            console.error('Failed to fetch Delivery Challan details:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to fetch Delivery Challan details. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [deliveryChallanId]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            if (isMounted && isOpen && deliveryChallanId) {
                await fetchDeliveryChallan();
            }
        };
        
        fetchData();
        
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [isOpen, deliveryChallanId, fetchDeliveryChallan]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Partial': return 'bg-orange-100 text-orange-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };

    // Determine modal title based on unit type
    const getModalTitle = () => {
        if (!dc) return "Delivery Challan Details";
        return dc.unit_type === 'Jobber' 
            ? "Jobber Delivery Challan Details" 
            : "Own Unit Delivery Challan Details";
    };

    // PDF Export Function - Navigate to the new DeltaDCPrintLayout component
    const exportToPDF = () => {
        if (!dc) return;
        // Navigate to the new DeltaDCPrintLayout page with the DC ID
        navigate(`/delivery-challan/${dc._id}/print`);
    };

    // Excel Export Function
    const exportToExcel = () => {
        if (!dc) return;
        
        // DC Info
        const dcInfo = [
            { 'Field': 'DC Number', 'Value': dc.dc_no || 'N/A' },
            { 'Field': 'Unit Type', 'Value': dc.unit_type || 'N/A' },
            { 'Field': dc.unit_type === 'Jobber' ? 'Supplier' : 'Issued To', 
              'Value': dc.unit_type === 'Jobber' ? (dc.supplier_id?.name || 'N/A') : (dc.person_name || 'N/A') },
            { 'Field': 'Date', 'Value': formatDate(dc.date) },
            { 'Field': 'Status', 'Value': dc.status || 'N/A' }
        ];
        
        // Add product information based on whether it's single or multiple products
        if (dc.products && dc.products.length > 0) {
            // For multiple products, add a summary row
            dcInfo.push({ 'Field': 'Total Products', 'Value': dc.products.length });
            dcInfo.push({ 'Field': 'Total Cartons', 'Value': dc.products.reduce((sum, product) => sum + (product.carton_qty || 0), 0) });
        } else {
            // For single product (backward compatibility)
            dcInfo.push({ 'Field': 'Product Name', 'Value': dc.product_name || 'N/A' });
            dcInfo.push({ 'Field': 'Carton Quantity', 'Value': dc.carton_qty || 0 });
        }
        
        // Handle materials for both single and multiple products
        let materialsToProcess = [];
        if (dc.products && dc.products.length > 0) {
            // For multiple products, collect all materials from all products
            dc.products.forEach(product => {
                if (product.materials && Array.isArray(product.materials)) {
                    materialsToProcess = materialsToProcess.concat(product.materials);
                }
            });
        } else if (dc.materials && Array.isArray(dc.materials)) {
            // For single product (backward compatibility)
            materialsToProcess = dc.materials;
        }
        
        const materialsData = materialsToProcess.map((item, index) => {
            // Use the total_qty directly from the database as Sent Qty (same as orderedQuantity in GRN)
            const sentQty = item.total_qty || 0;
            // Use the received_qty directly from the database (updated by GRN controller)
            const receivedQty = item.received_qty || 0;
            // Use the balance_qty directly from the database (updated by GRN controller)
            const balance = item.balance_qty || 0;
            
            // Calculate item status
            let itemStatus = 'Completed';
            if (balance > 0) {
                itemStatus = 'Pending';
            } else if (balance < 0) {
                itemStatus = 'Over Received';
            }
            
            return {
                'S.No': index + 1,
                'Material Name': item.material_name || 'N/A',
                'Qty per Carton': item.qty_per_carton || 0,
                'Sent Qty': sentQty,
                'Received Qty': receivedQty,
                'Balance': balance,
                'Status': itemStatus
            };
        });
        
        // Add totals row
        const totalSent = materialsToProcess.reduce((sum, item) => sum + (item.total_qty || 0), 0);
        const totalReceived = materialsToProcess.reduce((sum, item) => sum + (item.received_qty || 0), 0);
        const totalBalance = materialsToProcess.reduce((sum, item) => sum + (item.balance_qty || 0), 0);
        
        materialsData.push({
            'S.No': '',
            'Material Name': '',
            'Qty per Carton': 'TOTALS:',
            'Sent Qty': totalSent,
            'Received Qty': totalReceived,
            'Balance': totalBalance,
            'Status': ''
        });
        
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Create worksheets
        const dcInfoSheet = XLSX.utils.json_to_sheet(dcInfo);
        const materialsSheet = XLSX.utils.json_to_sheet(materialsData);
        
        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(wb, dcInfoSheet, 'DC Info');
        XLSX.utils.book_append_sheet(wb, materialsSheet, 'Materials');
        
        // Generate buffer
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Create blob and download
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `DeliveryChallan_${dc.dc_no || 'DC'}_${timestamp}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-primary-500 mx-auto text-3xl" />
                    <p className="mt-4 text-gray-600">Loading Delivery Challan details...</p>
                </div>
            </div>
        </Modal>
    );
    
    if (error) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <Card>
                <div className="p-6 bg-red-50 text-red-800 rounded-lg">
                    <p>{error}</p>
                    <button 
                        onClick={fetchDeliveryChallan}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </Card>
        </Modal>
    );
    
    if (!dc) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <Card><p className="text-center py-8">Delivery Challan not found.</p></Card>
        </Modal>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="xl">
            {/* Export Buttons */}
            <div className="flex justify-end space-x-2 mb-4">
                <button
                    onClick={exportToPDF}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                    title="Export to PDF"
                >
                    <FaFilePdf className="mr-1" />
                    PDF
                </button>
                <button
                    onClick={exportToExcel}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                    title="Export to Excel"
                >
                    <FaFileExcel className="mr-1" />
                    Excel
                </button>
            </div>

            {/* Completed DC Banner */}
            {dc && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 mb-6">
                    <div className="flex items-center">
                        <div>
                            <h3 className="font-bold text-lg text-green-800">Delivery Challan Details</h3>
                            <p className="text-green-700">Viewing delivery challan information.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* DC Info */}
            <Card className="shadow-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">DC Number</p>
                        <p className="font-bold text-lg">{dc?.dc_no || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Unit Type</p>
                        <p className="font-bold text-lg">{dc?.unit_type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">
                            {dc?.unit_type === 'Jobber' ? 'Supplier' : 'Issued To'}
                        </p>
                        <p className="font-bold text-lg">
                            {dc?.unit_type === 'Jobber' 
                                ? (dc.supplier_id?.name || 'N/A') 
                                : (dc.person_name || 'N/A')}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Status</p>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(dc?.status || '')}`}>
                            {dc?.status || 'N/A'}
                        </span>
                    </div>
                    
                    {/* Check if DC has multiple products */}
                    {dc && dc.products && dc.products.length > 0 ? (
                        // Display multiple products section
                        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 lg:col-span-4">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Products</p>
                            <div className="mt-2 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carton Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dc.products.map((product, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {product.product_name}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                    {product.carton_qty || 0}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        // Display single product (backward compatibility)
                        <>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500 uppercase tracking-wider">Product Name</p>
                                <p className="font-bold text-lg">{dc?.product_name || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-500 uppercase tracking-wider">Carton Quantity</p>
                                <p className="font-bold text-lg">{dc?.carton_qty || 'N/A'}</p>
                            </div>
                        </>
                    )}
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Date</p>
                        <p className="font-bold text-lg">{formatDate(dc?.date)}</p>
                    </div>
                    {dc?.remarks && (
                        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 lg:col-span-4">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Remarks</p>
                            <p className="font-medium text-gray-800">{dc.remarks}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Materials Table */}
            <Card title="Materials" className="shadow-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material Name</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Qty per Carton</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Received Qty</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                                // Handle materials for both single and multiple products
                                let materialsToProcess = [];
                                if (dc && dc.products && dc.products.length > 0) {
                                    // For multiple products, collect all materials from all products
                                    dc.products.forEach(product => {
                                        if (product.materials && Array.isArray(product.materials)) {
                                            materialsToProcess = materialsToProcess.concat(product.materials);
                                        }
                                    });
                                } else if (dc && dc.materials && Array.isArray(dc.materials)) {
                                    // For single product (backward compatibility)
                                    materialsToProcess = dc.materials;
                                }
                                
                                return materialsToProcess && materialsToProcess.length > 0 ? materialsToProcess.map((item, index) => {
                                    // Use the total_qty directly from the database as Sent Qty (same as orderedQuantity in GRN)
                                    const sentQty = item.total_qty || 0;
                                    // Use the received_qty directly from the database (updated by GRN controller)
                                    const receivedQty = item.received_qty || 0;
                                    // Use the balance_qty directly from the database (updated by GRN controller)
                                    const balance = item.balance_qty || 0;
                                    
                                    // Calculate item status based on quantities
                                    let itemStatus = 'Completed';
                                    let itemStatusClass = 'bg-green-100 text-green-800';
                                    // Use the balance quantity to determine status
                                    if (balance > 0) {
                                        itemStatus = 'Pending';
                                        itemStatusClass = 'bg-yellow-100 text-yellow-800';
                                    } else if (balance < 0) {
                                        // This shouldn't happen, but just in case
                                        itemStatus = 'Over Received';
                                        itemStatusClass = 'bg-red-100 text-red-800';
                                    }
                                    
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.material_name || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-blue-600">{item?.qty_per_carton || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-gray-900">{sentQty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-green-600">{receivedQty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {balance}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${itemStatusClass}`}>
                                                    {itemStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : null;
                            })()}
                        </tbody>
                    </table>
                </div>
                
                {/* Table Footer with Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {(() => {
                                // Handle materials for both single and multiple products
                                let materialsToProcess = [];
                                if (dc && dc.products && dc.products.length > 0) {
                                    // For multiple products, collect all materials from all products
                                    dc.products.forEach(product => {
                                        if (product.materials && Array.isArray(product.materials)) {
                                            materialsToProcess = materialsToProcess.concat(product.materials);
                                        }
                                    });
                                } else if (dc && dc.materials && Array.isArray(dc.materials)) {
                                    // For single product (backward compatibility)
                                    materialsToProcess = dc.materials;
                                }
                                
                                return `Total Items: ${materialsToProcess ? materialsToProcess.length : 0}`;
                            })()}
                        </div>
                        <div className="flex space-x-4">
                            <div className="text-sm">
                                <span className="text-gray-500">Total Sent: </span>
                                <span className="font-bold text-gray-900">
                                    {(() => {
                                        // Handle materials for both single and multiple products
                                        let materialsToProcess = [];
                                        if (dc && dc.products && dc.products.length > 0) {
                                            // For multiple products, collect all materials from all products
                                            dc.products.forEach(product => {
                                                if (product.materials && Array.isArray(product.materials)) {
                                                    materialsToProcess = materialsToProcess.concat(product.materials);
                                                }
                                            });
                                        } else if (dc && dc.materials && Array.isArray(dc.materials)) {
                                            // For single product (backward compatibility)
                                            materialsToProcess = dc.materials;
                                        }
                                        
                                        return materialsToProcess ? materialsToProcess.reduce((sum, item) => sum + (item.total_qty || 0), 0) : 0;
                                    })()}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Total Received: </span>
                                <span className="font-bold text-green-600">
                                    {(() => {
                                        // Handle materials for both single and multiple products
                                        let materialsToProcess = [];
                                        if (dc && dc.products && dc.products.length > 0) {
                                            // For multiple products, collect all materials from all products
                                            dc.products.forEach(product => {
                                                if (product.materials && Array.isArray(product.materials)) {
                                                    materialsToProcess = materialsToProcess.concat(product.materials);
                                                }
                                            });
                                        } else if (dc && dc.materials && Array.isArray(dc.materials)) {
                                            // For single product (backward compatibility)
                                            materialsToProcess = dc.materials;
                                        }
                                        
                                        return materialsToProcess ? materialsToProcess.reduce((sum, item) => sum + (item.received_qty || 0), 0) : 0;
                                    })()}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Total Balance: </span>
                                <span className="font-bold text-red-600">
                                    {(() => {
                                        // Handle materials for both single and multiple products
                                        let materialsToProcess = [];
                                        if (dc && dc.products && dc.products.length > 0) {
                                            // For multiple products, collect all materials from all products
                                            dc.products.forEach(product => {
                                                if (product.materials && Array.isArray(product.materials)) {
                                                    materialsToProcess = materialsToProcess.concat(product.materials);
                                                }
                                            });
                                        } else if (dc && dc.materials && Array.isArray(dc.materials)) {
                                            // For single product (backward compatibility)
                                            materialsToProcess = dc.materials;
                                        }
                                        
                                        return materialsToProcess ? materialsToProcess.reduce((sum, item) => sum + (item.balance_qty || 0), 0) : 0;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default DeliveryChallanDetailModal;