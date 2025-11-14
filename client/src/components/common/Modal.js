import React from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';

/**
 * A reusable Modal component that uses a React Portal.
 *
 * @param {object} props The component props.
 * @param {boolean} props.isOpen Controls if the modal is visible.
 * @param {function} props.onClose Function to call when the modal should be closed.
 * @param {string} props.title The title to display in the modal header.
 * @param {React.ReactNode} props.children The content to display in the modal body.
 * @returns {JSX.Element|null} The rendered Modal component or null.
 */
const Modal = ({ isOpen, onClose, title, children }) => {
    // If the modal is not open, render nothing.
    if (!isOpen) return null;

    // Use ReactDOM.createPortal to render the modal into the 'modal-root' div
    return ReactDOM.createPortal(
        <>
            {/* Modal Overlay: covers the entire screen */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-center items-center modal-backdrop animate-fadeIn p-4"
                onClick={onClose} // Close modal when clicking on the overlay
            >
                {/* Modal Content Panel - Apple Style */}
                <div
                    className="bg-white rounded-[var(--radius-lg)] w-full max-w-6xl mx-auto z-50 transform transition-all duration-300 scale-95 animate-in fade-in zoom-in border border-light-200/50 modal-content"
                    onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
                >
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-6 border-b border-light-200 modal-header rounded-t-[var(--radius-lg)]">
                        <h3 className="text-2xl font-bold text-dark-800 modal-title">{title}</h3>
                        <button 
                            onClick={onClose} 
                            className="text-light-500 hover:text-dark-700 transition-colors rounded-full p-2 hover:bg-light-200"
                            aria-label="Close modal"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 modal-body max-h-[75vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        </>,
        document.getElementById('modal-root')
    );
};

export default Modal;