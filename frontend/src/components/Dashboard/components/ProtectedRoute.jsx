// 📁 frontend/src/components/ProtectedRoute.jsx - NOVO COMPONENTE
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import { RefreshCw, Shield, AlertTriangle } from 'lucide-react';

const ProtectedRoute = ({ 
  children, 
  requiredRoles = null,
  fallback = null 
}) => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    hasRole 
  } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
          <p className="text-gray-500 text-sm mt-2">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginPage />;
  }

  // Check roles if required
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta área.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-sm text-red-700">
              <p><strong>Seu perfil:</strong> {user?.role || 'N/A'}</p>
              <p><strong>Requerido:</strong> {
                Array.isArray(requiredRoles) 
                  ? requiredRoles.join(' ou ') 
                  : requiredRoles
              }</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Entre em contato com o administrador para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return children;
};

// 🎯 HOC para proteger componentes
export const withAuth = (Component, requiredRoles = null) => {
  return (props) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// 🎯 HOC para componentes que requerem admin
export const withAdminAuth = (Component) => {
  return withAuth(Component, 'admin');
};

// 🎯 HOC para componentes que requerem manager ou admin
export const withManagerAuth = (Component) => {
  return withAuth(Component, ['admin', 'manager']);
};

export default ProtectedRoute;