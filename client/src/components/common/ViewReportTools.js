import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { FaEye, FaFileExcel, FaRedo } from 'react-icons/fa';

const ViewReportTools = ({ data, title, fileName, metaDetails, columns, formatDataForExport, detailedData, detailedTitle, detailedFileName, detailedColumns, onRefresh, searchTerm, setSearchTerm }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailedView, setIsDetailedView] = useState(false);
    const reportRef = useRef(null);

    // Function to open the report modal
    const openReportModal = () => {
        setIsModalOpen(true);
        setIsDetailedView(false);
    };

    // Function to close the report modal
    const closeReportModal = () => {
        setIsModalOpen(false);
        setIsDetailedView(false);
    };

    // Function to toggle detailed view
    const toggleDetailedView = () => {
        setIsDetailedView(!isDetailedView);
    };

    // Function to download PDF
    const downloadPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `${isDetailedView ? detailedFileName : fileName}_${timestamp}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    // Function to export to Excel
    const exportExcel = () => {
        try {
            // Determine which data to export
            let exportData = data;
            let exportFileName = fileName;
            
            if (isDetailedView && detailedData) {
                exportData = detailedData;
                exportFileName = detailedFileName;
            } else if (formatDataForExport && typeof formatDataForExport === 'function') {
                exportData = formatDataForExport(data);
            }

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData || []);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, exportFileName || 'report');
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `${exportFileName || 'report'}_${timestamp}.xlsx`;
            
            // Export to file
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
    };

    // Function to format date
    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Determine which columns and data to display
    const displayColumns = isDetailedView && detailedData ? 
        (detailedColumns || (detailedData.length > 0 ? Object.keys(detailedData[0] || {}).map(key => ({ header: key, key })) : [])) : 
        columns;
    
    const displayData = isDetailedView && detailedData ? detailedData : data;
    const displayTitle = isDetailedView && detailedTitle ? detailedTitle : title;

    return (
        <>
            {/* Toolbar Buttons */}
            <div className="flex space-x-2">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                        title="Refresh Data"
                    >
                        <FaRedo className="mr-1" />
                        <span>Refresh</span>
                    </button>
                )}
                {setSearchTerm && (
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm || ''}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                )}
                {(data || detailedData) && (
                    <button
                        onClick={openReportModal}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                        title="View Report"
                    >
                        <FaEye className="mr-1" />
                        <span>View Report</span>
                    </button>
                )}
            </div>

            {/* Report Preview Modal - only render if we have data to show */}
            {(data || detailedData) && (
                <Modal isOpen={isModalOpen} onClose={closeReportModal} title={`📄 Report Preview – ${displayTitle || 'Report'}`}>
                    <div className="max-h-[80vh] overflow-y-auto p-4 bg-gray-50 rounded-lg">
                        <div ref={reportRef} className="bg-white p-6 rounded-lg">
                            {/* Report Header */}
                            <div className="mb-6 pb-4 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">{(displayTitle || 'Report').toUpperCase()} REPORT</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                    <div>
                                        <p><strong>Generated:</strong> {formatDate(new Date())}</p>
                                        {metaDetails?.user && <p><strong>User:</strong> {metaDetails.user}</p>}
                                    </div>
                                    {metaDetails?.additionalInfo && (
                                        <div>
                                            {Object.entries(metaDetails.additionalInfo).map(([key, value]) => (
                                                <p key={key}><strong>{key}:</strong> {value}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Toggle View Button (only show if detailed data is available) */}
                            {detailedData && detailedData.length > 0 && (
                                <div className="mb-4">
                                    <button
                                        onClick={toggleDetailedView}
                                        className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition"
                                    >
                                        {isDetailedView ? 'Show Summary View' : 'Show Detailed View'}
                                    </button>
                                </div>
                            )}

                            {/* Report Content */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            {displayColumns && Array.isArray(displayColumns) && displayColumns.length > 0 ? (
                                                displayColumns.map((column, index) => (
                                                    <th 
                                                        key={index} 
                                                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                                    >
                                                        {typeof column === 'string' ? column : (column.header || column)}
                                                    </th>
                                                ))
                                            ) : (
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    No Data
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {displayData && displayData.length > 0 ? (
                                            displayData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    {displayColumns && Array.isArray(displayColumns) && displayColumns.length > 0 ? (
                                                        displayColumns.map((column, colIndex) => (
                                                            <td 
                                                                key={colIndex} 
                                                                className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                                                            >
                                                                {typeof column === 'string' ? (row[column] || '') : (column.render ? column.render(row[column.key], row) : (row[column.key] || ''))}
                                                            </td>
                                                        ))
                                                    ) : (
                                                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                            No data available
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={displayColumns && Array.isArray(displayColumns) ? displayColumns.length : 1} className="px-4 py-6 text-center text-gray-500">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Report Footer */}
                            <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                                <p>Generated by Delta Stock System</p>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer with Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
                        <button
                            onClick={closeReportModal}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
                        >
                            Close
                        </button>
                        <button
                            onClick={downloadPDF}
                            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                        >
                            Download PDF
                        </button>
                        <button
                            onClick={exportExcel}
                            className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                        >
                            Export Excel
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default ViewReportTools;