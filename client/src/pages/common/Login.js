import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    FaEye, 
    FaEyeSlash, 
    FaEnvelope, 
    FaLock, 
    FaCheckCircle, 
    FaChartLine, 
    FaShieldAlt, 
    FaCloud, 
    FaArrowRight 
} from 'react-icons/fa';
import logo from '../../assets/logo.png';

const Login = () => {
    // --- STATE MANAGEMENT (LOGIC PRESERVED) ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [rememberMe, setRememberMe] = useState(false); // UI state only

    const navigate = useNavigate();
    const { login, user } = useAuth();

    // Redirect if user is already logged in
    useEffect(() => {
        if (user && !isLoading) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, navigate]);

    // Focus email input on load
    useEffect(() => {
        const emailInput = document.getElementById('email-address');
        if (emailInput) emailInput.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password) {
            setError('Both email and password are required.');
            setIsLoading(false);
            return;
        }

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen flex bg-[#FAF7F2] font-sans selection:bg-[#F2C94C] selection:text-[#1A1A1A] overflow-hidden">
            
            {/* --- LEFT SIDE: BRANDING & VISUALS (Desktop Only) --- */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-[#FAF7F2] via-[#FFF3C9] to-[#F2C94C]/20 flex-col justify-between p-12 xl:p-16">
                
                {/* Decorative Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F2C94C]/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#6A7F3F]/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

                {/* Top Logo Area */}
                <div className="relative z-10 flex items-center gap-3 animate-fadeInDown">
                    <img src={logo} alt="Delta Logo" className="h-12 w-auto object-contain" />
                    <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">DELTA BRAND </span>
                </div>

                {/* Center Content */}
                <div className="relative z-10 max-w-lg mt-12">
                    <h1 className="text-5xl font-extrabold text-[#1A1A1A] leading-tight mb-6 animate-fadeInUp">
                        Smart Inventory.<br />
                        <span className="text-[#6A7F3F]">Seamless Operations.</span>
                    </h1>
                    <p className="text-lg text-[#6D685F] mb-10 leading-relaxed animate-fadeInUp animation-delay-100">
                        Manage packing materials, track stock in real-time, and streamline your entire supply chain workflow with our premium dashboard.
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-6 animate-fadeInUp animation-delay-200">
                        {[
                            { icon: FaChartLine, title: "Real-time Analytics", desc: "Live tracking of all material movements." },
                            { icon: FaShieldAlt, title: "Secure Access", desc: "Enterprise-grade security for your data." },
                            { icon: FaCloud, title: "Cloud Synced", desc: "Access your inventory from anywhere, anytime." }
                        ].map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm transition-transform hover:scale-[1.02] hover:bg-white/80">
                                <div className="p-3 rounded-xl bg-[#F2C94C]/20 text-[#B48E25]">
                                    <feature.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1A1A1A] text-lg">{feature.title}</h3>
                                    <p className="text-sm text-[#6D685F]">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Footer */}
                <div className="relative z-10 mt-12 flex justify-between items-center text-sm text-[#8E8B82] animate-fadeInUp animation-delay-300">
                    <p>© 2023 Delta Inventory Management</p>
                    <div className="flex gap-4">
                        <span className="cursor-pointer hover:text-[#1A1A1A] transition-colors">Privacy Policy</span>
                        <span className="cursor-pointer hover:text-[#1A1A1A] transition-colors">Terms of Service</span>
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDE: LOGIN FORM --- */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-[#FAF7F2] lg:bg-white">
                
                {/* Mobile Background Decoration */}
                <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-[#FFF3C9]/30 to-[#FAF7F2] z-0"></div>

                <div className="w-full max-w-md relative z-10 bg-white lg:bg-transparent p-8 sm:p-10 rounded-3xl shadow-xl lg:shadow-none border border-[#E5E1D5] lg:border-none animate-fadeIn">
                    
                    {/* Mobile Logo Header */}
                    <div className="lg:hidden text-center mb-8">
                        <img src={logo} alt="Delta Logo" className="h-16 w-auto mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[#1A1A1A]">Delta IMS</h2>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">Welcome Back</h2>
                        <p className="text-[#6D685F]">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2 group">
                            <label htmlFor="email-address" className="block text-sm font-semibold text-[#1A1A1A] ml-1">Email Address</label>
                            <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaEnvelope className="text-[#A8A39B] group-focus-within:text-[#F2C94C] transition-colors" />
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-5 py-4 bg-[#FAF7F2] border border-[#E5E1D5] rounded-xl text-[#1A1A1A] placeholder-[#A8A39B] focus:bg-white focus:outline-none focus:border-[#F2C94C] focus:ring-4 focus:ring-[#F2C94C]/10 transition-all duration-300 shadow-sm"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2 group">
                            <label htmlFor="password" className="block text-sm font-semibold text-[#1A1A1A] ml-1">Password</label>
                            <div className="relative transition-all duration-300 transform group-focus-within:scale-[1.01]">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaLock className="text-[#A8A39B] group-focus-within:text-[#F2C94C] transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-4 bg-[#FAF7F2] border border-[#E5E1D5] rounded-xl text-[#1A1A1A] placeholder-[#A8A39B] focus:bg-white focus:outline-none focus:border-[#F2C94C] focus:ring-4 focus:ring-[#F2C94C]/10 transition-all duration-300 shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A8A39B] hover:text-[#1A1A1A] transition-colors focus:outline-none"
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                >
                                    {isPasswordVisible ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between py-1">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-[#F2C94C] focus:ring-[#F2C94C] border-[#E5E1D5] rounded cursor-pointer accent-[#F2C94C]"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-[#6D685F] cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <Link to="#" className="font-semibold text-[#F2C94C] hover:text-[#d4aa2b] transition-colors hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-[#FFF5F5] border border-[#FEB2B2] rounded-xl flex items-start gap-3 animate-shake">
                                <FaShieldAlt className="text-[#C53030] mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-[#C53030] font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`
                                group w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-lg font-bold text-[#1A1A1A] 
                                bg-gradient-to-r from-[#F2C94C] to-[#E3B349] 
                                shadow-lg shadow-[#F2C94C]/30 
                                hover:shadow-xl hover:shadow-[#F2C94C]/40 hover:-translate-y-0.5 
                                focus:outline-none focus:ring-4 focus:ring-[#F2C94C]/40 
                                transition-all duration-300 
                                disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                            `}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-3">
                                    <svg className="animate-spin h-5 w-5 text-[#1A1A1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Sign In <FaArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative mt-8 mb-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-[#E5E1D5]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white lg:bg-transparent text-[#A8A39B] uppercase tracking-wider font-medium text-xs">Protected System</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-[#8E8B82] flex items-center justify-center gap-1">
                            <FaLock size={10} /> 256-bit SSL Encrypted Connection
                        </p>
                    </div>

                    {/* Version Number */}
                    <div className="absolute bottom-4 right-4 text-[10px] text-[#A8A39B] opacity-50 hidden lg:block">
                        v2.4.0
                    </div>
                </div>
            </div>

            {/* Custom Animations Styles */}
            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeInDown {
                    animation: fadeInDown 0.8s ease-out forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeInUp {
                    animation: fadeInUp 0.8s ease-out forwards;
                }
                .animation-delay-100 { animation-delay: 0.1s; }
                .animation-delay-200 { animation-delay: 0.2s; }
                .animation-delay-300 { animation-delay: 0.3s; }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default Login;