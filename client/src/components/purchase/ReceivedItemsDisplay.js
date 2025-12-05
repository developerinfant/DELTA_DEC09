import React from 'react';

const ReceivedItemsDisplay = ({ items }) => {
    // Helper function to determine if an item is fully received
    const isItemFullyReceived = (item) => {
        // Use the exact formulas specified
        const previousReceived = item.previousReceived || 0;
        const receivedQty = item.receivedQuantity || 0;
        const totalReceived = previousReceived + receivedQty;
        const orderedQty = item.orderedQuantity || 0;
        const pending = orderedQty - totalReceived;
        
        // Check if extra quantities are also fully received
        const extraAllowed = item.extraAllowedQty || 0;
        const previousExtraReceived = item.previousExtraReceived || 0;
        const extraReceivedQty = item.extraReceivedQty || 0;
        const totalExtraReceived = previousExtraReceived + extraReceivedQty;
        const extraPending = extraAllowed - totalExtraReceived;
        
        return pending === 0 && extraPending === 0;
    };

    return (
        <div className="space-y-4">
            {items && items.length > 0 ? (
                items.map((item, index) => {
                    // Use the exact formulas specified
                    const orderedQty = item.orderedQuantity || 0;
                    const previousReceived = item.previousReceived || 0;
                    const receivedQty = item.receivedQuantity || 0;
                    const totalReceived = previousReceived + receivedQty;
                    const pending = orderedQty - totalReceived;
                    
                    // Extra quantity values from GRN item
                    const extraAllowed = item.extraAllowedQty || 0;
                    const previousExtraReceived = item.previousExtraReceived || 0;
                    const extraReceivedQty = item.extraReceivedQty || 0;
                    const totalExtraReceived = previousExtraReceived + extraReceivedQty;
                    const extraPending = extraAllowed - totalExtraReceived;
                    
                    const isFullyReceived = isItemFullyReceived(item);

                    return (
                        <div key={item._id || index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-dark-700">
                                        {item.material?.name || item.material || 'Unknown Material'}
                                    </h4>
                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                        {item.materialModel?.replace('Material', '') || 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-2 text-center bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Ordered Qty</p>
                                        <p className="font-bold text-lg">{orderedQty}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-yellow-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Previous Received</p>
                                        <p className="font-bold text-lg">{previousReceived}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-green-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Recent Received Qty</p>
                                        <p className="font-bold text-lg">{receivedQty}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Total Received</p>
                                        <p className="font-bold text-lg">{totalReceived}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-orange-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Pending</p>
                                        <p className="font-bold text-lg">{pending}</p>
                                    </div>
                                </div>
                                
                                {/* Extra quantity fields */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                                    <div className="md:col-span-2 text-center bg-purple-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Extra Allowed</p>
                                        <p className="font-bold text-lg">{extraAllowed}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-yellow-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Extra Previous</p>
                                        <p className="font-bold text-lg">{previousExtraReceived}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-indigo-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Extra Received</p>
                                        <p className="font-bold text-lg">{extraReceivedQty}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-purple-100 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Total Extra Received</p>
                                        <p className="font-bold text-lg">{totalExtraReceived}</p>
                                    </div>
                                    <div className="md:col-span-2 text-center bg-orange-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">Extra Pending</p>
                                        <p className="font-bold text-lg">{extraPending}</p>
                                    </div>
                                </div>
                                
                                {/* If fully received, show a green banner */}
                                {isFullyReceived && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700">
                                        <strong>✓ This item has been fully received</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-lg">No items found</p>
                </div>
            )}
        </div>
    );
};

export default ReceivedItemsDisplay;