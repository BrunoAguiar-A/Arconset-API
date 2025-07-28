// 📁 frontend/src/hooks/useAuth.js - VERSÃO CORRIGIDA SEM LOOP INFINITO

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// 🔧 Configuração da API
const API_BASE_URL = 'http://localhost:5000';

// 🚨 CONFIGURAÇÕES ANTI-LOOP
const AUTH_CONFIG = {
  TOKEN_CHECK_ENABLED: false,        // 🚨 Desabilitar verificação automática
  TOKEN_CHECK_COOLDOWN: 300000,      // 🚨 5 minutos entre verificações
  HEALTH_CHECK_ENABLED: false,       // 🚨 Desabilitar health checks
  AUTO_VERIFY_ON_INIT: false,        // 🚨 Desabilitar verificação na inicialização
  REQUEST_TIMEOUT: 15000,            // 🚨 15 segundos timeout
  MAX_RETRY_ATTEMPTS: 2,             // 🚨 Máximo 2 tentativas
  SESSION_COOLDOWN: 60000,           // 🚨 1 minuto entre sessões
  ENABLE_DEBUG_LOGS: true            // 🚨 Logs detalhados para debug
};

// 🔐 SINGLETON GLOBAL PARA CONTROLE DE INSTÂNCIAS
const GlobalAuthState = {
  instance: null,
  isInitialized: false,
  lastTokenCheck: 0,
  lastHealthCheck: 0,
  requestCount: 0,
  sessionFlag: null
};

// Contexto de autenticação
const AuthContext = createContext(null);

// Lógica principal de autenticação - CORRIGIDA
const useAuthLogic = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 🔧 Referencias para controle
  const mountedRef = useRef(true);
  const instanceRef = useRef(Math.random().toString(36).substr(2, 9));
  const retryCountRef = useRef(0);

  // 🔧 Função de log condicional
  const debugLog = useCallback((message, data = null) => {
    if (AUTH_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`🔐 [${instanceRef.current}] ${message}`, data || '');
    }
  }, []);

  // 🔧 Limpar dados de autenticação - MANTIDA
  const clearAuthData = useCallback(() => {
    debugLog('🧹 Limpando dados de autenticação');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('last_token_check');
    
    // Reset estado global
    GlobalAuthState.lastTokenCheck = 0;
  }, [debugLog]);

  // 🔧 Salvar dados de autenticação - MANTIDA
  const saveAuthData = useCallback((userData, authToken) => {
    debugLog('✅ Salvando dados de autenticação:', userData.username);
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('last_token_check', Date.now().toString());
    
    // Atualizar estado global
    GlobalAuthState.lastTokenCheck = Date.now();
  }, [debugLog]);

  // 🔧 Função para obter token - MANTIDA
  const getAuthToken = useCallback(() => {
    return token || localStorage.getItem('auth_token');
  }, [token]);

  // 🔧 Verificar se está autenticado (função) - MANTIDA
  const isAuthenticatedFunction = useCallback(() => {
    return isAuthenticated && !!getAuthToken();
  }, [isAuthenticated, getAuthToken]);

  // 🚨 NOVA: Função para fazer requisições controladas
  const makeControlledRequest = useCallback(async (url, options = {}) => {
    // Controle de rate limiting
    GlobalAuthState.requestCount++;
    if (GlobalAuthState.requestCount > 5) {
      debugLog('🚨 Rate limit atingido, cancelando requisição');
      return null;
    }

    try {
      debugLog(`🌐 Fazendo requisição controlada para: ${url}`);
      
      // Controller para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AUTH_CONFIG.REQUEST_TIMEOUT);

      const defaultOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        ...options
      };

      const response = await fetch(url, defaultOptions);
      clearTimeout(timeoutId);
      
      // Reset contador após sucesso
      GlobalAuthState.requestCount = Math.max(0, GlobalAuthState.requestCount - 1);
      
      return response;
    } catch (error) {
      GlobalAuthState.requestCount = Math.max(0, GlobalAuthState.requestCount - 1);
      debugLog(`❌ Erro na requisição controlada:`, error.message);
      throw error;
    }
  }, [debugLog]);

  // 🔧 Verificar token com controles rigorosos - CORRIGIDA
  const checkPersistedToken = useCallback(async () => {
    // 🚨 VERIFICAÇÃO: Se verificação automática está desabilitada
    if (!AUTH_CONFIG.TOKEN_CHECK_ENABLED) {
      debugLog('🚨 Verificação automática de token desabilitada');
      
      // Usar dados salvos se existirem
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('auth_user');
      
      if (savedToken && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          debugLog('✅ Usando dados salvos sem verificação:', userData.username);
          saveAuthData(userData, savedToken);
        } catch (error) {
          debugLog('❌ Erro ao parsear dados salvos:', error);
          clearAuthData();
        }
      }
      
      setLoading(false);
      return;
    }

    debugLog('🔍 === VERIFICANDO TOKEN PERSISTIDO ===');
    
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    debugLog('🔍 Token salvo encontrado:', !!savedToken);
    debugLog('🔍 Usuário salvo encontrado:', !!savedUser);
    
    if (!savedToken || !savedUser) {
      debugLog('❌ Nenhum token ou usuário salvo encontrado');
      setLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(savedUser);
      debugLog('🔍 Dados do usuário salvos:', userData.username);
      
      // 🚨 VERIFICAÇÃO DE COOLDOWN: Evitar verificações muito frequentes
      const lastCheck = GlobalAuthState.lastTokenCheck || parseInt(localStorage.getItem('last_token_check') || '0');
      const now = Date.now();
      
      if (lastCheck && (now - lastCheck) < AUTH_CONFIG.TOKEN_CHECK_COOLDOWN) {
        debugLog('🔍 Token verificado recentemente, usando dados salvos');
        saveAuthData(userData, savedToken);
        setLoading(false);
        return;
      }
      
      debugLog('🔍 Token (primeiros 20 chars):', savedToken.substring(0, 20) + '...');
      
      // ✅ VERIFICAÇÃO DE SAÚDE DA API - CONDICIONAL
      if (AUTH_CONFIG.HEALTH_CHECK_ENABLED) {
        debugLog('🔍 Testando conexão com API...');
        try {
          const healthResponse = await makeControlledRequest(`${API_BASE_URL}/api/health`);
          
          if (!healthResponse || !healthResponse.ok) {
            debugLog('❌ API não está respondendo, usando dados salvos');
            saveAuthData(userData, savedToken);
            setLoading(false);
            return;
          }
          
          const healthData = await healthResponse.json();
          debugLog('✅ API respondendo:', healthData.success);
          
          if (!healthData.security?.auth_system_enabled) {
            debugLog('⚠️ Sistema de autenticação não habilitado, usando dados salvos');
            saveAuthData(userData, savedToken);
            setLoading(false);
            return;
          }
          
        } catch (healthError) {
          debugLog('❌ Erro ao testar API, usando dados salvos:', healthError.message);
          saveAuthData(userData, savedToken);
          setLoading(false);
          return;
        }
      }
      
      // ✅ VERIFICAR TOKEN COM ENDPOINT - COM CONTROLES
      debugLog('🔍 Enviando requisição de verificação...');
      
      const response = await makeControlledRequest(`${API_BASE_URL}/api/auth/verify-token`, {
        headers: { 
          'Authorization': `Bearer ${savedToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response) {
        debugLog('❌ Resposta nula, usando dados salvos');
        saveAuthData(userData, savedToken);
        setLoading(false);
        return;
      }

      debugLog('🔍 Status da resposta:', response.status);

      if (response.ok) {
        const data = await response.json();
        debugLog('🔍 Dados da verificação:', data);
        
        if (data.success && data.valid && data.user) {
          debugLog('✅ Token válido, restaurando sessão');
          
          // Atualizar dados com informações mais recentes do servidor
          const updatedUser = {
            ...userData,
            ...data.user
          };
          
          saveAuthData(updatedUser, savedToken);
          setLoading(false);
          return;
        } else {
          debugLog('❌ Resposta indica token inválido:', data);
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
          debugLog('❌ Resposta de erro (JSON):', errorData);
        } catch {
          const errorText = await response.text();
          debugLog('❌ Resposta de erro (texto):', errorText);
        }
        
        // Se for erro 401, token expirado
        if (response.status === 401) {
          debugLog('⏰ Token expirado (401)');
        }
      }
      
      debugLog('❌ Token inválido ou expirado, limpando dados');
      clearAuthData();
      
    } catch (error) {
      debugLog('❌ Erro ao verificar token:', error.message);
      
      // 🚨 SE FOR ERRO DE TIMEOUT OU REDE, MANTER DADOS SALVOS
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        debugLog('⚠️ Erro de timeout/rede, mantendo dados salvos temporariamente');
        try {
          const userData = JSON.parse(savedUser);
          saveAuthData(userData, savedToken);
        } catch (parseError) {
          debugLog('❌ Erro ao parsear dados salvos:', parseError);
          clearAuthData();
        }
        setLoading(false);
        return;
      }
      
      clearAuthData();
    } finally {
      setLoading(false);
    }
  }, [makeControlledRequest, saveAuthData, clearAuthData, debugLog]);

  // 🔧 Debug de token manual - CORRIGIDA
  const debugToken = useCallback(async (testToken = null) => {
    const tokenToTest = testToken || getAuthToken();
    
    if (!tokenToTest) {
      debugLog('🔍 DEBUG: Nenhum token para testar');
      return { valid: false, error: 'No token to test' };
    }

    try {
      debugLog('🔍 DEBUG: Testando token:', tokenToTest.substring(0, 20) + '...');
      
      const response = await makeControlledRequest(`${API_BASE_URL}/api/auth/debug-token`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${tokenToTest}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response) {
        return { valid: false, error: 'No response received' };
      }

      const data = await response.json();
      debugLog('🔍 DEBUG: Resultado do teste:', data);
      
      return data;
      
    } catch (error) {
      debugLog('❌ DEBUG: Erro ao testar token:', error.message);
      return { valid: false, error: error.message };
    }
  }, [getAuthToken, makeControlledRequest, debugLog]);

  // 🔧 Fazer logout - MANTIDA
  const logout = useCallback(async () => {
    setLoading(true);
    debugLog('🔓 Fazendo logout...');
    
    try {
      const currentToken = getAuthToken();
      if (currentToken) {
        const response = await makeControlledRequest(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response && response.ok) {
          debugLog('✅ Logout notificado ao servidor');
        } else {
          debugLog('⚠️ Erro ao notificar logout');
        }
      }
    } catch (error) {
      debugLog('⚠️ Erro ao notificar logout:', error.message);
    } finally {
      clearAuthData();
      setLoading(false);
      debugLog('🏁 Logout concluído');
    }
  }, [getAuthToken, makeControlledRequest, clearAuthData, debugLog]);

  // 🔧 Função para fazer requisições autenticadas - CORRIGIDA
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

    const currentToken = getAuthToken();
    if (currentToken) {
      defaultOptions.headers['Authorization'] = `Bearer ${currentToken}`;
    }

    debugLog(`🔐 Requisição autenticada: ${endpoint}`);
    
    try {
      const response = await makeControlledRequest(url, defaultOptions);
      
      if (!response) {
        throw new Error('Nenhuma resposta recebida');
      }
      
      if (response.status === 401) {
        debugLog('🚨 Token expirado ou inválido (401), fazendo logout...');
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
      debugLog(`❌ Erro na requisição ${endpoint}:`, error.message);
      throw error;
    }
  }, [getAuthToken, makeControlledRequest, clearAuthData, debugLog]);

  // 🔧 Fazer login com controles - CORRIGIDA
  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      debugLog('🔑 === INICIANDO LOGIN ===');
      debugLog('🔑 Username:', username);
      
      // 🚨 VERIFICAÇÃO DE SAÚDE DA API - CONDICIONAL
      if (AUTH_CONFIG.HEALTH_CHECK_ENABLED) {
        debugLog('🔍 Verificando disponibilidade da API...');
        try {
          const healthResponse = await makeControlledRequest(`${API_BASE_URL}/api/health`);
          if (!healthResponse || !healthResponse.ok) {
            throw new Error(`API não disponível`);
          }
          const healthData = await healthResponse.json();
          if (!healthData.success) {
            throw new Error('API reporta problemas de saúde');
          }
          debugLog('✅ API disponível e saudável');
        } catch (healthError) {
          debugLog('❌ API não está disponível:', healthError.message);
          throw new Error('Não foi possível conectar com o servidor. Verifique sua conexão.');
        }
      }
      
      const loginData = { username, password };
      
      debugLog('🔑 Enviando requisição de login...');
      
      const response = await makeControlledRequest(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      if (!response) {
        throw new Error('Nenhuma resposta recebida do servidor');
      }

      debugLog('🔑 Status da resposta de login:', response.status);
      
      const data = await response.json();
      debugLog('🔑 Dados da resposta de login:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (data.success && data.token && data.user) {
        debugLog('✅ Login bem-sucedido para:', data.user.username);
        debugLog('✅ Token recebido (primeiros 20 chars):', data.token.substring(0, 20) + '...');
        
        // ✅ SALVAR IMEDIATAMENTE
        saveAuthData(data.user, data.token);
        
        // ✅ TESTE OPCIONAL DO TOKEN
        if (AUTH_CONFIG.ENABLE_DEBUG_LOGS) {
          debugLog('🔍 Testando token após login...');
          try {
            const tokenTest = await debugToken(data.token);
            debugLog('🔍 Resultado do teste do token:', tokenTest);
          } catch (debugError) {
            debugLog('⚠️ Não foi possível testar token:', debugError.message);
          }
        }
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Credenciais inválidas');
      }
      
    } catch (error) {
      debugLog('❌ Erro no login:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [makeControlledRequest, saveAuthData, debugToken, debugLog]);

  // 🔧 Registrar usuário - CORRIGIDA
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      debugLog('📝 Registrando usuário:', userData.username);
      
      const response = await makeControlledRequest(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response) {
        throw new Error('Nenhuma resposta recebida do servidor');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (data.success) {
        debugLog('✅ Registro bem-sucedido');
        return { success: true, message: data.message };
      } else {
        throw new Error(data.error || 'Erro no registro');
      }
      
    } catch (error) {
      debugLog('❌ Erro no registro:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [makeControlledRequest, debugLog]);

  // 🔧 Verificar se usuário tem permissão - MANTIDA
  const hasRole = useCallback((requiredRoles) => {
    if (!user) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    
    return user.role === requiredRoles;
  }, [user]);

  // 🔧 Verificar se é admin - MANTIDA
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // 🔧 Verificar se é manager ou admin - MANTIDA
  const isManager = useCallback(() => {
    return hasRole(['admin', 'manager']);
  }, [hasRole]);

  // 🔧 Limpar erro - MANTIDA
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 🚨 NOVA: Inicialização manual
  const manualTokenCheck = useCallback(async () => {
    debugLog('🔍 Verificação manual de token solicitada');
    
    // Temporariamente habilitar verificação
    const originalEnabled = AUTH_CONFIG.TOKEN_CHECK_ENABLED;
    AUTH_CONFIG.TOKEN_CHECK_ENABLED = true;
    
    try {
      await checkPersistedToken();
    } finally {
      AUTH_CONFIG.TOKEN_CHECK_ENABLED = originalEnabled;
    }
  }, [checkPersistedToken, debugLog]);

  // 🚨 NOVA: Reset completo do sistema de auth
  const resetAuth = useCallback(() => {
    debugLog('🔄 Reset completo do sistema de autenticação');
    
    // Limpar estado global
    GlobalAuthState.instance = null;
    GlobalAuthState.isInitialized = false;
    GlobalAuthState.lastTokenCheck = 0;
    GlobalAuthState.lastHealthCheck = 0;
    GlobalAuthState.requestCount = 0;
    
    // Limpar dados locais
    clearAuthData();
    setLoading(false);
    setError(null);
    
    // Limpar flags de sessão
    sessionStorage.removeItem('auth_init');
    
    debugLog('✅ Reset completo concluído');
  }, [clearAuthData, debugLog]);

  // 🚨 NOVA: Obter status do sistema
  const getAuthStatus = useCallback(() => {
    return {
      isInitialized: GlobalAuthState.isInitialized,
      currentInstance: GlobalAuthState.instance,
      isControlling: GlobalAuthState.instance === instanceRef.current,
      requestCount: GlobalAuthState.requestCount,
      lastTokenCheck: GlobalAuthState.lastTokenCheck,
      sessionFlag: GlobalAuthState.sessionFlag,
      hasToken: !!getAuthToken(),
      hasUser: !!user,
      isAuthenticated,
      loading,
      error,
      config: AUTH_CONFIG
    };
  }, [getAuthToken, user, isAuthenticated, loading, error]);

  // ✅ INICIALIZAÇÃO CONTROLADA - CORRIGIDA
  useEffect(() => {
    // 🚨 VERIFICAÇÃO RIGOROSA: Evitar múltiplas inicializações
    if (GlobalAuthState.isInitialized || !mountedRef.current) {
      debugLog('🚀 Inicialização pulada - já inicializado ou componente desmontado');
      setLoading(false);
      return;
    }

    // 🚨 VERIFICAÇÃO DE SESSÃO: Evitar reinicializações na mesma sessão
    const sessionFlag = sessionStorage.getItem('auth_init');
    if (sessionFlag && !AUTH_CONFIG.AUTO_VERIFY_ON_INIT) {
      debugLog('🚀 Inicialização pulada - sessão já inicializada');
      setLoading(false);
      return;
    }

    debugLog('🚀 === INICIALIZANDO SISTEMA DE AUTENTICAÇÃO ===');
    
    // Marcar como inicializado
    GlobalAuthState.isInitialized = true;
    GlobalAuthState.instance = instanceRef.current;
    GlobalAuthState.sessionFlag = Date.now();
    sessionStorage.setItem('auth_init', GlobalAuthState.sessionFlag.toString());
    
    // 🚨 DELAY PARA EVITAR CONFLITOS
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        checkPersistedToken();
      }
    }, 1000); // 1 segundo de delay

    return () => {
      clearTimeout(timer);
    };
  }, []); // ✅ ARRAY VAZIO - EXECUTA APENAS UMA VEZ

  // ✅ CLEANUP RIGOROSO
  useEffect(() => {
    return () => {
      debugLog(`🧹 Limpando instância de auth ${instanceRef.current}`);
      mountedRef.current = false;
      
      // Liberar controle se for a instância ativa
      if (GlobalAuthState.instance === instanceRef.current) {
        GlobalAuthState.instance = null;
        debugLog(`🔓 Instância ${instanceRef.current} liberou controle de auth`);
      }
      
      // Reset contador
      GlobalAuthState.requestCount = Math.max(0, GlobalAuthState.requestCount - 1);
    };
  }, [debugLog]);

  // ✅ DEBUG: Log de mudanças de estado - CONDICIONAL
  useEffect(() => {
    if (AUTH_CONFIG.ENABLE_DEBUG_LOGS) {
      debugLog('🔍 === ESTADO DA AUTENTICAÇÃO ATUALIZADO ===');
      debugLog('   isAuthenticated:', isAuthenticated);
      debugLog('   hasUser:', !!user);
      debugLog('   hasToken:', !!getAuthToken());
      debugLog('   loading:', loading);
      debugLog('   error:', error);
      debugLog('   username:', user?.username);
      debugLog('   role:', user?.role);
    }
  }, [isAuthenticated, user, getAuthToken, loading, error, debugLog]);

  return {
    // Dados principais
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAuthenticatedFunction,
    getAuthToken,
    
    // Funções principais
    register,
    login,
    logout,
    hasRole,
    isAdmin,
    isManager,
    authenticatedRequest,
    clearError,
    
    // 🚨 NOVAS: Controles manuais
    manualTokenCheck,
    resetAuth,
    getAuthStatus,
    
    // Funções de debug
    checkPersistedToken: () => {
      const originalEnabled = AUTH_CONFIG.TOKEN_CHECK_ENABLED;
      AUTH_CONFIG.TOKEN_CHECK_ENABLED = true;
      const result = checkPersistedToken();
      AUTH_CONFIG.TOKEN_CHECK_ENABLED = originalEnabled;
      return result;
    },
    debugToken,
    
    // Status e configuração
    instanceId: instanceRef.current,
    isControllingInstance: GlobalAuthState.instance === instanceRef.current,
    config: AUTH_CONFIG
  };
};

// Provider de autenticação - MANTIDO
export const AuthProvider = ({ children }) => {
  const auth = useAuthLogic();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};

// Hook para usar autenticação - MANTIDO
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default useAuth;