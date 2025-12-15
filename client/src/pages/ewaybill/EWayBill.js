import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api'; // Use the configured API instance instead of raw axios
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const EWayBill = () => {
  const navigate = useNavigate();
  
  // State for source selection
  const [sourceType, setSourceType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentNumbers, setDocumentNumbers] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // State for document data
  const [documentData, setDocumentData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  
  // State for validation errors
  const [errors, setErrors] = useState({});
  
  // State for E-Way Bill data
  const [ewayBillData, setEwayBillData] = useState({
    // Header
    ewbNo: '',
    generatedBy: '',
    generatedDate: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    supplyType: '',
    subType: '',
    docType: '',
    docNo: '',
    docDate: '',
    
    // Part A - Transaction Details
    sender: {
      gstin: '',
      legalName: '',
      address: '',
      state: '',
      pincode: '',
      stateCode: ''
    },
    receiver: {
      gstin: '',
      legalName: '',
      address: '',
      state: '',
      pincode: '',
      stateCode: ''
    },
    
    // Part A - Goods Details
    goods: [],
    
    // Part B - Transport Details
    transportMode: '',
    approxDistance: '',
    transporterId: '',
    transporterName: '',
    transDocNo: '',
    transDocDate: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    vehicleType: '',
    placeOfDispatch: '',
    dispatchState: '',
    
    // Totals
    totalTaxableValue: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalInvoiceValue: 0
  });
  
  // Document type options
  const documentTypes = [
    { value: 'pm-po', label: 'Packing Material - Purchase Order' },
    { value: 'pm-dc', label: 'Packing Material - Delivery Challan' },
    { value: 'fg-dc', label: 'Finished Goods - Delivery Challan' },
    { value: 'fg-invoice', label: 'Finished Goods - Tax Invoice' }
  ];
  
  // Fetch document numbers based on source type
  useEffect(() => {
    if (sourceType) {
      setLoadingDocuments(true);
      setDocumentNumber('');
      setDocumentNumbers([]);
      
      // Call API to fetch document numbers
      api.get(`/eway-bill/documents/${sourceType}`)
        .then(response => {
          const numbers = response.data.map(doc => doc.number);
          setDocumentNumbers(numbers);
          setLoadingDocuments(false);
        })
        .catch(error => {
          console.error('Error fetching document numbers:', error);
          setDocumentNumbers([]);
          setLoadingDocuments(false);
        });
    }
  }, [sourceType]);
  
  // Fetch document data when document number is selected
  const fetchDocumentData = async () => {
    if (!sourceType || !documentNumber) return;
    
    setLoadingData(true);
    
    try {
      // Call API to fetch document data
      const response = await api.get(`/eway-bill/documents/${sourceType}/${documentNumber}`);
      const data = response.data;
      
      setDocumentData(data);
      mapDocumentDataToEwayBill(data);
      setLoadingData(false);
    } catch (error) {
      console.error('Error fetching document data:', error);
      setLoadingData(false);
    }
  };
  
  // Map document data to E-Way Bill format
  const mapDocumentDataToEwayBill = (data) => {
    let mappedData = { ...ewayBillData };
    
    // Set document type and number
    mappedData.docType = getSourceTypeName(sourceType);
    mappedData.docNo = data.docNo;
    mappedData.docDate = data.docDate;
    
    // Map sender and receiver based on document type
    switch (data.type) {
      case 'pm-po':
        mappedData.sender = {
          gstin: data.supplier.gstin,
          legalName: data.supplier.name,
          address: data.supplier.address,
          state: data.supplier.state,
          pincode: data.supplier.pincode,
          stateCode: data.supplier.stateCode
        };
        mappedData.receiver = {
          gstin: data.company.gstin,
          legalName: data.company.name,
          address: data.company.address,
          state: data.company.state,
          pincode: data.company.pincode,
          stateCode: data.company.stateCode
        };
        mappedData.goods = data.items.map(item => ({
          productName: item.name,
          hsn: item.hsn,
          quantity: item.qty,
          unit: item.uom,
          taxableValue: item.taxableValue || 0,
          cgstRate: item.cgstRate || 0,
          cgstAmount: item.cgstAmount || 0,
          sgstRate: item.sgstRate || 0,
          sgstAmount: item.sgstAmount || 0,
          igstRate: item.igstRate || 0,
          igstAmount: item.igstAmount || 0
        }));
        break;
        
      case 'pm-dc':
        mappedData.sender = {
          gstin: data.issuingUnit.gstin,
          legalName: data.issuingUnit.name,
          address: data.issuingUnit.address,
          state: data.issuingUnit.state,
          pincode: data.issuingUnit.pincode,
          stateCode: data.issuingUnit.stateCode
        };
        mappedData.receiver = {
          gstin: data.jobber.gstin,
          legalName: data.jobber.name,
          address: data.jobber.address,
          state: data.jobber.state,
          pincode: data.jobber.pincode,
          stateCode: data.jobber.stateCode
        };
        mappedData.goods = data.items.map(item => ({
          productName: item.name,
          hsn: '', // Not applicable for PM-DC
          quantity: item.qty,
          unit: item.uom,
          taxableValue: item.taxableValue || 0,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0
        }));
        break;
        
      case 'fg-dc':
        mappedData.sender = {
          gstin: data.dispatchingUnit.gstin,
          legalName: data.dispatchingUnit.name,
          address: data.dispatchingUnit.address,
          state: data.dispatchingUnit.state,
          pincode: data.dispatchingUnit.pincode,
          stateCode: data.dispatchingUnit.stateCode
        };
        mappedData.receiver = {
          gstin: data.receiver.gstin,
          legalName: data.receiver.name,
          address: data.receiver.address,
          state: data.receiver.state,
          pincode: data.receiver.pincode,
          stateCode: data.receiver.stateCode
        };
        mappedData.goods = data.items.map(item => ({
          productName: item.name,
          hsn: item.hsn || '',
          quantity: item.qty,
          unit: item.uom,
          taxableValue: item.taxableValue || 0,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0
        }));
        break;
        
      case 'fg-invoice':
        mappedData.sender = {
          gstin: data.billedFrom.gstin,
          legalName: data.billedFrom.name,
          address: data.billedFrom.address,
          state: data.billedFrom.state,
          pincode: data.billedFrom.pincode,
          stateCode: data.billedFrom.stateCode
        };
        mappedData.receiver = {
          gstin: data.billedTo.gstin,
          legalName: data.billedTo.name,
          address: data.billedTo.address,
          state: data.billedTo.state,
          pincode: data.billedTo.pincode,
          stateCode: data.billedTo.stateCode
        };
        mappedData.goods = data.items.map(item => ({
          productName: item.name,
          hsn: item.hsn,
          quantity: item.qty,
          unit: item.uom,
          taxableValue: item.taxableValue,
          cgstRate: item.cgstRate || 0,
          cgstAmount: item.cgstAmount || 0,
          sgstRate: item.sgstRate || 0,
          sgstAmount: item.sgstAmount || 0,
          igstRate: item.igstRate || 0,
          igstAmount: item.igstAmount || 0
        }));
        break;
    }
    
    // Calculate totals
    mappedData.totalTaxableValue = mappedData.goods.reduce((sum, item) => sum + (item.taxableValue || 0), 0);
    mappedData.totalCgst = mappedData.goods.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    mappedData.totalSgst = mappedData.goods.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
    mappedData.totalIgst = mappedData.goods.reduce((sum, item) => sum + (item.igstAmount || 0), 0);
    mappedData.totalInvoiceValue = mappedData.totalTaxableValue + mappedData.totalCgst + mappedData.totalSgst + mappedData.totalIgst;
    
    setEwayBillData(mappedData);
  };
  
  // Get source type name for display
  const getSourceTypeName = (type) => {
    switch (type) {
      case 'pm-po': return 'Packing Material Purchase Order';
      case 'pm-dc': return 'Packing Material Delivery Challan';
      case 'fg-dc': return 'Finished Goods Delivery Challan';
      case 'fg-invoice': return 'Finished Goods Tax Invoice';
      default: return '';
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (sourceType && documentNumber) {
      fetchDocumentData();
    }
  };
  
  // Handle transport details change
  const handleTransportChange = (field, value) => {
    setEwayBillData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Validate transport details
  const validateTransportDetails = () => {
    const errors = {};
    
    if (!ewayBillData.transportMode) {
      errors.transportMode = 'Transport mode is required';
    }
    
    if (!ewayBillData.approxDistance) {
      errors.approxDistance = 'Approximate distance is required';
    } else if (isNaN(ewayBillData.approxDistance) || Number(ewayBillData.approxDistance) <= 0) {
      errors.approxDistance = 'Distance must be a positive number';
    }
    
    if (!ewayBillData.vehicleNo) {
      errors.vehicleNo = 'Vehicle number is required';
    }
    
    if (!ewayBillData.vehicleType) {
      errors.vehicleType = 'Vehicle type is required';
    }
    
    return errors;
  };
  
  // Handle sender/receiver change
  const handlePartyChange = (party, field, value) => {
    setEwayBillData(prev => ({
      ...prev,
      [party]: {
        ...prev[party],
        [field]: value
      }
    }));
  };
  
  // Generate E-Way Bill PDF
  const generateEwayBill = async () => {
    // Validate transport details
    const validationErrors = validateTransportDetails();
    setErrors(validationErrors);
    
    // If there are validation errors, don't generate PDF
    if (Object.keys(validationErrors).length > 0) {
      alert('Please fill in all required transport details.');
      return;
    }
    
    const ewbContent = document.getElementById('eway-bill-content');
    
    if (!ewbContent) {
      alert('Unable to generate PDF. Content not found.');
      return;
    }
    
    try {
      // Generate canvas from the HTML content
      const canvas = await html2canvas(ewbContent, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Save PDF
      pdf.save(`EWayBill-${ewayBillData.docNo}.pdf`);
      
      alert('E-Way Bill PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">E-Way Bill Generator</h1>
      
      {/* Source Selection Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Select Source Document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Source Type</option>
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
              <select
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!sourceType || loadingDocuments}
                required
              >
                <option value="">Select Document Number</option>
                {documentNumbers.map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              {loadingDocuments && (
                <p className="text-sm text-gray-500 mt-1">Loading documents...</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={!sourceType || !documentNumber || loadingData}
            >
              {loadingData ? 'Loading...' : 'Load Document'}
            </button>
          </div>
        </form>
      </div>
      
      {/* E-Way Bill Preview */}
      {documentData && (
        <div id="eway-bill-content" className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">E-Way Bill Preview</h2>
            <button
              onClick={generateEwayBill}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Generate E-Way Bill
            </button>
          </div>
          
          {/* E-Way Bill Header */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">E-Way Bill Header</h3>
              <div className="border-2 border-gray-400 p-2 rounded">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-32 h-32 flex items-center justify-center text-gray-500 text-xs">
                  QR Code Placeholder
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">E-Way Bill No</label>
                <input
                  type="text"
                  value={ewayBillData.ewbNo}
                  onChange={(e) => setEwayBillData({...ewayBillData, ewbNo: e.target.value})}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Generated By</label>
                <input
                  type="text"
                  value={ewayBillData.generatedBy}
                  onChange={(e) => setEwayBillData({...ewayBillData, generatedBy: e.target.value})}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Generated Date</label>
                <input
                  type="date"
                  value={ewayBillData.generatedDate}
                  onChange={(e) => setEwayBillData({...ewayBillData, generatedDate: e.target.value})}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Document Type</label>
                <input
                  type="text"
                  value={ewayBillData.docType}
                  readOnly
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Document No</label>
                <input
                  type="text"
                  value={ewayBillData.docNo}
                  readOnly
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Document Date</label>
                <input
                  type="date"
                  value={ewayBillData.docDate}
                  readOnly
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Valid From</label>
                <input
                  type="date"
                  value={ewayBillData.validFrom}
                  onChange={(e) => setEwayBillData({...ewayBillData, validFrom: e.target.value})}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Valid To</label>
                <input
                  type="date"
                  value={ewayBillData.validTo}
                  onChange={(e) => setEwayBillData({...ewayBillData, validTo: e.target.value})}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Part A - Transaction Details */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">PART-A: Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Details */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Sender (FROM)</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">GSTIN</label>
                    <input
                      type="text"
                      value={ewayBillData.sender.gstin}
                      onChange={(e) => handlePartyChange('sender', 'gstin', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Legal Name</label>
                    <input
                      type="text"
                      value={ewayBillData.sender.legalName}
                      onChange={(e) => handlePartyChange('sender', 'legalName', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Address</label>
                    <textarea
                      value={ewayBillData.sender.address}
                      onChange={(e) => handlePartyChange('sender', 'address', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">State</label>
                      <input
                        type="text"
                        value={ewayBillData.sender.state}
                        onChange={(e) => handlePartyChange('sender', 'state', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Pincode</label>
                      <input
                        type="text"
                        value={ewayBillData.sender.pincode}
                        onChange={(e) => handlePartyChange('sender', 'pincode', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">State Code</label>
                    <input
                      type="text"
                      value={ewayBillData.sender.stateCode}
                      onChange={(e) => handlePartyChange('sender', 'stateCode', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Receiver Details */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Receiver (TO)</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">GSTIN</label>
                    <input
                      type="text"
                      value={ewayBillData.receiver.gstin}
                      onChange={(e) => handlePartyChange('receiver', 'gstin', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Legal Name</label>
                    <input
                      type="text"
                      value={ewayBillData.receiver.legalName}
                      onChange={(e) => handlePartyChange('receiver', 'legalName', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Address</label>
                    <textarea
                      value={ewayBillData.receiver.address}
                      onChange={(e) => handlePartyChange('receiver', 'address', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      rows="2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">State</label>
                      <input
                        type="text"
                        value={ewayBillData.receiver.state}
                        onChange={(e) => handlePartyChange('receiver', 'state', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Pincode</label>
                      <input
                        type="text"
                        value={ewayBillData.receiver.pincode}
                        onChange={(e) => handlePartyChange('receiver', 'pincode', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">State Code</label>
                    <input
                      type="text"
                      value={ewayBillData.receiver.stateCode}
                      onChange={(e) => handlePartyChange('receiver', 'stateCode', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Part A - Goods Details */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">PART-A: Goods Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxable Value</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGST</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SGST</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IGST</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ewayBillData.goods.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.hsn}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.unit}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.taxableValue}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.cgstRate > 0 ? `${item.cgstRate}% (${item.cgstAmount})` : '0'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.sgstRate > 0 ? `${item.sgstRate}% (${item.sgstAmount})` : '0'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.igstRate > 0 ? `${item.igstRate}% (${item.igstAmount})` : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Part B - Transport Details */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">PART-B: Transport Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Transport Mode *</label>
                <select
                  value={ewayBillData.transportMode}
                  onChange={(e) => handleTransportChange('transportMode', e.target.value)}
                  className={`w-full px-3 py-1 border rounded text-sm ${errors.transportMode ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Mode</option>
                  <option value="Road">Road</option>
                  <option value="Rail">Rail</option>
                  <option value="Air">Air</option>
                  <option value="Ship">Ship</option>
                </select>
                {errors.transportMode && <p className="text-red-500 text-xs mt-1">{errors.transportMode}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Approx Distance (Km) *</label>
                <input
                  type="number"
                  value={ewayBillData.approxDistance}
                  onChange={(e) => handleTransportChange('approxDistance', e.target.value)}
                  className={`w-full px-3 py-1 border rounded text-sm ${errors.approxDistance ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.approxDistance && <p className="text-red-500 text-xs mt-1">{errors.approxDistance}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Transporter ID</label>
                <input
                  type="text"
                  value={ewayBillData.transporterId}
                  onChange={(e) => handleTransportChange('transporterId', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Transporter Name</label>
                <input
                  type="text"
                  value={ewayBillData.transporterName}
                  onChange={(e) => handleTransportChange('transporterName', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Document No</label>
                <input
                  type="text"
                  value={ewayBillData.transDocNo}
                  onChange={(e) => handleTransportChange('transDocNo', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Document Date</label>
                <input
                  type="date"
                  value={ewayBillData.transDocDate}
                  onChange={(e) => handleTransportChange('transDocDate', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Vehicle No *</label>
                <input
                  type="text"
                  value={ewayBillData.vehicleNo}
                  onChange={(e) => handleTransportChange('vehicleNo', e.target.value)}
                  className={`w-full px-3 py-1 border rounded text-sm ${errors.vehicleNo ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.vehicleNo && <p className="text-red-500 text-xs mt-1">{errors.vehicleNo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Vehicle Type *</label>
                <select
                  value={ewayBillData.vehicleType}
                  onChange={(e) => handleTransportChange('vehicleType', e.target.value)}
                  className={`w-full px-3 py-1 border rounded text-sm ${errors.vehicleType ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Type</option>
                  <option value="Regular">Regular</option>
                  <option value="Over Dimensional Cargo">Over Dimensional Cargo</option>
                </select>
                {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Place of Dispatch</label>
                <input
                  type="text"
                  value={ewayBillData.placeOfDispatch}
                  onChange={(e) => handleTransportChange('placeOfDispatch', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">State</label>
                <input
                  type="text"
                  value={ewayBillData.dispatchState}
                  onChange={(e) => handleTransportChange('dispatchState', e.target.value)}
                  className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Totals */}
          <div className="border border-gray-300 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Total Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Taxable Value</div>
                <div className="text-lg font-semibold">₹{ewayBillData.totalTaxableValue.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total CGST</div>
                <div className="text-lg font-semibold">₹{ewayBillData.totalCgst.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total SGST</div>
                <div className="text-lg font-semibold">₹{ewayBillData.totalSgst.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total IGST</div>
                <div className="text-lg font-semibold">₹{ewayBillData.totalIgst.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Invoice Value</div>
                <div className="text-lg font-bold text-blue-700">₹{ewayBillData.totalInvoiceValue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EWayBill;