// src/components/auth/ProtectedRoute.js - typical implementation
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  console.log('ProtectedRoute rendering');
  const { isAuthenticated, loading } = useContext(AuthContext);
  console.log('Auth in ProtectedRoute:', { isAuthenticated, loading });

  if (loading) {
    // Add a simple loading indicator here
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('Authenticated, rendering children');
  return children;
};

export default ProtectedRoute;