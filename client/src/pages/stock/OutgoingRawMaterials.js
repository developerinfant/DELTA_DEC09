import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FaSpinner } from 'react-icons/fa';
import OutgoingRawHistoryTable from './OutgoingRawHistoryTable';
import ViewReportTools from '../../components/common/ViewReportTools';

const OutgoingRawMaterials = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/stock/outgoing-history');
                setRecords(data);
            } catch (err) {
                setError('Failed to load outgoing history.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    // Report columns configuration
    const reportColumns = [
        { header: 'Date', key: 'createdAt', render: (value) => new Date(value).toLocaleDateString() },
        { header: 'Material', key: 'rawMaterial.name' },
        { header: 'Quantity Sent', key: 'quantitySent' },
        { header: 'Jobber Name', key: 'jobberName' },
        { header: 'Status', key: 'status' }
    ];

    // Format data for export
    const formatDataForExport = (data) => {
        return data.map(record => ({
            'Date': record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A',
            'Material': record.rawMaterial?.name || 'N/A',
            'Quantity Sent': record.quantitySent || 0,
            'Jobber Name': record.jobberName || 'N/A',
            'Status': record.status || 'N/A'
        }));
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-accent-500" size={48} /></div>;
    }

    if (error) {
        return <div className="p-4 bg-primary-100 text-primary-700 rounded-md">{error}</div>;
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-neutral-800 mb-6">
                    Outgoing Raw Materials History
                </h1>
                <ViewReportTools
                    data={records}
                    title="Outgoing Raw Materials History"
                    fileName="OutgoingRawMaterials"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                    formatDataForExport={formatDataForExport}
                />
            </div>
            <OutgoingRawHistoryTable records={records} isLoading={isLoading} />
        </div>
    );
};

export default OutgoingRawMaterials;