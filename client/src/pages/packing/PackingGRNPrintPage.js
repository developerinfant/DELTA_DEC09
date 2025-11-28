import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';
import PackingGRNPrintLayout from './PackingGRNPrintLayout';

const PackingGRNPrintPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [grn, setGrn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGRN = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/grn/${id}`);
                setGrn(response.data);
            } catch (err) {
                setError('Failed to fetch GRN details.');
                console.error('Error fetching GRN:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchGRN();
        }
    }, [id]);

    // Check if we should automatically download
    const shouldAutoDownload = location.search.includes('download=true');

    // Handle auto-download
    useEffect(() => {
        // Wait a bit for the page to render, then trigger print which will show the save dialog
        const timer = setTimeout(() => {
            if (shouldAutoDownload && grn && !loading) {
                window.print();
                
                // Close the window after a short delay to allow download to start
                setTimeout(() => {
                    window.close();
                }, 2000);
            }
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [shouldAutoDownload, grn, loading]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-xl text-gray-700">Loading GRN details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center p-6 bg-red-50 rounded-lg">
                    <p className="text-red-700 text-xl">{error}</p>
                    <button 
                        onClick={() => navigate('/packing/grn/view')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Back to GRN List
                    </button>
                </div>
            </div>
        );
    }

    if (!grn) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <p className="text-xl text-gray-700">GRN not found</p>
                    <button 
                        onClick={() => navigate('/packing/grn/view')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Back to GRN List
                    </button>
                </div>
            </div>
        );
    }

    return <PackingGRNPrintLayout grnData={grn} />;
};

export default PackingGRNPrintPage;