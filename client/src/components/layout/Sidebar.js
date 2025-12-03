import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    FaBoxOpen,
    FaChartPie,
    FaSignOutAlt,
    FaUserPlus,
    FaWarehouse,
    FaAngleDown,
    FaAngleRight,
    FaFileAlt,
    FaTruck,
    FaBell,
    FaShoppingCart,
    FaUsersCog,
    FaClipboardCheck,
    FaBox,
    FaCog,
    FaChartBar,
    FaClipboardList,
    FaBars,
    FaTimes,
    FaMobileAlt,
    FaHome,
    FaFileInvoice,
    FaUsers,
    FaExclamationTriangle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hasAnyPermissionInModule, hasModuleAccess, isModuleVisible } from '../../utils/permissions';
import Modal from '../common/Modal'; // Import the Modal component
import logo from '../../assets/logo.png';

const Sidebar = ({ isOpen, packingAlertsCount = 0, rawAlertsCount = 0, toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const userRole = user?.role;
    const [isPackingOpen, setIsPackingOpen] = useState(false);
    const [isStockOpen, setIsStockOpen] = useState(false);
    const [isProductOpen, setIsProductOpen] = useState(false);
    const [isFinishedGoodsOpen, setIsFinishedGoodsOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // State for logout confirmation modal
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const openLogoutModal = () => {
        setIsLogoutModalOpen(true);
    };

    const closeLogoutModal = () => {
        setIsLogoutModalOpen(false);
    };

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Close mobile menu
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    // Updated link classes with modern styling using new theme colors - Apple Style
    const baseLinkClass = "flex items-center px-4 py-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-sm";
    const activeLinkClass = "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg";
    const subLinkClass = "flex items-center px-4 py-2.5 rounded-lg text-sm text-dark-700 hover:bg-light-200 transition-all duration-200";
    
    // Mobile link classes
    const mobileLinkClass = "flex items-center px-4 py-4 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-300 ease-in-out";
    const mobileSubLinkClass = "flex items-center px-4 py-3 rounded-lg text-sm text-dark-700 hover:bg-light-200 transition-all duration-200";

    const NavIcon = ({ icon: IconComponent }) => {
        return <IconComponent size={20} className="text-inherit" />;
    };

    // Alert badge component for better visual indication
    const AlertBadge = ({ count }) => {
        if (count <= 0) return null;
        return (
            <span className="ml-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger-500 rounded-full">
                {count > 9 ? '9+' : count}
            </span>
        );
    };

    // Define module structure for permission checking
    const moduleStructure = {
        packing: [
            'view-materials',
            'outgoing-materials',
            'stock-alerts',
            'view-packing-pos',
            'manage-packing-suppliers',
            'view-packing-grns'
        ],
        'finished-goods': [
            'view-fg-grns',
            'view-fg-dcs',
            'view-fg-invoices',
            'view-fg-buyers'
        ],
        stock: [
            'view-raw-materials',
            'jobber-unit',
            'outgoing-raw-materials',
            'raw-stock-alerts',
            'view-stock-pos',
            'manage-stock-suppliers',
            'view-stock-grns'
        ],
        product: [
            'product-details',
            'product-dc'
        ]
    };

    // Check if a module should be visible based on user permissions
    const isModuleVisibleForUser = (moduleId) => {
        // Admins can see all modules
        if (userRole === 'Admin') return true;
        
        // For managers, check if the module should be visible
        return isModuleVisible(user, moduleId);
    };

    // Check if a module section should be visible based on user permissions
    const isModuleSectionVisible = (sectionKey) => {
        // Admins can see all modules
        if (userRole === 'Admin') return true;
        
        // For managers, check if they have access to any submodule in this section
        return hasModuleAccess(user, moduleStructure[sectionKey]);
    };

    return (
        <>
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={closeMobileMenu}></div>
            )}

            {/* Mobile menu button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={toggleMobileMenu}
                    className="p-2 rounded-lg bg-white shadow-md text-dark-700 hover:bg-light-200 transition-all duration-200 glass-container"
                >
                    {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </button>
            </div>

            {/* Mobile slide-out menu - Apple Style */}
            <div 
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-light-100 to-light-200 flex flex-col transition-all duration-300 ease-in-out shadow-xl transform lg:hidden glass-container rounded-r-[var(--radius-lg)] ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-4 flex items-center justify-between h-20 border-b border-light-300">
                    <img src={logo} alt="Delta Logo" className="h-12" />
                    <button
                        onClick={closeMobileMenu}
                        className="p-2 rounded-lg text-dark-700 hover:bg-light-200 transition-all duration-200"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `${mobileLinkClass} ${isActive ? activeLinkClass : ''}`}
                        onClick={closeMobileMenu}
                    >
                        <NavIcon icon={FaHome} />
                        <span className="ml-4 font-semibold">Dashboard</span>
                    </NavLink>

                    {/* Packing Materials Collapsible Menu */}
                    {isModuleSectionVisible('packing') && (
                        <div className="pt-4">
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBoxOpen size={20} className="text-primary-500"/>
                                    <span className="ml-4 font-semibold">Packing Materials</span>
                                </div>
                                {isPackingOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />}
                            </button>
                            {isPackingOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {/* Group 1: Stock Alert, Stock Report */}
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <li>
                                            <NavLink to="/materials/alerts" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaExclamationTriangle className="mr-3" />Stock Alert
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <li>
                                            <NavLink to="/materials/report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaChartBar className="mr-3" />Stock Report
                                            </NavLink>
                                        </li>
                                    )}
                                    
                                    {/* Divider 1 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {/* Group 2: Purchase Order, GRN, Delivery Challan */}
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <li>
                                            <NavLink to="/materials/purchase" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaShoppingCart className="mr-3" />Purchase Order
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <li>
                                            <NavLink to="/packing/grn" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaClipboardCheck className="mr-3" />GRN
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <li>
                                            <NavLink to="/materials/dc" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    
                                    {/* Divider 2 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {/* Group 3: Master Supplier, Item Master */}
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <li>
                                            <NavLink to="/packing/suppliers" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaUsersCog className="mr-3" />Supplier Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <li>
                                            <NavLink to="/materials" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaFileAlt className="mr-3" />Item Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {/* Damaged Stock Report - Only one instance */}
                                    <li>
                                        <NavLink to="/packing/damaged-stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`} onClick={closeMobileMenu}>
                                            <FaExclamationTriangle className="mr-3" />Damaged Stock Report
                                        </NavLink>
                                    </li>

                                </ul>
                            )}
                        </div>
                    )}

                    {/* Finished Goods Collapsible Menu */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBox size={20} className="text-accent-500"/>
                                    <span className="ml-4 font-semibold">Finished Goods</span>
                                </div>
                                {isFinishedGoodsOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />}
                            </button>
                            {isFinishedGoodsOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    <li>
                                        <NavLink to="/fg/stock-alert" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                            <FaExclamationTriangle className="mr-3" />Stock Alert
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/fg/stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                            <FaChartBar className="mr-3" />Stock Report
                                        </NavLink>
                                    </li>
                                    
                                    {/* Divider 1 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <li>
                                            <NavLink to="/fg/grn" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaClipboardCheck className="mr-3" />GRN (DC-based)
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <li>
                                            <NavLink to="/fg/delivery-challan" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    
                                    {/* Divider 2 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <li>
                                            <NavLink to="/fg/invoice" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaFileInvoice className="mr-3" />Invoice
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <li>
                                            <NavLink to="/fg/buyer-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaUsers className="mr-3" />Buyer Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <li>
                                            <NavLink to="/fg/driver-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaUsers className="mr-3" />Driver Master
                                            </NavLink>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Stock Maintenance Collapsible Menu */}
                    {isModuleSectionVisible('stock') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsStockOpen(!isStockOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaWarehouse size={20} className="text-secondary-500"/>
                                    <span className="ml-4 font-semibold">Stock Maintenance</span>
                                </div>
                                {isStockOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />}
                            </button>
                            {isStockOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {isModuleVisibleForUser('view-raw-materials') && (
                                        <li>
                                            <NavLink to="/stock/raw-materials" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaFileAlt className="mr-3" />RAW Materials
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('jobber-unit') && (
                                        <li>
                                            <NavLink to="/stock/jobber-unit" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaTruck className="mr-3" />Worker Unit
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('outgoing-raw-materials') && (
                                        <li>
                                            <NavLink to="/stock/outgoing-raw-materials" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('raw-stock-alerts') && (
                                        <li>
                                            <NavLink to="/stock/raw-material-alerts" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <div className="flex items-center">
                                                    <FaBell className="mr-3" />Stock Alerts
                                                    <AlertBadge count={rawAlertsCount} />
                                                </div>
                                            </NavLink>
                                        </li>
                                    )}
                                    {/* Add Finishing Goods link */}
                                    <li>
                                        <NavLink to="/stock/finishing-goods" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                            <FaClipboardCheck className="mr-3" />Finishing Goods
                                            {/* Note: This is a special case that might need its own permission */}
                                        </NavLink>
                                    </li>
                                    {/* New Stock Maintenance PO, Suppliers, and GRNs links */}
                                    {isModuleVisibleForUser('view-stock-pos') && (
                                        <li>
                                            <NavLink to="/stock/maintenance/purchase-orders" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaShoppingCart className="mr-3" />View POs
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('manage-stock-suppliers') && (
                                        <li>
                                            <NavLink to="/stock/maintenance/suppliers" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaUsersCog className="mr-3" />Supplier Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-stock-grns') && (
                                        <li>
                                            <NavLink to="/stock/grn" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaClipboardCheck className="mr-3" />GRN
                                            </NavLink>
                                        </li>
                                    )}

                                </ul>
                            )}
                        </div>
                    )}

                    {/* Product Management Collapsible Menu */}
                    {isModuleSectionVisible('product') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsProductOpen(!isProductOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBox size={20} className="text-accent-500"/>
                                    <span className="ml-4 font-semibold">Product Management</span>
                                </div>
                                {isProductOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />}
                            </button>
                            {isProductOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {isModuleVisibleForUser('product-details') && (
                                        <li>
                                            <NavLink to="/products/details" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaClipboardList className="mr-3" />Product Details
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('product-dc') && (
                                        <li>
                                            <NavLink to="/products/dc" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`} onClick={closeMobileMenu}>
                                                <FaTruck className="mr-3" />Product DC
                                            </NavLink>
                                        </li>
                                    )}

                                </ul>
                            )}
                        </div>
                    )}
                    
                    {/* Admin Only Links */}
                    {userRole === 'Admin' && (
                        <>
                            <div className="pt-2">
                                <NavLink to="/admin/managers/create" className={({ isActive }) => `${mobileLinkClass} ${isActive ? activeLinkClass : ''}`} onClick={closeMobileMenu}>
                                    <NavIcon icon={FaUserPlus} />
                                    <span className="ml-4 font-semibold">Create Manager</span>
                                </NavLink>
                            </div>
                            <div className="pt-2">
                                <NavLink to="/admin/settings" className={({ isActive }) => `${mobileLinkClass} ${isActive ? activeLinkClass : ''}`} onClick={closeMobileMenu}>
                                    <NavIcon icon={FaCog} />
                                    <span className="ml-4 font-semibold">Settings</span>
                                </NavLink>
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-light-300">
                    <button 
                        onClick={() => {
                            openLogoutModal();
                            closeMobileMenu();
                        }}
                        className="flex items-center w-full px-4 py-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                    >
                        <FaSignOutAlt size={20} />
                        <span className="ml-4 font-semibold">Logout</span>
                        <span className="ml-auto transform transition-transform duration-200 group-hover:rotate-6">
                            <FaAngleRight />
                        </span>
                    </button>
                </div>
            </div>

            {/* Desktop sidebar - only shown on large screens - Apple Style */}
            <aside className={`bg-gradient-to-b from-light-100 to-light-200 flex flex-col transition-all duration-300 ease-in-out shadow-xl hidden lg:flex glass-container rounded-r-[var(--radius-lg)] rounded-l-none ${isOpen ? 'w-64' : 'w-20'}`}>
                <div className="p-4 flex items-center justify-center h-20 border-b border-light-300">
                    <img src={logo} alt="Delta Logo" className={`transition-all duration-300 ${isOpen ? 'h-16' : 'h-12'}`} />
                </div>

                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                    >
                        <NavIcon icon={FaChartPie} />
                        {isOpen && <span className="ml-4 font-semibold">Dashboard</span>}
                    </NavLink>

                    {/* Packing Materials Collapsible Menu */}
                    {isModuleSectionVisible('packing') && (
                        <div className="pt-4">
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBoxOpen size={20} className="text-primary-500"/>
                                    {isOpen && <span className="ml-4 font-semibold">Packing Materials</span>}
                                </div>
                                {isOpen && (isPackingOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />)}
                            </button>
                            {isPackingOpen && isOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {/* Group 1: Stock Alert, Stock Report */}
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <li>
                                            <NavLink to="/materials/alerts" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <div className="flex items-center">
                                                    <FaBell className="mr-3" />Stock Alert
                                                    <AlertBadge count={packingAlertsCount} />
                                                </div>
                                            </NavLink>
                                        </li>
                                    )}
                                    <li>
                                        <NavLink to="/packing/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                            <FaChartBar className="mr-3" />Stock Report
                                        </NavLink>
                                    </li>
                                    
                                    {/* Divider 1 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {/* Group 2: Purchase Order, GRN, Delivery Challan */}
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <li>
                                            <NavLink to="/packing/purchase-orders" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <FaShoppingCart className="mr-3" />Purchase Order
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <li>
                                            <NavLink to="/packing/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <FaClipboardCheck className="mr-3" />GRN
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <li>
                                            <NavLink to="/materials/outgoing" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    
                                    {/* Divider 2 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {/* Group 3: Master Supplier, Item Master */}
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <li>
                                            <NavLink to="/packing/suppliers" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <FaUsersCog className="mr-3" />Supplier Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <li>
                                            <NavLink to="/materials" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                                <FaFileAlt className="mr-3" />Item Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {/* Damaged Stock Report - Only one instance */}
                                    <li>
                                        <NavLink to="/packing/damaged-stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-primary-600' : ''}`}>
                                            <FaExclamationTriangle className="mr-3" />Damaged Stock Report
                                        </NavLink>
                                    </li>

                                </ul>
                            )}
                        </div>
                    )}

                    {/* Finished Goods Collapsible Menu */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBox size={20} className="text-accent-500"/>
                                    {isOpen && <span className="ml-4 font-semibold">Finished Goods</span>}
                                </div>
                                {isOpen && (isFinishedGoodsOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />)}
                            </button>
                            {isFinishedGoodsOpen && isOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    <li>
                                        <NavLink to="/fg/stock-alert" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                            <FaExclamationTriangle className="mr-3" />Stock Alert
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/fg/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                            <FaChartBar className="mr-3" />Stock Report
                                        </NavLink>
                                    </li>
                                    
                                    {/* Divider 1 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <li>
                                            <NavLink to="/fg/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaClipboardCheck className="mr-3" />GRN (DC-based)
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <li>
                                            <NavLink to="/fg/delivery-challan/create" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    
                                    {/* Divider 2 */}
                                    <div className="border-t border-light-400 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <li>
                                            <NavLink to="/fg/invoice" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaFileInvoice className="mr-3" />Invoice
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <li>
                                            <NavLink to="/fg/buyer-master" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaUsers className="mr-3" />Buyer Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <li>
                                            <NavLink to="/fg/driver-master" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaUsers className="mr-3" />Driver Master
                                            </NavLink>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Stock Maintenance Collapsible Menu */}
                    {isModuleSectionVisible('stock') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsStockOpen(!isStockOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaWarehouse size={20} className="text-secondary-500"/>
                                    {isOpen && <span className="ml-4 font-semibold">Stock Maintenance</span>}
                                </div>
                                {isOpen && (isStockOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />)}
                            </button>
                            {isStockOpen && isOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {isModuleVisibleForUser('view-raw-materials') && (
                                        <li>
                                            <NavLink to="/stock/raw-materials" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaFileAlt className="mr-3" />RAW Materials
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('jobber-unit') && (
                                        <li>
                                            <NavLink to="/stock/jobber-unit" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaTruck className="mr-3" />Worker Unit
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('outgoing-raw-materials') && (
                                        <li>
                                            <NavLink to="/stock/outgoing-raw-materials" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaTruck className="mr-3" />Delivery Challan
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('raw-stock-alerts') && (
                                        <li>
                                            <NavLink to="/stock/raw-material-alerts" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <div className="flex items-center">
                                                    <FaBell className="mr-3" />Stock Alerts
                                                    <AlertBadge count={rawAlertsCount} />
                                                </div>
                                            </NavLink>
                                        </li>
                                    )}
                                    {/* Add Finishing Goods link */}
                                    <li>
                                        <NavLink to="/stock/finishing-goods" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                            <FaClipboardCheck className="mr-3" />Finishing Goods
                                            {/* Note: This is a special case that might need its own permission */}
                                        </NavLink>
                                    </li>
                                    {/* New Stock Maintenance PO, Suppliers, and GRNs links */}
                                    {isModuleVisibleForUser('view-stock-pos') && (
                                        <li>
                                            <NavLink to="/stock/maintenance/purchase-orders" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaShoppingCart className="mr-3" />View POs
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('manage-stock-suppliers') && (
                                        <li>
                                            <NavLink to="/stock/maintenance/suppliers" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaUsersCog className="mr-3" />Supplier Master
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('view-stock-grns') && (
                                        <li>
                                            <NavLink to="/stock/grn" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-secondary-600' : ''}`}>
                                                <FaClipboardCheck className="mr-3" />GRN
                                            </NavLink>
                                        </li>
                                    )}

                                </ul>
                            )}
                        </div>
                    )}

                    {/* Product Management Collapsible Menu */}
                    {isModuleSectionVisible('product') && (
                        <div className="pt-2">
                            <button
                                onClick={() => setIsProductOpen(!isProductOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                            >
                                <div className="flex items-center">
                                    <FaBox size={20} className="text-accent-500"/>
                                    {isOpen && <span className="ml-4 font-semibold">Product Management</span>}
                                </div>
                                {isOpen && (isProductOpen ? <FaAngleDown className="transition-transform duration-200 group-hover:rotate-180" /> : <FaAngleRight />)}
                            </button>
                            {isProductOpen && isOpen && (
                                <ul className="pl-6 mt-2 space-y-1 animate-fadeIn">
                                    {isModuleVisibleForUser('product-details') && (
                                        <li>
                                            <NavLink to="/products/details" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaClipboardList className="mr-3" />Product Details
                                            </NavLink>
                                        </li>
                                    )}
                                    {isModuleVisibleForUser('product-dc') && (
                                        <li>
                                            <NavLink to="/products/dc" className={({isActive}) => `${subLinkClass} ${isActive ? 'bg-light-300 text-accent-600' : ''}`}>
                                                <FaTruck className="mr-3" />Product DC
                                            </NavLink>
                                        </li>
                                    )}

                                </ul>
                            )}
                        </div>
                    )}
                    
                    {/* Admin Only Links */}
                    {userRole === 'Admin' && (
                        <>
                            <div className="pt-2">
                                <NavLink to="/admin/managers/create" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}>
                                    <NavIcon icon={FaUserPlus} />
                                    {isOpen && <span className="ml-4 font-semibold">Create Manager</span>}
                                </NavLink>
                            </div>
                            <div className="pt-2">
                                <NavLink to="/admin/settings" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}>
                                    <NavIcon icon={FaCog} />
                                    {isOpen && <span className="ml-4 font-semibold">Settings</span>}
                                </NavLink>
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-light-300">
                    <button 
                        onClick={openLogoutModal} // Changed to open the confirmation modal
                        className="flex items-center w-full px-4 py-3 rounded-xl text-dark-700 hover:bg-light-200 transition-all duration-200 group"
                    >
                        <FaSignOutAlt size={20} />
                        {isOpen && <span className="ml-4 font-semibold">Logout</span>}
                        {isOpen && (
                            <span className="ml-auto transform transition-transform duration-200 group-hover:rotate-6">
                                <FaAngleRight />
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={closeLogoutModal}
                title="Confirm Logout"
            >
                <div className="space-y-6 modal-body">
                    <p className="text-dark-700">
                        Are you sure you want to logout?
                    </p>
                    <div className="flex justify-end space-x-4 pt-4 modal-footer">
                        <button
                            onClick={closeLogoutModal}
                            className="px-6 py-2.5 text-sm font-medium text-dark-700 bg-light-200 rounded-lg hover:bg-light-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-500 btn"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                handleLogout();
                                closeLogoutModal();
                            }}
                            className="px-6 py-2.5 text-sm font-medium text-white bg-danger-500 rounded-lg hover:bg-danger-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500 btn btn-secondary"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Sidebar;