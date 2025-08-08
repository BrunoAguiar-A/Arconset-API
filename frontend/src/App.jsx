// 📁 src/App.jsx - VERSÃO HÍBRIDA OTIMIZADA
import React from 'react';
import { AuthProvider, useAuth } from './components/Dashboard/hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Dashboard/pages/LoginPage';
import ErrorBoundary from './components/Dashboard/components/ErrorBoundary';
import ProtectedRoute from './components/Dashboard/components/ProtectedRoute';
import './App.css';

// 🎯 Componente principal - OTIMIZADO
const AppContent = () => {
  const { isAuthenticated, user, loading, error } = useAuth();

  console.log('🎯 Estado da aplicação:', {
    isAuthenticated,
    hasUser: !!user,
    username: user?.username,
    loading,
    error
  });

  // 🔄 Loading state otimizado
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema HVAC</h2>
          <p className="text-gray-600">Verificando autenticação...</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Sistema online</span>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 Error state otimizado
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Erro de Autenticação</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Tentar Novamente
            </button>
            
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Limpar Cache e Recarregar
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-white rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-2">💡 Soluções Rápidas:</h3>
            <ul className="text-sm text-gray-600 text-left space-y-1">
              <li>• Verifique sua conexão com a internet</li>
              <li>• Certifique-se de que o servidor está rodando</li>
              <li>• Limpe o cache do navegador (Ctrl+F5)</li>
              <li>• Tente acessar em uma aba anônima</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Renderização principal otimizada
  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <Dashboard />
    </ProtectedRoute>
  );
};

function App() {
  console.log('🚀 Iniciando Sistema HVAC Híbrido...');
  
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