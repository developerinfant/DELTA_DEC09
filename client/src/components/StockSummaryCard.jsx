import React from 'react';

const StockSummaryCard = ({ title, value, icon: Icon, bgColor, textColor, tooltip }) => {
  // Check if bgColor is a gradient class
  const isGradient = bgColor && bgColor.includes('gradient');
  
  return (
    <div 
      className="flex flex-col rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-200 hover:shadow-md h-full"
      title={tooltip}
    >
      <div className="flex items-center flex-grow">
        <div className={`p-3 rounded-lg ${bgColor} ${isGradient ? 'text-white' : textColor} mr-4 flex-shrink-0`}>
          <Icon className={`${isGradient ? 'text-white' : textColor}`} size={24} />
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-grow">
          <div className="text-sm font-medium text-gray-500 whitespace-nowrap truncate">{title}</div>
          <div 
            className={`text-2xl font-bold ${isGradient ? 'text-gray-900' : 'text-gray-900'} whitespace-nowrap overflow-hidden text-ellipsis`}
            style={{ minWidth: 0 }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSummaryCard;