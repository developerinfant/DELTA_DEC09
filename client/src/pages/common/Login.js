import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import logo from '../../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const navigate = useNavigate();
    const { login, user } = useAuth();

    // Redirect if user is already logged in
    useEffect(() => {
        if (user && !isLoading) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, navigate]);

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
            // Wait for all user data to be fetched before navigating
            const userData = await login(email, password);
            
            // Navigate immediately after successful login
            navigate('/', { replace: true });
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-background min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-3 space-y-3 border border-light-200/50">
                <div className="text-center mb-4">
                    <img src={logo} alt="Delta Logo" className="mx-auto h-44 w-44 object-contain" />
                    <h1 className="text-2xl font-bold text-dark-800 mt-1 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-secondary-600 mt-1">Please login to your account.</p>
                </div>
                
                <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        <div className="relative">
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 text-base text-dark-700 bg-light-100 border border-light-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all duration-200 shadow-sm"
                                placeholder="Your email"
                            />
                        </div>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={isPasswordVisible ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 text-base text-dark-700 bg-light-100 border border-light-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all duration-200 shadow-sm"
                                placeholder="Password"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 flex items-center pr-5 text-secondary-500 hover:text-primary-500 transition-colors"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                            >
                                {isPasswordVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="text-right">
                        <Link to="#" className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors">
                            Forgot your password?
                        </Link>
                    </div>

                    {error && (
                        <div className="p-4 bg-danger-100 border border-danger-200 rounded-xl text-sm text-danger-700 text-center animate-fadeIn">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-4 text-lg font-bold text-white rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-300 disabled:bg-red-300 transition-all duration-200 btn-primary"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </span>
                            ) : 'Login'}
                        </button>
                    </div>
                </form>
                
                <div className="text-center text-sm text-secondary-600 pt-4 border-t border-light-200">
                    <p>© 2023 Packing Materials Management. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;