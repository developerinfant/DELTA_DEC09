import React from 'react';

/**
 * A reusable Card component for displaying content in a styled container.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The content to be displayed inside the card.
 * @param {string} [props.title] - An optional title to display at the top of the card.
 * @param {string} [props.className] - Optional additional CSS classes to apply to the card.
 * @param {boolean} [props.withShadow] - Whether to apply shadow to the card.
 * @param {string} [props.padding] - Padding class for the card content.
 * @returns {JSX.Element} The rendered Card component.
 */
const Card = ({ 
  children, 
  title, 
  className = '', 
  withShadow = true, 
  padding = 'p-6' 
}) => {
    // Determine shadow classes with enhanced styling - Apple Style
    const shadowClass = withShadow 
        ? 'soft-shadow-hover' 
        : 'border border-light-200/50';
    
    return (
        // The main card container with base styles. Any additional classes from the `className` prop are added here.
        <div className={`bg-white rounded-[var(--radius-lg)] ${shadowClass} ${padding} ${className} transition-all duration-300 glass-container`}>
            
            {/* Conditionally render a title if one is provided */}
            {title && (
                <h2 className="text-2xl font-bold text-dark-800 mb-6 pb-3 border-b border-light-200 bg-gradient-to-r from-primary-600/10 to-secondary-600/10 px-2 rounded-t-[var(--radius-lg)]">
                    {title}
                </h2>
            )}

            {/* Render the content passed into the component */}
            <div>
                {children}
            </div>
        </div>
    );
};

export default Card;