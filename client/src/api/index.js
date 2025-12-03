import axios from 'axios';
import { toast } from 'react-toastify';

// 1. Create an axios instance with a base URL
// Ensure we always have the correct API base URL
const getBaseURL = () => {
  // Check if we're in development or production
  if (process.env.NODE_ENV === 'production') {
    // In production, use the deployed API URL
    return process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
  }
  // In development, use localhost
  return process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// 2. Request Interceptor
// This runs before every request is sent
api.interceptors.request.use(
    (config) => {
        // Get the user token from localStorage
        const userInfo = localStorage.getItem('userInfo');
        
        // If we have a token, add it to the Authorization header
        if (userInfo) {
            const { token } = JSON.parse(userInfo);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        
        return config;
    },
    (error) => {
        // If there's an error with the request, reject the promise
        return Promise.reject(error);
    }
);

// 3. Response Interceptor
// This runs after every response is received
api.interceptors.response.use(
    (response) => {
        // If the response is successful, just return it
        return response;
    },
    (error) => {
        // If the error status is 401 (Unauthorized), redirect to login
        if (error.response && error.response.status === 401) {
            // Remove user info from localStorage
            localStorage.removeItem('userInfo');
            // Redirect to login page
            window.location.href = '/login';
        }
        
        // Handle 500 errors
        if (error.response && error.response.status === 500) {
            toast.error("Internal Server Error. Try again.");
        }
        
        // Handle 404 errors
        if (error.response && error.response.status === 404) {
            toast.error("Data not found. Please refresh the page.");
        }
        
        // Handle the case where we receive HTML instead of JSON
        if (error.response?.data?.startsWith?.('<!DOCTYPE')) {
            // Create a more descriptive error
            const newError = new Error('Server error: Received HTML instead of JSON');
            newError.response = {
                status: error.response.status,
                statusText: error.response.statusText,
                data: 'Server returned an HTML error page instead of JSON'
            };
            return Promise.reject(newError);
        }
        
        // Reject the promise with the error
        return Promise.reject(error);
    }
);

// Add helper methods for driver master
api.drivers = {
  getAll: () => api.get('/fg/drivers'),
  getById: (id) => api.get(`/fg/drivers/${id}`),
  create: (driverData) => api.post('/fg/drivers', driverData),
  update: (id, driverData) => api.put(`/fg/drivers/${id}`, driverData),
  delete: (id) => api.delete(`/fg/drivers/${id}`),
  getNextDriverCode: () => api.get('/fg/drivers/next-driver-code')
};

// 4. Export the configured axios instance
export default api;