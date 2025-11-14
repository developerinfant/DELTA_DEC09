import React, { useState } from 'react';
import Card from '../../components/common/Card';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import { FaBox, FaTruck, FaClipboardCheck, FaUser, FaCalendar, FaTag } from 'react-icons/fa';

const AppleStyleDemo = () => {
  const [sampleData] = useState([
    {
      id: 1,
      product: 'Premium T-Shirt',
      jobber: 'Alpha Textiles',
      materials: 3,
      quantity: 150,
      date: '2023-06-15',
      status: 'Available'
    },
    {
      id: 2,
      product: 'Designer Jeans',
      jobber: 'Beta Denim Co.',
      materials: 5,
      quantity: 85,
      date: '2023-06-18',
      status: 'In Progress'
    },
    {
      id: 3,
      product: 'Casual Hoodie',
      jobber: 'Gamma Wearables',
      materials: 4,
      quantity: 200,
      date: '2023-06-20',
      status: 'Available'
    },
    {
      id: 4,
      product: 'Formal Shirt',
      jobber: 'Delta Apparel',
      materials: 2,
      quantity: 120,
      date: '2023-06-22',
      status: 'Reserved'
    },
    {
      id: 5,
      product: 'Summer Dress',
      jobber: 'Epsilon Fashion',
      materials: 6,
      quantity: 95,
      date: '2023-06-25',
      status: 'Available'
    }
  ]);

  // Define columns for desktop table
  const tableColumns = [
    { key: 'product', header: 'Product' },
    { key: 'jobber', header: 'Jobber/Unit' },
    { key: 'materials', header: 'Materials Used' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'date', header: 'Date', render: (value) => new Date(value).toLocaleDateString() },
    { 
      key: 'status', 
      header: 'Status', 
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'Available' ? 'bg-green-100 text-green-800' : 
          value === 'Reserved' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  // Define fields for mobile card list
  const mobileFields = [
    { key: 'product', label: 'Product', isTitle: true },
    { key: 'jobber', label: 'Jobber/Unit' },
    { key: 'materials', label: 'Materials Used' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'date', label: 'Date', render: (value) => new Date(value).toLocaleDateString() },
    { 
      key: 'status', 
      label: 'Status', 
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'Available' ? 'bg-green-100 text-green-800' : 
          value === 'Reserved' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  // Handle item click (for viewing details)
  const handleItemClick = (item) => {
    alert(`Viewing details for: ${item.product}`);
  };

  return (
    <div className="space-y-6 page-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Apple-Style UI Demo</h1>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-indigo-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
              <FaBox size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Total Products</div>
              <div className="text-2xl font-bold text-gray-900">{sampleData.length}</div>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FaClipboardCheck size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Available Stock</div>
              <div className="text-2xl font-bold text-gray-900">
                {sampleData.filter(item => item.status === 'Available').length}
              </div>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
              <FaTruck size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">In Progress</div>
              <div className="text-2xl font-bold text-gray-900">
                {sampleData.filter(item => item.status === 'In Progress').length}
              </div>
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              <FaUser size={24} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Jobbers</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(sampleData.map(item => item.jobber)).size}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Responsive Table */}
      <ResponsiveTable
        data={sampleData}
        columns={tableColumns}
        mobileFields={mobileFields}
        itemKey="id"
        onItemClick={handleItemClick}
        tableTitle="Product Inventory"
      />
      
      {/* Additional Demo Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Glassmorphic Card">
          <p className="text-gray-600 mb-4">
            This is a glassmorphic card with soft shadows and rounded corners, 
            demonstrating the Apple-style design principles.
          </p>
          <div className="flex space-x-3">
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-outline">Outline Button</button>
          </div>
        </Card>
        
        <Card title="Form Elements">
          <div className="space-y-4">
            <div>
              <label className="form-label">Name</label>
              <input type="text" className="form-input" placeholder="Enter your name" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="Enter your email" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input">
                <option>Available</option>
                <option>In Progress</option>
                <option>Reserved</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AppleStyleDemo;