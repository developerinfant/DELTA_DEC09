import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaFilePdf, FaTrash, FaPlus, FaSearch, FaPrint, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ViewFGDCs = () => {
    const navigate = useNavigate();
    
    // State
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [filteredChallans, setFilteredChallans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Filter state
    const [filters, setFilters] = useState({
        dispatchType: '',
        product: '',
        receiver: '',
        startDate: '',
        endDate: ''
    });
    
    // Fetch delivery challans on component mount
    useEffect(() => {
        const fetchDeliveryChallans = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/fg/delivery-challan');
                setDeliveryChallans(response.data);
                setFilteredChallans(response.data);
            } catch (err) {
                setError('Failed to load delivery challans. Please try refreshing.');
                console.error('Error fetching delivery challans:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDeliveryChallans();
    }, []);
    
    // Apply filters when they change
    useEffect(() => {
        let result = [...deliveryChallans];
        
        // Apply dispatch type filter
        if (filters.dispatchType) {
            result = result.filter(dc => dc.dispatch_type === filters.dispatchType);
        }
        
        // Apply product filter
        if (filters.product) {
            const searchTerm = filters.product.toLowerCase();
            result = result.filter(dc => 
                dc.product_name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply receiver filter
        if (filters.receiver) {
            const searchTerm = filters.receiver.toLowerCase();
            result = result.filter(dc => 
                (dc.receiver_name && dc.receiver_name.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply date range filters
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            result = result.filter(dc => new Date(dc.date) >= startDate);
        }
        
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            result = result.filter(dc => new Date(dc.date) <= endDate);
        }
        
        setFilteredChallans(result);
    }, [filters, deliveryChallans]);
    
    // Handle filter input changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Reset filters
    const resetFilters = () => {
        setFilters({
            dispatchType: '',
            product: '',
            receiver: '',
            startDate: '',
            endDate: ''
        });
    };
    
    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };
    
    // Get status badge class
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Dispatched': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        
        // All DCs are automatically "Completed" (Dispatched), so show them as such
        if (status === 'Pending') {
            status = 'Dispatched';
        }
        
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status === 'Dispatched' ? 'Completed' : status}
            </span>
        );
    };
    
    // Generate PDF for delivery challan
    const generatePDF = async (dcId) => {
        // Navigate to the new FGDCPrintLayout page with the DC ID
        navigate(`/fg/delivery-challan/${dcId}/print`);
    };
    
    // View DC details page
    const viewDC = (dcId) => {
        // Navigate to the DC detail page
        navigate(`/fg/delivery-challan/${dcId}/view`);
    };
    
    // Direct print DC - navigate to print layout in same tab
    const printDC = (dcId) => {
        // Navigate to the print page which will automatically show print dialog
        navigate(`/fg/delivery-challan/${dcId}/print?print=true`);
    };
    
    // Direct download DC PDF - reuse the print layout component
    const downloadDC = async (dcId) => {
        try {
            // Show loading toast
            const toastId = toast.info('Generating PDF...', { autoClose: false });
            
            // Fetch the DC data first
            const response = await api.get(`/fg/delivery-challan/${dcId}`);
            const deliveryChallan = response.data;
            
            // Create a temporary div to render the print layout
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '210mm';
            tempDiv.style.minHeight = '297mm';
            tempDiv.style.padding = '12mm';
            tempDiv.style.fontFamily = 'Arial, sans-serif';
            tempDiv.style.fontSize = '11.5px';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.boxSizing = 'border-box';
            tempDiv.style.border = '1px solid #000';
            
            // Import required utilities
            const formatDate = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            };
            
            const formatCurrency = (amount) => {
                if (!amount) return '0.00';
                return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };
            
            const formatQuantityDisplay = () => {
                if (deliveryChallan.issue_type === 'Both') {
                    return `${deliveryChallan.carton_quantity} Cartons + ${deliveryChallan.piece_quantity} Pieces`;
                } else if (deliveryChallan.issue_type === 'Carton') {
                    return `${deliveryChallan.quantity} Cartons`;
                } else {
                    return `${deliveryChallan.quantity} Pieces`;
                }
            };
            
            const calculateEquivalent = () => {
                if (deliveryChallan.issue_type === 'Both') {
                    const totalPieces = (deliveryChallan.carton_quantity * deliveryChallan.units_per_carton) + deliveryChallan.piece_quantity;
                    const equivalentCartons = Math.floor(totalPieces / deliveryChallan.units_per_carton);
                    const equivalentPieces = totalPieces % deliveryChallan.units_per_carton;
                    return `${equivalentCartons} Cartons, ${equivalentPieces} Pieces`;
                } else if (deliveryChallan.issue_type === 'Pieces') {
                    const equivalentCartons = Math.floor(deliveryChallan.quantity / deliveryChallan.units_per_carton);
                    const equivalentPieces = deliveryChallan.quantity % deliveryChallan.units_per_carton;
                    return `${equivalentCartons} Cartons, ${equivalentPieces} Pieces`;
                } else {
                    return `${deliveryChallan.quantity} Cartons`;
                }
            };
            
            const numberToWords = (num) => {
                const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                
                const num_to_words = (n) => {
                    if (n === 0) return 'Zero';
                    else if (n < 20) return a[n];
                    else if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
                    else if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + num_to_words(n % 100) : '');
                    else if (n < 100000) return num_to_words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + num_to_words(n % 1000) : '');
                    else if (n < 10000000) return num_to_words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + num_to_words(n % 100000) : '');
                    else return num_to_words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + num_to_words(n % 10000000) : '');
                };
                
                return num_to_words(Math.floor(num)) + ' Only';
            };
            
            // Settings (same as in print layout)
            const settings = {
                companyName: 'DELTA S TRADE LINK',
                companyAddress: 'NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST), NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.',
                companyEmail: 'deltastradelink@gmail.com',
                companyGstin: '33BFDPS0871J1ZC',
                bankName: 'KARUR VYSYA BANK',
                accountName: 'DELTA S TRADE LINK',
                accountNumber: '1128115000011983',
                branchIfsc: 'DINDIGUL MAIN & KVBL0001128'
            };
            
            // Calculate values for the DC (simplified since DC doesn't have complex tax structure like PO)
            const totalQuantity = deliveryChallan.quantity || 0;
            const grandTotal = 0; // DC doesn't have monetary value like PO
            
            // Render the same HTML structure as in FGDCPrintLayout but with proper logo path
            tempDiv.innerHTML = `
                <div style="text-align: center; font-weight: bold; font-size: 8pt; text-decoration: underline; margin-top: 2mm; margin-bottom: 1.5mm; font-weight: 800; letter-spacing: 0.2px;">
                    SUBJECT TO JURISDICTION
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; margin-bottom: 0mm;">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; font-weight: bold; border-right: none; padding: 1mm 1.5mm; width: 35%; font-size: 8pt; font-weight: 800; vertical-align: middle;">
                                <strong>GSTIN : </strong>${settings.companyGstin}
                            </td>
                            <td style="border: 1px solid #000; border-left: none; text-align: left; padding: 0.05mm; width: 52%; vertical-align: middle; padding: 1mm 1.5mm; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800; font-size: 8pt;">
                                DELIVERY CHALLAN
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: Arial, sans-serif; margin-bottom: 0mm;">
                    <tbody>
                        <tr>
                            <td style="width: 30%; border-right: 1px solid #000; text-align: center; vertical-align: middle; padding-right: 2mm;">
                                <div style="display: flex; flex-direction: column; align-items: center;">
                                    <img
                                        src="/logo-po.png"
                                        alt="Company Logo"
                                        style="width: 75%; height: auto; object-fit: contain;"
                                    />
                                    <div style="font-size: 9pt; font-weight: 800; margin-top: 1mm;">
                                        DELTA'S TRADE LINK
                                    </div>
                                </div>
                            </td>
                            <td style="width: 70%; text-align: center; vertical-align: middle; padding: 2.5mm 2mm; border-top: 1px solid #000; border-bottom: 1px solid #000;">
                                <div style="font-family: Times New Roman, Times, serif; font-weight: 900; font-size: 25pt; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; color: #000;">
                                    DELTA S TRADE LINK
                                </div>
                                <div style="font-style: italic; font-weight: bold; font-size: 12pt; margin-bottom: 1mm;">
                                    India's No 1 Pooja Products Manufacturer
                                </div>
                                <div style="font-size: 10pt; font-weight: bold; line-height: 1.4; margin-bottom: 0.5mm;">
                                    NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),<br />
                                    NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.
                                </div>
                                <div style="font-size: 9pt; font-weight: bold;">
                                    E-Mail : deltastradelink@gmail.com
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 8pt; margin-top: 0mm;">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; padding: 3mm; width: 33%; vertical-align: top; line-height: 1.45;">
                                <div style="font-weight: 800; margin-bottom: 0.5mm;">
                                    Receiver Details:
                                </div>
                                <div style="font-weight: 800; text-transform: uppercase; margin-bottom: 0.5mm; font-size: 8.5pt;">
                                    ${deliveryChallan.receiver_name || ''}
                                </div>
                                <div style="margin-bottom: 1.9mm; font-weight: 400;">
                                    ${deliveryChallan.receiver_details || ''}
                                </div>
                                <div style="display: flex; align-items: center; font-weight: 800; margin-top: 1mm;">
                                    <span style="width: 15mm;">GSTIN</span>
                                    <span>: ${settings.companyGstin}</span>
                                </div>
                            </td>
                            <td style="border: 1px solid #000; padding: 3mm; width: 33%; vertical-align: top; line-height: 1.45;">
                                <div style="font-weight: 800; margin-bottom: 0.5mm;">
                                    Dispatch Details:
                                </div>
                                <div style="margin-bottom: 1.9mm; font-weight: 400;">
                                    ${deliveryChallan.dispatch_type || ''}
                                </div>
                                <div style="display: flex; align-items: center; font-weight: 800; margin-top: 1mm;">
                                    <span style="width: 15mm;">Date</span>
                                    <span>: ${formatDate(deliveryChallan.date)}</span>
                                </div>
                            </td>
                            <td style="border: 1px solid #000; padding: 2mm 3mm; width: 34%; vertical-align: top;">
                                <table style="width: 100%; border-collapse: collapse; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 8pt; line-height: 2.2;">
                                    <tbody>
                                        <tr>
                                            <td style="width: 40%; font-weight: 800; vertical-align: top;">DC No.</td>
                                            <td style="font-weight: 400;">: ${deliveryChallan.dc_no || ''}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-weight: 800;">Product</td>
                                            <td style="font-weight: 400;">: ${deliveryChallan.product_name || ''}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-weight: 800;">Quantity</td>
                                            <td style="font-weight: 400;">: ${formatQuantityDisplay()}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-weight: 800;">Equivalent</td>
                                            <td style="font-weight: 400;">: ${calculateEquivalent()}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-weight: 800;">Status</td>
                                            <td style="font-weight: 400;">: ${deliveryChallan.status || ''}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                ${deliveryChallan.remarks ? `
                <table style="width: 100%; border-collapse: collapse; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 8pt; margin-top: 0mm; border-top: none;">
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; border-top: none; padding: 3mm; vertical-align: top;">
                                <div style="font-weight: 800; margin-bottom: 0.5mm;">
                                    Remarks:
                                </div>
                                <div style="font-weight: 400;">
                                    ${deliveryChallan.remarks}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                ` : ''}
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 8pt; margin-top: 8mm;">
                    <tbody>
                        <tr>
                            <td style="width: 50%; vertical-align: top; border: 1px solid #000; padding: 3mm;">
                                <div style="font-weight: bold; margin-bottom: 2mm;">
                                    Declaration:
                                </div>
                                <div style="line-height: 1.5;">
                                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                                </div>
                            </td>
                            <td style="width: 50%; vertical-align: top; border: 1px solid #000; padding: 3mm; text-align: center;">
                                <div style="font-weight: bold; margin-bottom: 8mm;">
                                    For ${settings.companyName}
                                </div>
                                <div>Authorised Signatory</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
            
            // Append to body
            document.body.appendChild(tempDiv);
            
            // Wait for content to render
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Import html2canvas and jsPDF dynamically
            const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);
            
            // Generate canvas
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                logging: false
            });
            
            // Remove temp div
            document.body.removeChild(tempDiv);
            
            // Generate PDF
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
            
            // Update toast
            toast.update(toastId, { render: 'Downloading PDF...', type: 'info' });
            
            // Save PDF
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `FGDC_${deliveryChallan.dc_no}_${timestamp}.pdf`;
            pdf.save(filename);
            
            // Success toast
            toast.update(toastId, { render: 'PDF downloaded successfully!', type: 'success', autoClose: 3000 });
        } catch (error) {
            console.error('Error downloading DC:', error);
            toast.error('Failed to download DC: ' + (error.message || 'Unknown error'));
        }
    };
    
    // Delete delivery challan (placeholder - would require backend implementation)
    const handleDelete = async (dcId) => {
        if (window.confirm('Are you sure you want to delete this delivery challan?')) {
            toast.warn('Delete functionality not implemented yet.');
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Finished Goods Delivery Challans
                </h1>
                <p className="text-gray-600 text-sm">
                    View and manage all finished goods delivery challans.
                </p>
            </div>
            
            {/* Filters */}
            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dispatch Type
                        </label>
                        <select
                            name="dispatchType"
                            value={filters.dispatchType}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="Free Sample">Free Sample</option>
                            <option value="Courier">Courier</option>
                            <option value="E-Commerce">E-Commerce</option>
                            <option value="Sales">Sales</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                        </label>
                        <input
                            type="text"
                            name="product"
                            value={filters.product}
                            onChange={handleFilterChange}
                            placeholder="Product name"
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Receiver
                        </label>
                        <input
                            type="text"
                            name="receiver"
                            value={filters.receiver}
                            onChange={handleFilterChange}
                            placeholder="Receiver name"
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
                    >
                        <FaSearch className="mr-2" />
                        Reset Filters
                    </button>
                    
                    <button
                        onClick={() => navigate('/fg/delivery-challan/create')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center"
                    >
                        <FaPlus className="mr-2" />
                        Create New DC
                    </button>
                </div>
            </Card>
            
            {/* Delivery Challans Table */}
            <Card title={`Delivery Challans (${filteredChallans.length})`}>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <FaSpinner className="animate-spin text-primary-500" size={48} />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredChallans.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No delivery challans found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChallans.map(dc => (
                                        <tr key={dc._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{dc.dc_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{dc.dispatch_type}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={dc.product_name}>
                                                {dc.product_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {dc.issue_type === 'Both' 
                                                    ? `${dc.carton_quantity}C + ${dc.piece_quantity}P` 
                                                    : `${dc.quantity} ${dc.issue_type === 'Carton' ? 'C' : 'P'}`}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={dc.receiver_name}>
                                                {dc.receiver_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(dc.date)}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {getStatusBadge(dc.status)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right space-x-2">
                                                <button
                                                    onClick={() => viewDC(dc._id)}
                                                    className="p-2 text-blue-600 hover:text-blue-900"
                                                    title="View DC"
                                                >
                                                    <FaEye />
                                                </button>
                                                <button
                                                    onClick={() => downloadDC(dc._id)}
                                                    className="p-2 text-red-600 hover:text-red-900"
                                                    title="Download PDF"
                                                >
                                                    <FaFilePdf />
                                                </button>
                                                <button
                                                    onClick={() => printDC(dc._id)}
                                                    className="p-2 text-purple-600 hover:text-purple-900"
                                                    title="Print DC"
                                                >
                                                    <FaPrint />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ViewFGDCs;