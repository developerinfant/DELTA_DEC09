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
    FaExclamationTriangle,
    FaChevronRight,
    FaChevronDown
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
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
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

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    // --- NEW PREMIUM UI STYLING CONSTANTS ---

    // Main Navigation Link Styles
    const baseLinkClass = "relative flex items-center px-4 py-3 my-1 mx-2 rounded-xl text-stone-500 font-medium transition-all duration-200 ease-in-out hover:bg-stone-50 hover:text-[#1A1A1A] group";
    
    // Active State - Gold Primary with Dark Text
    const activeLinkClass = "bg-[#F2C94C] text-[#1A1A1A] font-bold shadow-md shadow-orange-100";

    // Sub-menu Link Styles
    const subLinkClass = "flex items-center px-4 py-2.5 my-0.5 rounded-lg text-sm text-stone-500 hover:text-[#1A1A1A] hover:bg-stone-50 transition-all duration-200";
    
    // Active Sub-menu - Olive Accent
    const activeSubLinkClass = "bg-[#E8EFE0] text-[#6A7F3F] font-bold";

    // Mobile Specifics
    const mobileLinkClass = "flex items-center px-5 py-4 border-b border-stone-50 text-stone-600 font-medium active:bg-stone-100";
    const mobileActiveLinkClass = "bg-[#FFF9E6] text-[#B48E25] font-bold border-l-4 border-[#F2C94C]";
    const mobileSubLinkClass = "flex items-center px-8 py-3 text-sm text-stone-500 active:text-[#1A1A1A]";

    // Icon Wrapper Helper
    const NavIcon = ({ icon: IconComponent, isActive }) => {
        return <IconComponent size={20} className={`transition-colors duration-200 ${isActive ? 'text-inherit' : 'text-stone-400 group-hover:text-[#1A1A1A]'}`} />;
    };

    // Premium Alert Badge
    const AlertBadge = ({ count }) => {
        if (count <= 0) return null;
        return (
            <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-[#D9534F] rounded-full shadow-sm ring-2 ring-white">
                {count > 9 ? '9+' : count}
            </span>
        );
    };

    // --- PERMISSION LOGIC PRESERVED 100% ---
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

    const isModuleVisibleForUser = (moduleId) => {
        if (userRole === 'Admin') return true;
        return isModuleVisible(user, moduleId);
    };

    const isModuleSectionVisible = (sectionKey) => {
        if (userRole === 'Admin') return true;
        return hasModuleAccess(user, moduleStructure[sectionKey]);
    };

    return (
        <>
            {/* --- MOBILE MENU OVERLAY --- */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-[#1A1A1A]/20 backdrop-blur-sm lg:hidden transition-opacity duration-300" 
                    onClick={closeMobileMenu}
                ></div>
            )}

            {/* --- MOBILE MENU TOGGLE BUTTON --- */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={toggleMobileMenu}
                    className="p-3 rounded-xl bg-white shadow-lg shadow-stone-200/50 text-[#1A1A1A] active:scale-95 transition-all duration-200 border border-stone-100"
                >
                    {isMobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
                </button>
            </div>

            {/* --- MOBILE SIDEBAR --- */}
            <div 
                className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white flex flex-col transition-transform duration-300 ease-out shadow-2xl lg:hidden ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Mobile Header */}
                <div className="p-6 flex items-center justify-between border-b border-stone-100">
                    <img src={logo} alt="Delta Logo" className="h-10 w-auto" />
                    <button
                        onClick={closeMobileMenu}
                        className="p-2 rounded-full bg-stone-50 text-stone-400 hover:bg-stone-100"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Mobile Navigation Content */}
                <nav className="flex-grow overflow-y-auto py-2 custom-scrollbar">
                    <div className="px-4 mb-2">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-2 mb-2">Menu</p>
                    </div>

                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-stone-50'}`}
                        onClick={closeMobileMenu}
                    >
                        <FaHome size={18} className="mr-3" />
                        <span className="font-semibold">Dashboard</span>
                    </NavLink>

                    {/* Mobile Packing Materials */}
                    {isModuleSectionVisible('packing') && (
                        <div>
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className={`w-full ${mobileLinkClass} justify-between hover:bg-stone-50`}
                            >
                                <div className="flex items-center">
                                    <FaBoxOpen size={18} className="mr-3 text-[#F2C94C]"/>
                                    <span className="font-semibold">Packing Materials</span>
                                </div>
                                <FaChevronDown className={`text-stone-300 transition-transform ${isPackingOpen ? 'rotate-180' : ''}`} size={12} />
                            </button>
                            
                            {isPackingOpen && (
                                <div className="bg-stone-50/50 py-2 border-b border-stone-50">
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <NavLink to="/materials/alerts" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaExclamationTriangle className="mr-3 opacity-70" size={14} />Stock Alert
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaChartBar className="mr-3 opacity-70" size={14} />Stock Report
                                    </NavLink>
                                    
                                    <div className="my-2 border-t border-stone-100 mx-8"></div>
                                    
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <NavLink to="/packing/purchase-orders" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaShoppingCart className="mr-3 opacity-70" size={14} />Purchase Order
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <NavLink to="/packing/grn/view" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaClipboardCheck className="mr-3 opacity-70" size={14} />GRN
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <NavLink to="/materials/outgoing" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaTruck className="mr-3 opacity-70" size={14} />Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="my-2 border-t border-stone-100 mx-8"></div>
                                    
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <NavLink to="/packing/suppliers" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsersCog className="mr-3 opacity-70" size={14} />Supplier Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <NavLink to="/materials" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaFileAlt className="mr-3 opacity-70" size={14} />Item Master
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/damaged-stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#F2C94C] font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaExclamationTriangle className="mr-3 opacity-70" size={14} />Damaged Stock
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Finished Goods */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div>
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className={`w-full ${mobileLinkClass} justify-between hover:bg-stone-50`}
                            >
                                <div className="flex items-center">
                                    <FaBox size={18} className="mr-3 text-[#6A7F3F]"/>
                                    <span className="font-semibold">Finished Goods</span>
                                </div>
                                <FaChevronDown className={`text-stone-300 transition-transform ${isFinishedGoodsOpen ? 'rotate-180' : ''}`} size={12} />
                            </button>
                            
                            {isFinishedGoodsOpen && (
                                <div className="bg-stone-50/50 py-2 border-b border-stone-50">
                                    <NavLink to="/fg/stock-alert" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaExclamationTriangle className="mr-3 opacity-70" size={14} />Stock Alert
                                    </NavLink>
                                    <NavLink to="/fg/stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaChartBar className="mr-3 opacity-70" size={14} />Stock Report
                                    </NavLink>
                                    
                                    <div className="my-2 border-t border-stone-100 mx-8"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <NavLink to="/fg/grn/view" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaClipboardCheck className="mr-3 opacity-70" size={14} />GRN (DC-based)
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <NavLink to="/fg/delivery-challan/create" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaTruck className="mr-3 opacity-70" size={14} />Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="my-2 border-t border-stone-100 mx-8"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <NavLink to="/fg/invoice" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaFileInvoice className="mr-3 opacity-70" size={14} />Invoice
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/buyer-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsers className="mr-3 opacity-70" size={14} />Buyer Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/driver-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-[#6A7F3F] font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsers className="mr-3 opacity-70" size={14} />Driver Master
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Admin Links Mobile */}
                    {userRole === 'Admin' && (
                        <>
                            <div className="px-4 mt-6 mb-2">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest pl-2 mb-2">Admin</p>
                            </div>
                            <NavLink to="/admin/managers/create" className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-stone-50'}`} onClick={closeMobileMenu}>
                                <FaUserPlus size={18} className="mr-3" />
                                <span className="font-semibold">Create Manager</span>
                            </NavLink>
                            <NavLink to="/admin/settings" className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-stone-50'}`} onClick={closeMobileMenu}>
                                <FaCog size={18} className="mr-3" />
                                <span className="font-semibold">Settings</span>
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-stone-100">
                    <button 
                        onClick={() => {
                            openLogoutModal();
                            closeMobileMenu();
                        }}
                        className="flex items-center w-full px-5 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                    >
                        <FaSignOutAlt size={18} />
                        <span className="ml-3">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-stone-100 shadow-[2px_0_24px_rgba(0,0,0,0.02)] flex flex-col transition-all duration-300 ease-in-out hidden lg:flex ${isOpen ? 'w-[280px]' : 'w-[80px]'}`}>
                
                {/* Logo Area */}
                <div className="h-24 flex items-center justify-center p-6 border-b border-stone-50">
                    {isOpen ? (
                        <img src={logo} alt="Delta Logo" className="h-10 w-auto transition-all duration-300" />
                    ) : (
                        <img src={logo} alt="Delta" className="h-8 w-auto transition-all duration-300" />
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-grow overflow-y-auto py-6 px-3 custom-scrollbar flex flex-col gap-1">
                    
                    {/* Dashboard */}
                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        title={!isOpen ? "Dashboard" : ""}
                    >
                        {({ isActive }) => (
                            <>
                                <NavIcon icon={FaChartPie} isActive={isActive} />
                                {isOpen && <span className="ml-3.5 tracking-wide">Dashboard</span>}
                            </>
                        )}
                    </NavLink>

                    {/* Section Label */}
                    {isOpen && <div className="mt-6 mb-2 px-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Inventory</div>}

                    {/* Packing Materials Collapsible */}
                    {isModuleSectionVisible('packing') && (
                        <div className="mb-1">
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className={`w-full ${baseLinkClass} justify-between ${isPackingOpen ? 'bg-stone-50 text-[#1A1A1A]' : ''}`}
                                title={!isOpen ? "Packing Materials" : ""}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className={`${isPackingOpen ? 'text-[#F2C94C]' : 'text-stone-400 group-hover:text-[#F2C94C]'} transition-colors`}>
                                        <FaBoxOpen size={20} />
                                    </div>
                                    {isOpen && <span className="ml-3.5 font-medium truncate">Packing Materials</span>}
                                </div>
                                {isOpen && (
                                    <FaChevronRight 
                                        size={10} 
                                        className={`text-stone-300 transition-transform duration-200 ${isPackingOpen ? 'rotate-90' : ''}`} 
                                    />
                                )}
                            </button>
                            
                            {/* Submenu */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isPackingOpen && isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-4 pr-2 py-1 ml-3 border-l-2 border-stone-100 space-y-1">
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <NavLink to="/materials/alerts" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <div className="flex items-center w-full">
                                                <span>Stock Alert</span>
                                                <AlertBadge count={packingAlertsCount} />
                                            </div>
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        Stock Report
                                    </NavLink>
                                    
                                    <div className="h-px bg-stone-100 mx-2 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <NavLink to="/packing/purchase-orders" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Purchase Order
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <NavLink to="/packing/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            GRN
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <NavLink to="/materials/outgoing" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="h-px bg-stone-100 mx-2 my-2"></div>
                                    
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <NavLink to="/packing/suppliers" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Supplier Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <NavLink to="/materials" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Item Master
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/damaged-stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        Damaged Stock
                                    </NavLink>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Finished Goods Collapsible */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div className="mb-1">
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className={`w-full ${baseLinkClass} justify-between ${isFinishedGoodsOpen ? 'bg-stone-50 text-[#1A1A1A]' : ''}`}
                                title={!isOpen ? "Finished Goods" : ""}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className={`${isFinishedGoodsOpen ? 'text-[#6A7F3F]' : 'text-stone-400 group-hover:text-[#6A7F3F]'} transition-colors`}>
                                        <FaBox size={20} />
                                    </div>
                                    {isOpen && <span className="ml-3.5 font-medium truncate">Finished Goods</span>}
                                </div>
                                {isOpen && (
                                    <FaChevronRight 
                                        size={10} 
                                        className={`text-stone-300 transition-transform duration-200 ${isFinishedGoodsOpen ? 'rotate-90' : ''}`} 
                                    />
                                )}
                            </button>
                            
                            {/* Submenu */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFinishedGoodsOpen && isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-4 pr-2 py-1 ml-3 border-l-2 border-stone-100 space-y-1">
                                    <NavLink to="/fg/stock-alert" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        Stock Alert
                                    </NavLink>
                                    <NavLink to="/fg/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        Stock Report
                                    </NavLink>
                                    
                                    <div className="h-px bg-stone-100 mx-2 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <NavLink to="/fg/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            GRN (DC-based)
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <NavLink to="/fg/delivery-challan/create" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="h-px bg-stone-100 mx-2 my-2"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <NavLink to="/fg/invoice" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Invoice
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/buyer-master" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Buyer Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/driver-master" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            Driver Master
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Admin Section */}
                    {userRole === 'Admin' && (
                        <>
                            {isOpen && <div className="mt-6 mb-2 px-4 text-[11px] font-bold text-stone-400 uppercase tracking-widest">Admin</div>}
                            
                            <NavLink 
                                to="/admin/managers/create" 
                                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                                title={!isOpen ? "Create Manager" : ""}
                            >
                                {({ isActive }) => (
                                    <>
                                        <NavIcon icon={FaUserPlus} isActive={isActive} />
                                        {isOpen && <span className="ml-3.5 tracking-wide">Create Manager</span>}
                                    </>
                                )}
                            </NavLink>
                            
                            <NavLink 
                                to="/admin/settings" 
                                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                                title={!isOpen ? "Settings" : ""}
                            >
                                {({ isActive }) => (
                                    <>
                                        <NavIcon icon={FaCog} isActive={isActive} />
                                        {isOpen && <span className="ml-3.5 tracking-wide">Settings</span>}
                                    </>
                                )}
                            </NavLink>
                        </>
                    )}

                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-stone-100 bg-white">
                    <button 
                        onClick={openLogoutModal}
                        className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-xl text-stone-500 hover:bg-[#FFF5F5] hover:text-[#D9534F] transition-all duration-300 group`}
                        title="Logout"
                    >
                        <FaSignOutAlt size={20} className="transition-transform duration-300 group-hover:-translate-x-1" />
                        {isOpen && <span className="ml-3 font-semibold">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* --- LOGOUT MODAL (RESTYLED) --- */}
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={closeLogoutModal}
                title="Confirm Logout"
            >
                <div className="p-1">
                    <div className="flex items-center gap-4 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="p-3 bg-white rounded-full text-red-500 shadow-sm">
                            <FaSignOutAlt size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-[#1A1A1A]">Ready to leave?</h4>
                            <p className="text-sm text-stone-500">You will need to sign in again to access the dashboard.</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={closeLogoutModal}
                            className="px-5 py-2.5 rounded-xl font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                handleLogout();
                                closeLogoutModal();
                            }}
                            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#D9534F] hover:bg-red-600 shadow-lg shadow-red-200 transition-all transform hover:scale-[1.02]"
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