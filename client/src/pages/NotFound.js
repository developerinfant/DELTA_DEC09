import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

/**
 * A component to display when a user navigates to a non-existent route (404 Error).
 * It provides a clear message and a link to return to the homepage.
 */
const NotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-center p-6">
            <FaExclamationTriangle className="text-yellow-400 text-6xl mb-4" />
            
            <h1 className="text-9xl font-extrabold text-gray-800 tracking-widest">
                404
            </h1>
            
            <div className="bg-indigo-600 px-2 text-sm rounded rotate-12 absolute">
                Page Not Found
            </div>
            
            <p className="mt-4 text-lg text-gray-600">
                Oops! The page you’re looking for doesn’t exist.
            </p>
            
            <p className="text-md text-gray-500 mt-2">
                It might have been moved or deleted.
            </p>

            <Link
                to="/"
                className="mt-8 inline-block px-8 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
            >
                Go Back Home
            </Link>
        </div>
    );
};

export default NotFound;