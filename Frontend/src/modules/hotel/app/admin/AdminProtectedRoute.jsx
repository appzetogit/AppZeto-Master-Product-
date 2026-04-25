import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAdminStore from './store/adminStore';
import { Loader2 } from 'lucide-react';

const AdminProtectedRoute = () => {
  const { isAuthenticated, loading, checkAuth } = useAdminStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-400 font-medium">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to admin login while saving the attempted location
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
