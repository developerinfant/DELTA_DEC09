const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const FinishedGoodsDC = require('../models/FinishedGoodsDC');
const FGInvoice = require('../models/FGInvoice');
const Supplier = require('../models/Supplier');
const FGBuyer = require('../models/FGBuyer');
const PackingMaterial = require('../models/PackingMaterial');
const FinishedGood = require('../models/FinishedGood');

// Get document numbers by type
exports.getDocumentNumbers = async (req, res) => {
  try {
    console.log('Eway bill route hit with type:', req.params.type);
    const { type } = req.params;
    let documents = [];

    switch (type) {
      case 'pm-po':
        documents = await PurchaseOrder.find({ 'items.materialModel': 'PackingMaterial' }).select('poNumber createdAt');
        break;
      case 'pm-dc':
        // Get all GRNs first, then filter by material model
        const allGRNs = await GRN.find().select('grnNumber createdAt items.materialModel');
        documents = allGRNs.filter(grn => grn.items.some(item => item.materialModel === 'PackingMaterial'));
        break;
      case 'fg-dc':
        documents = await FinishedGoodsDC.find().select('dcNumber createdAt');
        break;
      case 'fg-invoice':
        documents = await FGInvoice.find().select('invoiceNumber createdAt');
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }

    // Fix the response format to match what the frontend expects
    const documentNumbers = documents.map(doc => ({
      id: doc._id,
      number: type === 'pm-po' ? doc.poNumber : 
              type === 'pm-dc' ? doc.grnNumber : 
              type === 'fg-dc' ? doc.dcNumber : 
              doc.invoiceNumber,
      date: doc.createdAt
    }));

    res.json(documentNumbers);
  } catch (error) {
    console.error('Error fetching document numbers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get document data by type and number
exports.getDocumentData = async (req, res) => {
  try {
    console.log('Eway bill data route hit with type:', req.params.type, 'and number:', req.params.number);
    const { type, number } = req.params;
    let documentData = {};

    switch (type) {
      case 'pm-po': {
        const po = await PurchaseOrder.findOne({ poNumber: number, 'items.materialModel': 'PackingMaterial' })
          .populate('supplier', 'companyName gstin address state city pincode')
          .populate('items.material', 'name hsnCode');
        
        if (!po) {
          return res.status(404).json({ message: 'Purchase Order not found' });
        }

        documentData = {
          type: 'pm-po',
          docNo: po.poNumber,
          docDate: po.createdAt.toISOString().split('T')[0],
          supplier: {
            name: po.supplier ? po.supplier.companyName : 'N/A',
            gstin: po.supplier ? po.supplier.gstin : '',
            address: po.supplier ? `${po.supplier.address}, ${po.supplier.city}, ${po.supplier.state}` : '',
            state: po.supplier ? po.supplier.state : '',
            pincode: po.supplier ? po.supplier.pincode : '',
            stateCode: po.supplier ? getStateCode(po.supplier.state) : ''
          },
          company: {
            name: 'Delta TV Pvt Ltd',
            gstin: '27XYZABCDE1234P',
            address: 'Corporate Office, Mumbai, Maharashtra',
            state: 'Maharashtra',
            pincode: '400001',
            stateCode: '27'
          },
          items: po.items.map(item => ({
            name: item.material ? item.material.name : 'Unknown',
            hsn: item.material ? item.material.hsnCode : '',
            qty: item.quantity,
            uom: 'Pieces',
            taxableValue: item.totalAmount,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: item.totalAmount * 0.09,
            sgstAmount: item.totalAmount * 0.09,
            igstAmount: 0
          }))
        };
        break;
      }

      case 'pm-dc': {
        const grn = await GRN.findOne({ grnNumber: number })
          .populate('supplier', 'companyName gstin address state city pincode')
          .populate('items.material');
        
        // Check if GRN exists first
        if (!grn) {
          return res.status(404).json({ message: 'GRN not found' });
        }
        
        // Verify this GRN has packing materials
        if (!grn.items.some(item => item.materialModel === 'PackingMaterial')) {
          return res.status(404).json({ message: 'Packing Material GRN not found' });
        }

        documentData = {
          type: 'pm-dc',
          docNo: grn.grnNumber,
          docDate: grn.createdAt.toISOString().split('T')[0],
          issuingUnit: {
            name: 'Delta TV - Factory',
            gstin: '27XYZABCDE1234P',
            address: 'Factory Road, Pune, Maharashtra',
            state: 'Maharashtra',
            pincode: '411002',
            stateCode: '27'
          },
          jobber: {
            name: grn.supplier ? grn.supplier.companyName : 'N/A',
            gstin: grn.supplier ? grn.supplier.gstin : '',
            address: grn.supplier ? `${grn.supplier.address}, ${grn.supplier.city}, ${grn.supplier.state}` : '',
            state: grn.supplier ? grn.supplier.state : '',
            pincode: grn.supplier ? grn.supplier.pincode : '',
            stateCode: grn.supplier ? getStateCode(grn.supplier.state) : ''
          },
          items: grn.items
            .filter(item => item.materialModel === 'PackingMaterial')
            .map(item => ({
              name: typeof item.material === 'string' ? item.material : (item.material ? item.material.name : 'Unknown'),
              qty: item.receivedQuantity,
              uom: 'Kgs',
              taxableValue: 0
            }))
        };
        break;
      }

      case 'fg-dc': {
        const dc = await FinishedGoodsDC.findOne({ dcNumber: number })
          .populate('buyer', 'companyName gstin address state city pincode')
          .populate('items.product', 'name hsnCode');
        
        if (!dc) {
          return res.status(404).json({ message: 'Delivery Challan not found' });
        }

        documentData = {
          type: 'fg-dc',
          docNo: dc.dcNumber,
          docDate: dc.createdAt.toISOString().split('T')[0],
          dispatchingUnit: {
            name: 'Delta TV - Warehouse',
            gstin: '27XYZABCDE1234P',
            address: 'Warehouse Complex, Pune, Maharashtra',
            state: 'Maharashtra',
            pincode: '411003',
            stateCode: '27'
          },
          receiver: {
            name: dc.buyer ? dc.buyer.companyName : 'N/A',
            gstin: dc.buyer ? dc.buyer.gstin : '',
            address: dc.buyer ? `${dc.buyer.address}, ${dc.buyer.city}, ${dc.buyer.state}` : '',
            state: dc.buyer ? dc.buyer.state : '',
            pincode: dc.buyer ? dc.buyer.pincode : '',
            stateCode: dc.buyer ? getStateCode(dc.buyer.state) : ''
          },
          items: dc.items.map(item => ({
            name: item.product ? item.product.name : 'Unknown',
            hsn: item.product ? (item.product.hsnCode || '') : '',
            qty: item.cartons,
            uom: 'Cartons',
            taxableValue: 0
          }))
        };
        break;
      }

      case 'fg-invoice': {
        const invoice = await FGInvoice.findOne({ invoiceNumber: number })
          .populate('buyer', 'companyName gstin address state city pincode')
          .populate('items.product', 'name hsnCode');
        
        if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
        }

        documentData = {
          type: 'fg-invoice',
          docNo: invoice.invoiceNumber,
          docDate: invoice.createdAt.toISOString().split('T')[0],
          billedFrom: {
            name: 'Delta TV Pvt Ltd',
            gstin: '27XYZABCDE1234P',
            address: 'Corporate Office, Mumbai, Maharashtra',
            state: 'Maharashtra',
            pincode: '400001',
            stateCode: '27'
          },
          billedTo: {
            name: invoice.buyer ? invoice.buyer.companyName : 'N/A',
            gstin: invoice.buyer ? invoice.buyer.gstin : '',
            address: invoice.buyer ? `${invoice.buyer.address}, ${invoice.buyer.city}, ${invoice.buyer.state}` : '',
            state: invoice.buyer ? invoice.buyer.state : '',
            pincode: invoice.buyer ? invoice.buyer.pincode : '',
            stateCode: invoice.buyer ? getStateCode(invoice.buyer.state) : ''
          },
          items: invoice.items.map(item => ({
            name: item.product ? item.product.name : 'Unknown',
            hsn: item.product ? item.product.hsnCode : '',
            qty: item.quantity,
            uom: 'Pieces',
            taxableValue: item.amount,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
            cgstAmount: item.cgstAmount,
            sgstAmount: item.sgstAmount,
            igstAmount: item.igstAmount
          }))
        };
        break;
      }

      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }

    res.json(documentData);
  } catch (error) {
    console.error('Error fetching document data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to get state code
const getStateCode = (state) => {
  const stateCodes = {
    'Andhra Pradesh': '37',
    'Arunachal Pradesh': '12',
    'Assam': '18',
    'Bihar': '10',
    'Chhattisgarh': '22',
    'Goa': '30',
    'Gujarat': '24',
    'Haryana': '06',
    'Himachal Pradesh': '02',
    'Jharkhand': '20',
    'Karnataka': '29',
    'Kerala': '32',
    'Madhya Pradesh': '23',
    'Maharashtra': '27',
    'Manipur': '14',
    'Meghalaya': '17',
    'Mizoram': '15',
    'Nagaland': '13',
    'Odisha': '21',
    'Punjab': '03',
    'Rajasthan': '08',
    'Sikkim': '11',
    'Tamil Nadu': '33',
    'Telangana': '36',
    'Tripura': '16',
    'Uttar Pradesh': '09',
    'Uttarakhand': '05',
    'West Bengal': '19',
    'Andaman and Nicobar Islands': '35',
    'Chandigarh': '04',
    'Dadra and Nagar Haveli and Daman and Diu': '26',
    'Lakshadweep': '31',
    'Delhi': '07',
    'Puducherry': '34',
    'Jammu and Kashmir': '01',
    'Ladakh': '38'
  };

  return stateCodes[state] || '00';
};