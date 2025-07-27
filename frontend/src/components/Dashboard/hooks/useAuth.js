// 📁 frontend/src/hooks/useAuth.js - VERSÃO DEFINITIVA SEM AUTO-LOGIN
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// 🔧 Configuração da API
const API_BASE_URL = 'http://localhost:5000';

// Contexto de autenticação
const AuthContext = createContext(null);

// Lógica principal de autenticação
const useAuthLogic = () => {
  // 🔴 FORCE CLEAR IMEDIATO - ADICIONE ESTAS LINHAS
  React.useLayoutEffect(() => {
    console.log('🔴 FORCE CLEAR EXECUTANDO...');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    console.log('🧹 TUDO LIMPO FORÇADAMENTE!');
  }, []);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false); // ✅ MUDANÇA: INICIA COMO false
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // ✅ SEMPRE INICIA COMO false

  // 🔧 Limpar dados de autenticação
  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    console.log('🧹 Dados de autenticação limpos');
  }, []);

  // 🔧 Salvar dados de autenticação
  const saveAuthData = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', authToken);
    console.log('✅ Dados de autenticação salvos:', userData.username);
  }, []);

  // 🔧 Fazer logout
  const logout = useCallback(async () => {
    setLoading(true);
    console.log('🔓 Fazendo logout...');
    
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Logout notificado ao servidor');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao notificar logout:', error.message);
    } finally {
      clearAuthData();
      setLoading(false);
      console.log('🏁 Logout concluído');
    }
  }, [token, clearAuthData]);

  // 🔧 Função para fazer requisições autenticadas
  const authenticatedRequest = useCallback(async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...options
    };

    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`🔐 Requisição autenticada: ${endpoint}`);
    
    try {
      const response = await fetch(url, defaultOptions);
      
      if (response.status === 401) {
        console.warn('🚨 Token expirado ou inválido, fazendo logout...');
        clearAuthData();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Erro HTTP ${response.status}`;
        } catch {
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      throw error;
    }
  }, [token, clearAuthData]);

  // 🔧 Verificar token (apenas quando solicitado manualmente)
  const verifyToken = useCallback(async (tokenToVerify = null) => {
    const checkToken = tokenToVerify || token;
    
    if (!checkToken) {
      console.log('🔍 Nenhum token para verificar');
      return { valid: false, user: null };
    }

    try {
      console.log('🔍 Verificando validade do token...');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${checkToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Resultado da verificação:', data.success ? 'VÁLIDO' : 'INVÁLIDO');
        
        if (data.success && data.user) {
          return { valid: true, user: data.user };
        }
      }
      
      console.log('❌ Token inválido ou expirado');
      return { valid: false, user: null };
      
    } catch (error) {
      console.error('❌ Erro na verificação do token:', error);
      return { valid: false, user: null };
    }
  }, [token]);

  // 🔧 Registrar usuário
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Registrando usuário:', userData.username);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (data.success) {
        console.log('✅ Registro bem-sucedido');
        return { success: true, message: data.message };
      } else {
        throw new Error(data.error || 'Erro no registro');
      }
      
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔧 Fazer login
  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔑 Tentando login para:', username);
      
      const loginData = {
        username: username,
        password: password
      };
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (data.success && data.token && data.user) {
        console.log('✅ Login bem-sucedido para:', data.user.username);
        saveAuthData(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Credenciais inválidas');
      }
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [saveAuthData]);

  // 🔧 Verificar se usuário tem permissão
  const hasRole = useCallback((requiredRoles) => {
    if (!user) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    
    return user.role === requiredRoles;
  }, [user]);

  // 🔧 Verificar se é admin
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // 🔧 Verificar se é manager ou admin
  const isManager = useCallback(() => {
    return hasRole(['admin', 'manager']);
  }, [hasRole]);

  // 🔧 Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ✅ INICIALIZAÇÃO CORRIGIDA - NUNCA MAIS AUTO-LOGIN!
  useEffect(() => {
    console.log('🚀 Inicializando sistema de autenticação...');
    console.log('🔴 MODO SEGURO: Sem verificação automática de tokens');
    console.log('👤 Usuário deve fazer login manualmente');
    
    // ✅ FORÇA ESTADO INICIAL LIMPO
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setLoading(false);
    setError(null);
    
    // ✅ LIMPAR QUALQUER DADO RESIDUAL (OPCIONAL - DESCOMENTE SE QUISER)
    // localStorage.removeItem('auth_user');
    // localStorage.removeItem('auth_token');
    
    console.log('🏁 Inicialização concluída - Sistema pronto para login manual');
  }, []); // ✅ SEM DEPENDÊNCIAS

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    verifyToken,
    hasRole,
    isAdmin,
    isManager,
    authenticatedRequest,
    clearError
  };
};

// Provider de autenticação
export const AuthProvider = ({ children }) => {
  const auth = useAuthLogic();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};

// Hook para usar autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default useAuth;