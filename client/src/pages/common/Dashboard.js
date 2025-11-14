import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { 
    FaBoxes, 
    FaWarehouse, 
    FaSpinner, 
    FaUsers, 
    FaChartLine,
    FaTruck,
    FaClipboardList,
    FaExclamationTriangle,
    FaCheckCircle,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import { 
    LineChart, 
    Line, 
    BarChart, 
    Bar, 
    AreaChart, 
    Area,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import Card from '../../components/common/Card';

// Premium Glassmorphism StatCard with real-time animations - Apple Style
const StatCard = ({ icon, title, value, percentage, linkTo, gradient, trend, subtitle }) => {
    const isPositive = trend === 'up';
    const TrendIcon = isPositive ? FaArrowUp : FaArrowDown;
    const trendColor = isPositive ? 'text-green-500' : 'text-red-500';
    const trendBg = isPositive ? 'bg-green-50' : 'bg-red-50';

    return (
        <Link to={linkTo} className="block h-full">
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] h-full transition-all duration-500 hover:scale-105 group mobile-card glass-container soft-shadow-hover">
                <div className="relative p-6 mobile-p-4">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                            <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1">{title}</p>
                            <h3 className="text-3xl font-black text-gray-900 mb-1 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent mobile-text-2xl">
                                {value}
                            </h3>
                            {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
                        </div>
                        <div className={`p-3 rounded-xl ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            {React.cloneElement(icon, { className: 'text-white', size: 24 })}
                        </div>
                    </div>
                    
                    {percentage && (
                        <div className={`flex items-center gap-2 ${trendBg} rounded-lg px-3 py-2`}>
                            <TrendIcon className={trendColor} size={12} />
                            <span className={`text-sm font-bold ${trendColor}`}>{percentage}</span>
                            <span className="text-xs text-gray-600">vs last week</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

// Quick Action Tile Component - Apple Style
const QuickActionTile = ({ icon, title, description, linkTo, color }) => {
    return (
        <Link to={linkTo} className="block">
            <div className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-105 group cursor-pointer mobile-card glass-container soft-shadow-hover touch-target touch-animation">
                <div className="relative flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${color} shadow-md`}>
                        {React.cloneElement(icon, { className: 'text-white', size: 20 })}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                        <p className="text-xs text-gray-600">{description}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
};

// Chart Card Wrapper - Apple Style
const ChartCard = ({ title, subtitle, children, height = "350px" }) => {
    return (
        <Card className="mobile-card">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            <div style={{ height }} className="mobile-smooth-scroll">
                {children}
            </div>
        </Card>
    );
};

// Alert/Notification Card - Apple Style
const AlertCard = ({ type, title, message, count }) => {
    const config = {
        warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: FaExclamationTriangle, iconColor: 'text-yellow-500' },
        success: { bg: 'bg-green-50', border: 'border-green-200', icon: FaCheckCircle, iconColor: 'text-green-500' },
        info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: FaClipboardList, iconColor: 'text-blue-500' }
    };
    
    const { bg, border, icon: Icon, iconColor } = config[type] || config.info;
    
    return (
        <div className={`${bg} ${border} border rounded-xl p-4 glass-container mobile-card`}>
            <div className="flex items-start gap-3">
                <Icon className={`${iconColor} mt-1`} size={20} />
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                        {count && (
                            <span className={`${iconColor} text-xs font-bold px-2 py-1 bg-white rounded-full`}>
                                {count}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{message}</p>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [grnData, setGrnData] = useState([]);
    const [poData, setPoData] = useState([]);
    const [stockAlerts, setStockAlerts] = useState([]);

    // Function to fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            // Fetch all data in parallel
            const [statsResponse, grnResponse, poResponse, packingAlertsResponse, rawAlertsResponse] = await Promise.all([
                api.get('/materials/stats'),
                api.get('/grn/weekly-stats'),
                api.get('/purchase-orders/weekly-stats'),
                api.get('/materials/alerts'),
                api.get('/stock/alerts')
            ]);

            // Set stats data
            setStats(statsResponse.data);

            // Set GRN data
            setGrnData(grnResponse.data);

            // Set PO data
            setPoData(poResponse.data);

            // Combine packing and raw material alerts
            const combinedAlerts = [
                ...packingAlertsResponse.data.map(alert => ({
                    type: 'warning',
                    title: 'Low Packing Material Stock',
                    message: `${alert.name} is below threshold (${alert.quantity} < ${alert.stockAlertThreshold})`,
                    count: alert.quantity
                })),
                ...rawAlertsResponse.data.map(alert => ({
                    type: 'warning',
                    title: 'Low Raw Material Stock',
                    message: `${alert.name} is below threshold (${alert.quantity} < ${alert.stockAlertThreshold})`,
                    count: alert.quantity
                }))
            ];

            // Add some mock success/info alerts to make it more realistic
            const additionalAlerts = [
                {
                    type: 'success',
                    title: 'GRN Completed',
                    message: '12 goods receipts processed today',
                    count: 12
                },
                {
                    type: 'info',
                    title: 'Pending Approvals',
                    message: '5 purchase orders awaiting approval',
                    count: 5
                }
            ];

            setStockAlerts([...combinedAlerts.slice(0, 3), ...additionalAlerts]);

        } catch (err) {
            setError('Could not fetch dashboard data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Set up polling for real-time updates (every 30 seconds)
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchDashboardData();
        }, 30000); // 30 seconds

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, [fetchDashboardData]);

    // Stock distribution data
    const stockDistribution = [
        { name: 'Raw Materials', value: stats?.totalRawMaterialTypes || 0, color: '#ef4444' },
        { name: 'Packing Materials', value: stats?.totalPackingMaterialTypes || 0, color: '#f59e0b' },
        { name: 'Finished Goods', value: 87, color: '#10b981' },
        { name: 'WIP', value: 34, color: '#3b82f6' }
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-primary-500 mx-auto mb-4" size={48} />
                    <p className="text-gray-600 font-medium">Loading Delta Factory Dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <div className="bg-red-50 rounded-xl p-6 max-w-md glass-container">
                        <div className="bg-red-100 rounded-full p-3 inline-block mb-4">
                            <FaExclamationTriangle className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={fetchDashboardData}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mobile-btn btn btn-primary"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 mobile-container page-fade-in">
            {/* KPI Cards Grid - Responsive grid that adapts to screen size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mobile-grid">
                <StatCard 
                    title="Packing Materials"
                    value={stats?.totalPackingMaterialTypes || 0}
                    percentage="+12.5%"
                    trend="up"
                    subtitle="Active SKUs"
                    linkTo="/materials"
                    gradient="bg-gradient-to-br from-yellow-400 to-orange-500"
                    icon={<FaBoxes />}
                />
                <StatCard 
                    title="Raw Materials"
                    value={stats?.totalRawMaterialTypes || 0}
                    percentage="+8.3%"
                    trend="up"
                    subtitle="Total Types"
                    linkTo="/stock/raw-materials"
                    gradient="bg-gradient-to-br from-red-500 to-pink-600"
                    icon={<FaWarehouse />}
                />
                <StatCard 
                    title="Active Orders"
                    value="47"
                    percentage="-3.2%"
                    trend="down"
                    subtitle="In Production"
                    linkTo="/orders"
                    gradient="bg-gradient-to-br from-green-400 to-emerald-600"
                    icon={<FaClipboardList />}
                />
                <StatCard 
                    title="Monthly Revenue"
                    value="₹18.5L"
                    percentage="+15.7%"
                    trend="up"
                    subtitle="This Month"
                    linkTo="/reports"
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    icon={<FaChartLine />}
                />
            </div>

            {/* Quick Actions - Responsive grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mobile-grid">
                <QuickActionTile 
                    icon={<FaClipboardList />}
                    title="New GRN"
                    description="Create goods receipt"
                    linkTo="/grn/new"
                    color="bg-gradient-to-br from-purple-500 to-purple-700"
                />
                <QuickActionTile 
                    icon={<FaTruck />}
                    title="New PO"
                    description="Create purchase order"
                    linkTo="/po/new"
                    color="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <QuickActionTile 
                    icon={<FaWarehouse />}
                    title="Stock Check"
                    description="View inventory levels"
                    linkTo="/stock"
                    color="bg-gradient-to-br from-green-500 to-green-700"
                />
                <QuickActionTile 
                    icon={<FaUsers />}
                    title="Suppliers"
                    description="Manage vendors"
                    linkTo="/suppliers"
                    color="bg-gradient-to-br from-orange-500 to-orange-700"
                />
            </div>

            {/* Charts Row 1: GRN and PO Analytics - Responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mobile-grid">
                <ChartCard 
                    title="GRN Analytics" 
                    subtitle="Goods Receipt Notes - Last 7 Days"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={grnData}>
                            <defs>
                                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                    border: 'none', 
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }} 
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Area 
                                type="monotone" 
                                dataKey="received" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorReceived)" 
                                strokeWidth={2}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="pending" 
                                stroke="#f59e0b" 
                                fillOpacity={1} 
                                fill="url(#colorPending)" 
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard 
                    title="Purchase Orders" 
                    subtitle="PO Status - Last 7 Days"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={poData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                    border: 'none', 
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }} 
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="created" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="approved" fill="#10b981" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Charts Row 2: Stock Distribution and Trends - Responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mobile-grid">
                <ChartCard 
                    title="Stock Distribution" 
                    subtitle="Current Inventory by Category"
                    height="300px"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stockDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stockDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                    border: 'none', 
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }} 
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                wrapperStyle={{ fontSize: '11px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <div className="lg:col-span-2">
                    <ChartCard 
                        title="Real-Time Stock Alerts" 
                        subtitle="Critical notifications and actions required"
                        height="300px"
                    >
                        <div className="space-y-3 overflow-y-auto h-full pr-2 mobile-smooth-scroll">
                            {stockAlerts.map((alert, index) => (
                                <AlertCard key={index} {...alert} />
                            ))}
                            
                            {/* Additional Stock Status Cards */}
                            <div className="grid grid-cols-2 gap-3 mt-4 mobile-grid">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 mobile-card glass-container">
                                    <h4 className="text-xs font-bold text-blue-900 mb-1">IN STOCK</h4>
                                    <p className="text-2xl font-black text-blue-600 mobile-text-xl">287</p>
                                    <p className="text-xs text-blue-700 mt-1">Items available</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 mobile-card glass-container">
                                    <h4 className="text-xs font-bold text-purple-900 mb-1">ON ORDER</h4>
                                    <p className="text-2xl font-black text-purple-600 mobile-text-xl">42</p>
                                    <p className="text-xs text-purple-700 mt-1">Items pending</p>
                                </div>
                            </div>
                        </div>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;