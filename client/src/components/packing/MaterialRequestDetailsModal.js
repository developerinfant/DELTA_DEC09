import React from 'react';
import Modal from '../common/Modal';

const MaterialRequestDetailsModal = ({ isOpen, onClose, request }) => {
  if (!request) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Material Request Details">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Request Information</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Request ID</label>
                <p className="mt-1 text-sm text-gray-900">{request.requestId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Product Name</label>
                <p className="mt-1 text-sm text-gray-900">{request.productName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Required Quantity</label>
                <p className="mt-1 text-sm text-gray-900">{request.requiredQty}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    request.priority === 'High' ? 'bg-red-100 text-red-800' : 
                    request.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.priority}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Request Status</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                    request.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 
                    request.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Requested By</label>
                <p className="mt-1 text-sm text-gray-900">{request.requester}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(request.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Remarks</h4>
          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
            {request.remarks || 'No remarks provided'}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default MaterialRequestDetailsModal;