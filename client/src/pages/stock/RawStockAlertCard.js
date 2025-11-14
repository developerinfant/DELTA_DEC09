import React from 'react';
import { FaExclamationTriangle, FaPlusCircle, FaShoppingCart } from 'react-icons/fa';

const RawStockAlertCard = ({ material, onAddStock, onCreatePO }) => {
    return (
        <div className="bg-white border-l-4 border-primary-500 text-primary-800 p-6 rounded-lg shadow-lg flex flex-col justify-between">
            <div>
                <div className="flex items-center mb-2">
                    <FaExclamationTriangle className="text-primary-600 mr-3" size={24} />
                    <h3 className="text-xl font-bold text-dark-700">{material.name}</h3>
                </div>
                <p className="text-md text-secondary-500">
                    Current stock is critically low.
                </p>
                <div className="mt-4 text-sm bg-red-50 p-3 rounded-md">
                    <p className="text-dark-700">
                        Quantity Remaining: <span className="font-bold text-2xl text-primary-500">{material.quantity}</span>
                    </p>
                    <p className="mt-1 text-secondary-500">
                        Alert Threshold: <span className="font-semibold">{material.stockAlertThreshold}</span>
                    </p>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                 <button
                    onClick={() => onAddStock(material)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <FaPlusCircle className="mr-2" />
                    Add Stock
                </button>
                <button
                    onClick={() => onCreatePO(material)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <FaShoppingCart className="mr-2" />
                    Create PO
                </button>
            </div>
        </div>
    );
};

export default RawStockAlertCard;