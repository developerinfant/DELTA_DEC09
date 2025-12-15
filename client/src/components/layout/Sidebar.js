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
import Modal from '../common/Modal';
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

    // --- PREMIUM UI STYLING CONSTANTS (FIXED FOR BETTER CONTRAST) ---
    const baseLinkClass = "relative flex items-center px-5 py-3.5 my-0.5 mx-2 rounded-2xl text-slate-600 font-semibold transition-all duration-300 ease-out hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-slate-900 hover:shadow-sm hover:scale-[1.02] group overflow-hidden";
    
    const activeLinkClass = "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 text-white font-bold shadow-xl shadow-amber-500/30 scale-[1.02]";

    // FIXED: Better contrast for submenu items
    const subLinkClass = "flex items-center px-5 py-3 my-0.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 hover:shadow-sm hover:translate-x-1 transition-all duration-300";
    
    // FIXED: Dark background with white text for better visibility
    const activeSubLinkClass = "bg-gradient-to-r from-slate-800 to-slate-700 text-white font-bold shadow-lg shadow-slate-500/30 translate-x-1 border-l-4 border-amber-400";

    const mobileLinkClass = "flex items-center px-6 py-4 border-b border-slate-100/50 text-slate-700 font-semibold active:bg-gradient-to-r active:from-amber-50 active:to-orange-50 transition-all duration-200";
    const mobileActiveLinkClass = "bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 text-amber-700 font-bold border-l-4 border-amber-400 shadow-sm";
    const mobileSubLinkClass = "flex items-center px-10 py-3.5 text-sm font-medium text-slate-600 active:text-slate-900 active:bg-slate-50";

    const NavIcon = ({ icon: IconComponent, isActive }) => {
        return (
            <div className="relative">
                <IconComponent 
                    size={20} 
                    className={`transition-all duration-300 ${
                        isActive 
                            ? 'text-white drop-shadow-lg' 
                            : 'text-slate-400 group-hover:text-amber-500 group-hover:scale-110'
                    }`} 
                />
                {isActive && (
                    <div className="absolute inset-0 blur-md bg-white/30 rounded-full"></div>
                )}
            </div>
        );
    };

    const AlertBadge = ({ count }) => {
        if (count <= 0) return null;
        return (
            <span className="ml-auto flex items-center justify-center min-w-[22px] h-6 px-2 text-[11px] font-black text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/40 ring-2 ring-white animate-pulse">
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
            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
                    border-radius: 10px;
                    transition: background 0.3s;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #94a3b8, #64748b);
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                
                .shimmer-effect {
                    background: linear-gradient(
                        90deg,
                        rgba(255,255,255,0) 0%,
                        rgba(255,255,255,0.2) 50%,
                        rgba(255,255,255,0) 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite;
                }
            `}</style>

            {/* --- MOBILE MENU OVERLAY --- */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-md lg:hidden transition-all duration-300" 
                    onClick={closeMobileMenu}
                ></div>
            )}

            {/* --- MOBILE MENU TOGGLE BUTTON --- */}
            <div className="lg:hidden fixed top-5 left-5 z-50">
                <button
                    onClick={toggleMobileMenu}
                    className="p-3.5 rounded-2xl bg-white shadow-2xl shadow-slate-900/20 text-slate-800 active:scale-95 transition-all duration-300 border border-slate-100 hover:shadow-amber-500/30 hover:border-amber-200"
                >
                    {isMobileMenuOpen ? (
                        <FaTimes size={22} className="text-red-500" />
                    ) : (
                        <FaBars size={22} className="text-amber-600" />
                    )}
                </button>
            </div>

            {/* --- MOBILE SIDEBAR --- */}
            <div 
                className={`fixed inset-y-0 left-0 z-50 w-[300px] bg-gradient-to-b from-white via-slate-50 to-white flex flex-col transition-transform duration-500 ease-out shadow-2xl lg:hidden ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Mobile Header with Gradient */}
                <div className="relative p-6 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50/30 to-orange-50/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-orange-400/5"></div>
                    <img src={logo} alt="Delta Logo" className="relative h-11 w-auto drop-shadow-md" />
                    <button
                        onClick={closeMobileMenu}
                        className="relative p-2.5 rounded-xl bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 shadow-md transition-all duration-300"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Mobile Navigation Content */}
                <nav className="flex-grow overflow-y-auto py-3 custom-scrollbar">
                    <div className="px-6 mb-3">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] pl-1 mb-2 flex items-center">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 mr-2 rounded-full"></span>
                            Menu
                        </p>
                    </div>

                    <NavLink 
                        to="/" 
                        className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-slate-50'}`}
                        onClick={closeMobileMenu}
                    >
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mr-3 shadow-sm">
                            <FaHome size={18} className="text-amber-600" />
                        </div>
                        <span className="font-bold">Dashboard</span>
                    </NavLink>

                    {/* Mobile Packing Materials */}
                    {isModuleSectionVisible('packing') && (
                        <div>
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className={`w-full ${mobileLinkClass} justify-between hover:bg-slate-50`}
                            >
                                <div className="flex items-center">
                                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mr-3 shadow-sm">
                                        <FaBoxOpen size={18} className="text-amber-600"/>
                                    </div>
                                    <span className="font-bold">Packing Materials</span>
                                </div>
                                <FaChevronDown 
                                    className={`text-slate-400 transition-all duration-300 ${isPackingOpen ? 'rotate-180 text-amber-500' : ''}`} 
                                    size={14} 
                                />
                            </button>
                            
                            {isPackingOpen && (
                                <div className="bg-gradient-to-b from-slate-50/80 to-white py-2 border-b border-slate-50">
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <NavLink to="/materials/alerts" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaExclamationTriangle className="mr-3 opacity-70" size={14} />Stock Alert
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaChartBar className="mr-3 opacity-70" size={14} />Stock Report
                                    </NavLink>
                                    
                                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-10"></div>
                                    
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <NavLink to="/packing/purchase-orders" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaShoppingCart className="mr-3 opacity-70" size={14} />Purchase Order
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <NavLink to="/packing/grn/view" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaClipboardCheck className="mr-3 opacity-70" size={14} />GRN
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <NavLink to="/materials/outgoing" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaTruck className="mr-3 opacity-70" size={14} />Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-10"></div>
                                    
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <NavLink to="/packing/suppliers" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsersCog className="mr-3 opacity-70" size={14} />Supplier Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <NavLink to="/materials" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaFileAlt className="mr-3 opacity-70" size={14} />Item Master
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Finished Goods */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div>
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className={`w-full ${mobileLinkClass} justify-between hover:bg-slate-50`}
                            >
                                <div className="flex items-center">
                                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl mr-3 shadow-sm">
                                        <FaBox size={18} className="text-emerald-600"/>
                                    </div>
                                    <span className="font-bold">Finished Goods</span>
                                </div>
                                <FaChevronDown 
                                    className={`text-slate-400 transition-all duration-300 ${isFinishedGoodsOpen ? 'rotate-180 text-emerald-500' : ''}`} 
                                    size={14} 
                                />
                            </button>
                            
                            {isFinishedGoodsOpen && (
                                <div className="bg-gradient-to-b from-slate-50/80 to-white py-2 border-b border-slate-50">
                                    <NavLink to="/fg/stock-alert" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaExclamationTriangle className="mr-3 opacity-70" size={14} />Stock Alert
                                    </NavLink>
                                    <NavLink to="/fg/stock-report" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                        <FaChartBar className="mr-3 opacity-70" size={14} />Stock Report
                                    </NavLink>
                                    
                                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-10"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <NavLink to="/fg/grn/view" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaClipboardCheck className="mr-3 opacity-70" size={14} />GRN (DC-based)
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <NavLink to="/fg/delivery-challan/create" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaTruck className="mr-3 opacity-70" size={14} />Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-10"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <NavLink to="/fg/invoice" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaFileInvoice className="mr-3 opacity-70" size={14} />Invoice
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/buyer-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsers className="mr-3 opacity-70" size={14} />Buyer Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/driver-master" className={({isActive}) => `${mobileSubLinkClass} ${isActive ? 'text-white bg-gradient-to-r from-slate-800 to-slate-700 font-bold' : ''}`} onClick={closeMobileMenu}>
                                            <FaUsers className="mr-3 opacity-70" size={14} />Driver Master
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Damaged Stock Module - Mobile Top Level Item */}
                    <NavLink 
                        to="/packing/damaged-stock-report" 
                        className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-slate-50'}`}
                        onClick={closeMobileMenu}
                    >
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mr-3 shadow-sm">
                            <FaExclamationTriangle size={18} className="text-amber-600" />
                        </div>
                        <span className="font-bold">Damaged Stock</span>
                    </NavLink>
                    
                    {/* E-Way Bill Module - Mobile Top Level Item */}
                    <NavLink 
                        to="/eway-bill" 
                        className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-slate-50'}`}
                        onClick={closeMobileMenu}
                    >
                        <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mr-3 shadow-sm">
                            <FaFileAlt size={18} className="text-blue-600" />
                        </div>
                        <span className="font-bold">E-Way Bill</span>
                    </NavLink>
                    
                    {/* Admin Links Mobile */}
                    {userRole === 'Admin' && (
                        <>
                            <div className="px-6 mt-6 mb-3">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] pl-1 mb-2 flex items-center">
                                    <span className="w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 mr-2 rounded-full"></span>
                                    Admin
                                </p>
                            </div>
                            <NavLink to="/admin/managers/create" className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-slate-50'}`} onClick={closeMobileMenu}>
                                <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mr-3 shadow-sm">
                                    <FaUserPlus size={18} className="text-indigo-600" />
                                </div>
                                <span className="font-bold">Create Manager</span>
                            </NavLink>
                            <NavLink to="/admin/settings" className={({ isActive }) => `${mobileLinkClass} ${isActive ? mobileActiveLinkClass : 'hover:bg-slate-50'}`} onClick={closeMobileMenu}>
                                <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mr-3 shadow-sm">
                                    <FaCog size={18} className="text-indigo-600" />
                                </div>
                                <span className="font-bold">Settings</span>
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* Mobile Footer */}
                <div className="p-4 border-t border-slate-100 bg-gradient-to-t from-slate-50 to-white">
                    <button 
                        onClick={() => {
                            openLogoutModal();
                            closeMobileMenu();
                        }}
                        className="flex items-center w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold hover:from-red-600 hover:to-pink-600 shadow-xl shadow-red-500/30 transition-all duration-300 active:scale-95"
                    >
                        <FaSignOutAlt size={20} />
                        <span className="ml-3 tracking-wide">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className={`fixed inset-y-0 left-0 z-30 bg-gradient-to-b from-white via-slate-50/30 to-white border-r border-slate-200/50 shadow-[4px_0_40px_rgba(0,0,0,0.05)] flex flex-col transition-all duration-500 ease-out hidden lg:flex backdrop-blur-xl ${isOpen ? 'w-[300px]' : 'w-[85px]'}`}>
                
                {/* Logo Area with Clean Gradient Background */}
                <div className="relative h-24 flex items-center justify-center p-6 border-b border-slate-100 overflow-hidden bg-gradient-to-r from-amber-50/20 to-orange-50/20">
                    {isOpen ? (
                        <img src={logo} alt="Delta Logo" className="relative h-12 w-auto transition-all duration-500 drop-shadow-xl z-10" />
                    ) : (
                        <img src={logo} alt="Delta" className="relative h-9 w-auto transition-all duration-500 drop-shadow-lg z-10" />
                    )}
                </div>

                {/* Navigation with Enhanced Styling */}
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
                                {isOpen && (
                                    <span className="ml-4 tracking-wide">Dashboard</span>
                                )}
                                {isActive && isOpen && (
                                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                )}
                            </>
                        )}
                    </NavLink>

                    {/* Section Label with Gradient Line */}
                    {isOpen && (
                        <div className="mt-8 mb-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inventory</span>
                                <div className="h-px flex-grow bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                            </div>
                        </div>
                    )}

                    {/* Packing Materials Collapsible */}
                    {isModuleSectionVisible('packing') && (
                        <div className="mb-1">
                            <button
                                onClick={() => setIsPackingOpen(!isPackingOpen)}
                                className={`w-full ${baseLinkClass} justify-between ${isPackingOpen ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-slate-900 shadow-md' : ''}`}
                                title={!isOpen ? "Packing Materials" : ""}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className={`${isPackingOpen ? 'text-amber-600 scale-110' : 'text-slate-400 group-hover:text-amber-500'} transition-all duration-300`}>
                                        <FaBoxOpen size={20} />
                                    </div>
                                    {isOpen && <span className="ml-4 font-bold truncate">Packing Materials</span>}
                                </div>
                                {isOpen && (
                                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${isPackingOpen ? 'bg-amber-200/50 rotate-90' : 'bg-slate-100'}`}>
                                        <FaChevronRight 
                                            size={10} 
                                            className={`${isPackingOpen ? 'text-amber-700' : 'text-slate-400'}`} 
                                        />
                                    </div>
                                )}
                            </button>
                            
                            {/* Submenu */}
                            <div className={`overflow-hidden transition-all duration-500 ease-out ${isPackingOpen && isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-5 pr-2 py-2 ml-4 border-l-2 border-amber-300/50 space-y-1">
                                    {isModuleVisibleForUser('stock-alerts') && (
                                        <NavLink to="/materials/alerts" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <div className="flex items-center w-full">
                                                <FaExclamationTriangle size={14} className="mr-3 opacity-60" />
                                                <span>Stock Alert</span>
                                                <AlertBadge count={packingAlertsCount} />
                                            </div>
                                        </NavLink>
                                    )}
                                    <NavLink to="/packing/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        <FaChartBar size={14} className="mr-3 opacity-60" />
                                        Stock Report
                                    </NavLink>
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2 my-3"></div>
                                    
                                    {isModuleVisibleForUser('view-packing-pos') && (
                                        <NavLink to="/packing/purchase-orders" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaShoppingCart size={14} className="mr-3 opacity-60" />
                                            Purchase Order
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-packing-grns') && (
                                        <NavLink to="/packing/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaClipboardCheck size={14} className="mr-3 opacity-60" />
                                            GRN
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('outgoing-materials') && (
                                        <NavLink to="/materials/outgoing" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaTruck size={14} className="mr-3 opacity-60" />
                                            Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2 my-3"></div>
                                    
                                    {isModuleVisibleForUser('manage-packing-suppliers') && (
                                        <NavLink to="/packing/suppliers" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaUsersCog size={14} className="mr-3 opacity-60" />
                                            Supplier Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-materials') && (
                                        <NavLink to="/materials" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaFileAlt size={14} className="mr-3 opacity-60" />
                                            Item Master
                                        </NavLink>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Finished Goods Collapsible */}
                    {isModuleSectionVisible('finished-goods') && (
                        <div className="mb-1">
                            <button
                                onClick={() => setIsFinishedGoodsOpen(!isFinishedGoodsOpen)}
                                className={`w-full ${baseLinkClass} justify-between ${isFinishedGoodsOpen ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-slate-900 shadow-md' : ''}`}
                                title={!isOpen ? "Finished Goods" : ""}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className={`${isFinishedGoodsOpen ? 'text-emerald-600 scale-110' : 'text-slate-400 group-hover:text-emerald-500'} transition-all duration-300`}>
                                        <FaBox size={20} />
                                    </div>
                                    {isOpen && <span className="ml-4 font-bold truncate">Finished Goods</span>}
                                </div>
                                {isOpen && (
                                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${isFinishedGoodsOpen ? 'bg-emerald-200/50 rotate-90' : 'bg-slate-100'}`}>
                                        <FaChevronRight 
                                            size={10} 
                                            className={`${isFinishedGoodsOpen ? 'text-emerald-700' : 'text-slate-400'}`} 
                                        />
                                    </div>
                                )}
                            </button>
                            
                            {/* Submenu */}
                            <div className={`overflow-hidden transition-all duration-500 ease-out ${isFinishedGoodsOpen && isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-5 pr-2 py-2 ml-4 border-l-2 border-emerald-300/50 space-y-1">
                                    <NavLink to="/fg/stock-alert" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        <FaExclamationTriangle size={14} className="mr-3 opacity-60" />
                                        Stock Alert
                                    </NavLink>
                                    <NavLink to="/fg/stock-report" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                        <FaChartBar size={14} className="mr-3 opacity-60" />
                                        Stock Report
                                    </NavLink>
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2 my-3"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-grns') && (
                                        <NavLink to="/fg/grn/view" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaClipboardCheck size={14} className="mr-3 opacity-60" />
                                            GRN (DC-based)
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-dcs') && (
                                        <NavLink to="/fg/delivery-challan/create" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaTruck size={14} className="mr-3 opacity-60" />
                                            Delivery Challan
                                        </NavLink>
                                    )}
                                    
                                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2 my-3"></div>
                                    
                                    {isModuleVisibleForUser('view-fg-invoices') && (
                                        <NavLink to="/fg/invoice" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaFileInvoice size={14} className="mr-3 opacity-60" />
                                            Invoice
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/buyer-master" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaUsers size={14} className="mr-3 opacity-60" />
                                            Buyer Master
                                        </NavLink>
                                    )}
                                    {isModuleVisibleForUser('view-fg-buyers') && (
                                        <NavLink to="/fg/driver-master" className={({isActive}) => `${subLinkClass} ${isActive ? activeSubLinkClass : ''}`}>
                                            <FaUsers size={14} className="mr-3 opacity-60" />
                                            Driver Master
                                        </NavLink>
                                    )}
                                   
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Damaged Stock Module - Top Level Item */}
                    <NavLink 
                        to="/packing/damaged-stock-report" 
                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        title={!isOpen ? "Damaged Stock" : ""}
                    >
                        {({ isActive }) => (
                            <>
                                <NavIcon icon={FaExclamationTriangle} isActive={isActive} />
                                {isOpen && (
                                    <span className="ml-4 tracking-wide">Damaged Stock</span>
                                )}
                                {isActive && isOpen && (
                                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                    
                    {/* E-Way Bill Module */}
                    <NavLink 
                        to="/eway-bill" 
                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        title={!isOpen ? "E-Way Bill" : ""}
                    >
                        {({ isActive }) => (
                            <>
                                <NavIcon icon={FaFileAlt} isActive={isActive} />
                                {isOpen && (
                                    <span className="ml-4 tracking-wide">E-Way Bill</span>
                                )}
                                {isActive && isOpen && (
                                    <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                    
                    {/* Admin Section */}
                    {userRole === 'Admin' && (
                        <>
                            {isOpen && (
                                <div className="mt-8 mb-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-grow bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Admin</span>
                                        <div className="h-px flex-grow bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
                                    </div>
                                </div>
                            )}
                            
                            <NavLink 
                                to="/admin/managers/create" 
                                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                                title={!isOpen ? "Create Manager" : ""}
                            >
                                {({ isActive }) => (
                                    <>
                                        <NavIcon icon={FaUserPlus} isActive={isActive} />
                                        {isOpen && (
                                            <span className="ml-4 tracking-wide">Create Manager</span>
                                        )}
                                        {isActive && isOpen && (
                                            <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                        )}
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
                                        {isOpen && (
                                            <span className="ml-4 tracking-wide">Settings</span>
                                        )}
                                        {isActive && isOpen && (
                                            <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </>
                    )}

                </nav>

                {/* Footer / Logout with Premium Design */}
                <div className="p-4 border-t border-slate-100 bg-gradient-to-t from-slate-50/80 to-transparent">
                    <button 
                        onClick={openLogoutModal}
                        className={`w-full flex items-center ${isOpen ? 'justify-start px-5' : 'justify-center px-2'} py-4 rounded-2xl text-slate-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-600 hover:shadow-lg hover:shadow-red-100 transition-all duration-300 group relative overflow-hidden`}
                        title="Logout"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-pink-500/0 group-hover:from-red-500/5 group-hover:to-pink-500/5 transition-all duration-300"></div>
                        <FaSignOutAlt size={20} className="relative transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-1" />
                        {isOpen && <span className="relative ml-4 font-bold tracking-wide">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* --- ENHANCED LOGOUT MODAL --- */}
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={closeLogoutModal}
                title="Confirm Logout"
            >
                <div className="p-2">
                    <div className="relative flex items-center gap-5 mb-8 bg-gradient-to-r from-red-50 via-pink-50 to-red-50 p-6 rounded-2xl border border-red-100 shadow-lg shadow-red-100/50 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
                        <div className="relative p-4 bg-white rounded-2xl text-red-500 shadow-xl shadow-red-500/20">
                            <FaSignOutAlt size={24} />
                        </div>
                        <div className="relative">
                            <h4 className="font-black text-lg text-slate-900 mb-1">Ready to leave?</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">You'll need to sign in again to access your dashboard.</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeLogoutModal}
                            className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                handleLogout();
                                closeLogoutModal();
                            }}
                            className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-2xl shadow-red-500/40 transition-all duration-300 transform hover:scale-105 active:scale-95"
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