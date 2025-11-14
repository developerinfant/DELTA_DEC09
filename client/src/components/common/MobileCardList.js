import React from 'react';
import { FaChevronRight } from 'react-icons/fa';

/**
 * A reusable component for displaying data in a card-based layout on mobile devices.
 *
 * @param {object} props - The component props.
 * @param {Array} props.data - The data to be displayed in the card list.
 * @param {Function} props.onItemClick - Function to call when a card is clicked.
 * @param {Array} props.fields - Array of field configurations to display in each card.
 * @param {string} props.itemKey - The key to use for React list keys.
 * @returns {JSX.Element} The rendered CardList component.
 */
const MobileCardList = ({ data, onItemClick, fields, itemKey }) => {
  return (
    <div className="card-list">
      {data.map((item) => (
        <div 
          key={item[itemKey]} 
          className="card-item"
          onClick={() => onItemClick && onItemClick(item)}
        >
          <div className="card-item-header">
            <div className="card-item-title">
              {item[fields.find(f => f.isTitle)?.key] || 'Untitled'}
            </div>
            {onItemClick && (
              <FaChevronRight className="text-light-500" />
            )}
          </div>
          <div className="card-item-content">
            {fields.filter(f => !f.isTitle).map((field) => (
              <div key={field.key} className="card-item-field">
                <span className="card-item-label">{field.label}</span>
                <span className="card-item-value">
                  {field.render ? field.render(item[field.key]) : item[field.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileCardList;