// 📁 frontend/src/App.js - FORÇANDO LOGIN SEMPRE
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Login/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AuthDebug from './components/AuthDebug';
import { RefreshCw, Shield, AlertCircle, Bug } from 'lucide-react';

// 🎯 Componente principal da aplicação
const AppContent = () => {
  const { isAuthenticated, user, loading, error } = useAuth();
  const [showDebug, setShowDebug] = useState(false);

  // 🔴 FORCE LOGIN TEMPORÁRIO - SEMPRE MOSTRA LOGIN
  const FORCE_SHOW_LOGIN = true; // ✅ MUDE PARA false QUANDO TESTAR

  console.log('🎯 Estado da autenticação:', {
    isAuthenticated,
    hasUser: !!user,
    hasToken: !!localStorage.getItem('auth_token'),
    username: user?.username,
    loading,
    error,
    FORCE_SHOW_LOGIN
  });

  // 🔴 FORCE LOGIN ATIVO
  if (FORCE_SHOW_LOGIN) {
    console.log('🔴 FORCE LOGIN ATIVO - Mostrando LoginPage');
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-bold z-50">
          🔴 MODO FORCE LOGIN ATIVO - APENAS PARA TESTE
        </div>
        <div className="pt-10">
          <LoginPage />
        </div>
        
        {/* Debug em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <button
              onClick={() => setShowDebug(true)}
              className="fixed bottom-4 right-4 w-12 h-12 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors shadow-lg flex items-center justify-center z-40"
              title="Debug de Autenticação"
            >
              <Bug className="w-5 h-5" />
            </button>
            
            <AuthDebug 
              show={showDebug} 
              onClose={() => setShowDebug(false)} 
            />
          </>
        )}
      </>
    );
  }

  // 🔄 Loading state - enquanto verifica autenticação
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
          <p className="text-gray-500 text-sm">Aguarde um momento</p>
          
          <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setShowDebug(true)}
              className="mt-4 px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 flex items-center gap-1 mx-auto"
            >
              <Bug className="w-3 h-3" />
              Debug Auth
            </button>
          )}
        </div>
      </div>
    );
  }

  // 🚨 Error state global - apenas para erros críticos
  if (error && !isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro Crítico</h2>
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

            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => setShowDebug(true)}
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors w-full flex items-center justify-center gap-2"
              >
                <Bug className="w-4 h-4" />
                Ver Debug
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ USAR SEU PROTECTEDROUTE SUPERIOR!
  return (
    <>
      <ProtectedRoute fallback={<LoginPage />}>
        <Dashboard />
      </ProtectedRoute>
      
      {/* Debug apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <>
          <button
            onClick={() => setShowDebug(true)}
            className="fixed bottom-4 right-4 w-12 h-12 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors shadow-lg flex items-center justify-center z-40"
            title="Debug de Autenticação"
          >
            <Bug className="w-5 h-5" />
          </button>
          
          <AuthDebug 
            show={showDebug} 
            onClose={() => setShowDebug(false)} 
          />
        </>
      )}
    </>
  );
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