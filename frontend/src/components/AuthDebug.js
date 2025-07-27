// 📁 frontend/src/components/AuthDebug.js - COMPONENTE DE DEBUG
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { RefreshCw, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const AuthDebug = ({ show, onClose }) => {
  const { user, token, loading, error, isAuthenticated } = useAuth();
  
  // Estado do localStorage
  const savedUser = localStorage.getItem('auth_user');
  const savedToken = localStorage.getItem('auth_token');
  
  if (!show) return null;

  const debugInfo = {
    'Estado de Autenticação': {
      'isAuthenticated': isAuthenticated ? '✅ true' : '❌ false',
      'loading': loading ? '⏳ true' : '✅ false',
      'error': error || '✅ nenhum',
    },
    'Dados do Usuário': {
      'user existe': user ? '✅ sim' : '❌ não',
      'username': user?.username || '❌ não definido',
      'full_name': user?.full_name || '❌ não definido',
      'role': user?.role || '❌ não definido',
      'is_active': user?.is_active !== undefined ? (user.is_active ? '✅ ativo' : '❌ inativo') : '❌ não definido',
    },
    'Token de Autenticação': {
      'token existe': token ? '✅ sim' : '❌ não',
      'token length': token ? `${token.length} chars` : '0',
      'token preview': token ? `${token.substring(0, 20)}...` : '❌ nenhum',
    },
    'LocalStorage': {
      'auth_user salvo': savedUser ? '✅ sim' : '❌ não',
      'auth_token salvo': savedToken ? '✅ sim' : '❌ não',
      'user data válido': (() => {
        try {
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            return parsed.username ? '✅ válido' : '❌ inválido';
          }
          return '❌ não existe';
        } catch {
          return '❌ JSON inválido';
        }
      })(),
    },
    'Ambiente': {
      'NODE_ENV': process.env.NODE_ENV || 'development',
      'API_BASE_URL': 'http://localhost:5000',
      'Timestamp': new Date().toLocaleString('pt-BR'),
      'User Agent': navigator.userAgent.substring(0, 50) + '...',
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    alert('🧹 Dados de autenticação limpos!\nRecarregue a página.');
    window.location.reload();
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const data = await response.json();
        alert(`✅ API conectada!\nStatus: ${data.status}\nTimestamp: ${data.timestamp}`);
      } else {
        alert(`❌ API respondeu com erro: ${response.status}`);
      }
    } catch (error) {
      alert(`❌ Erro de conexão com API:\n${error.message}`);
    }
  };

  const forceReauth = async () => {
    if (confirm('🔄 Forçar nova autenticação?\n\nIsso irá limpar os dados salvos e recarregar a página.')) {
      clearAuthData();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Debug de Autenticação</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status geral */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {isAuthenticated ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Status: {isAuthenticated ? 'Autenticado' : 'Não Autenticado'}
              </h3>
              <p className="text-gray-600">
                {loading ? 'Verificando autenticação...' : 
                 error ? `Erro: ${error}` : 
                 isAuthenticated ? 'Usuário logado com sucesso' : 'Usuário precisa fazer login'}
              </p>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testApiConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Testar API
            </button>
            <button
              onClick={clearAuthData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar Dados
            </button>
            <button
              onClick={forceReauth}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Forçar Re-auth
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="p-6 space-y-6">
          {Object.entries(debugInfo).map(([category, items]) => (
            <div key={category} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(items).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="text-sm text-gray-600 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Dados brutos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-lg">Dados Brutos (JSON)</h4>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Usuário Atual:</h5>
                <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(user, null, 2) || 'null'}
                </pre>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-2">LocalStorage auth_user:</h5>
                <pre className="bg-gray-800 text-blue-400 p-3 rounded text-xs overflow-x-auto">
                  {savedUser || 'null'}
                </pre>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-2">Token (primeiros 100 chars):</h5>
                <pre className="bg-gray-800 text-yellow-400 p-3 rounded text-xs overflow-x-auto">
                  {(savedToken || token)?.substring(0, 100) + '...' || 'null'}
                </pre>
              </div>
            </div>
          </div>

          {/* Logs do console */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 Dicas de Debug:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Verifique o console do navegador (F12) para logs detalhados</li>
              <li>• Confirme se o backend está rodando em localhost:5000</li>
              <li>• Teste o endpoint /api/auth/verify-token manualmente</li>
              <li>• Verifique se não há CORS errors na aba Network</li>
              <li>• Se o token existe mas não funciona, pode estar expirado</li>
            </ul>
          </div>

          {/* Troubleshooting */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">🔧 Troubleshooting:</h4>
            <div className="text-sm text-red-700 space-y-2">
              <p><strong>Problema:</strong> Login não funciona</p>
              <p><strong>Soluções:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>1. Limpar dados de auth e tentar novamente</li>
                <li>2. Verificar se API está online</li>
                <li>3. Verificar credenciais (admin/Admin123!)</li>
                <li>4. Recarregar página completamente</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Este debug é apenas para desenvolvimento. Remova em produção.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;