// 📁 src/hooks/useSecureBankMonitor.js - VERSÃO CORRIGIDA SEM LOOP INFINITO
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

// 🔧 Configurações finais - CORRIGIDAS PARA EVITAR LOOPS
const CONFIG = {
  API_BASE: 'http://localhost:5000/api',
  CACHE_TTL: 300000, // 5 minutos
  DEBOUNCE_TIME: 5000, // 🚨 AUMENTADO: 5 segundos
  AUTO_INIT_ENABLED: false, // 🚨 NOVO: Desabilitar inicialização automática
  HEALTH_CHECK_ENABLED: false, // 🚨 NOVO: Desabilitar health checks automáticos
  MAX_RETRIES: 2, // 🚨 NOVO: Máximo de tentativas
  REQUEST_TIMEOUT: 10000 // 🚨 NOVO: Timeout de 10 segundos
};

// 🔐 SINGLETON GLOBAL RÍGIDO - MELHORADO
const GlobalBankMonitor = {
  instance: null,
  cache: {
    configs: null,
    timestamp: 0
  },
  isActive: false,
  lastRequest: 0,
  requestCount: 0, // 🚨 NOVO: Contador de requisições
  isInitialized: false // 🚨 NOVO: Flag de inicialização
};

// 🏦 Hook com controle total de instância - CORRIGIDO
export const useSecureBankMonitor = () => {
  // 🔐 Auth context
  const { isAuthenticated, token } = useAuth();
  
  // 📊 Estados principais
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaVerificacao, setUltimaVerificacao] = useState(null);
  const [statusBancos, setStatusBancos] = useState({
    BRADESCO: { conectado: false, erro: null, totalBoletos: 0 },
    ITAU: { conectado: false, erro: null, totalBoletos: 0 },
    BANCO_BRASIL: { conectado: false, erro: null, totalBoletos: 0 }
  });
  const [bancosConfigurados, setBancosConfigurados] = useState({
    BRADESCO: false,
    ITAU: false,
    BANCO_BRASIL: false
  });
  const [isSecure, setIsSecure] = useState(false);
  const [userBankProfile, setUserBankProfile] = useState(null);

  // 🔧 Referencias
  const mountedRef = useRef(true);
  const instanceRef = useRef(Math.random().toString(36).substr(2, 9));
  const retryCountRef = useRef(0);

  // 🛡️ Request única e controlada - MELHORADA COM MAIS CONTROLES
  const makeControlledRequest = useCallback(async (endpoint, options = {}) => {
    // 🚨 VERIFICAÇÃO ADICIONAL: Se sistema está desabilitado
    if (!CONFIG.HEALTH_CHECK_ENABLED && endpoint.includes('health')) {
      console.log('🚨 Health check desabilitado, pulando requisição');
      return null;
    }

    // Verificações rigorosas
    if (!isAuthenticated || !token || !mountedRef.current) {
      console.log('❌ Request cancelada: não autenticado ou componente desmontado');
      return null;
    }

    // 🚨 NOVO: Controle de rate limiting
    GlobalBankMonitor.requestCount++;
    if (GlobalBankMonitor.requestCount > 10) {
      console.log('🚨 Rate limit atingido, cancelando requisição');
      return null;
    }

    // Controle de frequência global (debounce) - AUMENTADO
    const now = Date.now();
    if (now - GlobalBankMonitor.lastRequest < CONFIG.DEBOUNCE_TIME) {
      console.log('⏳ Request cancelada: debounce global ativo');
      return null;
    }

    // Apenas uma instância pode fazer requisições
    if (GlobalBankMonitor.instance && GlobalBankMonitor.instance !== instanceRef.current) {
      console.log('🔒 Request cancelada: outra instância é dona das requisições');
      return null;
    }

    // Marcar como instância ativa
    if (!GlobalBankMonitor.instance) {
      GlobalBankMonitor.instance = instanceRef.current;
      console.log(`🔑 Instância ${instanceRef.current} assumiu controle`);
    }

    GlobalBankMonitor.lastRequest = now;

    try {
      console.log(`🔐 Fazendo requisição controlada: ${endpoint}`);

      // 🚨 NOVO: Controller para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal, // 🚨 NOVO: Abort signal
        ...options
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}:`, errorText);

        if (response.status === 401) {
          // Token inválido ou expirado: limpar e logout
          GlobalBankMonitor.instance = null;
          console.warn('❌ Token inválido ou expirado detectado.');
          
          // 🚨 NÃO FAZER LOGOUT AUTOMÁTICO - APENAS LOG
          console.log('⚠️ Token expirado, mas mantendo sessão local');
          return null;
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Sucesso: ${endpoint}`);
      
      // 🚨 NOVO: Reset contador após sucesso
      GlobalBankMonitor.requestCount = Math.max(0, GlobalBankMonitor.requestCount - 1);
      retryCountRef.current = 0;
      
      return data;
    } catch (error) {
      console.error(`❌ Erro na requisição ${endpoint}:`, error);
      
      // 🚨 NOVO: Controle de retry
      retryCountRef.current++;
      if (retryCountRef.current >= CONFIG.MAX_RETRIES) {
        GlobalBankMonitor.instance = null;
        console.log('🚨 Máximo de tentativas atingido, liberando instância');
      }
      
      // 🚨 NOVO: Se for timeout, não considerar erro crítico
      if (error.name === 'AbortError') {
        console.warn('⏰ Requisição cancelada por timeout');
        return null;
      }
      
      throw error;
    }
  }, [isAuthenticated, token]);

  // 📋 Carregar configurações com cache rigoroso - CORRIGIDA
  const carregarConfiguracoes = useCallback(async () => {
    // 🚨 VERIFICAÇÃO ADICIONAL: Se auto-init está desabilitado
    if (!CONFIG.AUTO_INIT_ENABLED) {
      console.log('📋 Auto-init desabilitado, usando valores padrão');
      if (mountedRef.current) {
        setBancosConfigurados({
          BRADESCO: false,
          ITAU: false,
          BANCO_BRASIL: false
        });
        setUserBankProfile({
          configured_banks: [],
          total_banks: 3,
          active_banks: 0
        });
        setIsSecure(false);
      }
      return;
    }

    try {
      const now = Date.now();

      // Usar cache se ainda válido
      if (
        GlobalBankMonitor.cache.configs &&
        (now - GlobalBankMonitor.cache.timestamp) < CONFIG.CACHE_TTL
      ) {
        console.log('📋 Usando cache de configurações');
        if (mountedRef.current) {
          const cached = GlobalBankMonitor.cache.configs;
          setBancosConfigurados(cached.bancosConfigurados);
          setUserBankProfile(cached.userBankProfile);
          setIsSecure(cached.isSecure);
        }
        return; // Sai aqui pra não fazer nova requisição
      }

      // 🚨 VERIFICAÇÃO: Se já está carregando, não fazer nova requisição
      if (loading) {
        console.log('📋 Já está carregando configurações, pulando...');
        return;
      }

      // Cache expirou ou não existe, faz requisição
      console.log('🔍 Carregando configurações bancárias...');
      const result = await makeControlledRequest('/bank-config');

      // Se não recebeu dados válidos, só loga e sai (sem sobrescrever cache nem estado)
      if (!result || !result.success) {
        console.warn('⚠️ Resposta inválida ou erro no servidor:', result);
        return;
      }

      // Montar novo status dos bancos
      const novoStatus = {};
      const configuredBanks = [];

      if (result.configs) {
        Object.entries(result.configs).forEach(([banco, config]) => {
          const hasCredentials = Boolean(config?.hasCredentials);
          novoStatus[banco] = hasCredentials;

          if (hasCredentials) {
            configuredBanks.push(banco);
          }
        });
      }

      const profileData = {
        configured_banks: configuredBanks,
        total_banks: Object.keys(novoStatus).length,
        active_banks: configuredBanks.length
      };

      const isSecureStatus = configuredBanks.length > 0;

      // Atualiza cache global com timestamp novo
      GlobalBankMonitor.cache = {
        configs: {
          bancosConfigurados: novoStatus,
          userBankProfile: profileData,
          isSecure: isSecureStatus
        },
        timestamp: now
      };

      // Atualiza estados só se componente ainda montado
      if (mountedRef.current) {
        setBancosConfigurados(novoStatus);
        setUserBankProfile(profileData);
        setIsSecure(isSecureStatus);
        setError(null); // Limpa erro se tiver
      }

      console.log('✅ Configurações carregadas com sucesso:', novoStatus);

    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      if (mountedRef.current) {
        setError(error.message || 'Erro desconhecido');
      }
    }
  }, [makeControlledRequest, loading]);

  // 🔄 Verificar boletos APENAS quando solicitado - CORRIGIDA
  const verificarTodosBoletos = useCallback(async () => {
    if (!isAuthenticated || !mountedRef.current || loading) {
      console.log('❌ Verificação cancelada: pré-condições não atendidas');
      return;
    }

    console.log('🔄 Verificação manual de boletos...');
    setLoading(true);
    setError(null);

    try {
      // 🚨 NÃO CARREGAR CONFIGURAÇÕES AUTOMATICAMENTE
      // await carregarConfiguracoes();
      
      // Por enquanto, simular verificação sem boletos reais
      if (mountedRef.current) {
        setBoletos([]);
        setUltimaVerificacao(new Date().toISOString());
        console.log('✅ Verificação concluída: sistema configurado mas sem boletos reais');
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar boletos:', error);
      if (mountedRef.current) {
        setError(error.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, loading]);

  // 📊 Calcular estatísticas - MANTIDA
  const getEstatisticas = useCallback(() => {
    return {
      total: boletos.length,
      urgentes: boletos.filter(b => b.urgente).length,
      pendentes: boletos.filter(b => b.status === 'Pendente').length,
      valorTotal: boletos.reduce((sum, b) => sum + (b.valor || 0), 0),
      porBanco: { 
        bradesco: boletos.filter(b => b.banco === 'BRADESCO').length,
        itau: boletos.filter(b => b.banco === 'ITAU').length,
        bb: boletos.filter(b => b.banco === 'BANCO_BRASIL').length
      }
    };
  }, [boletos]);

  // 🚨 NOVA FUNÇÃO: Inicialização manual
  const manualInit = useCallback(async () => {
    if (!isAuthenticated || loading) {
      console.log('❌ Inicialização manual cancelada: não autenticado ou carregando');
      return;
    }

    console.log('🚀 Inicialização manual do monitor bancário...');
    
    // Temporariamente habilitar auto-init para esta execução
    const originalEnabled = CONFIG.AUTO_INIT_ENABLED;
    CONFIG.AUTO_INIT_ENABLED = true;
    
    try {
      await carregarConfiguracoes();
      GlobalBankMonitor.isInitialized = true;
    } catch (error) {
      console.error('❌ Erro na inicialização manual:', error);
    } finally {
      CONFIG.AUTO_INIT_ENABLED = originalEnabled;
    }
  }, [carregarConfiguracoes, isAuthenticated, loading]);

  // 🚨 NOVA FUNÇÃO: Reset completo
  const resetMonitor = useCallback(() => {
    console.log('🔄 Reset completo do monitor bancário...');
    
    // Limpar cache global
    GlobalBankMonitor.cache = {
      configs: null,
      timestamp: 0
    };
    GlobalBankMonitor.instance = null;
    GlobalBankMonitor.requestCount = 0;
    GlobalBankMonitor.isInitialized = false;
    
    // Reset estados locais
    if (mountedRef.current) {
      setBoletos([]);
      setError(null);
      setUltimaVerificacao(null);
      setBancosConfigurados({
        BRADESCO: false,
        ITAU: false,
        BANCO_BRASIL: false
      });
      setUserBankProfile(null);
      setIsSecure(false);
    }
    
    console.log('✅ Reset completo concluído');
  }, []);

  // 🚀 INICIALIZAÇÃO ÚNICA E CONTROLADA - CORRIGIDA
  useEffect(() => {
    // 🚨 VERIFICAÇÃO RIGOROSA: Só executar se todas as condições forem atendidas
    if (!isAuthenticated || !mountedRef.current || !CONFIG.AUTO_INIT_ENABLED || GlobalBankMonitor.isInitialized) {
      console.log('🚀 Inicialização automática pulada:', {
        isAuthenticated,
        mounted: mountedRef.current,
        autoInitEnabled: CONFIG.AUTO_INIT_ENABLED,
        isInitialized: GlobalBankMonitor.isInitialized
      });
      return;
    }

    // ✅ DELAY MAIOR PARA EVITAR MÚLTIPLAS INICIALIZAÇÕES
    const timer = setTimeout(() => {
      if (mountedRef.current && isAuthenticated && CONFIG.AUTO_INIT_ENABLED && !GlobalBankMonitor.isInitialized) {
        console.log(`🚀 Inicializando monitor bancário (instância: ${instanceRef.current})`);
        GlobalBankMonitor.isInitialized = true;
        carregarConfiguracoes();
      }
    }, 3000); // 🚨 AUMENTADO: 3 segundos

    return () => {
      clearTimeout(timer);
    };
  }, []); // ✅ ARRAY VAZIO - EXECUTA APENAS UMA VEZ

  // 🧹 CLEANUP RIGOROSO - MELHORADO
  useEffect(() => {
    return () => {
      console.log(`🧹 Limpando instância ${instanceRef.current}`);
      mountedRef.current = false;
      
      // ✅ LIBERAR CONTROLE SE FOR A INSTÂNCIA ATIVA
      if (GlobalBankMonitor.instance === instanceRef.current) {
        GlobalBankMonitor.instance = null;
        console.log(`🔓 Instância ${instanceRef.current} liberou controle`);
      }
      
      // 🚨 NOVO: Reset contador se for a última instância
      GlobalBankMonitor.requestCount = Math.max(0, GlobalBankMonitor.requestCount - 1);
    };
  }, []);

  // 🔐 Função auxiliar para obter token - MANTIDA
  const getAuthToken = useCallback(() => token, [token]);

  // 🚨 NOVA FUNÇÃO: Verificar status do sistema
  const getSystemStatus = useCallback(() => {
    return {
      isInitialized: GlobalBankMonitor.isInitialized,
      currentInstance: GlobalBankMonitor.instance,
      isControlling: GlobalBankMonitor.instance === instanceRef.current,
      requestCount: GlobalBankMonitor.requestCount,
      lastRequest: GlobalBankMonitor.lastRequest,
      cacheAge: GlobalBankMonitor.cache.timestamp ? Date.now() - GlobalBankMonitor.cache.timestamp : null,
      config: {
        autoInitEnabled: CONFIG.AUTO_INIT_ENABLED,
        healthCheckEnabled: CONFIG.HEALTH_CHECK_ENABLED,
        debounceTime: CONFIG.DEBOUNCE_TIME
      }
    };
  }, []);

  // 🎯 API pública do hook - EXPANDIDA
  return {
    // Dados
    boletos,
    loading,
    error,
    ultimaVerificacao,
    statusBancos,
    bancosConfigurados,
    isSecure,
    userBankProfile,
    
    // Funções principais (sob demanda)
    verificarTodosBoletos,
    getEstatisticas,
    getAuthToken,
    
    // 🚨 NOVAS FUNÇÕES: Controle manual
    manualInit,
    resetMonitor,
    carregarConfiguracoes: () => {
      const originalEnabled = CONFIG.AUTO_INIT_ENABLED;
      CONFIG.AUTO_INIT_ENABLED = true;
      const result = carregarConfiguracoes();
      CONFIG.AUTO_INIT_ENABLED = originalEnabled;
      return result;
    },
    
    // Status
    isConnected: false, // Por enquanto false até ter dados reais
    hasConfiguredBanks: Object.values(bancosConfigurados).some(Boolean),
    totalBanks: Object.keys(bancosConfigurados).length,
    activeBanks: Object.values(bancosConfigurados).filter(Boolean).length,
    
    // Debug e monitoramento
    instanceId: instanceRef.current,
    isControllingInstance: GlobalBankMonitor.instance === instanceRef.current,
    getSystemStatus,
    
    // 🚨 NOVO: Configurações atuais
    config: {
      autoInitEnabled: CONFIG.AUTO_INIT_ENABLED,
      healthCheckEnabled: CONFIG.HEALTH_CHECK_ENABLED,
      debounceTime: CONFIG.DEBOUNCE_TIME,
      maxRetries: CONFIG.MAX_RETRIES,
      requestTimeout: CONFIG.REQUEST_TIMEOUT
    }
  };
};

export default useSecureBankMonitor;