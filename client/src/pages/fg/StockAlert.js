import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaPlusCircle, FaTruck } from 'react-icons/fa';

const FGStockAlert = () => {
    const navigate = useNavigate();
    // Data states
    const [alertedProducts, setAlertedProducts] = useState([]);
    
    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal and form states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockToAdd, setStockToAdd] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Function to fetch alerts from the API
    const fetchStockAlerts = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/fg/stock-alerts');
            setAlertedProducts(data);
        } catch (err) {
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
    const handleOpenAddStockModal = (product) => {
        setSelectedProduct(product);
        setStockToAdd(''); // Reset the input field
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };
    
    // --- Handler for Creating a GRN ---
    const handleCreateGRN = (product) => {
        // Navigate to FG GRN creation page
        navigate('/fg/grn/create');
    };

    // --- Handler for Creating a DC ---
    const handleCreateDC = (product) => {
        // Navigate to Packing Materials DC page
        navigate('/materials/dc');
    };

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

        if (alertedProducts.length === 0) {
     return (
                <div className="bg-green-50 text-green-800 p-8 rounded-lg shadow-md text-center">
                    <FaCheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                    <h2 className="text-2xl font-bold">All Good!</h2>
                    <p className="mt-2">There are currently no products below their stock alert threshold.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertedProducts.map(product => (
                    <div 
                        key={product._id} 
                        className={`bg-white border-l-4 ${product.currentStock < product.alertThreshold ? 'border-red-500' : 'border-green-500'} text-dark-800 p-6 rounded-lg shadow-lg flex flex-col justify-between`}
                    >
                        <div>
                            <div className="flex items-center mb-2">
                                {product.currentStock < product.alertThreshold ? (
                                    <FaExclamationTriangle className="text-red-600 mr-3" size={24} />
                                ) : (
                                    <FaCheckCircle className="text-green-600 mr-3" size={24} />
                                )}
                                <h3 className="text-xl font-bold text-dark-700">{product.productName}</h3>
                            </div>
                            <p className="text-md text-secondary-500">
                                {product.currentStock < product.alertThreshold 
                                    ? 'Current stock is critically low.' 
                                    : 'Stock level is sufficient.'}
                            </p>
                            <div className={`mt-4 text-sm p-3 rounded-md ${product.currentStock < product.alertThreshold ? 'bg-red-50' : 'bg-green-50'}`}>
                                <p className="text-dark-700">
                                    Quantity Remaining: <span className={`font-bold text-2xl ${product.currentStock < product.alertThreshold ? 'text-red-600' : 'text-green-600'}`}>{product.currentStock}</span>
                                </p>
                                <p className="mt-1 text-secondary-500">
                                    Alert Threshold: <span className="font-semibold">{product.alertThreshold}</span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => handleCreateGRN(product)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <FaPlusCircle className="mr-2" />
                                Add Stock
                            </button>
                            <button
                                onClick={() => handleCreateDC(product)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                <FaTruck className="mr-2" />
                                Create DC
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-800">
                    Finished Goods Stock Alerts
                </h1>
            </div>
            
            {renderContent()}

            {/* Modal for adding stock */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={handleCloseModal} 
                title={`Stock Options for "${selectedProduct?.productName}"`}
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                        <h3 className="font-medium text-blue-800">Current Stock Information</h3>
                        <p className="text-sm text-gray-600 mt-2">
                            Current quantity: <span className="font-bold">{selectedProduct?.currentStock}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Alert threshold: <span className="font-bold">{selectedProduct?.alertThreshold}</span>
                        </p>
                    </div>
                    <div className="mt-4 flex space-x-2">
                        <button
                            onClick={() => {
                                handleCreateGRN(selectedProduct);
                                handleCloseModal();
                            }}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Go to GRN Page
                        </button>
                        <button
                            onClick={() => {
                                handleCreateDC(selectedProduct);
                                handleCloseModal();
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Go to Packing DC Page
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FGStockAlert;