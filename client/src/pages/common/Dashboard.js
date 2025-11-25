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
    FaArrowDown,
    FaRedo
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
    const [packingStats, setPackingStats] = useState(null);
    const [fgStats, setFgStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [grnData, setGrnData] = useState([]);
    const [poData, setPoData] = useState([]);
    const [stockDistribution, setStockDistribution] = useState([]);
    const [stockAlerts, setStockAlerts] = useState([]);

    // Function to fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setIsLoading(true);
            // Fetch all data in parallel
            const [
                packingResponse, 
                fgResponse, 
                grnResponse, 
                poResponse, 
                distributionResponse,
                alertsResponse
            ] = await Promise.all([
                api.get('/dashboard/packing-summary'),
                api.get('/dashboard/finished-summary'),
                api.get('/dashboard/grn-analytics'),
                api.get('/dashboard/po-stats'),
                api.get('/dashboard/stock-distribution'),
                api.get('/dashboard/stock-alerts')
            ]);

            // Set packing stats data
            setPackingStats(packingResponse.data);

            // Set FG stats data
            setFgStats(fgResponse.data);

            // Set GRN data
            setGrnData(grnResponse.data);

            // Set PO data
            setPoData(poResponse.data);

            // Set stock distribution data
            setStockDistribution(distributionResponse.data);

            // Set stock alerts data
            setStockAlerts(alertsResponse.data);

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
            {/* Refresh Button */}
            <div className="flex justify-end">
                <button
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-200 transition-colors"
                >
                    <FaRedo size={16} />
                    <span>Refresh</span>
                </button>
            </div>
            
            {/* KPI Cards Grid - Responsive grid that adapts to screen size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mobile-grid">
                <StatCard 
                    title="Active SKUs"
                    value={packingStats?.activeSKUs || 0}
                    subtitle="Packing Materials"
                    linkTo="/materials"
                    gradient="bg-gradient-to-br from-yellow-400 to-orange-500"
                    icon={<FaBoxes />}
                />
                <StatCard 
                    title="Total Stock"
                    value={packingStats?.totalStock || 0}
                    subtitle="PM Store"
                    linkTo="/packing/stock-report"
                    gradient="bg-gradient-to-br from-red-500 to-pink-600"
                    icon={<FaWarehouse />}
                />
                <StatCard 
                    title="Stock Alerts"
                    value={packingStats?.stockAlerts || 0}
                    subtitle="Low Stock Items"
                    linkTo="/materials/alerts"
                    gradient="bg-gradient-to-br from-green-400 to-emerald-600"
                    icon={<FaExclamationTriangle />}
                />
                <StatCard 
                    title="GRNs Created"
                    value={packingStats?.totalGRNsThisMonth || 0}
                    subtitle="This Month"
                    linkTo="/packing/grn/view"
                    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
                    icon={<FaClipboardList />}
                />
            </div>
            
            {/* Finished Goods Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mobile-grid">
                <StatCard 
                    title="Active Products"
                    value={fgStats?.activeFGProducts || 0}
                    subtitle="Finished Goods"
                    linkTo="/fg/delivery-challan/view"
                    gradient="bg-gradient-to-br from-purple-400 to-purple-600"
                    icon={<FaBoxes />}
                />
                <StatCard 
                    title="Total FG Stock"
                    value={fgStats?.totalFGStock || 0}
                    subtitle="All Units"
                    linkTo="/fg/stock-report"
                    gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
                    icon={<FaWarehouse />}
                />
                <StatCard 
                    title="Active Orders"
                    value={fgStats?.activeOrders || 0}
                    subtitle="Ongoing Jobs"
                    linkTo="/fg/dc/view"
                    gradient="bg-gradient-to-br from-teal-400 to-teal-600"
                    icon={<FaClipboardList />}
                />
                <StatCard 
                    title="Monthly Revenue"
                    value={`₹${fgStats?.monthlyRevenue ? Math.round(fgStats.monthlyRevenue).toLocaleString() : '0'}`}
                    subtitle="This Month"
                    linkTo="/fg/invoice/view"
                    gradient="bg-gradient-to-br from-cyan-500 to-cyan-700"
                    icon={<FaChartLine />}
                />
            </div>

            {/* Quick Actions - Responsive grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mobile-grid">
                <QuickActionTile 
                    icon={<FaClipboardList />}
                    title="New GRN"
                    description="Create goods receipt"
                    linkTo="/packing/grn/create"
                    color="bg-gradient-to-br from-purple-500 to-purple-700"
                />
                <QuickActionTile 
                    icon={<FaTruck />}
                    title="New PO"
                    description="Create purchase order"
                    linkTo="/packing/purchase-orders/create"
                    color="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <QuickActionTile 
                    icon={<FaWarehouse />}
                    title="Stock Check"
                    description="View inventory levels"
                    linkTo="/packing/stock-report"
                    color="bg-gradient-to-br from-green-500 to-green-700"
                />
                <QuickActionTile 
                    icon={<FaUsers />}
                    title="Suppliers"
                    description="Manage vendors"
                    linkTo="/packing/suppliers"
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
                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
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
                                dataKey="completed" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorCompleted)" 
                                strokeWidth={2}
                                name="Completed"
                            />
                            <Area 
                                type="monotone" 
                                dataKey="pending" 
                                stroke="#f59e0b" 
                                fillOpacity={1} 
                                fill="url(#colorPending)" 
                                strokeWidth={2}
                                name="Pending"
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
                            <Bar dataKey="approved" fill="#10b981" radius={[8, 8, 0, 0]} name="Approved" />
                            <Bar dataKey="created" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Created" />
                            <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Pending" />
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
                                label={({ name, value }) => `${name}: ${value}`}
                            >
                                {stockDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#ef4444'} />
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
                        subtitle="Top 5 Lowest Stock Items"
                        height="300px"
                    >
                        <div className="space-y-3 overflow-y-auto h-full pr-2 mobile-smooth-scroll">
                            {stockAlerts && stockAlerts.length > 0 ? (
                                stockAlerts.map((item, index) => (
                                    <div key={index} className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200 mobile-card glass-container">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-sm font-bold text-red-900">{item.name}</h4>
                                                <p className="text-xs text-red-700 mt-1">{item.itemCode}</p>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-red-500 text-white rounded-full">
                                                Low Stock
                                            </span>
                                        </div>
                                        <div className="flex justify-between mt-3">
                                            <div>
                                                <p className="text-xs text-gray-600">Current Stock</p>
                                                <p className="text-lg font-black text-red-600">{item.quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Alert Limit</p>
                                                <p className="text-lg font-black text-gray-900">{item.stockAlertThreshold}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Last Updated</p>
                                                <p className="text-xs font-bold text-gray-900">
                                                    {new Date(item.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No stock alerts at this time</p>
                                </div>
                            )}
                        </div>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;