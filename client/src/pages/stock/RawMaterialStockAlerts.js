import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Import useNavigate
import api from '../../api';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import RawStockAlertCard from './RawStockAlertCard';
import ViewReportTools from '../../components/common/ViewReportTools';

const RawMaterialStockAlerts = () => {
    const navigate = useNavigate(); // <-- Initialize useNavigate
    const [alertedMaterials, setAlertedMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [stockToAdd, setStockToAdd] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchStockAlerts = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/stock/alerts');
            setAlertedMaterials(data);
        } catch (err) {
            setError('Failed to fetch stock alerts.');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchStockAlerts();
    }, []);

    const handleOpenAddStockModal = (material) => {
        setSelectedMaterial(material);
        setStockToAdd('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMaterial(null);
    };

    // Function to handle "Create PO" button click
    const handleCreatePO = (material) => {
        navigate('/stock/maintenance/purchase-orders/create', { 
            state: { 
                materialId: material._id,
            } 
        });
    };

    const handleAddStockSubmit = async (e) => {
        e.preventDefault();
        if (!stockToAdd || Number(stockToAdd) <= 0) return;

        setIsUpdating(true);
        const newQuantity = selectedMaterial.quantity + Number(stockToAdd);

        try {
            await api.put(`/stock/raw-materials/${selectedMaterial._id}`, {
                ...selectedMaterial,
                quantity: newQuantity,
            });
            handleCloseModal();
            fetchStockAlerts(); 
        } catch (err) {
            alert("There was an error adding stock.");
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

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center text-neutral-500 mt-12">
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
                    <p className="mt-2">No raw materials are below their stock alert threshold.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertedMaterials.map(material => (
                    <RawStockAlertCard 
                        key={material._id} 
                        material={material} 
                        onAddStock={handleOpenAddStockModal}
                        onCreatePO={handleCreatePO} // <-- Pass the function as a prop
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-neutral-800">
                    Raw Material Stock Alerts
                </h1>
                <ViewReportTools
                    data={alertedMaterials}
                    title="Raw Material Stock Alerts"
                    fileName="RawStockAlerts"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                />
            </div>
            
            {renderContent()}

            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                title={`Add Stock for "${selectedMaterial?.name}"`}
            >
                <form onSubmit={handleAddStockSubmit}>
                    <p className="text-sm text-neutral-600">
                        Current quantity: <span className="font-bold">{selectedMaterial?.quantity}</span>
                    </p>
                    <div className="mt-4">
                        <label htmlFor="stock-to-add" className="block text-sm font-medium text-neutral-700">Quantity to Add</label>
                        <input
                            id="stock-to-add"
                            type="number"
                            value={stockToAdd}
                            onChange={(e) => setStockToAdd(e.target.value)}
                            min="1"
                            className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm"
                            autoFocus
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={isUpdating} className="btn-primary">
                            {isUpdating ? 'Adding...' : 'Add Stock'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RawMaterialStockAlerts;