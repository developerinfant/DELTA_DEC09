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
    FaRedo,
    FaChevronRight
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

// --- THEME CONSTANTS FOR CHARTS ---
const THEME = {
    gold: '#F2C94C',
    goldLight: '#FCEFC7',
    olive: '#6A7F3F',
    oliveLight: '#E8EFE0',
    dark: '#1A1A1A',
    gray: '#888888',
    cream: '#FAF7F2',
    danger: '#D9534F',
    white: '#FFFFFF'
};

// --- REDESIGNED COMPONENTS ---

// Premium Minimal StatCard
// Logic preserved, Styling completely changed to Warm Minimal
const StatCard = ({ icon, title, value, percentage, linkTo, gradient, trend, subtitle }) => {
    const isPositive = trend === 'up';
    const TrendIcon = isPositive ? FaArrowUp : FaArrowDown;
    // Using theme colors instead of generic red/green for a softer look
    const trendColor = isPositive ? 'text-emerald-600' : 'text-red-500';
    const trendBg = isPositive ? 'bg-emerald-50' : 'bg-red-50';

    return (
        <Link to={linkTo} className="block h-full group">
            <div className="relative h-full bg-white rounded-2xl p-6 shadow-sm border border-stone-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-grow">
                        {/* Title - Muted uppercase tracking */}
                        <p className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-2">{title}</p>
                        
                        {/* Value - Large, Dark, Elegant font */}
                        <h3 className="text-3xl font-bold text-[#1A1A1A] mb-1 tracking-tight">
                            {value}
                        </h3>
                        
                        {/* Subtitle - Soft Grey */}
                        {subtitle && <p className="text-sm text-stone-500 font-medium">{subtitle}</p>}
                    </div>
                    
                    {/* Icon - Minimal Circle with Theme Colors */}
                    <div className="p-3 rounded-full bg-[#FAF7F2] text-[#F2C94C] group-hover:bg-[#F2C94C] group-hover:text-white transition-colors duration-300">
                        {React.cloneElement(icon, { size: 20 })}
                    </div>
                </div>
                
                {/* Trend Indicator - Pill shape */}
                {percentage && (
                    <div className="mt-4 flex items-center gap-2">
                        <div className={`flex items-center gap-1 ${trendBg} rounded-full px-2.5 py-1`}>
                            <TrendIcon className={trendColor} size={10} />
                            <span className={`text-xs font-bold ${trendColor}`}>{percentage}</span>
                        </div>
                        <span className="text-xs text-stone-400 font-medium">vs last week</span>
                    </div>
                )}
            </div>
        </Link>
    );
};

// Quick Action Tile - Minimal Button Style
const QuickActionTile = ({ icon, title, description, linkTo, color }) => {
    return (
        <Link to={linkTo} className="block">
            <div className="group relative bg-white rounded-2xl p-5 border border-stone-100 shadow-sm transition-all duration-300 hover:border-[#F2C94C] hover:shadow-md cursor-pointer h-full">
                <div className="flex items-center gap-4">
                    {/* Icon Box */}
                    <div className="p-3 rounded-xl bg-[#FAF7F2] text-[#6A7F3F] group-hover:bg-[#F2C94C] group-hover:text-[#1A1A1A] transition-colors duration-300">
                        {React.cloneElement(icon, { size: 18 })}
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-grow">
                        <h4 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#6A7F3F] transition-colors">{title}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
                    </div>

                    {/* Arrow Indicator */}
                    <FaChevronRight size={12} className="text-stone-300 group-hover:text-[#F2C94C] transition-colors" />
                </div>
            </div>
        </Link>
    );
};

// Chart Card Wrapper - Clean White Canvas
const ChartCard = ({ title, subtitle, children, height = "350px" }) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 h-full">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{title}</h3>
                    {subtitle && <p className="text-sm text-stone-500 mt-1 font-medium">{subtitle}</p>}
                </div>
                {/* Decorative dot */}
                <div className="w-2 h-2 rounded-full bg-[#F2C94C] mb-2"></div>
            </div>
            <div style={{ height }} className="w-full">
                {children}
            </div>
        </div>
    );
};

// Alert/Notification Card - Restyled
const AlertCard = ({ type, title, message, count }) => {
    const config = {
        warning: { bg: 'bg-[#FFF8E1]', border: 'border-[#F2C94C]', icon: FaExclamationTriangle, iconColor: 'text-[#F2C94C]' },
        success: { bg: 'bg-[#E8EFE0]', border: 'border-[#6A7F3F]', icon: FaCheckCircle, iconColor: 'text-[#6A7F3F]' },
        info: { bg: 'bg-stone-50', border: 'border-stone-200', icon: FaClipboardList, iconColor: 'text-stone-500' }
    };
    
    const { bg, border, icon: Icon, iconColor } = config[type] || config.info;
    
    return (
        <div className={`${bg} rounded-xl p-4 border-l-4 ${border} mb-3 transition-transform hover:scale-[1.01]`}>
            <div className="flex items-start gap-3">
                <Icon className={`${iconColor} mt-0.5`} size={18} />
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-[#1A1A1A]">{title}</h4>
                        {count && (
                            <span className={`${iconColor} text-[10px] font-bold px-2 py-0.5 bg-white/80 rounded-full shadow-sm`}>
                                {count}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{message}</p>
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#FAF7F2]">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-[#F2C94C] mx-auto mb-4" size={48} />
                    <p className="text-[#6A7F3F] font-bold text-lg">Loading Delta Factory...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#FAF7F2]">
                <div className="text-center w-full max-w-md">
                    <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100">
                        <div className="bg-red-50 rounded-full p-4 inline-block mb-4">
                            <FaExclamationTriangle className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Something went wrong</h3>
                        <p className="text-stone-500 mb-6">{error}</p>
                        <button
                            onClick={fetchDashboardData}
                            className="bg-[#F2C94C] hover:bg-[#e0b840] text-[#1A1A1A] font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF7F2] p-4 md:p-8 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1A1A1A]">Dashboard</h1>
                        <p className="text-stone-500 mt-1">Track and manage inventory, sales and transactions</p>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="group flex items-center gap-2 bg-white hover:bg-stone-50 text-[#1A1A1A] font-semibold py-2.5 px-5 rounded-xl border border-stone-200 shadow-sm transition-all hover:border-[#F2C94C]"
                    >
                        <FaRedo size={14} className="text-stone-400 group-hover:text-[#F2C94C] group-hover:rotate-180 transition-all duration-500" />
                        <span>Refresh Data</span>
                    </button>
                </div>
                
                {/* KPI Cards Grid - Packing Materials */}
                <div>
                    <h2 className="text-sm font-bold uppercase text-stone-400 tracking-widest mb-4 ml-1">Packing Materials</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Active SKUs"
                            value={packingStats?.activeSKUs || 0}
                            subtitle="In System"
                            linkTo="/materials"
                            // Gradient props kept for compatibility but ignored in favor of theme
                            gradient=""
                            icon={<FaBoxes />}
                        />
                        <StatCard 
                            title="PM Stock"
                            value={packingStats?.totalStock || 0}
                            subtitle="Total Units"
                            linkTo="/packing/stock-report"
                            gradient=""
                            icon={<FaWarehouse />}
                        />
                        <StatCard 
                            title="Low Stock"
                            value={packingStats?.stockAlerts || 0}
                            subtitle="Requires Action"
                            linkTo="/materials/alerts"
                            gradient=""
                            icon={<FaExclamationTriangle />}
                            percentage={packingStats?.stockAlerts > 0 ? "+2" : "0%"} 
                            trend={packingStats?.stockAlerts > 0 ? "up" : "down"}
                        />
                        <StatCard 
                            title="Monthly GRNs"
                            value={packingStats?.totalGRNsThisMonth || 0}
                            subtitle="Receipts"
                            linkTo="/packing/grn/view"
                            gradient=""
                            icon={<FaClipboardList />}
                        />
                    </div>
                </div>
                
                {/* KPI Cards Grid - Finished Goods */}
                <div>
                    <h2 className="text-sm font-bold uppercase text-stone-400 tracking-widest mb-4 ml-1">Finished Goods</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Products"
                            value={fgStats?.activeFGProducts || 0}
                            subtitle="Catalog"
                            linkTo="/fg/delivery-challan/view"
                            gradient=""
                            icon={<FaBoxes />}
                        />
                        <StatCard 
                            title="FG Stock"
                            value={fgStats?.totalFGStock || 0}
                            subtitle="Warehouse"
                            linkTo="/fg/stock-report"
                            gradient=""
                            icon={<FaWarehouse />}
                        />
                        <StatCard 
                            title="Active Jobs"
                            value={fgStats?.activeOrders || 0}
                            subtitle="Processing"
                            linkTo="/fg/delivery-challan/view"
                            gradient=""
                            icon={<FaClipboardList />}
                        />
                        <StatCard 
                            title="Revenue"
                            value={`₹${fgStats?.monthlyRevenue ? Math.round(fgStats.monthlyRevenue).toLocaleString() : '0'}`}
                            subtitle="This Month"
                            linkTo="/fg/invoice/view"
                            gradient=""
                            icon={<FaChartLine />}
                            percentage="+12%"
                            trend="up"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <QuickActionTile 
                        icon={<FaClipboardList />}
                        title="New GRN"
                        description="Receive packing material"
                        linkTo="/packing/grn/create"
                        color=""
                    />
                    <QuickActionTile 
                        icon={<FaTruck />}
                        title="New PO"
                        description="Order supplies"
                        linkTo="/packing/purchase-orders/create"
                        color=""
                    />
                    <QuickActionTile 
                        icon={<FaWarehouse />}
                        title="Stock Check"
                        description="Full inventory report"
                        linkTo="/packing/stock-report"
                        color=""
                    />
                    <QuickActionTile 
                        icon={<FaUsers />}
                        title="Suppliers"
                        description="Manage vendor database"
                        linkTo="/packing/suppliers"
                        color=""
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* GRN Analytics Chart */}
                    <ChartCard 
                        title="GRN Activity" 
                        subtitle="Goods Received - Last 7 Days"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={grnData}>
                                <defs>
                                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={THEME.olive} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={THEME.olive} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={THEME.gold} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#A0A0A0" 
                                    tick={{fill: '#A0A0A0', fontSize: 12}} 
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#A0A0A0" 
                                    tick={{fill: '#A0A0A0', fontSize: 12}} 
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#FFFFFF', 
                                        border: 'none', 
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                        color: '#1A1A1A'
                                    }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Area 
                                    type="monotone" 
                                    dataKey="completed" 
                                    stroke={THEME.olive} 
                                    fillOpacity={1} 
                                    fill="url(#colorCompleted)" 
                                    strokeWidth={3}
                                    name="Completed"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="pending" 
                                    stroke={THEME.gold} 
                                    fillOpacity={1} 
                                    fill="url(#colorPending)" 
                                    strokeWidth={3}
                                    name="Pending"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* PO Analytics Chart */}
                    <ChartCard 
                        title="Purchase Orders" 
                        subtitle="Status Overview"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={poData} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#A0A0A0" 
                                    tick={{fill: '#A0A0A0', fontSize: 12}} 
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#A0A0A0" 
                                    tick={{fill: '#A0A0A0', fontSize: 12}} 
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ 
                                        backgroundColor: '#FFFFFF', 
                                        border: 'none', 
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    }} 
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Bar dataKey="approved" fill={THEME.olive} radius={[4, 4, 4, 4]} name="Approved" />
                                <Bar dataKey="created" fill={THEME.gold} radius={[4, 4, 4, 4]} name="Created" />
                                <Bar dataKey="pending" fill="#D1D5DB" radius={[4, 4, 4, 4]} name="Pending" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Bottom Row: Distribution & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stock Distribution */}
                    <ChartCard 
                        title="Inventory Split" 
                        subtitle="Category Distribution"
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
                                    stroke="none"
                                >
                                    {stockDistribution.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index % 2 === 0 ? THEME.gold : THEME.olive} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#FFFFFF', 
                                        border: 'none', 
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    }} 
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Stock Alerts List */}
                    <div className="lg:col-span-2">
                        <ChartCard 
                            title="Critical Alerts" 
                            subtitle="Items below reorder level"
                            height="300px"
                        >
                            <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                                {stockAlerts && stockAlerts.length > 0 ? (
                                    <div className="space-y-3">
                                        {stockAlerts.map((item, index) => (
                                            <div key={index} className="bg-[#FFFDF5] rounded-xl p-4 border border-stone-100 hover:border-[#F2C94C] transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-red-50 text-red-500 p-3 rounded-xl">
                                                        <FaExclamationTriangle size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-[#1A1A1A]">{item.name}</h4>
                                                        <p className="text-xs text-stone-500 font-medium tracking-wide">{item.itemCode}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-xs text-stone-400 uppercase font-bold">In Stock</p>
                                                        <p className="text-lg font-bold text-red-500">{item.quantity}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-stone-200 hidden sm:block"></div>
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs text-stone-400 uppercase font-bold">Limit</p>
                                                        <p className="text-lg font-bold text-[#1A1A1A]">{item.stockAlertThreshold}</p>
                                                    </div>
                                                    <Link to={`/materials/edit/${item._id}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white shadow-sm rounded-lg text-[#F2C94C] hover:text-[#d4aa2b]">
                                                        <FaRedo size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                                        <div className="bg-stone-50 p-4 rounded-full mb-3">
                                            <FaCheckCircle size={32} className="text-[#6A7F3F]" />
                                        </div>
                                        <p className="font-medium">All stock levels are healthy</p>
                                    </div>
                                )}
                            </div>
                        </ChartCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;