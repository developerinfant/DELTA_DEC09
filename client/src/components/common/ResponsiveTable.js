import React, { useState } from 'react';
import MobileCardList from './MobileCardList';
import Pagination from './Pagination';

/**
 * A responsive table component that switches between table and card views based on screen size.
 *
 * @param {object} props - The component props.
 * @param {Array} props.data - The data to be displayed.
 * @param {Array} props.columns - Array of column definitions for the table.
 * @param {Array} props.mobileFields - Array of field definitions for the mobile card view.
 * @param {string} props.itemKey - The key to use for React list keys.
 * @param {Function} props.onItemClick - Function to call when an item is clicked.
 * @param {number} props.itemsPerPage - Number of items to display per page.
 * @param {string} [props.tableTitle] - Optional title for the table/card container.
 * @returns {JSX.Element} The rendered ResponsiveTable component.
 */
const ResponsiveTable = ({ 
  data, 
  columns, 
  mobileFields, 
  itemKey, 
  onItemClick, 
  itemsPerPage = 10,
  tableTitle = ''
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Get current items for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="table-container">
          {tableTitle && (
            <div className="px-6 py-4 border-b border-light-200">
              <h3 className="text-lg font-semibold text-dark-800">{tableTitle}</h3>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-zebra">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column, index) => (
                    <th 
                      key={index} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((item, rowIndex) => (
                    <tr 
                      key={item[itemKey]} 
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      {columns.map((column, colIndex) => (
                        <td 
                          key={colIndex} 
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {column.render ? column.render(item[column.key], item) : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      colSpan={columns.length} 
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for desktop */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
        </div>
      </div>
      
      {/* Mobile Card List View */}
      <div className="md:hidden">
        <div className="card glass-container">
          {tableTitle && (
            <div className="px-4 py-3 border-b border-light-200">
              <h3 className="text-lg font-semibold text-dark-800">{tableTitle}</h3>
            </div>
          )}
          <div className="p-4">
            <div className="sticky-filter-bar">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Items</h3>
                <span className="text-sm text-gray-500">{data.length} total</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2 form-input"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <MobileCardList 
              data={currentItems}
              onItemClick={onItemClick}
              fields={mobileFields}
              itemKey={itemKey}
            />
            
            {/* Pagination for mobile */}
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;