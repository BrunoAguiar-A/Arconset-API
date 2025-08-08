// 📁 frontend/src/App.js - VERSÃO CORRIGIDA PARA PRODUÇÃO

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import LoginPage from './components/Login/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import AuthDebug from './components/AuthDebug';
import { RefreshCw, Shield, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';

// 🎯 Componente principal da aplicação
const AppContent = () => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    error, 
    manualTokenCheck,
    getAuthStatus,
    resetAuth,
    clearError
  } = useAuth();

  // 🔍 Estado para debug (apenas em desenvolvimento)
  const [showDebug, setShowDebug] = React.useState(false);
  const [retryAttempts, setRetryAttempts] = React.useState(0);

  // ⌨️ Atalho para debug (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  // 🔄 Função para tentar novamente
  const handleRetry = async () => {
    setRetryAttempts(prev => prev + 1);
    clearError();
    
    try {
      await manualTokenCheck();
    } catch (error) {
      console.error('Erro ao tentar novamente:', error);
    }
  };

  // 🔄 Reset completo
  const handleFullReset = () => {
    resetAuth();
    setRetryAttempts(0);
    window.location.reload();
  };

  console.log('🎯 Estado da autenticação:', {
    isAuthenticated,
    hasUser: !!user,
    username: user?.username,
    role: user?.role,
    loading,
    error,
    retryAttempts
  });

  // 🔄 Loading state - MELHORADO
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          {/* Logo/Ícone */}
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Shield className="w-8 h-8 text-white" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white">
              <RefreshCw className="w-3 h-3 text-white animate-spin m-0.5" />
            </div>
          </div>
          
          {/* Título */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema HVAC</h2>
          
          {/* Status detalhado */}
          <div className="space-y-2 mb-6">
            <p className="text-gray-600 font-medium">
              {retryAttempts > 0 ? 'Tentando reconectar...' : 'Verificando autenticação...'}
            </p>
            <p className="text-gray-500 text-sm">
              {retryAttempts > 0 ? `Tentativa ${retryAttempts}` : 'Restaurando sessão...'}
            </p>
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000 animate-pulse" 
              style={{width: `${Math.min(60 + (retryAttempts * 10), 90)}%`}}
            ></div>
          </div>
          
          {/* Informações de sistema */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>🔐 Modo Produção • 🛡️ Seguro • ⚡ Otimizado</p>
            <p>Versão 2.0.0</p>
          </div>
          
          {/* Botão de retry se demorar muito */}
          {retryAttempts > 0 && (
            <div className="mt-6 space-y-2">
              <button 
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 🚨 Error state - MELHORADO
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          {/* Ícone de erro */}
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            {error.includes('rede') || error.includes('fetch') || error.includes('conectividade') ? (
              <WifiOff className="w-8 h-8 text-white" />
            ) : (
              <AlertCircle className="w-8 h-8 text-white" />
            )}
          </div>
          
          {/* Título baseado no tipo de erro */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error.includes('rede') || error.includes('fetch') ? 
              'Erro de Conectividade' : 
              'Erro de Autenticação'
            }
          </h2>
          
          {/* Mensagem de erro */}
          <p className="text-gray-600 mb-4">{error}</p>
          
          {/* Informações adicionais */}
          {retryAttempts > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Tentativas realizadas: {retryAttempts}
              </p>
            </div>
          )}
          
          {/* Ações */}
          <div className="space-y-2">
            <button 
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            
            <button 
              onClick={handleFullReset}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors w-full flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Reset Completo
            </button>
            
            {/* Debug em desenvolvimento */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={() => setShowDebug(true)}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors w-full flex items-center justify-center gap-2 text-sm"
              >
                🔍 Debug
              </button>
            )}
          </div>
          
          {/* Dicas de solução */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">💡 Soluções:</h3>
            <ul className="text-blue-700 text-sm space-y-1 text-left">
              <li>• Verifique sua conexão com a internet</li>
              <li>• Confirme se o servidor está rodando</li>
              <li>• Limpe o cache do navegador (Ctrl+F5)</li>
              <li>• Tente fazer logout e login novamente</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Estado de sucesso: decidir entre Dashboard ou Login
  if (isAuthenticated && user) {
    console.log('✅ Usuário autenticado, carregando Dashboard');
    return (
      <>
        <Dashboard />
        
        {/* Debug modal (apenas desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <AuthDebug 
            show={showDebug} 
            onClose={() => setShowDebug(false)} 
          />
        )}
        
        {/* Indicador de conexão */}
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Sistema Online</span>
            </div>
          </div>
        </div>
      </>
    );
  } else {
    console.log('❌ Usuário não autenticado, carregando LoginPage');
    return (
      <>
        <LoginPage />
        
        {/* Debug modal (apenas desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <AuthDebug 
            show={showDebug} 
            onClose={() => setShowDebug(false)} 
          />
        )}
      </>
    );
  }
};

// 🎯 Componente App principal com Error Boundary melhorado
const App = () => {
  console.log('🚀 Iniciando Sistema HVAC...');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <AppContent />
          
          {/* Informações de versão (apenas desenvolvimento) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 left-4 z-40">
              <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  <span>v2.0.0-prod</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-blue-400">DEV</span>
                </div>
                <div className="text-gray-400 mt-1">
                  Ctrl+Shift+D para debug
                </div>
              </div>
            </div>
          )}
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;