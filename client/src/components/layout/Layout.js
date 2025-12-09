import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import { FaSearch, FaBell, FaUserCircle, FaExclamationTriangle, FaPlus, FaBox, FaDownload, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import usePWA from '../../hooks/usePWA';

// Helper function to create breadcrumbs from the path
const createBreadcrumbs = (pathname) => {
    if (pathname === '/') {
        return [{ name: 'Dashboard', path: '/', isLast: true }];
    }
    const paths = pathname.split('/').filter(x => x);
    let breadcrumbPath = '';
    return paths.map((path, index) => {
        breadcrumbPath += `/${path}`;
        const isLast = index === paths.length - 1;
        const name = path.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return { name, path: breadcrumbPath, isLast };
    });
};

const Layout = () => {
    const { user } = useAuth();
    
    const {
        supportsPWA,
        promptInstall,
        installPWA
    } = usePWA();
    
    // Sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const breadcrumbs = createBreadcrumbs(location.pathname);

    // State for alert counts
    const [packingAlertsCount, setPackingAlertsCount] = useState(0);
    const [rawAlertsCount, setRawAlertsCount] = useState(0);
    const [packingAlerts, setPackingAlerts] = useState([]);
    const [rawAlerts, setRawAlerts] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showFAB, setShowFAB] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const toggleFAB = () => {
        setShowFAB(!showFAB);
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showNotifications && !event.target.closest('.notification-panel') && !event.target.closest('.notification-bell')) {
                setShowNotifications(false);
            }
            if (showFAB && !event.target.closest('.fab-menu') && !event.target.closest('.fab-button')) {
                setShowFAB(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications, showFAB]);

    // Fetch alerts
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const [packingRes, rawRes] = await Promise.all([
                    api.get('/materials/alerts'),
                    api.get('/stock/alerts')
                ]);
                setPackingAlertsCount(packingRes.data.length);
                setRawAlertsCount(rawRes.data.length);
                setPackingAlerts(packingRes.data);
                setRawAlerts(rawRes.data);
            } catch (error) {
                console.error("Failed to fetch stock alerts:", error);
            }
        };
        fetchAlerts();
    }, [location.pathname]);

    // Responsive Sidebar Logic
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1200) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // FAB actions
    const fabActions = [
        { icon: <FaPlus />, label: 'New GRN', path: '/grn/new' },
        { icon: <FaPlus />, label: 'New PO', path: '/po/new' },
        { icon: <FaPlus />, label: 'New Material', path: '/materials/new' },
        { icon: <FaPlus />, label: 'New Supplier', path: '/suppliers/new' }
    ];

    return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A1A] font-sans selection:bg-[#F2C94C] selection:text-[#1A1A1A] overflow-x-hidden">
            
            {/* Sidebar Component - Fixed Position */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                packingAlertsCount={packingAlertsCount}
                rawAlertsCount={rawAlertsCount}
                toggleSidebar={toggleSidebar}
            />
            
            {/* 
               MAIN CONTENT WRAPPER
               - Applies margin-left equal to sidebar width on desktop
            */}
            <div 
                className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[80px]'}`}
            >
                {/* 
                    PREMIUM NAVBAR / HEADER
                    - Fixed height (72px)
                    - Cream background with blur
                    - Rounded pill search
                    - Floating icon buttons
                */}
                <header className="sticky top-0 right-0 z-40 flex justify-between items-center h-[72px] px-6 lg:px-8 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE6DF] shadow-sm transition-all duration-300">
                    
                    {/* Left: Mobile Placeholder & Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        {/* Placeholder for Mobile Menu Button (Actual button is in Sidebar) */}
                        <div className="flex items-center lg:hidden w-8 h-8"></div>

                        {/* Breadcrumbs */}
                        <div className="hidden md:block">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={index} className="flex items-center">
                                            {crumb.isLast ? (
                                                <span className="text-[#1A1A1A] font-bold text-sm tracking-wide bg-white/50 px-3 py-1 rounded-full border border-[#EAE6DF]">
                                                    {crumb.name}
                                                </span>
                                            ) : (
                                                <>
                                                    <Link 
                                                        to={crumb.path} 
                                                        className="text-[#6D685F] hover:text-[#F2C94C] text-sm font-medium transition-colors duration-200"
                                                    >
                                                        {crumb.name}
                                                    </Link>
                                                    <FaChevronRight className="flex-shrink-0 h-2.5 w-2.5 text-[#B8B2A5] mx-2" />
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </div>
                    </div>

                    {/* Right: Search & Actions */}
                    <div className="flex items-center gap-4 lg:gap-6">
                        
                        {/* Search Bar - Pill Shape */}
                        <div className="relative hidden lg:block group">
                            <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-[#B8B2A5] group-focus-within:text-[#F2C94C] transition-colors duration-300" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="pl-11 pr-5 py-2.5 w-64 lg:w-80 bg-white border border-[#EAE6DF] rounded-full text-sm font-medium text-[#1A1A1A] placeholder-[#B8B2A5] shadow-sm focus:outline-none focus:border-[#F2C94C] focus:ring-4 focus:ring-[#F2C94C]/10 transition-all duration-300 hover:shadow-md" 
                            />
                        </div>

                        <div className="flex items-center gap-3 lg:gap-4">
                            {/* PWA Install Button */}
                            {supportsPWA && promptInstall && (
                                <button 
                                    onClick={installPWA} 
                                    className="group flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#EAE6DF] text-[#6D685F] shadow-sm hover:text-[#1A1A1A] hover:border-[#F2C94C] hover:shadow-md transition-all duration-300 active:scale-95" 
                                    title="Install Delta IMS"
                                >
                                    <FaDownload size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            )}
                            
                            {/* Notification Bell */}
                            <div className="relative notification-bell">
                                <button 
                                    onClick={toggleNotifications} 
                                    className={`group relative flex items-center justify-center w-10 h-10 rounded-full border shadow-sm transition-all duration-300 active:scale-95 ${
                                        showNotifications 
                                        ? 'bg-[#F2C94C] border-[#F2C94C] text-white shadow-md' 
                                        : 'bg-white border-[#EAE6DF] text-[#6D685F] hover:text-[#F2C94C] hover:border-[#F2C94C]'
                                    }`}
                                >
                                    <FaBell size={18} />
                                    {(packingAlertsCount + rawAlertsCount) > 0 && (
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-[#D9534F] text-white text-[9px] font-bold rounded-full ring-2 ring-white animate-pulse">
                                            {packingAlertsCount + rawAlertsCount}
                                        </span>
                                    )}
                                </button>
                                
                                {/* Notification Dropdown */}
                                <AnimatePresence>
                                    {showNotifications && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                                            exit={{ opacity: 0, y: 15, scale: 0.95 }} 
                                            transition={{ duration: 0.2 }} 
                                            className="notification-panel absolute right-0 mt-5 w-96 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-[#EAE6DF] z-50 overflow-hidden"
                                        >
                                            <div className="px-5 py-4 border-b border-[#EAE6DF] flex justify-between items-center bg-[#FAF7F2]/50">
                                                <h3 className="font-bold text-[#1A1A1A]">Notifications</h3>
                                                {(packingAlertsCount + rawAlertsCount) > 0 && (
                                                    <span className="text-[10px] font-bold bg-[#D9534F]/10 text-[#D9534F] px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                        {packingAlertsCount + rawAlertsCount} New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-[360px] overflow-y-auto custom-scrollbar bg-white">
                                                {packingAlertsCount === 0 && rawAlertsCount === 0 ? (
                                                    <div className="p-8 text-center text-[#B8B2A5]">
                                                        <div className="bg-[#FAF7F2] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-[#F2C94C]">
                                                            <FaBell size={24} />
                                                        </div>
                                                        <p className="font-medium">You're all caught up!</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-[#EAE6DF]">
                                                        {packingAlerts.map((alert, index) => (
                                                            <Link 
                                                                to="/materials/alerts" 
                                                                key={`packing-${index}`} 
                                                                className="block p-4 hover:bg-[#FAF7F2] transition-colors duration-200 group relative" 
                                                                onClick={() => setShowNotifications(false)}
                                                            >
                                                                <div className="flex gap-4">
                                                                    <div className="flex-shrink-0 mt-1 text-[#F2C94C] bg-[#FFF9E6] p-2 rounded-lg group-hover:bg-[#F2C94C] group-hover:text-white transition-colors shadow-sm">
                                                                        <FaBox size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="text-sm font-bold text-[#1A1A1A] mb-0.5">Low Packing Stock</p>
                                                                            <span className="w-1.5 h-1.5 bg-[#D9534F] rounded-full"></span>
                                                                        </div>
                                                                        <p className="text-xs text-[#6D685F] leading-relaxed">
                                                                            <span className="font-medium text-[#1A1A1A]">{alert.name}</span> is running low. Only <span className="text-[#D9534F] font-bold">{alert.quantity}</span> units remaining.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                        {rawAlerts.map((alert, index) => (
                                                            <Link 
                                                                to="/stock/raw-material-alerts" 
                                                                key={`raw-${index}`} 
                                                                className="block p-4 hover:bg-[#FAF7F2] transition-colors duration-200 group relative" 
                                                                onClick={() => setShowNotifications(false)}
                                                            >
                                                                <div className="flex gap-4">
                                                                    <div className="flex-shrink-0 mt-1 text-[#6A7F3F] bg-[#E8EFE0] p-2 rounded-lg group-hover:bg-[#6A7F3F] group-hover:text-white transition-colors shadow-sm">
                                                                        <FaExclamationTriangle size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex justify-between items-start">
                                                                            <p className="text-sm font-bold text-[#1A1A1A] mb-0.5">Low Raw Material</p>
                                                                            <span className="w-1.5 h-1.5 bg-[#D9534F] rounded-full"></span>
                                                                        </div>
                                                                        <p className="text-xs text-[#6D685F] leading-relaxed">
                                                                            <span className="font-medium text-[#1A1A1A]">{alert.name}</span> needs restocking. Current level: <span className="text-[#D9534F] font-bold">{alert.quantity}</span>.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 bg-[#FAF7F2] text-center border-t border-[#EAE6DF]">
                                                <Link to="/materials/alerts" className="text-xs font-bold text-[#6D685F] hover:text-[#F2C94C] uppercase tracking-wider transition-colors flex items-center justify-center gap-1">
                                                    View All Activity <FaChevronRight size={8} />
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            {/* Profile Section */}
                            <div className="flex items-center gap-3 pl-5 border-l border-[#EAE6DF] cursor-pointer group ml-1">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-[#1A1A1A] leading-tight group-hover:text-[#F2C94C] transition-colors">
                                        {user?.name || 'Admin'}
                                    </p>
                                    <p className="text-[10px] font-bold text-[#B8B2A5] uppercase tracking-wider mt-0.5">
                                        {user?.role || 'Administrator'}
                                    </p>
                                </div>
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-[#FAF7F2] text-[#B8B2A5] flex items-center justify-center border border-[#EAE6DF] shadow-sm group-hover:border-[#F2C94C] group-hover:text-[#F2C94C] transition-all duration-300">
                                        <FaUserCircle size={24} />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] rounded-full border-2 border-white"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        {/* Mobile Breadcrumbs Fallback */}
                        <div className="md:hidden mb-6">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={index} className="flex items-center">
                                            {crumb.isLast ? (
                                                <span className="text-[#1A1A1A] font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#EAE6DF]">{crumb.name}</span>
                                            ) : (
                                                <>
                                                    <Link to={crumb.path} className="text-[#6D685F] hover:text-[#F2C94C] text-sm transition-colors duration-200">{crumb.name}</Link>
                                                    <FaChevronRight className="flex-shrink-0 h-2 w-2 text-[#B8B2A5] mx-2" />
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </div>

                        {/* Outlet with Animation */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ duration: 0.3 }} 
                            className="w-full h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </div>

                    {/* Mobile FAB */}
                    <div className="lg:hidden">
                        <AnimatePresence>
                            {showFAB && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }} 
                                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }} 
                                    className="fab-menu absolute bottom-24 right-6 flex flex-col items-end space-y-4 z-40"
                                >
                                    {fabActions.map((action, index) => (
                                        <Link 
                                            key={index} 
                                            to={action.path} 
                                            className="flex items-center bg-white rounded-2xl shadow-lg border border-[#EAE6DF] px-5 py-3 transform transition-all duration-200 active:scale-95" 
                                            onClick={() => setShowFAB(false)}
                                        >
                                            <span className="text-sm font-bold text-[#1A1A1A] mr-3">{action.label}</span>
                                            <div className="bg-[#FAF7F2] text-[#F2C94C] p-2 rounded-full border border-[#F2C94C]/20">
                                                {action.icon}
                                            </div>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button 
                            onClick={toggleFAB} 
                            className={`fab-button fixed bottom-6 right-6 w-14 h-14 bg-[#F2C94C] text-[#1A1A1A] rounded-2xl shadow-xl hover:bg-[#E0B840] hover:shadow-2xl transition-all duration-300 z-30 flex items-center justify-center border border-[#E0B840] ${showFAB ? 'rotate-45' : ''}`}
                        >
                            <FaPlus size={20} />
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;