import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { FaSpinner, FaPrint, FaFilePdf, FaArrowLeft } from 'react-icons/fa';

const FGDCDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dc, setDc] = useState(null);
    const [itemCode, setItemCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDC = async () => {
            try {
                // Fetch the delivery challan details
                const dcResponse = await api.get(`/fg/delivery-challan/${id}`);
                setDc(dcResponse.data);
                
                // Fetch the item code from product stock
                try {
                    const productStockResponse = await api.get(`/product-stock/${encodeURIComponent(dcResponse.data.product_name)}`);
                    if (productStockResponse.data && productStockResponse.data.itemCode) {
                        setItemCode(productStockResponse.data.itemCode);
                    } else {
                        setItemCode('N/A');
                    }
                } catch (productStockError) {
                    console.error('Error fetching product stock:', productStockError);
                    setItemCode('N/A');
                }
            } catch (err) {
                setError('Failed to fetch delivery challan details.');
                console.error('Error fetching DC:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchDC();
        }
    }, [id]);

    const handlePrint = () => {
        // Navigate to the print layout for printing
        navigate(`/fg/delivery-challan/${id}/print?print=true`);
    };

    const handleDownloadPDF = () => {
        // Trigger direct download from the API endpoint
        window.open(`/api/fg/delivery-challan/${id}/download`, '_blank');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {error}
                <button 
                    onClick={() => navigate('/fg/delivery-challan/view')}
                    className="ml-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                    Back to Delivery Challans
                </button>
            </div>
        );
    }

    if (!dc) {
        return (
            <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">
                Delivery Challan not found.
                <button 
                    onClick={() => navigate('/fg/delivery-challan/view')}
                    className="ml-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                    Back to Delivery Challans
                </button>
            </div>
        );
    }



    // Format quantity display based on issue type
    const formatQuantityDisplay = () => {
        if (dc.issue_type === 'Both') {
            return (
                <div>
                    <div><span className="font-medium">Cartons:</span> {dc.carton_quantity}</div>
                    <div><span className="font-medium">Pieces:</span> {dc.piece_quantity}</div>
                    <div><span className="font-medium">Total Quantity:</span> {dc.quantity}</div>
                </div>
            );
        } else if (dc.issue_type === 'Carton') {
            return (
                <div>
                    <div><span className="font-medium">Cartons:</span> {dc.quantity}</div>
                    <div><span className="font-medium">Pieces:</span> 0</div>
                    <div><span className="font-medium">Total Quantity:</span> {dc.quantity * dc.units_per_carton}</div>
                </div>
            );
        } else {
            return (
                <div>
                    <div><span className="font-medium">Cartons:</span> 0</div>
                    <div><span className="font-medium">Pieces:</span> {dc.quantity}</div>
                    <div><span className="font-medium">Total Quantity:</span> {dc.quantity}</div>
                </div>
            );
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-dark-700">Delivery Challan Details</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => navigate('/fg/delivery-challan/view')}
                        className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        <FaArrowLeft className="mr-2" /> Back
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                        <FaPrint className="mr-2" /> Print
                    </button>
                    <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                        <FaFilePdf className="mr-2" /> Download PDF
                    </button>
                </div>
            </div>
            
            {/* Main DC Container */}
            <div className="bg-white border border-light-300 rounded-lg p-6">
                {/* DC Header Information */}
                <div className="border-b border-light-300 pb-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-dark-700">DELTA S TRADE LINK</h2>
                            <p className="text-sm text-dark-700 mt-1">
                                NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),<br />
                                NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.
                            </p>
                            <p className="text-sm text-dark-700 mt-1">
                                GSTIN: 33BFDPS0871J1ZC
                            </p>
                        </div>
                        
                        <div className="text-right">
                            <h3 className="text-2xl font-bold text-dark-700">DELIVERY CHALLAN</h3>
                            <p className="text-sm text-dark-700 mt-2">
                                SUBJECT TO DINDIGUL JURISDICTION
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-light-100 p-3 rounded">
                            <div className="text-sm text-gray-600">DC No</div>
                            <div className="font-medium">{dc.dc_no}</div>
                        </div>
                        <div className="bg-light-100 p-3 rounded">
                            <div className="text-sm text-gray-600">Date</div>
                            <div className="font-medium">{formatDate(dc.date)}</div>
                        </div>
                        <div className="bg-light-100 p-3 rounded">
                            <div className="text-sm text-gray-600">Status</div>
                            <div className="font-medium">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                    dc.status === 'Dispatched' 
                                        ? 'bg-green-100 text-green-800' 
                                        : dc.status === 'Cancelled' 
                                            ? 'bg-red-100 text-red-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {dc.status === 'Dispatched' ? 'Completed' : dc.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Receiver Information */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-dark-700 mb-3">Receiver Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Receiver Type</div>
                            <div className="font-medium">{dc.receiver_type}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Receiver Name</div>
                            <div className="font-medium">{dc.receiver_name || 'N/A'}</div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="text-sm text-gray-600">Receiver Details</div>
                            <div className="font-medium">{dc.receiver_details || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                {/* Product Information */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-dark-700 mb-3">Product Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Product Name</div>
                            <div className="font-medium">{dc.product_name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Item Code</div>
                            <div className="font-medium">{itemCode || 'Loading...'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Dispatch Type</div>
                            <div className="font-medium">{dc.dispatch_type}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Issue Type</div>
                            <div className="font-medium">{dc.issue_type}</div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="text-sm text-gray-600">Quantity Details</div>
                            <div className="font-medium">
                                {formatQuantityDisplay()}
                            </div>
                        </div>
                        {dc.units_per_carton && (
                            <div>
                                <div className="text-sm text-gray-600">Units Per Carton</div>
                                <div className="font-medium">{dc.units_per_carton}</div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-gray-600">Created By</div>
                        <div className="font-medium">{dc.created_by || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Created At</div>
                        <div className="font-medium">{formatDateTime(dc.createdAt)}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-sm text-gray-600">Remarks</div>
                        <div className="font-medium">{dc.remarks || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FGDCDetail;