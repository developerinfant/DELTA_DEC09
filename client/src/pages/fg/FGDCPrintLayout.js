import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../api';
import logoPO from '../../assets/logo-po.png';
import { FaEye } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/*
 * FGDCPrintLayout.js
 * 
 * Changelog:
 * - Reused formatting functions from FGInvoicePrintLayout.js (formatDate, formatCurrency, numberToWords)
 * - Reused PDF generation logic from FGInvoicePrintLayout.js (downloadPDF)
 * - Reused styling approach from FGInvoicePrintLayout.js (inline styles, table layouts)
 * - Adapted data structure to match FG Delivery Challan fields
 * - Maintained same visual hierarchy and layout proportions
 * - Kept same margins, fonts, paddings, and card styling
 * - Used same column widths and spacing for tables
 * - Implemented conditional rendering for empty fields
 * - Preserved logo positioning and header/label alignment
 */

const FGDCPrintLayout = () => {
    const { id } = useParams();
    const location = useLocation();
    const [deliveryChallan, setDeliveryChallan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reportRef = useRef(null);
    
    // Check if this is for printing (print=true in query params)
    const isPrintMode = new URLSearchParams(location.search).get('print') === 'true';

    const settings = {
        companyName: 'DELTA S TRADE LINK',
        companyAddress: 'NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST), NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA',
        companyEmail: 'deltastradelink@gmail.com',
        companyGstin: '33BFDPS0871J1ZC',
        bankName: 'KARUR VYSYA BANK',
        accountName: 'DELTA S TRADE LINK',
        accountNumber: '1128115000011983',
        branchIfsc: 'DINDIGUL MAIN & KVBL0001128'
    };

    useEffect(() => {
        const fetchDCData = async () => {
            try {
                setLoading(true);
                const dcResponse = await api.get(`/fg/delivery-challan/${id}`);
                const dcData = dcResponse.data;
                
                setDeliveryChallan(dcData);
                setLoading(false);
            } catch (err) {
                setError('Failed to load delivery challan data');
                setLoading(false);
                console.error('Error fetching DC data:', err);
            }
        };

        if (id) {
            fetchDCData();
        }
    }, [id]);
    
    // Auto-print effect when in print mode
    useEffect(() => {
        if (isPrintMode && deliveryChallan && !loading) {
            // Small delay to ensure everything is rendered
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [isPrintMode, deliveryChallan, loading]);

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
            const filename = `FGDC_${deliveryChallan.dc_no}_${timestamp}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading delivery challan data...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    if (!deliveryChallan) {
        return <div className="flex justify-center items-center h-screen">No delivery challan data available</div>;
    }

    // Format quantity display based on issue type
    const formatQuantityDisplay = () => {
        if (deliveryChallan.issue_type === 'Both') {
            return `${deliveryChallan.carton_quantity} Cartons + ${deliveryChallan.piece_quantity} Pieces`;
        } else if (deliveryChallan.issue_type === 'Carton') {
            return `${deliveryChallan.quantity} Cartons`;
        } else {
            return `${deliveryChallan.quantity} Pieces`;
        }
    };

    // Calculate equivalent in cartons and pieces
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

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {!isPrintMode && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={downloadPDF}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                        title="Download PDF Report"
                    >
                        <FaEye className="mr-2" />
                        <span>Download DC</span>
                    </button>
                </div>
            )}

            <div ref={reportRef} style={{ 
                width: '210mm', 
                minHeight: '297mm', 
                padding: '12mm', 
                fontFamily: 'Arial, sans-serif',
                fontSize: '11.5px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                margin: '0 auto',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                border: '1px solid #000'
            }}>
                
                {/* === HEADER SECTION: SUBJECT TO JURISDICTION + BOX === */}
                <div
                    style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '8pt',
                        textDecoration: 'underline',
                        marginTop: '2mm',
                        marginBottom: '1.5mm',
                        fontWeight: '800', 
                        letterSpacing: '0.2px'
                    }}
                >
                    SUBJECT TO JURISDICTION
                </div>

                <table
                    style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '9pt',
                        marginBottom: '0mm'
                    }}
                >
                    <tbody>
                        <tr>
                            {/* Left Cell — GSTIN */}
                            <td
                                style={{
                                    border: '1px solid #000',
                                    fontWeight: 'bold',
                                    borderRight: 'none',
                                    padding: '1mm 1.5mm',
                                    width: '35%',
                                    fontSize: '8pt',
                                    fontWeight: '800', 
                                    verticalAlign: 'middle'
                                }}
                            >
                                <strong>GSTIN : </strong>
                                {settings.companyGstin}
                            </td>

                            {/* Right Cell — DELIVERY CHALLAN */}
                            <td
                                style={{
                                    border: '1px solid #000',
                                    borderLeft: 'none',
                                    textAlign: 'left',
                                    padding: '0.05mm',
                                    width: '52%',
                                    verticalAlign: 'middle',
                                    padding: '1mm 1.5mm',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontWeight: '800', 
                                    fontSize: '8pt'
                                }}
                            >
                                DELIVERY CHALLAN
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* === COMPANY HEADER BOX (Logo + Company Details) === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #000',
                    fontFamily: 'Arial, sans-serif',
                    marginBottom: '0mm'
                  }}
                >
                  <tbody>
                    <tr>
                      {/* Left: Company Logo */}
                      <td
                        style={{
                          width: '30%',
                          borderRight: '1px solid #000',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          paddingRight: '2mm'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <img
                            src={logoPO}
                            alt="Company Logo"
                            style={{
                              width: '75%',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                          />
                          <div
                            style={{
                              fontSize: '9pt',
                              fontWeight: '800',
                              marginTop: '1mm'
                            }}
                          >
                            DELTA'S TRADE LINK
                          </div>
                        </div>
                      </td>

                      {/* Right: Company Name + Address */}
                     <td
                        style={{
                          width: '70%',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          padding: '2.5mm 2mm',
                          borderTop: '1px solid #000',
                          borderBottom: '1px solid #000'
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'Times New Roman, Times, serif',
                            fontWeight: '900',
                            fontSize: '25pt',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            lineHeight: '1.1',
                            color: '#000'
                          }}
                        >
                          DELTA S TRADE LINK
                        </div>

                        <div
                          style={{
                            fontStyle: 'italic',
                            fontWeight: 'bold',
                            fontSize: '12pt',
                            marginBottom: '1mm'
                          }}
                        >
                          India's No 1 Pooja Products Manufacturer
                        </div>

                        <div
                          style={{
                            fontSize: '10pt',
                            fontWeight: 'bold',
                            lineHeight: '1.4',
                            marginBottom: '0.5mm'
                          }}
                        >
                          NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),<br />
                          NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.
                        </div>

                        <div
                          style={{
                            fontSize: '9pt',
                            fontWeight: 'bold'
                          }}
                        >
                          E-Mail : deltastradelink@gmail.com
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* === Three-column Info Section === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: "'Arial', 'Helvetica', sans-serif",
                    fontSize: '8pt',
                    marginTop: '0mm',
                  }}
                >
                  <tbody>
                    <tr>
                      {/* === Receiver Details === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '3mm',
                          width: '33%',
                          verticalAlign: 'top',
                          lineHeight: '1.45',
                        }}
                      >
                        <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>
                          Receiver Details:
                        </div>

                        <div
                          style={{
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            marginBottom: '0.5mm',
                            fontSize: '8.5pt',
                          }}
                        >
                          {deliveryChallan.receiver_name || ''}
                        </div>

                        <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
                          {deliveryChallan.receiver_details || ''}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: '800',
                            marginTop: '1mm',
                          }}
                        >
                          <span style={{ width: '15mm' }}>GSTIN</span>
                          <span>: {settings.companyGstin}</span>
                        </div>
                      </td>

                      {/* === Dispatch Details === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '3mm',
                          width: '33%',
                          verticalAlign: 'top',
                          lineHeight: '1.45',
                        }}
                      >
                        <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>
                          Dispatch Details:
                        </div>

                        <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
                          {deliveryChallan.dispatch_type || ''}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontWeight: '800',
                            marginTop: '1mm',
                          }}
                        >
                          <span style={{ width: '15mm' }}>Date</span>
                          <span>: {formatDate(deliveryChallan.date)}</span>
                        </div>
                      </td>

                      {/* === DC Info === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '2mm 3mm',
                          width: '34%',
                          verticalAlign: 'top',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontFamily: "'Arial', 'Helvetica', sans-serif",
                            fontSize: '8pt',
                            lineHeight: '2.2',
                          }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ width: '40%', fontWeight: '800', verticalAlign: 'top' }}>
                                DC No.
                              </td>
                              <td style={{ fontWeight: '400' }}>: {deliveryChallan.dc_no || ''}</td>
                            </tr>
                            
                            <tr>
                              <td style={{ fontWeight: '800' }}>Product</td>
                              <td style={{ fontWeight: '400' }}>: {deliveryChallan.product_name || ''}</td>
                            </tr>
                            
                            <tr>
                              <td style={{ fontWeight: '800' }}>Quantity</td>
                              <td style={{ fontWeight: '400' }}>: {formatQuantityDisplay()}</td>
                            </tr>
                            
                            <tr>
                              <td style={{ fontWeight: '800' }}>Equivalent</td>
                              <td style={{ fontWeight: '400' }}>: {calculateEquivalent()}</td>
                            </tr>
                            
                            <tr>
                              <td style={{ fontWeight: '800' }}>Status</td>
                              <td style={{ fontWeight: '400' }}>: {deliveryChallan.status || ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* === Remarks Section === */}
                {deliveryChallan.remarks && (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontFamily: "'Arial', 'Helvetica', sans-serif",
                      fontSize: '8pt',
                      marginTop: '0mm',
                      borderTop: 'none',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            border: '1px solid #000',
                            borderTop: 'none',
                            padding: '3mm',
                            verticalAlign: 'top',
                          }}
                        >
                          <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>
                            Remarks:
                          </div>
                          <div style={{ fontWeight: '400' }}>
                            {deliveryChallan.remarks}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* === Declaration and Signatures === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: "'Arial', 'Helvetica', sans-serif",
                    fontSize: '8pt',
                    marginTop: '8mm',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          width: '50%',
                          verticalAlign: 'top',
                          border: '1px solid #000',
                          padding: '3mm',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '2mm' }}>
                          Declaration:
                        </div>
                        <div style={{ lineHeight: '1.5' }}>
                          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                        </div>
                      </td>
                      
                      <td
                        style={{
                          width: '50%',
                          verticalAlign: 'top',
                          border: '1px solid #000',
                          padding: '3mm',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '8mm' }}>
                          For {settings.companyName}
                        </div>
                        <div>Authorised Signatory</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
        </div>
    );
};

export default FGDCPrintLayout;