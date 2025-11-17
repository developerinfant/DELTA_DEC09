import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaInfoCircle, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import GRNForm from './GRNForm';

const CreateGRN = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Determine material type based on the current route
    const getMaterialType = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return 'raw';
        } else if (location.pathname.includes('/packing/')) {
            return 'packing';
        }
        // Default to packing materials
        return 'packing';
    };

    // Use useCallback to prevent unnecessary re-renders
    const fetchPOs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch only Approved POs, filtered by material type
            const materialType = getMaterialType();
            const { data } = await api.get(`/purchase-orders?materialType=${materialType}&status=Approved`);
            setPurchaseOrders(data);
        } catch (err) {
            setError('Failed to load purchase orders.');
            console.error('Error fetching POs:', err);
        } finally {
            setIsLoading(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        fetchPOs();
    }, [fetchPOs]);

    const handleGRNCreated = useCallback(() => {
        // Refresh POs after GRN creation
        fetchPOs();
    }, [fetchPOs]);

    // Determine where to navigate after GRN creation based on the current route
    const getReturnPath = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return '/stock/maintenance/grn/view';
        } else if (location.pathname.includes('/packing/')) {
            return '/packing/grn/view';
        }
        // Default to packing GRNs view
        return '/grn/view';
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-96">
            <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
                <FaSpinner className="animate-spin text-primary-500 mx-auto text-4xl" />
                <p className="mt-4 text-xl text-gray-700">Loading purchase orders...</p>
                <p className="mt-2 text-gray-500">Please wait while we fetch the latest data</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="max-w-2xl mx-auto">
            <div className="p-6 bg-red-100 text-red-800 rounded-2xl shadow-lg border border-red-200">
                <div className="flex items-center">
                    <FaExclamationTriangle className="mr-3 text-2xl" />
                    <div>
                        <h3 className="text-lg font-bold">Error Loading Data</h3>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
                <div className="mt-6 flex space-x-3">
                    <button 
                        onClick={fetchPOs}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
                    >
                        <FaRedo className="mr-2" />
                        Retry
                    </button>
                    <button 
                        onClick={() => navigate('/purchase-orders')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                        View All POs
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <Card title="Create Goods Receipt Note (GRN)" className="shadow-xl">
            <GRNForm
                purchaseOrders={purchaseOrders}
                onCreate={handleGRNCreated}
                returnPath={getReturnPath()}
            />
        </Card>
    );
};

export default CreateGRN;