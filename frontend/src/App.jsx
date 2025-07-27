// src/App.jsx - VERSÃO CORRIGIDA COM LOGIN
import React from 'react';
import { AuthProvider, useAuth } from './components/Dashboard/hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Dashboard/pages/LoginPage';
import ErrorBoundary from './components/Dashboard/components/ErrorBoundary';
import ProtectedRoute from './components/Dashboard/components/ProtectedRoute';
import './App.css';

// 🎯 Componente principal da aplicação
const AppContent = () => {
  const { isAuthenticated, user, loading, error } = useAuth();

  console.log('🎯 Estado da autenticação:', {
    isAuthenticated,
    hasUser: !!user,
    username: user?.username,
    loading,
    error
  });

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // 🚨 Error state
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ✅ Usar ProtectedRoute para controlar acesso
  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <Dashboard />
    </ProtectedRoute>
  );
};

// 🎯 Componente App principal
function App() {
  console.log('🚀 Iniciando Sistema HVAC...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <AppContent />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;