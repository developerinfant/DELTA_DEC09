import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios'; // Import axios directly for login
import api from '../api';

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for a logged-in user in localStorage on initial load
    useEffect(() => {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            try {
                const parsedUser = JSON.parse(storedUserInfo);
                setUser(parsedUser);
            } catch (error) {
                console.error('Error parsing user info from localStorage:', error);
                localStorage.removeItem('userInfo');
            }
        }
        setIsLoading(false);
    }, []);

    // Login function - using axios directly with full URL to avoid baseURL issues
    const login = async (email, password) => {
        try {
            // Use the full URL directly to avoid any baseURL configuration issues
            const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
            console.log('Making login request to:', `${baseURL}/auth/login`);
            
            const { data } = await axios.post(`${baseURL}/auth/login`, { email, password });
            if (data) {
                // For admin user, we don't need to fetch additional details
                if (data._id === 'admin_user_id') {
                    // Admin user doesn't need additional details
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    setUser(data);
                    return data;
                }
                
                // For manager users, fetch additional details including permissions
                try {
                    const userDetails = await api.get(`/managers/${data._id}`).then(res => res.data);
                    const fullUserData = { 
                        ...data, 
                        ...userDetails,
                        // Ensure permissions are properly merged
                        permissions: {
                            ...(data.permissions || {}),
                            ...(userDetails.permissions || {})
                        }
                    };
                    localStorage.setItem('userInfo', JSON.stringify(fullUserData));
                    setUser(fullUserData);
                    return fullUserData; // Return the full user data
                } catch (detailsError) {
                    // If we can't fetch additional details, use the basic data
                    console.warn('Could not fetch user details, using basic data:', detailsError);
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    setUser(data);
                    return data; // Return the basic data
                }
            }
            return data;
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error response:', error.response);
            throw error;
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('userInfo');
        setUser(null);
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context easily
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext;