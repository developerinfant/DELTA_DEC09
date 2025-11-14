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

    // Modal and form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [stockToAdd, setStockToAdd] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

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

    // --- Modal Handlers ---
    const handleOpenAddStockModal = (material) => {
        setSelectedMaterial(material);
        setStockToAdd(''); // Reset the input field
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMaterial(null);
    };
    
    // --- New Handler for Creating a PO ---
    const handleCreatePO = (material) => {
        navigate('/purchase-orders/create', { 
            state: { 
                materialId: material._id,
            } 
        });
    };

    // --- Form Submission Handler for Adding Stock ---
    const handleAddStockSubmit = async (e) => {
        e.preventDefault();
        if (!stockToAdd || Number(stockToAdd) <= 0) {
            alert('Please enter a valid quantity to add.');
            return;
        }

        setIsUpdating(true);
        const newQuantity = selectedMaterial.quantity + Number(stockToAdd);

        try {
            // Send the entire material object with the updated quantity
            await api.put(`/materials/${selectedMaterial._id}`, {
                ...selectedMaterial,
                quantity: newQuantity,
            });
            
            handleCloseModal();
            // Re-fetch the alerts list to see if this material is still low on stock
            fetchStockAlerts(); 

        } catch (err) {
            console.error("Failed to add stock:", err);
            alert("There was an error adding stock. Please try again.");
        } finally {
            setIsUpdating(false);
        }
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
                        onAddStock={handleOpenAddStockModal}
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

            {/* Modal for adding stock */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                title={`Add Stock for "${selectedMaterial?.name}"`}
            >
                <form onSubmit={handleAddStockSubmit}>
                    <p className="text-sm text-gray-600">
                        Current quantity: <span className="font-bold">{selectedMaterial?.quantity}</span>
                    </p>
                    <div className="mt-4">
                        <label htmlFor="stock-to-add" className="block text-sm font-medium text-gray-700">Quantity to Add</label>
                        <input
                            id="stock-to-add"
                            type="number"
                            value={stockToAdd}
                            onChange={(e) => setStockToAdd(e.target.value)}
                            min="1"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            placeholder="e.g., 50"
                            autoFocus
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300">Cancel</button>
                        <button type="submit" disabled={isUpdating} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                            {isUpdating ? 'Adding...' : 'Add Stock'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PackingMaterialStockAlerts;