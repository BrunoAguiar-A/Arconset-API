// 📁 src/hooks/useSecureBankMonitor.js - VERSÃO ATUALIZADA COM AUTENTICAÇÃO
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth'; // ✅ IMPORTAR HOOK DE AUTH

// 🔐 Configurações de segurança ultra rigorosas
const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  MAX_REQUESTS_PER_MINUTE: 10,
  REQUEST_TIMEOUT: 30000, // 30 segundos
  MAX_RETRIES: 2,
  RETRY_DELAY: 2000, // 2 segundos
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos máximo
  ALLOWED_ENDPOINTS: [
    '/api/bank-config',
    '/api/bank/authenticate', 
    '/api/bank/boletos',
    '/api/bank-config/test',
    '/api/bank-config/status',
    '/api/user/bank-profile', // ✅ NOVO ENDPOINT
    '/api/user/logout-bank',   // ✅ NOVO ENDPOINT
    '/api/user/logout-all-banks' // ✅ NOVO ENDPOINT
  ]
};

// 🛡️ Classe para gerenciamento seguro de autenticação - ATUALIZADA
class SecureAuthManager {
  constructor(authenticatedRequest, isAuthenticated, logout) {
    this.authenticatedRequest = authenticatedRequest; // ✅ USAR FUNÇÃO DO useAuth
    this.isAuthenticated = isAuthenticated; // ✅ VERIFICAR SE ESTÁ AUTENTICADO
    this.logout = logout; // ✅ FUNÇÃO DE LOGOUT
    this.requestCount = new Map();
    this.lastRequest = new Map();
    this.isInitialized = true;
    
    // ✅ VERIFICAR AUTENTICAÇÃO NA INICIALIZAÇÃO
    if (!this.isAuthenticated) {
      console.warn('⚠️ SecureAuthManager: Usuário não está autenticado');
    }
  }

  // ✅ MÉTODO ATUALIZADO - Usar authenticatedRequest do useAuth
  async secureRequest(url, options = {}) {
    // Verificar se está autenticado
    if (!this.isAuthenticated) {
      throw new Error('🔐 Usuário não está autenticado');
    }

    if (!this.isInitialized) {
      throw new Error('SecureAuthManager não está inicializado');
    }

    // URL completa se necessário
    const fullUrl = url.startsWith('http') ? url : url;

    // Validar URL
    const isAllowed = SECURITY_CONFIG.ALLOWED_ENDPOINTS.some(endpoint => 
      fullUrl.includes(endpoint)
    );
    
    if (!isAllowed) {
      throw new Error('🚫 URL não permitida');
    }

    // Rate limiting
    if (!this.checkRateLimit(fullUrl)) {
      throw new Error('🚫 Rate limit excedido. Aguarde alguns segundos.');
    }

    let lastError;
    
    // Retry com backoff exponencial
    for (let attempt = 0; attempt <= SECURITY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔐 Requisição segura autenticada (tentativa ${attempt + 1}):`, fullUrl);
        
        // ✅ USAR authenticatedRequest DO useAuth
        const data = await this.authenticatedRequest(fullUrl, options);
        
        console.log('✅ Requisição segura autenticada bem-sucedida');
        return data;

      } catch (error) {
        lastError = error;
        
        // Se é erro de autenticação (401), fazer logout
        if (error.message.includes('401') || error.message.includes('Sessão expirada')) {
          console.warn('🔓 Sessão expirada, fazendo logout...');
          try {
            await this.logout();
          } catch (logoutError) {
            console.error('Erro no logout:', logoutError);
          }
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        
        // Se é erro de rede
        if (error.message.includes('fetch') || error.message.includes('conexão')) {
          lastError = new Error('Erro de conexão: Verifique se o servidor está funcionando');
        }
        
        // Se é o último attempt, lançar erro
        if (attempt === SECURITY_CONFIG.MAX_RETRIES) {
          break;
        }
        
        // Aguardar antes de tentar novamente
        const delay = SECURITY_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente em ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  checkRateLimit(endpoint) {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${endpoint}_${minute}`;
    
    const count = this.requestCount.get(key) || 0;
    if (count >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      console.warn('🚫 Rate limit atingido para:', endpoint);
      return false;
    }
    
    this.requestCount.set(key, count + 1);
    this.cleanupOldCounters(minute);
    
    return true;
  }

  cleanupOldCounters(currentMinute) {
    for (const [mapKey] of this.requestCount) {
      const keyMinute = parseInt(mapKey.split('_').pop());
      if (currentMinute - keyMinute > 2) {
        this.requestCount.delete(mapKey);
      }
    }
  }

  clearSensitiveData() {
    try {
      this.requestCount.clear();
      this.lastRequest.clear();
      
      if (window.gc) {
        window.gc();
      }
    } catch (error) {
      console.warn('Erro no cleanup:', error);
    }
  }

  destroy() {
    this.clearSensitiveData();
    this.isInitialized = false;
  }
}

// 🔐 Hook principal ultra seguro - ATUALIZADO COM AUTENTICAÇÃO
export const useSecureBankMonitor = () => {
  // ✅ USAR HOOK DE AUTENTICAÇÃO
  const { 
    isAuthenticated, 
    authenticatedRequest, 
    logout, 
    user 
  } = useAuth();

  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ultimaVerificacao, setUltimaVerificacao] = useState(null);
  const [statusBancos, setStatusBancos] = useState({
    BRADESCO: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
    ITAU: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
    BANCO_BRASIL: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 }
  });
  const [configuracoesBanco, setConfiguracoesBanco] = useState({});
  const [sessionData, setSessionData] = useState(new Map());
  const [userBankProfile, setUserBankProfile] = useState(null); // ✅ NOVO ESTADO
  
  // Refs para controle de estado
  const intervalRef = useRef(null);
  const authManagerRef = useRef(null);
  const mountedRef = useRef(true);
  const lastActivityRef = useRef(Date.now());

  // ✅ INICIALIZAÇÃO ATUALIZADA COM AUTENTICAÇÃO
  useEffect(() => {
    if (isAuthenticated) {
      authManagerRef.current = new SecureAuthManager(
        authenticatedRequest,
        isAuthenticated,
        logout
      );
      
      console.log('🔐 SecureAuthManager inicializado com autenticação');
    } else {
      console.warn('⚠️ Usuário não autenticado, SecureAuthManager não será inicializado');
    }
    
    return () => {
      mountedRef.current = false;
      
      if (authManagerRef.current) {
        authManagerRef.current.destroy();
      }
      
      setSessionData(new Map());
      setBoletos([]);
      setConfiguracoesBanco({});
      setUserBankProfile(null);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, authenticatedRequest, logout]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const validateDataIntegrity = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    if ('success' in data && typeof data.success !== 'boolean') {
      console.warn('⚠️ Estrutura de resposta suspeita');
      return false;
    }
    
    return true;
  }, []);

  // ✅ NOVA FUNÇÃO - Carregar perfil bancário do usuário
  const carregarPerfilBancario = useCallback(async () => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return;
    }
    
    try {
      updateActivity();
      
      const response = await authManagerRef.current.secureRequest('/api/user/bank-profile');
      
      if (!validateDataIntegrity(response)) {
        throw new Error('Resposta inválida do servidor');
      }

      if (response.success && response.profile) {
        if (mountedRef.current) {
          setUserBankProfile(response.profile);
          console.log('✅ Perfil bancário carregado:', response.profile);
        }
      } else {
        throw new Error(response.error || 'Erro ao carregar perfil');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar perfil bancário:', error);
      if (mountedRef.current) {
        setUserBankProfile(null);
      }
    }
  }, [updateActivity, validateDataIntegrity, isAuthenticated]);

  // 🏦 Carregar configurações dos bancos - ATUALIZADO
  const carregarConfiguracoesBanco = useCallback(async () => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return;
    }
    
    try {
      updateActivity();
      
      const response = await authManagerRef.current.secureRequest('/api/bank-config');
      
      if (!validateDataIntegrity(response)) {
        throw new Error('Resposta inválida do servidor');
      }

      if ('success' in response && !response.success) {
        throw new Error(response.error || 'Erro na resposta do servidor');
      }

      if (mountedRef.current) {
        const configs = response.configs || response.data || {};
        setConfiguracoesBanco(configs);
        
        // Atualizar status baseado nas configurações
        Object.keys(configs).forEach(banco => {
          const config = configs[banco];
          if (config && mountedRef.current) {
            setStatusBancos(prev => ({
              ...prev,
              [banco]: {
                ...prev[banco],
                conectado: Boolean(config.hasCredentials && config.enabled),
                erro: null
              }
            }));
          }
        });
      }

      console.log('✅ Configurações bancárias carregadas com segurança');
      
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      
      if (mountedRef.current) {
        setStatusBancos(prev => {
          const newStatus = { ...prev };
          Object.keys(newStatus).forEach(banco => {
            newStatus[banco] = {
              ...newStatus[banco],
              conectado: false,
              erro: error.message || 'Erro desconhecido'
            };
          });
          return newStatus;
        });
      }
    }
  }, [updateActivity, validateDataIntegrity, isAuthenticated]);

  // 💾 Salvar configuração bancária - ATUALIZADO
  const salvarConfiguracaoBanco = useCallback(async (bankName, config) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return { success: false, error: 'Sistema não autenticado' };
    }
    
    try {
      updateActivity();
      
      // Validar dados de entrada
      if (!bankName || !['BRADESCO', 'ITAU', 'BANCO_BRASIL'].includes(bankName)) {
        throw new Error('Nome do banco inválido');
      }
      
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Client ID e Client Secret são obrigatórios');
      }
      
      if (config.clientId.length < 10 || config.clientSecret.length < 20) {
        throw new Error('Credenciais muito curtas');
      }
      
      // Verificar se não são dados de exemplo
      const suspiciousPatterns = ['example', 'test', 'demo', '123456', 'password'];
      const combinedText = `${config.clientId} ${config.clientSecret}`.toLowerCase();
      
      for (const pattern of suspiciousPatterns) {
        if (combinedText.includes(pattern)) {
          throw new Error(`Credenciais parecem ser dados de exemplo (contém: ${pattern})`);
        }
      }

      const response = await authManagerRef.current.secureRequest('/api/bank-config', {
        method: 'POST',
        body: JSON.stringify({
          bankName,
          config: {
            clientId: config.clientId.trim(),
            clientSecret: config.clientSecret.trim(),
            enabled: Boolean(config.enabled),
            contas: config.contas || []
          }
        })
      });

      if (!validateDataIntegrity(response)) {
        throw new Error('Resposta do servidor inválida');
      }
      
      if ('success' in response && response.success) {
        await carregarConfiguracoesBanco();
        await carregarPerfilBancario(); // ✅ ATUALIZAR PERFIL
        console.log(`✅ Configuração ${bankName} salva com segurança`);
        return { success: true };
      } else {
        throw new Error(response.error || 'Erro desconhecido ao salvar');
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      return { success: false, error: error.message };
    }
  }, [updateActivity, validateDataIntegrity, isAuthenticated, carregarConfiguracoesBanco, carregarPerfilBancario]);

  // 🔐 Autenticar com banco - ATUALIZADO
  const autenticarBanco = useCallback(async (bankName) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return null;
    }
    
    try {
      updateActivity();
      console.log(`🔐 Autenticando com ${bankName} via servidor...`);
      
      const response = await authManagerRef.current.secureRequest('/api/bank/authenticate', {
        method: 'POST',
        body: JSON.stringify({ bankName })
      });

      if (!validateDataIntegrity(response)) {
        throw new Error('Resposta inválida do servidor');
      }

      if ('success' in response && !response.success) {
        throw new Error(response.error || 'Falha na autenticação');
      }

      if (mountedRef.current && response.sessionToken) {
        const sessionInfo = {
          token: response.sessionToken,
          bankName: bankName,
          expiresAt: Date.now() + ((response.expiresIn || 1800) * 1000),
          createdAt: Date.now()
        };
        
        setSessionData(prev => {
          const newMap = new Map(prev);
          newMap.set(bankName, sessionInfo);
          return newMap;
        });
        
        setStatusBancos(prev => ({
          ...prev,
          [bankName]: { 
            ...prev[bankName], 
            conectado: true, 
            erro: null 
          }
        }));
        
        console.log(`✅ ${bankName}: Autenticado com sucesso`);
      }
      
      return response.sessionToken || null;
      
    } catch (error) {
      console.error(`❌ Erro na autenticação ${bankName}:`, error);
      
      if (mountedRef.current) {
        setStatusBancos(prev => ({
          ...prev,
          [bankName]: { 
            ...prev[bankName], 
            conectado: false, 
            erro: error.message 
          }
        }));
      }
      
      return null;
    }
  }, [updateActivity, validateDataIntegrity, isAuthenticated]);

  // 🔍 Verificar se sessão ainda é válida - MANTIDO
  const isSessionValid = useCallback((bankName) => {
    const session = sessionData.get(bankName);
    if (!session) return false;
    
    const now = Date.now();
    const isExpired = now >= session.expiresAt;
    
    if (isExpired) {
      setSessionData(prev => {
        const newMap = new Map(prev);
        newMap.delete(bankName);
        return newMap;
      });
      
      setStatusBancos(prev => ({
        ...prev,
        [bankName]: { 
          ...prev[bankName], 
          conectado: false, 
          erro: 'Sessão expirada' 
        }
      }));
      
      return false;
    }
    
    return true;
  }, [sessionData]);

  // 💳 Consultar boletos - ATUALIZADO
  const consultarBoletosBanco = useCallback(async (bankName) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return [];
    }
    
    const config = configuracoesBanco[bankName];
    if (!config || !config.enabled || !config.hasCredentials) {
      console.log(`⚠️ ${bankName}: Não configurado ou desabilitado`);
      return [];
    }

    if (!isSessionValid(bankName)) {
      console.log(`⚠️ ${bankName}: Sessão inválida, tentando autenticar...`);
      const token = await autenticarBanco(bankName);
      if (!token) {
        console.error(`❌ ${bankName}: Falha na autenticação`);
        return [];
      }
    }

    try {
      updateActivity();
      console.log(`🔍 Consultando boletos ${bankName} via servidor...`);
      
      const response = await authManagerRef.current.secureRequest(
        `/api/bank/boletos?bankName=${encodeURIComponent(bankName)}`
      );

      if (!validateDataIntegrity(response)) {
        throw new Error('Resposta do servidor inválida');
      }

      if ('success' in response && response.success) {
        const boletosEncontrados = response.boletos || response.data || [];
        
        // Validar estrutura dos boletos
        const boletosValidos = Array.isArray(boletosEncontrados) ? 
          boletosEncontrados.filter(boleto => {
            return boleto && 
                   typeof boleto.id === 'string' &&
                   typeof boleto.valor === 'number' &&
                   typeof boleto.beneficiario === 'string';
          }) : [];
        
        if (mountedRef.current) {
          setStatusBancos(prev => ({
            ...prev,
            [bankName]: { 
              ...prev[bankName], 
              ultimaConsulta: new Date(),
              totalBoletos: boletosValidos.length,
              erro: null
            }
          }));
        }
        
        console.log(`✅ ${bankName}: ${boletosValidos.length} boletos encontrados`);
        return boletosValidos;
        
      } else {
        throw new Error(response.error || 'Erro na consulta');
      }
      
    } catch (error) {
      console.error(`❌ Erro ao consultar boletos ${bankName}:`, error);
      
      if (mountedRef.current) {
        setStatusBancos(prev => ({
          ...prev,
          [bankName]: { 
            ...prev[bankName], 
            erro: error.message 
          }
        }));
      }
      
      return [];
    }
  }, [configuracoesBanco, updateActivity, validateDataIntegrity, isSessionValid, autenticarBanco, isAuthenticated]);

  // 🚀 Verificar todos os bancos - ATUALIZADO
  const verificarTodosBoletos = useCallback(async (silencioso = false) => {
    if (!mountedRef.current || !isAuthenticated) return;
    
    if (!silencioso) setLoading(true);
    
    try {
      updateActivity();
      console.log('🏦 Iniciando verificação segura em todos os bancos...');
      
      const bancosConfigurados = Object.keys(configuracoesBanco)
        .filter(banco => {
          const config = configuracoesBanco[banco];
          return config && config.enabled && config.hasCredentials;
        });
      
      if (bancosConfigurados.length === 0) {
        console.log('⚠️ Nenhum banco configurado para monitoramento');
        
        // Mock data com timestamps dinâmicos apenas se autenticado
        const mockBoletos = [
          {
            id: `mock-${Date.now()}-001`,
            beneficiario: 'Energia Elétrica Ltda',
            valor: 450.30,
            dataVencimento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            codigoBarras: '34191234567890123456789012345678901234567890',
            banco: 'Bradesco',
            conta: '12345-6',
            urgente: true,
            dataDeteccao: new Date().toISOString(),
            origem: 'API Bradesco (MOCK)',
            status: 'Pendente'
          },
          {
            id: `mock-${Date.now()}-002`,
            beneficiario: 'Telefonia Móvel S.A.',
            valor: 89.90,
            dataVencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            codigoBarras: '23791987654321098765432109876543210987654321',
            banco: 'Itaú',
            conta: '54321-0',
            urgente: false,
            dataDeteccao: new Date().toISOString(),
            origem: 'API Itaú (MOCK)',
            status: 'Pendente'
          }
        ];
        
        if (mountedRef.current) {
          setBoletos(mockBoletos);
          setUltimaVerificacao(new Date());
        }
        console.log('📋 Usando dados MOCK para demonstração');
        return;
      }

      const todosBoletosEncontrados = [];
      
      for (const banco of bancosConfigurados) {
        if (!mountedRef.current) break;
        
        try {
          const boletos = await consultarBoletosBanco(banco);
          todosBoletosEncontrados.push(...boletos);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Erro ao consultar ${banco}:`, error);
        }
      }
      
      if (!mountedRef.current) return;
      
      const boletosOrdenados = todosBoletosEncontrados
        .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));
      
      // Detectar novos boletos
      if (boletos.length > 0 && silencioso) {
        const novosBoletos = boletosOrdenados.filter(novo => 
          !boletos.find(existente => existente.id === novo.id)
        );
        
        if (novosBoletos.length > 0 && Notification.permission === 'granted') {
          try {
            new Notification('💳 Novos Boletos Bancários!', {
              body: `${novosBoletos.length} novo(s) boleto(s) detectados`,
              icon: '/favicon.ico',
              tag: 'bank-boletos'
            });
          } catch (error) {
            console.warn('Erro ao exibir notificação:', error);
          }
        }
      }
      
      setBoletos(boletosOrdenados);
      setUltimaVerificacao(new Date());
      
      console.log(`✅ Verificação concluída: ${boletosOrdenados.length} boletos encontrados`);
      
    } catch (error) {
      console.error('❌ Erro na verificação geral:', error);
    } finally {
      if (!silencioso && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [consultarBoletosBanco, boletos, configuracoesBanco, updateActivity, isAuthenticated]);

  // ✅ NOVA FUNÇÃO - Fazer logout bancário
  const logoutBanco = useCallback(async (bankName) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return { success: false, error: 'Sistema não autenticado' };
    }

    try {
      const response = await authManagerRef.current.secureRequest('/api/user/logout-bank', {
        method: 'POST',
        body: JSON.stringify({ bankName })
      });

      if (response.success) {
        // Limpar sessão local
        setSessionData(prev => {
          const newMap = new Map(prev);
          newMap.delete(bankName);
          return newMap;
        });

        setStatusBancos(prev => ({
          ...prev,
          [bankName]: {
            ...prev[bankName],
            conectado: false,
            erro: null
          }
        }));

        console.log(`🔓 Logout ${bankName} realizado com sucesso`);
        return { success: true };
      } else {
        throw new Error(response.error || 'Erro no logout');
      }
    } catch (error) {
      console.error('❌ Erro no logout bancário:', error);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ✅ NOVA FUNÇÃO - Fazer logout de todos os bancos
  const logoutTodosBancos = useCallback(async () => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return { success: false, error: 'Sistema não autenticado' };
    }

    try {
      const response = await authManagerRef.current.secureRequest('/api/user/logout-all-banks', {
        method: 'POST'
      });

      if (response.success) {
        // Limpar todas as sessões locais
        setSessionData(new Map());
        
        setStatusBancos({
          BRADESCO: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
          ITAU: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
          BANCO_BRASIL: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 }
        });

        console.log('🔓 Logout de todos os bancos realizado com sucesso');
        return { success: true, deletedSessions: response.deletedSessions };
      } else {
        throw new Error(response.error || 'Erro no logout');
      }
    } catch (error) {
      console.error('❌ Erro no logout de todos os bancos:', error);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated]);

  // ⏰ Configurar monitoramento automático - ATUALIZADO
  useEffect(() => {
    if (isAuthenticated) {
      carregarConfiguracoesBanco();
      carregarPerfilBancario(); // ✅ CARREGAR PERFIL
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(console.warn);
      }
    }
  }, [carregarConfiguracoesBanco, carregarPerfilBancario, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Limpar dados se não autenticado
      setBoletos([]);
      setConfiguracoesBanco({});
      setSessionData(new Map());
      setUserBankProfile(null);
      return;
    }

    const algumBancoConfigurado = Object.values(configuracoesBanco)
      .some(config => config && config.enabled && config.hasCredentials);
    
    if (algumBancoConfigurado && mountedRef.current) {
      verificarTodosBoletos();
      
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current || !isAuthenticated) return;
        
        const inactiveTime = Date.now() - lastActivityRef.current;
        const oneHour = 60 * 60 * 1000;
        
        if (inactiveTime < oneHour) {
          verificarTodosBoletos(true);
        }
      }, 15 * 60 * 1000); // 15 minutos
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [configuracoesBanco, verificarTodosBoletos, isAuthenticated]);

  // 🎯 Detectar atividade do usuário - MANTIDO
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // 📊 Estatísticas seguras - OTIMIZADO
  const getEstatisticas = useCallback(() => {
    if (!Array.isArray(boletos)) {
      return {
        total: 0,
        pendentes: 0,
        urgentes: 0,
        valorTotal: 0,
        porBanco: { bradesco: 0, itau: 0, bb: 0 }
      };
    }

    try {
      return {
        total: boletos.length,
        pendentes: boletos.filter(b => b.status === 'Pendente').length,
        urgentes: boletos.filter(b => b.urgente).length,
        valorTotal: boletos.reduce((sum, b) => sum + (Number(b.valor) || 0), 0),
        porBanco: {
          bradesco: boletos.filter(b => b.banco === 'Bradesco').length,
          itau: boletos.filter(b => b.banco === 'Itaú').length,
          bb: boletos.filter(b => b.banco === 'Banco do Brasil').length
        }
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        total: 0,
        pendentes: 0,
        urgentes: 0,
        valorTotal: 0,
        porBanco: { bradesco: 0, itau: 0, bb: 0 }
      };
    }
  }, [boletos]);

  // 🧹 Função para limpar sessões - ATUALIZADA
  const limparSessoes = useCallback(async () => {
    try {
      // Tentar fazer logout no servidor
      if (isAuthenticated && authManagerRef.current?.isInitialized) {
        await logoutTodosBancos();
      }
      
      // Limpar dados locais
      setSessionData(new Map());
      setBoletos([]);
      setStatusBancos({
        BRADESCO: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
        ITAU: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 },
        BANCO_BRASIL: { conectado: false, erro: null, ultimaConsulta: null, totalBoletos: 0 }
      });
      setUserBankProfile(null);
      
      if (authManagerRef.current?.isInitialized) {
        authManagerRef.current.clearSensitiveData();
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      console.log('🧹 Todas as sessões e dados sensíveis foram limpos');
    } catch (error) {
      console.error('Erro ao limpar sessões:', error);
    }
  }, [isAuthenticated, logoutTodosBancos]);

  // ✅ FUNÇÃO PARA DELETAR CONFIGURAÇÃO BANCÁRIA
  const deletarConfiguracaoBanco = useCallback(async (bankName) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return { success: false, error: 'Sistema não autenticado' };
    }

    try {
      // Fazer logout do banco primeiro
      await logoutBanco(bankName);

      // Deletar configuração no servidor
      const response = await authManagerRef.current.secureRequest(`/api/bank-config/${bankName}`, {
        method: 'DELETE',
        headers: {
          'X-Confirm-Delete': 'true'
        }
      });

      if (response.success) {
        // Atualizar dados locais
        await carregarConfiguracoesBanco();
        await carregarPerfilBancario();
        
        console.log(`✅ Configuração ${bankName} deletada com sucesso`);
        return { success: true };
      } else {
        throw new Error(response.error || 'Erro ao deletar configuração');
      }
    } catch (error) {
      console.error('❌ Erro ao deletar configuração:', error);
      return { success: false, error: error.message };
    }
  }, [isAuthenticated, logoutBanco, carregarConfiguracoesBanco, carregarPerfilBancario]);

  // ✅ FUNÇÃO PARA TESTAR CONFIGURAÇÃO BANCÁRIA
  const testarConfiguracaoBanco = useCallback(async (bankName) => {
    if (!mountedRef.current || !authManagerRef.current?.isInitialized || !isAuthenticated) {
      return { success: false, error: 'Sistema não autenticado' };
    }

    try {
      const response = await authManagerRef.current.secureRequest('/api/bank-config/test', {
        method: 'POST',
        body: JSON.stringify({ bankName })
      });

      if (response.success && response.testResult) {
        console.log(`✅ Teste ${bankName}: ${response.testResult.message}`);
        return { 
          success: true, 
          result: response.testResult 
        };
      } else {
        throw new Error(response.error || 'Erro no teste');
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, [isAuthenticated]);

  // ✅ RETORNO ATUALIZADO COM NOVAS FUNCIONALIDADES
  return {
    // 📊 Dados
    boletos: Array.isArray(boletos) ? boletos : [],
    loading: Boolean(loading),
    ultimaVerificacao,
    statusBancos: statusBancos || {},
    configuracoesBanco: configuracoesBanco || {},
    userBankProfile, // ✅ NOVO: Perfil bancário do usuário
    
    // 🎯 Funções principais
    verificarTodosBoletos,
    getEstatisticas,
    carregarConfiguracoesBanco,
    carregarPerfilBancario, // ✅ NOVO
    salvarConfiguracaoBanco,
    deletarConfiguracaoBanco, // ✅ NOVO
    testarConfiguracaoBanco, // ✅ NOVO
    
    // 🔐 Funções de autenticação bancária
    autenticarBanco,
    logoutBanco, // ✅ NOVO
    logoutTodosBancos, // ✅ NOVO
    limparSessoes,
    
    // 🔧 Status derivado
    bancosConfigurados: Object.fromEntries(
      Object.entries(configuracoesBanco).map(([banco, config]) => [
        banco.toLowerCase(),
        Boolean(config && config.hasCredentials && config.enabled)
      ])
    ),
    
    // 🛡️ Estado de segurança e autenticação
    isSecure: Boolean(authManagerRef.current?.isInitialized),
    isAuthenticated, // ✅ NOVO: Status de autenticação
    user, // ✅ NOVO: Dados do usuário
    lastActivity: lastActivityRef.current,
    
    // ✅ ESTATÍSTICAS AVANÇADAS
    estatisticasAvancadas: {
      totalConfiguracoes: Object.keys(configuracoesBanco).length,
      bancosAtivos: Object.values(statusBancos).filter(s => s.conectado).length,
      sessoesAtivas: sessionData.size,
      ultimaAtividade: new Date(lastActivityRef.current).toISOString(),
      perfilCarregado: Boolean(userBankProfile)
    }
  };
};

// ✅ HOOK AUXILIAR PARA GERENCIAR NOTIFICAÇÕES BANCÁRIAS
export const useBankNotifications = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);

  useEffect(() => {
    // Verificar permissão de notificações
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === 'granted');
      });
    }
  }, []);

  const sendNotification = useCallback((title, options = {}) => {
    if (!notificationsEnabled) return false;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'bank-notification',
        requireInteraction: false,
        ...options
      });

      setLastNotification({
        title,
        timestamp: new Date().toISOString(),
        options
      });

      // Auto-close após 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return false;
    }
  }, [notificationsEnabled]);

  const notifyNewBoletos = useCallback((count, bankName) => {
    return sendNotification('💳 Novos Boletos Detectados!', {
      body: `${count} novo(s) boleto(s) encontrados no ${bankName}`,
      tag: 'new-boletos'
    });
  }, [sendNotification]);

  const notifyUrgentBoleto = useCallback((boleto) => {
    return sendNotification('🚨 Boleto Urgente!', {
      body: `${boleto.beneficiario} - ${boleto.valor} - Vence hoje!`,
      tag: 'urgent-boleto',
      requireInteraction: true
    });
  }, [sendNotification]);

  const notifySessionExpired = useCallback((bankName) => {
    return sendNotification('⏰ Sessão Bancária Expirada', {
      body: `Sua sessão com ${bankName} expirou. Faça login novamente.`,
      tag: 'session-expired'
    });
  }, [sendNotification]);

  return {
    notificationsEnabled,
    lastNotification,
    sendNotification,
    notifyNewBoletos,
    notifyUrgentBoleto,
    notifySessionExpired,
    enableNotifications: () => {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationsEnabled(permission === 'granted');
        });
      }
    }
  };
};

// ✅ HOOK PARA ESTATÍSTICAS DE PERFORMANCE
export const useBankPerformanceStats = () => {
  const [stats, setStats] = useState({
    requestCount: 0,
    successRate: 100,
    averageResponseTime: 0,
    lastRequestTime: null,
    errors: []
  });

  const recordRequest = useCallback((duration, success, error = null) => {
    setStats(prev => {
      const newRequestCount = prev.requestCount + 1;
      const newSuccessRate = success 
        ? ((prev.successRate * prev.requestCount + 100) / newRequestCount)
        : ((prev.successRate * prev.requestCount) / newRequestCount);
      
      const newAverageResponseTime = (prev.averageResponseTime * prev.requestCount + duration) / newRequestCount;
      
      const newErrors = error 
        ? [...prev.errors.slice(-9), { error, timestamp: Date.now() }]
        : prev.errors;

      return {
        requestCount: newRequestCount,
        successRate: Math.round(newSuccessRate * 100) / 100,
        averageResponseTime: Math.round(newAverageResponseTime),
        lastRequestTime: Date.now(),
        errors: newErrors
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      requestCount: 0,
      successRate: 100,
      averageResponseTime: 0,
      lastRequestTime: null,
      errors: []
    });
  }, []);

  return {
    stats,
    recordRequest,
    resetStats
  };
};

export default useSecureBankMonitor;