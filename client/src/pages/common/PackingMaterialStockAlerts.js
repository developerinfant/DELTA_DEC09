import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Import useNavigate
import api from '../../api';
import StockAlertCard from '../../components/packing/StockAlertCard';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';

const PackingMaterialStockAlerts = () => {
    const navigate = useNavigate(); // <-- Initialize useNavigate
    // Data states
    const [alertedMaterials, setAlertedMaterials] = useState([]);
    
    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Function to fetch alerts from the API
    const fetchStockAlerts = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/materials/alerts');
            setAlertedMaterials(data);
        } catch (err)
 {
            setError('Failed to fetch stock alerts. Please try again later.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Initial data fetch on component mount
    useEffect(() => {
        fetchStockAlerts();
    }, []);

    // --- Handler for redirecting to Item Master with editId ---
    const handleAddStockRedirect = (material) => {
        // Navigate to the Item Master page with the editId parameter
        navigate(`/materials?editId=${material.itemCode}`);
    };

    // --- New Handler for Creating a PO ---
    const handleCreatePO = (material) => {
        navigate('/packing/purchase-orders/create', { 
            state: { 
                materialId: material._id,
            } 
        });
    };

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'Material Name', key: 'name' },
        { header: 'Current Quantity', key: 'quantity' },
        { header: 'Alert Threshold', key: 'stockAlertThreshold' },
        { header: 'Status', key: 'status', render: (value) => (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                Below Threshold
            </span>
        ) }
    ];

    // --- Render Logic ---
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center text-gray-500 mt-12">
                    <FaSpinner className="animate-spin mr-3" size={30} />
                    <span className="text-xl">Loading Alerts...</span>
                </div>
            );
        }

        if (error) {
            return <p className="text-center text-red-600 mt-12">{error}</p>;
        }

        if (alertedMaterials.length === 0) {
            return (
                <div className="bg-green-50 text-green-800 p-8 rounded-lg shadow-md text-center">
                    <FaCheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                    <h2 className="text-2xl font-bold">All Good!</h2>
                    <p className="mt-2">There are currently no materials below their stock alert threshold.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertedMaterials.map(material => (
                    <StockAlertCard 
                        key={material._id} 
                        material={material} 
                        onAddStock={handleAddStockRedirect} // <-- Updated handler
                        onCreatePO={handleCreatePO} // <-- Pass the new handler
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                    Packing Material Stock Alerts
                </h1>
                <ViewReportTools
                    data={alertedMaterials}
                    title="Packing Material Stock Alerts"
                    fileName="StockAlerts"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                />
            </div>
            
            {renderContent()}
        </div>
    );
};

export default PackingMaterialStockAlerts;