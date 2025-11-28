import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ViewFGGRN = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [grn, setGrn] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGRN = async () => {
            try {
                setIsLoading(true);
                const { data } = await api.get(`/grn/${id}`);
                setGrn(data);
            } catch (err) {
                setError('Failed to fetch GRN details.');
                console.error('Error fetching GRN:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchGRN();
        }
    }, [id]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(/\//g, '/');
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Partial': return 'bg-orange-100 text-orange-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-3xl text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-dark-700">Finished Goods GRN Details</h1>
                    <Link 
                        to="/fg/grn/view"
                        className="btn-primary"
                    >
                        Back to GRN List
                    </Link>
                </div>
                <Card>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                </Card>
            </div>
        );
    }

    if (!grn) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-dark-700">Finished Goods GRN Details</h1>
                    <Link 
                        to="/fg/grn/view"
                        className="btn-primary"
                    >
                        Back to GRN List
                    </Link>
                </div>
                <Card>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                        GRN not found.
                    </div>
                </Card>
            </div>
        );
    }

    // Determine if GRN is completed
    const isCompleted = grn.status === 'Completed';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark-700">Finished Goods GRN Details</h1>
                <Link 
                    to="/fg/grn/view"
                    className="btn-primary"
                >
                    Back to GRN List
                </Link>
            </div>

            <Card>
                {/* Header */}
                {isCompleted ? (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h2 className="text-xl font-bold text-green-800">Completed GRN</h2>
                        <p className="text-green-700">This GRN is Completed and cannot be modified.</p>
                    </div>
                ) : (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h2 className="text-xl font-bold text-gray-800">GRN Details</h2>
                        <p className="text-gray-700">GRN Status: <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>{grn.status}</span></p>
                    </div>
                )}

                {/* GRN Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                        <p className="mt-1 text-lg font-medium text-gray-900">{grn.grnNumber}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">DC Number</label>
                        <p className="mt-1 text-lg font-medium text-gray-900">{grn.dcNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Issued To</label>
                        <p className="mt-1 text-lg font-medium text-gray-900">{grn.supplierName || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1">
                            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                {grn.status}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date Received</label>
                        <p className="mt-1 text-lg font-medium text-gray-900">{grn.dateReceived ? formatDate(grn.dateReceived) : 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Receiver Name</label>
                        <p className="mt-1 text-lg font-medium text-gray-900">{grn.receivedBy || 'N/A'}</p>
                    </div>
                </div>

                {/* Carton Return Details */}
                <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Carton Return Details</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCT NAME</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CARTONS SENT</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CARTONS RECEIVED</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BALANCE</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grn.productName || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grn.cartonsSent || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grn.cartonsReturned || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grn.cartonBalance || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            grn.cartonsReturned === grn.cartonsSent ? 'bg-green-100 text-green-800' : 
                                            grn.cartonsReturned > 0 ? 'bg-orange-100 text-orange-800' : 
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {grn.cartonsReturned === grn.cartonsSent ? 'Completed' : 
                                             grn.cartonsReturned > 0 ? 'Partially Received' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Material Details - REMOVED as per requirement */}

            </Card>
        </div>
    );
};

export default ViewFGGRN;