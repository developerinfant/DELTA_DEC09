import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';
import logoPO from '../../assets/logo-po.png';
import { FaEye } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const FGInvoicePrintLayout = () => {
    const { id } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [buyer, setBuyer] = useState(null);
    const [settings, setSettings] = useState({
        companyName: 'DELTA S TRADE LINK',
        companyAddress: 'NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST), NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA',
        companyEmail: 'deltastradelink@gmail.com',
        companyGstin: '33BFDPS0871J1ZC',
        bankName: 'KARUR VYSYA BANK',
        accountName: 'DELTA S TRADE LINK',
        accountNumber: '1128115000011983',
        branchIfsc: 'DINDIGUL MAIN & KVBL0001128'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reportRef = useRef(null);

    useEffect(() => {
        const fetchInvoiceData = async () => {
            try {
                setLoading(true);
                const invoiceResponse = await api.get(`/fg/invoices/${id}`);
                const invoiceData = invoiceResponse.data;
                
                setInvoice(invoiceData);
                
                // Fetch buyer details
                if (invoiceData.buyerId) {
                    try {
                        const buyerResponse = await api.get(`/fg/buyers/${invoiceData.buyerId}`);
                        setBuyer(buyerResponse.data);
                    } catch (buyerError) {
                        console.error('Error fetching buyer data:', buyerError);
                    }
                }
                
                setLoading(false);
            } catch (err) {
                setError('Failed to load invoice data');
                setLoading(false);
                console.error('Error fetching invoice data:', err);
            }
        };

        if (id) {
            fetchInvoiceData();
        }
    }, [id]);

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
            const filename = `FGInvoice_${invoice.invoiceNo}_${timestamp}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading invoice data...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    if (!invoice) {
        return <div className="flex justify-center items-center h-screen">No invoice data available</div>;
    }

    // Calculate totals
    const totalQty = invoice.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalAmount = invoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Calculate taxable amount and taxes based on GST type
    const taxableAmount = invoice.taxableAmount || (totalAmount - (invoice.schemeDiscount || 0));
    const cgstAmount = invoice.cgstAmount || (invoice.gstType === 'CGST+SGST' ? taxableAmount * 0.025 : 0);
    const sgstAmount = invoice.sgstAmount || (invoice.gstType === 'CGST+SGST' ? taxableAmount * 0.025 : 0);
    const igstAmount = invoice.igstAmount || (invoice.gstType === 'IGST' ? taxableAmount * 0.05 : 0);
    const grandTotal = invoice.grandTotal || (taxableAmount + cgstAmount + sgstAmount + igstAmount);

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="flex justify-end mb-4">
                <button
                    onClick={downloadPDF}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                    title="Download PDF Report"
                >
                    <FaEye className="mr-2" />
                    <span>Download Invoice</span>
                </button>
            </div>

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

                            {/* Right Cell — TAX INVOICE */}
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
                                TAX INVOICE
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

                {/* === E-Way Bill Row === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: "'Arial', 'Helvetica', sans-serif",
                    fontWeight: 'bold',
                    fontSize: '8pt',
                    letterSpacing: '0.2px',
                    marginBottom: '0',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          border: '1px solid #000',
                          borderRight: 'none',
                          padding: '1mm 1.5mm',
                          width: '33.33%',
                          fontFamily: "'Arial', 'Helvetica', sans-serif",
                          fontWeight: 'bold',
                          fontSize: '8pt',
                          letterSpacing: '0.2px',
                        }}
                      >
                        E-Way Bill No. : {invoice.eWayBillNo || ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          borderRight: 'none',
                          borderLeft: 'none',
                          padding: '1mm 1.5mm',
                          width: '33.33%',
                          fontFamily: "'Arial', 'Helvetica', sans-serif",
                          fontWeight: 'bold',
                          fontSize: '8pt',
                          letterSpacing: '0.2px',
                        }}
                      >
                        E-Way Bill Date :{' '}
                        {invoice.eWayBillDate ? formatDate(invoice.eWayBillDate) : ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          borderLeft: 'none',
                          padding: '1mm 1.5mm',
                          width: '33.34%',
                          fontFamily: "'Arial', 'Helvetica', sans-serif",
                          fontWeight: '700',
                          fontSize: '8pt',
                          letterSpacing: '0.2px',
                        }}
                      >
                        Vehicle No : {invoice.vehicleNo || ''}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* === DELTA INVOICE HEADER BOX STRUCTURE === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: "'Arial', 'Helvetica', sans-serif",
                    fontSize: '8pt',
                    marginTop: '0',
                    borderBottom: 'none',
                  }}
                >
                  <tbody>
                    <tr>
                      {/* === Billing From === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '3mm',
                          width: '33%',
                          verticalAlign: 'top',
                          lineHeight: '1.45',
                        }}
                      >
                        <div style={{ fontWeight: '800', marginBottom: '1mm' }}>Billing From</div>

                        <div style={{ marginBottom: '8.60mm' }}>
                          <div style={{ fontWeight: '600', fontSize: '8.5pt' }}>{settings.companyName}</div>
                          <div style={{ fontWeight: '400' }}>{settings.companyAddress}</div>
                        </div>

                        <div style={{ marginTop: '4mm' }}>
                          <div style={{ fontWeight: '800' }}>
                            <b>Contact No. :</b> 
                          </div>
                          <div style={{ marginTop: '1.5mm', fontWeight: '800' }}>
                            <b>GSTIN :</b> {settings.companyGstin}
                          </div>
                        </div>
                      </td>

                      {/* === Billed To === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '3mm',
                          width: '33%',
                          verticalAlign: 'top',
                          lineHeight: '1.45',
                        }}
                      >
                        <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>Billed To:</div>

                        <div
                          style={{
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            marginBottom: '0.5mm',
                            fontSize: '8.5pt',
                          }}
                        >
                          {invoice.buyerName}
                        </div>

                        <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
                          {invoice.billedTo.split('\n').map((line, i) => (
                            <span key={i}>{line}<br /></span>
                          ))}
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
                          <span>: {invoice.buyerGstin || ''}</span>
                        </div>
                      </td>

                      {/* === Right-side Invoice Info === */}
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
                                Invoice No.
                              </td>
                              <td style={{ fontWeight: '400' }}>: {invoice.invoiceNo}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: '800' }}>Date</td>
                              <td style={{ fontWeight: '400' }}>: {formatDate(invoice.invoiceDate)}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: '800' }}>Disp.From</td>
                              <td style={{ fontWeight: '400' }}>
                                : {invoice.dispatchFrom || 'Main'}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: '800' }}>No.of Pack</td>
                              <td style={{ fontWeight: '400' }}>: {invoice.noOfPackages || ''}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: '800' }}>Transport</td>
                              <td style={{ fontWeight: '400' }}>: {invoice.transportName || ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* === SEPARATE VERTICAL BOXES UNDER EACH COLUMN === */}
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
                      {/* === Under Billing From === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          borderTop: 'none',
                          fontWeight: '600',
                          padding: '1mm',
                          width: '33%',
                          verticalAlign: 'top',
                        }}
                      >
                        <div>
                          <b>Terms of Payment :</b> {invoice.termsOfPayment || ''}
                        </div>
                        <div style={{ marginTop: '3mm' }}>
                          <b>Destination :</b> {invoice.destination || ''}
                        </div>
                      </td>

                      {/* === Under Billed To === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '1mm',
                          width: '33%',
                          fontWeight: '600',
                          verticalAlign: 'top',
                        }}
                      >
                        <div>
                          <b>P.O No & Date :</b> {invoice.poNoDate || ''}
                        </div>
                        <div style={{ marginTop: '3mm' }}>
                          <b>D.C No & Date :</b> {invoice.deliveryChallanNoDate || ''}
                        </div>
                      </td>

                      {/* === Under Invoice Details === */}
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '1mm',
                          width: '34%',
                          verticalAlign: 'top',
                          fontWeight: '600',
                        }}
                      >
                        <div>
                          <b>Salesman :</b> {invoice.salesman || '<None>'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Items Table */}
                {/* === PRODUCT TABLE === */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '9pt',
                    marginTop: '2mm',
                     marginTop: '0',
                      borderTop: 'none'  
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        'S.N',
                        'ITEM CODE',
                        'PRODUCT',
                        'HSN',
                        'GST%',
                        'SCHEME',
                        'UOM',
                        'QTY',
                        'RATE',
                        'DISC%',
                        'AMOUNT'
                      ].map((header, index) => (
                        <th
                          key={index}
                          style={{
                            border: '1px solid #000',
                            padding: '1mm 1.5mm',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            borderBottom: 'none',
                            backgroundColor: '#fff'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
  {invoice.items.map((item, index) => {
    return (
      <tr key={item._id || index}>
        {[
          index + 1,
          item.itemCode || '',
          item.product || '',
          item.hsn || '48191010',
          `${item.gstPercent || 5}%`,
          item.scheme || '',
          item.uom || 'Nos',
          formatCurrency(item.qty || 0),
          item.rate ? formatCurrency(item.rate) : '0.00',
          item.discPercent ? `${item.discPercent}%` : '',
          formatCurrency(item.amount || 0),
        ].map((val, i) => (
          <td
            key={i}
            style={{
              border: '1px solid #000',
              textAlign: i === 10 ? 'right' : 'center',
              padding: '1mm 1.5mm',
            }}
          >
            {val}
          </td>
        ))}
      </tr>
    );
  })}

  {/* Empty placeholder rows (only vertical lines) */}
  {Array.from({ length: Math.max(10 - invoice.items.length, 0) }).map((_, i) => (
    <tr key={`empty-${i}`}>
      {Array.from({ length: 11 }).map((_, j) => (
        <td
          key={j}
          style={{
            borderLeft: '1px solid #000',
            borderRight: j === 10 ? '1px solid #000' : 'none',
            borderTop: 'none',
            borderBottom: 'none',
            height: '10px',
            padding: '2mm 1.5mm',
          }}
        ></td>
      ))}
    </tr>
  ))}

  {/* === TOTAL ROW === */}
  <tr>
    {Array.from({ length: 11 }).map((_, j) => {
      if (j === 7) {
        // Total QTY
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            {formatCurrency(totalQty)}
          </td>
        );
      } else if (j === 10) {
        // Total AMOUNT
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
            {formatCurrency(totalAmount)}
          </td>
        );
      } else {
        // Empty cells
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'center',
            }}
          ></td>
        );
      }
    })}
  </tr>
</tbody>

                </table>

                {/* HSN/SAC Tax Table – Final Exact Layout */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '9pt',
                    marginTop: '0',
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        rowSpan="2"
                        style={{
                          border: '1px solid #000',
                          textAlign: 'center',
                          padding: '2mm',
                          fontWeight: 'bold',
                        }}
                      >
                        HSN/SAC
                      </th>
                      <th
                        rowSpan="2"
                        style={{
                          border: '1px solid #000',
                          textAlign: 'center',
                          padding: '2mm',
                          fontWeight: 'bold',
                        }}
                      >
                        Taxable Value
                      </th>
                      
                      {/* Conditional rendering based on GST type */}
                      {invoice.gstType === 'CGST+SGST' ? (
                        <>
                          <th
                            colSpan="2"
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '2mm',
                              fontWeight: 'bold',
                            }}
                          >
                            CGST
                          </th>
                          <th
                            colSpan="2"
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '2mm',
                              fontWeight: 'bold',
                            }}
                          >
                            SGST/UTGST
                          </th>
                        </>
                      ) : (
                        <th
                          colSpan="2"
                          style={{
                            border: '1px solid #000',
                            textAlign: 'center',
                            padding: '2mm',
                            fontWeight: 'bold',
                          }}
                        >
                          IGST
                        </th>
                      )}
                      
                      <th
                        rowSpan="2"
                        style={{
                          border: '1px solid #000',
                          width: '22%',
                          textAlign: 'left',
                          padding: '2mm',
                          fontWeight: 'bold',
                        }}
                      ></th>
                      <th
                        rowSpan="2"
                        style={{
                          border: '1px solid #000',
                          width: '10%',
                          textAlign: 'right',
                          padding: '2mm',
                          fontWeight: 'bold',
                        }}
                      ></th>
                    </tr>
                    <tr>
                      {/* Conditional headers based on GST type */}
                      {invoice.gstType === 'CGST+SGST' ? (
                        <>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Rate
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Amount
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Rate
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Amount
                          </th>
                        </>
                      ) : (
                        <>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Rate
                          </th>
                          <th
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              padding: '1.5mm',
                              fontWeight: 'bold',
                            }}
                          >
                            Amount
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
                        48191010
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
                        {formatCurrency(taxableAmount)}
                      </td>
                      
                      {/* Conditional tax display based on GST type */}
                      {invoice.gstType === 'CGST+SGST' ? (
                        <>
                          <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
                            {invoice.cgstPercent || 2.5} %
                          </td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
                            {formatCurrency(cgstAmount)}
                          </td>
                          <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
                            {invoice.sgstPercent || 2.5} %
                          </td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
                            {formatCurrency(sgstAmount)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
                            {invoice.igstPercent || 5} %
                          </td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
                            {formatCurrency(igstAmount)}
                          </td>
                        </>
                      )}
                      
                      {/* Right-side stacked Input CGST/SGST or IGST section */}
                      <td
                        style={{
                          borderTop: 'none',
                          borderBottom: 'none',
                          borderLeft: 'none',
                          borderRight: '1px solid #000',
                          textAlign: 'left',
                          verticalAlign: 'top',
                          padding: '1.5mm 2mm',
                          fontSize: '8.5pt',
                          lineHeight: '1.6',
                        }}
                      >
                        {invoice.gstType === 'CGST+SGST' ? (
                          <>
                            Input-CGST-{invoice.cgstPercent || 2.5}%<br />
                            Input-SGST-{invoice.sgstPercent || 2.5}%
                          </>
                        ) : (
                          <>Input-IGST-{invoice.igstPercent || 5}%</>
                        )}
                      </td>
                      <td
                        style={{
                          borderTop: 'none',
                          borderBottom: 'none',
                          borderLeft: 'none',
                          borderRight: '1px solid #000',
                          textAlign: 'right',
                          verticalAlign: 'top',
                          padding: '1.5mm 2mm',
                          fontSize: '8.5pt',
                          lineHeight: '1.6',
                        }}
                      >
                        {invoice.gstType === 'CGST+SGST' ? (
                          <>
                            {formatCurrency(cgstAmount)}<br />
                            {formatCurrency(sgstAmount)}
                          </>
                        ) : (
                          formatCurrency(igstAmount)
                        )}
                      </td>
                    </tr>

                    {/* Total Row */}
                    <tr>
                      <td
                        style={{
                          border: '1px solid #000',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          padding: '1.5mm',
                        }}
                      >
                        Total
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          padding: '1.5mm',
                        }}
                      >
                        {formatCurrency(taxableAmount)}
                      </td>
                      
                      {/* Conditional total tax display based on GST type */}
                      {invoice.gstType === 'CGST+SGST' ? (
                        <>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td
                            style={{
                              border: '1px solid #000',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              padding: '1.5mm',
                            }}
                          >
                            {formatCurrency(cgstAmount)}
                          </td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td
                            style={{
                              border: '1px solid #000',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              padding: '1.5mm',
                            }}
                          >
                            {formatCurrency(sgstAmount)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td
                            colSpan="3"
                            style={{
                              border: '1px solid #000',
                              textAlign: 'right',
                              fontWeight: 'bold',
                              padding: '1.5mm',
                            }}
                          >
                            {formatCurrency(igstAmount)}
                          </td>
                        </>
                      )}
                      
                      <td colSpan="2" style={{ border: '1px solid #000', padding: '1.5mm' }}></td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr>
                      <td
                        colSpan={invoice.gstType === 'CGST+SGST' ? 6 : 4}
                        style={{
                          border: '1px solid #000',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          padding: '2mm',
                          fontSize: '10pt',
                        }}
                      >
                        Grand Total
                      </td>
                      <td
                        colSpan="2"
                        style={{
                          border: '1px solid #000',
                          textAlign: 'right',
                          fontWeight: 'bold',
                          padding: '2mm',
                          fontSize: '10pt',
                        }}
                      >
                        ₹ {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* === AMOUNT CHARGEABLE BOX === */}
                <table
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Arial, sans-serif',
    fontSize: '9pt',
    marginTop: '0',
  }}
>
  <tbody>
    <tr>
      <td
        colSpan="2"
        style={{
          border: '1px solid #000',
          padding: '1mm 1.5mm',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1mm',
          }}
        >
          <div>
            Amount Chargeable (in words): <strong>INR {numberToWords(grandTotal)}</strong>
          </div>
          <div style={{ fontWeight: 'bold' }}>E. & O.E</div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '9pt',
            marginTop: '2mm',
          }}
        >
          <tbody>
            <tr>
              {/* Left - Bank Details & Terms */}
              <td
                style={{
                  width: '70%',
                  verticalAlign: 'top',
                  borderTop: '1px solid #000',
                  borderRight: 'none',
                  padding: '3mm',
                }}
              >
               <strong>BANK DETAILS :-</strong>
<div style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5mm' }}>
  <div style={{ display: 'flex' }}>
    <span style={{ width: '33mm' }}>Bank Name</span>
    <span>: {settings.bankName}</span>
  </div>
  <div style={{ display: 'flex' }}>
    <span style={{ width: '33mm' }}>A/c. Name</span>
    <span>: {settings.accountName}</span>
  </div>
  <div style={{ display: 'flex' }}>
    <span style={{ width: '33mm' }}>A/c. No.</span>
    <span>: {settings.accountNumber}</span>
  </div>
  <div style={{ display: 'flex' }}>
    <span style={{ width: '33mm' }}>Branch & IFSC</span>
    <span>: {settings.branchIfsc}</span>
  </div>
</div>

<div
  style={{
    marginTop: '4mm',
    fontWeight: 'bold',
    fontSize: '9pt',
  }}
>
  TERMS & CONDITIONS
</div>
              </td>

              {/* Right - Company Name */}
              <td
                style={{
                  width: '30%',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #000',
                  padding: '3mm',
                  fontWeight: 'bold',
                }}
              >
                For {settings.companyName}
              </td>
            </tr>

            {/* Signatures inside same box */}
            <tr>
              <td
                style={{
                  textAlign: 'center',
                  borderTop: 'none',
                  paddingTop: '6mm',
                  paddingBottom: '3mm',
                }}
              >
                Customer Signature
              </td>
              <td
                style={{
                  textAlign: 'center',
                  borderTop: 'none',
                  paddingTop: '6mm',
                  paddingBottom: '3mm',
                }}
              >
                Authorised Signatory
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
            </div>
        </div>
    );
};

export default FGInvoicePrintLayout;