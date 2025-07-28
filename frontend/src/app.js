// 📁 frontend/src/App.js - VERSÃO SIMPLIFICADA E FUNCIONAL

import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Login/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { RefreshCw, Shield, AlertCircle } from 'lucide-react';

// 🎯 Componente principal da aplicação
const AppContent = () => {
  const { isAuthenticated, user, loading, error } = useAuth();

  console.log('🎯 Estado da autenticação:', {
    isAuthenticated,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    loading,
    error
  });

  // 🔄 Loading state - enquanto verifica token
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema HVAC</h2>
          <p className="text-gray-600 font-medium mb-2">Verificando autenticação...</p>
          <p className="text-gray-500 text-sm">Restaurando sessão...</p>
          
          <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 Error state - apenas para erros críticos
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          
          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors w-full"
            >
              Tentar Novamente
            </button>
            
            <button 
              onClick={() => {
                localStorage.removeItem('auth_user');
                localStorage.removeItem('auth_token');
                window.location.reload();
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors w-full"
            >
              Limpar Dados e Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Lógica simples: autenticado = Dashboard, não autenticado = Login
  if (isAuthenticated && user) {
    console.log('✅ Usuário autenticado, carregando Dashboard');
    return <Dashboard />;
  } else {
    console.log('❌ Usuário não autenticado, carregando LoginPage');
    return <LoginPage />;
  }
};

// 🎯 Componente App principal
const App = () => {
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
};

export default App;