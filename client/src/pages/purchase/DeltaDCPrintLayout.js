import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';
import logoPO from '../../assets/logo-po.png';
import { FaEye } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const DeltaDCPrintLayout = () => {
    const { id } = useParams();
    const [deliveryChallan, setDeliveryChallan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reportRef = useRef(null);

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
                const dcResponse = await api.get(`/delivery-challan/${id}`);
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
            const filename = `DeliveryChallan_${deliveryChallan.dc_no}_${timestamp}.pdf`;
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

    // Calculate totals for materials
    const materials = deliveryChallan.materials || [];
    
    // Handle multiple products vs single product
    let totalSent = 0;
    let totalReceived = 0;
    let totalBalance = 0;
    
    if (deliveryChallan.products && deliveryChallan.products.length > 0) {
        // Multiple products - calculate totals for all products
        totalSent = materials.reduce((sum, item) => {
            // For multiple products, we need to calculate based on each product's materials
            // This is a simplified approach - in reality, you might need to aggregate differently
            return sum + (item.total_qty || 0);
        }, 0);
        
        totalReceived = materials.reduce((sum, item) => {
            return sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0));
        }, 0);
        
        totalBalance = materials.reduce((sum, item) => {
            const receivedQty = item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0);
            const totalQty = item.total_qty || 0;
            return sum + (totalQty - receivedQty);
        }, 0);
    } else {
        // Single product (backward compatibility)
        totalSent = materials.reduce((sum, item) => sum + (item.qty_per_carton * deliveryChallan.carton_qty), 0);
        totalReceived = materials.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0);
        totalBalance = materials.reduce((sum, item) => {
            return sum + (item.balance_qty !== undefined ? item.balance_qty : ((item.qty_per_carton * deliveryChallan.carton_qty) - (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0))));
        }, 0);
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="flex justify-end mb-4">
                <button
                    onClick={downloadPDF}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                    title="Download PDF Report"
                >
                    <FaEye className="mr-2" />
                    <span>View Report</span>
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
                          padding: '2.5mm 2mm', // slightly reduced for tight look
                          borderTop: '1px solid #000',
                          borderBottom: '1px solid #000'
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'Times New Roman, Times, serif', // classic serif font
                            fontWeight: '900',                            // very bold
                            fontSize: '25pt',                             // adjusted to match image
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',                       // mild spacing
                            lineHeight: '1.1',                            // tighter vertical alignment
                            color: '#000'                                 // pure black
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
        E-Way Bill No. : 
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
        E-Way Bill Date : 
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
        Vehicle No : 
      </td>
    </tr>
  </tbody>
</table>


{/* === DELTA DC HEADER BOX STRUCTURE === */}
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
      {/* === Unit Type === */}
      <td
        style={{
          border: '1px solid #000',
          padding: '3mm',
          width: '33%',
          verticalAlign: 'top',
          lineHeight: '1.45',
        }}
      >
        <div style={{ fontWeight: '800', marginBottom: '1mm' }}>Unit Type</div>

        <div style={{ marginBottom: '8.60mm' }}>
          <div style={{ fontWeight: '600', fontSize: '8.5pt' }}>{deliveryChallan.unit_type || ''}</div>
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

      {/* === Issued To / Supplier === */}
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
          {deliveryChallan.unit_type === 'Jobber' ? 'Supplier' : 'Issued To'}:
        </div>

        <div
          style={{
            fontWeight: '800',
            textTransform: 'uppercase',
            marginBottom: '0.5mm',
            fontSize: '8.5pt',
          }}
        >
          {deliveryChallan.unit_type === 'Jobber' 
            ? (deliveryChallan.supplier_id?.name || '')
            : (deliveryChallan.person_name || '')}
        </div>

        <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
          {deliveryChallan.unit_type === 'Jobber' 
            ? (deliveryChallan.supplier_id?.address || '')
            : ''}
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

      {/* === Right-side DC Info === */}
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
              <td style={{ fontWeight: '800' }}>Date</td>
              <td style={{ fontWeight: '400' }}>: {formatDate(deliveryChallan.date)}</td>
            </tr>
            
            {/* Check if DC has multiple products */}
            {deliveryChallan.products && deliveryChallan.products.length > 0 ? (
                // Display multiple products
                <tr>
                  <td style={{ fontWeight: '800' }}>Products</td>
                  <td style={{ fontWeight: '400' }}>
                    : 
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2mm' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', borderBottom: '1px solid #000' }}>Product Name</th>
                          <th style={{ textAlign: 'right', borderBottom: '1px solid #000' }}>Carton Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryChallan.products.map((product, index) => (
                          <tr key={index}>
                            <td style={{ textAlign: 'left' }}>{product.product_name}</td>
                            <td style={{ textAlign: 'right' }}>{product.carton_qty || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
            ) : (
                // Display single product (backward compatibility)
                <>
                  <tr>
                    <td style={{ fontWeight: '800' }}>Product</td>
                    <td style={{ fontWeight: '400' }}>: {deliveryChallan.product_name || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '800' }}>Carton Qty</td>
                    <td style={{ fontWeight: '400' }}>: {deliveryChallan.carton_qty || ''}</td>
                  </tr>
                </>
            )}
            
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
      {/* === Under Unit Type === */}
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
          <b>Terms of Payment :</b> 
        </div>
        <div style={{ marginTop: '3mm' }}>
          <b>Destination :</b> 
        </div>
      </td>

      {/* === Under Issued To / Supplier === */}
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
          <b>P.O No & Date :</b> 
        </div>
        <div style={{ marginTop: '3mm' }}>
          <b>D.C No & Date :</b> {deliveryChallan.dc_no || ''}
        </div>
      </td>

      {/* === Under DC Details === */}
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
          <b>Salesman :</b> 
        </div>
      </td>
    </tr>
  </tbody>
</table>



                {/* Items Table */}
                {/* === MATERIALS TABLE === */}
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
                        'MATERIAL',
                        'HSN',
                        'GST%',
                        'UOM',
                        'QTY PER\nCARTON',
                        'SENT QTY',
                        'RECEIVED\nQTY',
                        'BALANCE'
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
  {materials.map((item, index) => {
    // Handle multiple products vs single product
    let sentQty, receivedQty, balance;
    
    if (deliveryChallan.products && deliveryChallan.products.length > 0) {
      // Multiple products
      sentQty = item.total_qty || 0;
      receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
      balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
    } else {
      // Single product (backward compatibility)
      sentQty = item.qty_per_carton * deliveryChallan.carton_qty;
      receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
      balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
    }

    return (
      <tr key={item._id || index}>
        {[
          index + 1,
          item.material?.code || '',
          item.material?.name || item.material_name || '',
          '48191010', // Default HSN code
          '5%', // Default GST%
          'Nos',
          formatCurrency(item.qty_per_carton || 0),
          formatCurrency(sentQty),
          formatCurrency(receivedQty),
          formatCurrency(balance),
        ].map((val, i) => (
          <td
            key={i}
            style={{
              border: '1px solid #000',
              textAlign: [6, 7, 8, 9].includes(i) ? 'right' : 'center',
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
  {Array.from({ length: Math.max(10 - materials.length, 0) }).map((_, i) => (
    <tr key={`empty-${i}`}>
      {Array.from({ length: 10 }).map((_, j) => (
        <td
          key={j}
          style={{
            borderLeft: '1px solid #000',
            borderRight: j === 9 ? '1px solid #000' : 'none',
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
    {Array.from({ length: 10 }).map((_, j) => {
      if (j === 6) {
        // Total QTY PER CARTON
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
          </td>
        );
      } else if (j === 7) {
        // Total SENT QTY
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
            {formatCurrency(totalSent)}
          </td>
        );
      } else if (j === 8) {
        // Total RECEIVED QTY
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
            {formatCurrency(totalReceived)}
          </td>
        );
      } else if (j === 9) {
        // Total BALANCE
        return (
          <td
            key={j}
            style={{
              border: '1px solid #000',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
            {formatCurrency(totalBalance)}
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
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
        48191010
      </td>
      <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
        {formatCurrency(totalSent * 0)} {/* Assuming no taxable value for DC */}
      </td>
      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
        2.5 %
      </td>
      <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
        {formatCurrency(0)}
      </td>
      <td style={{ border: '1px solid #000', textAlign: 'center', padding: '1.5mm' }}>
        2.5 %
      </td>
      <td style={{ border: '1px solid #000', textAlign: 'right', padding: '1.5mm' }}>
        {formatCurrency(0)}
      </td>
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
        Input-CGST-2.5%<br />
        Input-SGST-2.5%
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
        {formatCurrency(0)}
        <br />
        {formatCurrency(0)}
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
        {formatCurrency(0)}
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
        {formatCurrency(0)}
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
        {formatCurrency(0)}
      </td>
      <td colSpan="2" style={{ border: '1px solid #000', padding: '1.5mm' }}></td>
    </tr>

    {/* Grand Total Row */}
    <tr>
      <td
        colSpan="6"
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
        ₹ {formatCurrency(0)}
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
            Amount Chargeable (in words): <strong>INR {numberToWords(0)}</strong>
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

export default DeltaDCPrintLayout;