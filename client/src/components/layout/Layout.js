import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import { FaBars, FaSearch, FaBell, FaUserCircle, FaExclamationTriangle, FaInfoCircle, FaPlus, FaBox, FaTruck, FaUsers, FaDownload } from 'react-icons/fa';
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

    // Toggle notification panel
    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    // Toggle FAB menu
    const toggleFAB = () => {
        setShowFAB(!showFAB);
    };

    // Close notification panel when clicking outside
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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showFAB]);

    // useEffect to fetch alert counts and details
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                // Fetch both alert counts and details at the same time
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
    }, [location.pathname]); // Re-fetch counts whenever the user navigates

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
        <div className="flex h-screen bg-gradient-to-br from-light-200 to-light-300">
            {/* Pass counts and toggle function as props to Sidebar */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                packingAlertsCount={packingAlertsCount}
                rawAlertsCount={rawAlertsCount}
                toggleSidebar={toggleSidebar}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Enhanced Header with modern styling - Apple Style */}
                <header className="flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-light-300 shadow-sm relative z-10 glass-container">
                    {/* Left side: Hamburger Menu - hidden on desktop, visible on mobile */}
                    <div className="flex items-center lg:hidden">
                        {/* Mobile menu button is now handled in Sidebar component */}
                    </div>

                    {/* Breadcrumbs - hidden on mobile, visible on desktop */}
                    <div className="hidden md:block">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-2">
                                {breadcrumbs.map((crumb, index) => (
                                    <li key={index} className="flex items-center">
                                        {crumb.isLast ? (
                                            <span className="text-dark-800 font-semibold text-sm md:text-base">{crumb.name}</span>
                                        ) : (
                                            <>
                                                <Link to={crumb.path} className="text-dark-600 hover:text-primary-500 text-sm md:text-base transition-colors duration-200">
                                                    {crumb.name}
                                                </Link>
                                                <svg className="flex-shrink-0 h-5 w-5 text-dark-400 mx-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>

                    {/* Right side: Search, Icons, and User Info */}
                    <div className="flex items-center space-x-5">
                        <div className="relative hidden md:block">
                            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-dark-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2.5 w-64 bg-light-100 border border-light-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all duration-200 shadow-sm form-input"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* PWA Install Button - only show if supported and prompt is available */}
                            {supportsPWA && promptInstall && (
                                <button
                                    onClick={installPWA}
                                    className="hidden md:flex items-center text-dark-600 hover:text-primary-500 cursor-pointer transition-colors duration-200 relative p-2 rounded-full hover:bg-light-200"
                                    title="Install Delta IMS"
                                >
                                    <FaDownload size={22} />
                                </button>
                            )}
                            
                            {/* Notification Bell with Popup */}
                            <div className="relative notification-bell">
                                <button 
                                    onClick={toggleNotifications}
                                    className="text-dark-600 hover:text-primary-500 cursor-pointer transition-colors duration-200 relative p-2 rounded-full hover:bg-light-200"
                                >
                                    <FaBell size={22} />
                                    {(packingAlertsCount + rawAlertsCount) > 0 && (
                                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger-500 rounded-full">
                                                {packingAlertsCount + rawAlertsCount > 9 ? '9+' : packingAlertsCount + rawAlertsCount}
                                            </span>
                                        )}
                                </button>
                                
                                {/* Notification Panel */}
                                {showNotifications && (
                                    <div className="notification-panel absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-light-300 z-50 modal-content">
                                        <div className="p-4 border-b border-light-200 modal-header">
                                            <h3 className="font-bold text-lg text-dark-800 modal-title">Notifications</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto modal-body">
                                            {packingAlertsCount === 0 && rawAlertsCount === 0 ? (
                                                <div className="p-4 text-center text-dark-500">
                                                    <FaInfoCircle className="mx-auto text-2xl mb-2 text-light-400" />
                                                    <p>No alerts at this time</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {packingAlerts.map((alert, index) => (
                                                        <Link 
                                                            to="/materials/alerts" 
                                                            key={`packing-${index}`}
                                                            className="block p-4 border-b border-light-200 hover:bg-light-100 transition-colors duration-200"
                                                            onClick={() => setShowNotifications(false)}
                                                        >
                                                            <div className="flex items-start">
                                                                <FaExclamationTriangle className="text-warning-500 mt-1 mr-3 flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-medium text-dark-800">Low Packing Material Stock</p>
                                                                    <p className="text-sm text-dark-600">{alert.name} - Only {alert.quantity} left</p>
                                                                    <p className="text-xs text-dark-500 mt-1">Threshold: {alert.stockAlertThreshold}</p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                    {rawAlerts.map((alert, index) => (
                                                        <Link 
                                                            to="/stock/raw-material-alerts" 
                                                            key={`raw-${index}`}
                                                            className="block p-4 border-b border-light-200 hover:bg-light-100 transition-colors duration-200"
                                                            onClick={() => setShowNotifications(false)}
                                                        >
                                                            <div className="flex items-start">
                                                                <FaExclamationTriangle className="text-warning-500 mt-1 mr-3 flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-medium text-dark-800">Low Raw Material Stock</p>
                                                                    <p className="text-sm text-dark-600">{alert.name} - Only {alert.quantity} left</p>
                                                                    <p className="text-xs text-dark-500 mt-1">Threshold: {alert.stockAlertThreshold}</p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                        <div className="p-3 bg-light-100 text-center text-sm text-dark-600 modal-footer">
                                            {(packingAlertsCount + rawAlertsCount) > 0 ? (
                                                <span>{packingAlertsCount + rawAlertsCount} alert(s) requiring attention</span>
                                            ) : (
                                                <span>All systems normal</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                             <div className="flex items-center group cursor-pointer">
                                <div className="relative">
                                    <FaUserCircle className="text-dark-600 group-hover:text-primary-500 transition-colors duration-200" size={26} />
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 rounded-full border-2 border-white"></span>
                                </div>
                                <div className="ml-3 hidden md:block">
                                    <p className="text-sm font-semibold text-dark-700 group-hover:text-primary-600 transition-colors duration-200">
                                        {user?.name || 'Admin'}
                                    </p>
                                    <p className="text-xs text-dark-500">{user?.role || 'Administrator'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content with enhanced styling */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-light-200/50 to-light-300/50 p-6 relative">
                    <div className="max-w-full mx-auto">
                        {/* Mobile breadcrumbs - visible on mobile, hidden on desktop */}
                        <div className="md:hidden mb-4">
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={index} className="flex items-center">
                                            {crumb.isLast ? (
                                                <span className="text-dark-800 font-semibold text-sm">{crumb.name}</span>
                                            ) : (
                                                <>
                                                    <Link to={crumb.path} className="text-dark-600 hover:text-primary-500 text-sm transition-colors duration-200">
                                                        {crumb.name}
                                                    </Link>
                                                    <svg className="flex-shrink-0 h-4 w-4 text-dark-400 mx-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        </div>
                        <div className="page-fade-in">
                            <Outlet />
                        </div>
                    </div>
                    
                    {/* Floating Action Button (FAB) for mobile */}
                    <div className="lg:hidden">
                        {/* FAB Menu */}
                        {showFAB && (
                            <div className="fab-menu absolute bottom-24 right-6 flex flex-col items-end space-y-3 z-40">
                                {fabActions.map((action, index) => (
                                    <Link 
                                        key={index}
                                        to={action.path}
                                        className="flex items-center bg-white rounded-full shadow-lg px-4 py-2 transform transition-all duration-200 hover:scale-105 glass-container"
                                        onClick={() => setShowFAB(false)}
                                    >
                                        <span className="text-sm font-medium text-dark-700 mr-2">{action.label}</span>
                                        <div className="bg-primary-500 text-white p-2 rounded-full">
                                            {action.icon}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        
                        {/* FAB Button */}
                        <button
                            onClick={toggleFAB}
                            className="fab-button fixed bottom-6 right-6 bg-primary-500 text-white p-4 rounded-full shadow-xl hover:bg-primary-600 transition-all duration-300 z-30 touch-target touch-animation"
                        >
                            <FaPlus size={24} className={`transition-transform duration-300 ${showFAB ? 'rotate-45' : ''}`} />
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;