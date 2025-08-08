// 📁 hooks/useAuth.js - VERSÃO CORRIGIDA PARA RESOLVER LOADING INFINITO
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// 🔧 Configuração simplificada
const API_BASE_URL = 'http://localhost:5000';

// Contexto
const AuthContext = createContext(null);

// 🚨 VERSÃO SIMPLIFICADA - SEM LOOPS
const useAuthLogic = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Flag para evitar múltiplas inicializações
  const initializedRef = useRef(false);

  console.log('🔐 useAuth state:', { 
    hasUser: !!user, 
    hasToken: !!token, 
    loading, 
    isAuthenticated,
    initialized: initializedRef.current
  });

  // ✅ Função para limpar dados
  const clearAuthData = useCallback(() => {
    console.log('🧹 Limpando dados de autenticação');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }, []);

  // ✅ Função para salvar dados
  const saveAuthData = useCallback((userData, authToken) => {
    console.log('💾 Salvando dados de autenticação:', userData.username);
    
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    setError(null);
    
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', authToken);
  }, []);

  // ✅ Fazer requisição com timeout
  const makeRequest = useCallback(async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, []);

  // ✅ Login simplificado
  const login = useCallback(async (username, password) => {
    console.log('🔑 Iniciando login para:', username);
    setLoading(true);
    setError(null);

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Login bem-sucedido:', data);

      if (data.success && data.token && data.user) {
        saveAuthData(data.user, data.token);
        return { success: true };
      } else {
        throw new Error('Resposta de login inválida');
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [makeRequest, saveAuthData]);

  // ✅ Logout simplificado
  const logout = useCallback(async () => {
    console.log('🚪 Fazendo logout');
    setLoading(true);

    try {
      const currentToken = token || localStorage.getItem('auth_token');
      
      if (currentToken) {
        // Tentar notificar o servidor, mas não esperar
        makeRequest(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }).catch(() => {}); // Ignorar erros
      }
    } finally {
      clearAuthData();
      setLoading(false);
    }
  }, [token, makeRequest, clearAuthData]);

  // ✅ Verificar token salvo - SIMPLIFICADO
  const checkSavedToken = useCallback(async () => {
    console.log('🔍 Verificando token salvo...');

    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (!savedToken || !savedUser) {
      console.log('❌ Nenhum token salvo encontrado');
      setLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      console.log('🔍 Dados salvos encontrados para:', userData.username);

      // ✅ VERIFICAR TOKEN COM SERVIDOR
      const response = await makeRequest(`${API_BASE_URL}/api/auth/verify-token`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Token verificado com sucesso');
        
        if (data.success && data.valid) {
          // Atualizar com dados mais recentes do servidor
          const updatedUser = { ...userData, ...data.user };
          saveAuthData(updatedUser, savedToken);
        } else {
          throw new Error('Token inválido');
        }
      } else {
        console.log('⏰ Token expirado ou inválido');
        throw new Error('Token expirado');
      }
    } catch (error) {
      console.log('❌ Erro na verificação do token:', error.message);
      
      // ✅ FALLBACK: Se for erro de rede, manter dados temporariamente
      if (error.name === 'AbortError' || error.message.includes('fetch')) {
        console.log('⚠️ Erro de rede - mantendo sessão temporariamente');
        try {
          const userData = JSON.parse(savedUser);
          saveAuthData(userData, savedToken);
        } catch (parseError) {
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } finally {
      setLoading(false);
    }
  }, [makeRequest, saveAuthData, clearAuthData]);

  // ✅ Requisição autenticada
  const authenticatedRequest = useCallback(async (endpoint, options = {}) => {
    const currentToken = token || localStorage.getItem('auth_token');
    
    if (!currentToken) {
      throw new Error('Token não encontrado');
    }

    const response = await makeRequest(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers
      }
    });

    if (response.status === 401) {
      console.log('🚨 Token expirado (401) - fazendo logout');
      clearAuthData();
      throw new Error('Sessão expirada');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    return response.json();
  }, [token, makeRequest, clearAuthData]);

  // ✅ INICIALIZAÇÃO - APENAS UMA VEZ
  useEffect(() => {
    if (initializedRef.current) {
      console.log('⏭️ useAuth já foi inicializado, pulando...');
      return;
    }

    console.log('🚀 Inicializando useAuth...');
    initializedRef.current = true;

    // Verificar token salvo imediatamente
    checkSavedToken();
  }, []); // ✅ ARRAY VAZIO - EXECUTA APENAS UMA VEZ

  // ✅ Funções auxiliares
  const hasRole = useCallback((requiredRoles) => {
    if (!user) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  }, [user]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isManager = useCallback(() => hasRole(['admin', 'manager']), [hasRole]);

  const clearError = useCallback(() => setError(null), []);

  return {
    // Estado
    user,
    token,
    loading,
    error,
    isAuthenticated,
    
    // Funções
    login,
    logout,
    authenticatedRequest,
    hasRole,
    isAdmin,
    isManager,
    clearError,
    
    // Debug
    checkSavedToken,
    
    // Status
    isInitialized: initializedRef.current
  };
};

// Provider
export const AuthProvider = ({ children }) => {
  const auth = useAuthLogic();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default useAuth;