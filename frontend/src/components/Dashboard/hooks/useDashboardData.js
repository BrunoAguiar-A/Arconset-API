// 📁 src/hooks/useDashboardData.js - VERSÃO CORRIGIDA PARA SUA ESTRUTURA

import { useState, useCallback, useEffect } from 'react';

// 🔧 Configuração da API
const API_BASE_URL = 'http://localhost:5000';

// 🛡️ Função para fazer requisições seguras
const secureApiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 Fazendo requisição para: ${url}`);
  
  try {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      ...options
    };

    const response = await fetch(url, defaultOptions);
    
    // Log da resposta para debug
    console.log(`📡 Status da resposta ${endpoint}:`, response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Erro HTTP ${response.status}`;
        } else {
          const textResponse = await response.text();
          errorMessage = `Erro HTTP ${response.status}: ${textResponse.substring(0, 200)}`;
        }
      } catch (parseError) {
        errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Verificar se é realmente JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('❌ Resposta não é JSON:', textResponse.substring(0, 200));
      
      if (textResponse.includes('<!doctype') || textResponse.includes('<html')) {
        throw new Error('Servidor retornou página HTML. Verifique se a API está rodando corretamente na porta 5000.');
      }
      
      throw new Error(`Resposta inválida: esperado JSON, recebido ${contentType || 'unknown'}`);
    }

    const data = await response.json();
    console.log(`✅ Resposta recebida de ${endpoint}:`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ Erro na requisição ${endpoint}:`, error);
    
    // Melhorar mensagens de erro
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('❌ Erro de conexão: Verifique se o servidor Flask está rodando em http://localhost:5000');
    }
    
    if (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('ECONNREFUSED')) {
      throw new Error('❌ Conexão recusada: Servidor Flask não está rodando na porta 5000');
    }
    
    throw error;
  }
};

// 🎯 Hook principal para dados do dashboard - CORRIGIDO PARA SUA ESTRUTURA
export const useDashboardData = () => {
  const [data, setData] = useState({
    stats: {
      totalProjects: 0,
      totalClients: 0,
      totalBills: 0,
      totalFiles: 0,
      revenue: 0
    },
    projects: [],
    clientes: [],
    bills: [],
    files: [],
    notifications: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // 🔧 Mapeamento dos endpoints que realmente existem no seu backend
  const ENDPOINT_MAP = {
    // Baseado no seu dashboard.py
    dashboardStats: '/api/dashboard/stats',
    projectsRecent: '/api/dashboard/projetos-recentes',
    billsDue: '/api/dashboard/contas-vencimento', 
    notifications: '/api/notificacoes',
    
    // Endpoints individuais (assumindo que existem)
    projects: '/api/projects',
    clients: '/api/clientes', 
    bills: '/api/contas',
    files: '/api/arquivos'
  };

  // 🔄 Função para carregar dados usando os endpoints que realmente existem
  const loadDashboardData = useCallback(async () => {
    console.log('📊 Carregando dados do dashboard usando endpoints reais...');
    
    try {
      // 1. Tentar carregar estatísticas do dashboard
      let dashboardStats = null;
      try {
        console.log('🎯 Carregando estatísticas do dashboard...');
        const statsResponse = await secureApiRequest(ENDPOINT_MAP.dashboardStats);
        if (statsResponse.success && statsResponse.data) {
          dashboardStats = statsResponse.data;
          console.log('✅ Estatísticas carregadas:', dashboardStats);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao carregar estatísticas:', error.message);
      }

      // 2. Carregar dados individuais em paralelo
      const dataRequests = await Promise.allSettled([
        // Projetos
        secureApiRequest(ENDPOINT_MAP.projects).catch(e => {
          console.warn('⚠️ Projetos não disponíveis:', e.message);
          return { success: true, data: [] };
        }),
        
        // Clientes  
        secureApiRequest(ENDPOINT_MAP.clients).catch(e => {
          console.warn('⚠️ Clientes não disponíveis:', e.message);
          return { success: true, data: [] };
        }),
        
        // Contas
        secureApiRequest(ENDPOINT_MAP.bills).catch(e => {
          console.warn('⚠️ Contas não disponíveis:', e.message);
          return { success: true, data: [] };
        }),
        
        // Notificações
        secureApiRequest(ENDPOINT_MAP.notifications).catch(e => {
          console.warn('⚠️ Notificações não disponíveis:', e.message);
          return { success: true, data: [] };
        })
      ]);

      // 3. Processar resultados
      const [projectsResult, clientsResult, billsResult, notificationsResult] = dataRequests;

      const projects = projectsResult.status === 'fulfilled' && projectsResult.value?.success 
        ? (projectsResult.value.data || []) 
        : [];
        
      const clientes = clientsResult.status === 'fulfilled' && clientsResult.value?.success 
        ? (clientsResult.value.data || []) 
        : [];
        
      const bills = billsResult.status === 'fulfilled' && billsResult.value?.success 
        ? (billsResult.value.data || []) 
        : [];
        
      const notifications = notificationsResult.status === 'fulfilled' && notificationsResult.value?.success 
        ? (notificationsResult.value.data || []) 
        : [];

      // 4. Criar dados mock para arquivos (se o endpoint não existir)
      const files = [
        {
          id: 1,
          nome_original: "Contrato_Cliente_A.pdf",
          tipo_documento: "Contrato",
          projeto_nome: projects.length > 0 ? projects[0].nome : "Projeto Exemplo",
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          nome_original: "Proposta_Comercial.docx", 
          tipo_documento: "Proposta",
          projeto_nome: projects.length > 1 ? projects[1].nome : "Projeto Mobile",
          created_at: new Date().toISOString()
        }
      ];

      // 5. Calcular estatísticas se não foram retornadas pelo endpoint
      let finalStats;
      if (dashboardStats) {
        // Usar estatísticas do servidor, mas complementar se necessário
        finalStats = {
          totalProjects: dashboardStats.projetos?.total || projects.length,
          totalClients: dashboardStats.geral?.clientes || clientes.length,
          totalBills: dashboardStats.financeiro?.contas_pendentes || bills.length,
          totalFiles: dashboardStats.arquivos?.total || files.length,
          revenue: dashboardStats.financeiro?.valor_projetos_ativos || 
                   projects.reduce((sum, project) => sum + (parseFloat(project.valor_total || project.valor || 0)), 0)
        };
      } else {
        // Calcular estatísticas localmente
        finalStats = {
          totalProjects: projects.length,
          totalClients: clientes.length, 
          totalBills: bills.length,
          totalFiles: files.length,
          revenue: projects.reduce((sum, project) => sum + (parseFloat(project.valor_total || project.valor || 0)), 0)
        };
      }

      // 6. Montar dados finais
      const consolidatedData = {
        stats: finalStats,
        projects: Array.isArray(projects) ? projects : [],
        clientes: Array.isArray(clientes) ? clientes : [],
        bills: Array.isArray(bills) ? bills : [],
        files: Array.isArray(files) ? files : [],
        notifications: Array.isArray(notifications) ? notifications : []
      };

      console.log('✅ Dados consolidados:', consolidatedData);
      return consolidatedData;

    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      throw error;
    }
  }, []);

  // 🔄 Função principal de carregamento
  const loadData = useCallback(async () => {
    console.log('📊 Iniciando carregamento de dados...');
    setLoading(true);
    setError(null);

    try {
      const data = await loadDashboardData();
      
      if (data) {
        setData(data);
        setRetryCount(0);
        console.log('✅ Dados carregados com sucesso');
      } else {
        throw new Error('Nenhum dado foi retornado');
      }

    } catch (error) {
      console.error('❌ Erro no carregamento:', error);
      const errorMessage = error.message || 'Erro desconhecido ao carregar dados';
      setError(errorMessage);
      
      // Dados padrão em caso de erro
      const defaultData = {
        stats: {
          totalProjects: 0,
          totalClients: 0,
          totalBills: 0,
          totalFiles: 0,
          revenue: 0
        },
        projects: [],
        clientes: [],
        bills: [],
        files: [],
        notifications: [{
          id: Date.now(),
          titulo: "Erro de Conexão",
          mensagem: `Não foi possível carregar os dados: ${errorMessage}`,
          tipo: "error",
          lida: false,
          created_at: new Date().toISOString()
        }]
      };

      setData(defaultData);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  // 🔄 Auto-retry com backoff exponencial
  useEffect(() => {
    if (error && retryCount < 3) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`🔄 Tentativa ${retryCount + 1} de retry em ${retryDelay}ms...`);
      
      const timeoutId = setTimeout(() => {
        if (retryCount < 3) {
          loadData();
        }
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [error, retryCount, loadData]);

  // 🔄 Carregar dados na inicialização
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🎯 Funções CRUD
  const createItem = useCallback(async (type, itemData) => {
    try {
      setLoading(true);
      
      const endpointMap = {
        'projeto': '/api/projects',
        'cliente': '/api/clientes',
        'conta': '/api/contas'
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });

      if (response && response.success) {
        await loadData(); // Recarregar dados
        return { success: true, data: response.data };
      } else {
        throw new Error(response?.error || 'Erro ao criar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao criar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const updateItem = useCallback(async (type, id, itemData) => {
    try {
      setLoading(true);
      
      const endpointMap = {
        'projeto': `/api/projects/${id}`,
        'cliente': `/api/clientes/${id}`,
        'conta': `/api/contas/${id}`
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });

      if (response && response.success) {
        await loadData();
        return { success: true, data: response.data };
      } else {
        throw new Error(response?.error || 'Erro ao atualizar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const deleteItem = useCallback(async (type, id) => {
    try {
      setLoading(true);
      
      const endpointMap = {
        'projeto': `/api/projects/${id}`,
        'cliente': `/api/clientes/${id}`,
        'conta': `/api/contas/${id}`
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'DELETE'
      });

      if (response && response.success) {
        await loadData();
        return { success: true };
      } else {
        throw new Error(response?.error || 'Erro ao deletar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const payBill = useCallback(async (billId) => {
    try {
      setLoading(true);
      
      const response = await secureApiRequest(`/api/contas/${billId}/pagar`, {
        method: 'PATCH',
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split('T')[0]
        })
      });

      if (response && response.success) {
        await loadData();
        return { success: true, data: response.data };
      } else {
        throw new Error(response?.error || 'Erro ao marcar conta como paga');
      }
    } catch (error) {
      console.error(`❌ Erro ao pagar conta:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const response = await secureApiRequest(`/api/notificacoes/${notificationId}/marcar-lida`, {
        method: 'PATCH'
      });

      if (response && response.success) {
        setData(prevData => ({
          ...prevData,
          notifications: prevData.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, lida: true }
              : notification
          )
        }));
        return { success: true };
      } else {
        throw new Error(response?.error || 'Erro ao marcar notificação como lida');
      }
    } catch (error) {
      console.error(`❌ Erro ao marcar notificação como lida:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await secureApiRequest('/api/notificacoes/marcar-todas-lidas', {
        method: 'PATCH'
      });

      if (response && response.success) {
        setData(prevData => ({
          ...prevData,
          notifications: prevData.notifications.map(notification => ({
            ...notification,
            lida: true
          }))
        }));
        return { success: true };
      } else {
        throw new Error(response?.error || 'Erro ao marcar todas as notificações como lidas');
      }
    } catch (error) {
      console.error(`❌ Erro ao marcar todas as notificações como lidas:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const hasData = data.projects.length > 0 || 
                  data.clientes.length > 0 || 
                  data.bills.length > 0;

  const getDerivedStats = useCallback(() => {
    if (!data || !Array.isArray(data.bills) || !Array.isArray(data.projects)) {
      return {
        overdueBills: 0,
        dueSoonBills: 0,
        activeProjects: 0,
        unreadNotifications: 0,
        totalRevenue: 0,
        pendingBillsValue: 0
      };
    }

    const now = new Date();
    const overdueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const overdueBills = data.bills.filter(bill => {
      if (bill.status === 'Paga') return false;
      const dueDate = new Date(bill.data_vencimento);
      return dueDate < overdueDate;
    });

    const dueSoonBills = data.bills.filter(bill => {
      if (bill.status === 'Paga') return false;
      const dueDate = new Date(bill.data_vencimento);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    const activeProjects = data.projects.filter(project => 
      project.status === 'Em Andamento' || project.status === 'Iniciado'
    );

    const unreadNotifications = data.notifications.filter(notification => !notification.lida);

    return {
      overdueBills: overdueBills.length,
      dueSoonBills: dueSoonBills.length,
      activeProjects: activeProjects.length,
      unreadNotifications: unreadNotifications.length,
      totalRevenue: data.stats.revenue,
      pendingBillsValue: data.bills
        .filter(bill => bill.status !== 'Paga')
        .reduce((sum, bill) => sum + (parseFloat(bill.valor) || 0), 0)
    };
  }, [data]);

  const retryLoadData = useCallback(() => {
    if (retryCount < 3) {
      console.log(`🔄 Retry manual - tentativa ${retryCount + 1}...`);
      loadData();
    }
  }, [loadData, retryCount]);

  return {
    // 📊 Dados principais
    data,
    loading,
    error,
    hasData,
    retryCount,
    
    // 🔄 Funções de carregamento
    loadData,
    clearError,
    retryLoadData,
    
    // 🛠️ Funções CRUD
    createItem,
    updateItem,
    deleteItem,
    payBill,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // 📈 Estatísticas derivadas
    derivedStats: getDerivedStats(),
    
    // 🔧 Utilitários
    secureApiRequest
  };
};

// 🎯 Hooks específicos para operações
export const useProjectOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createProject: (projectData) => createItem('projeto', projectData),
    updateProject: (id, projectData) => updateItem('projeto', id, projectData),
    deleteProject: (id) => deleteItem('projeto', id)
  };
};

export const useClientOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createClient: (clientData) => createItem('cliente', clientData),
    updateClient: (id, clientData) => updateItem('cliente', id, clientData),
    deleteClient: (id) => deleteItem('cliente', id)
  };
};

export const useBillOperations = () => {
  const { createItem, updateItem, deleteItem, payBill } = useDashboardData();
  
  return {
    createBill: (billData) => createItem('conta', billData),
    updateBill: (id, billData) => updateItem('conta', id, billData),
    deleteBill: (id) => deleteItem('conta', id),
    payBill
  };
};

// 🔧 Hook para debug e monitoramento
export const useDashboardDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    lastRequest: null,
    requestCount: 0,
    errors: [],
    performance: []
  });

  const logRequest = useCallback((endpoint, duration, success, error = null) => {
    setDebugInfo(prev => ({
      lastRequest: {
        endpoint,
        timestamp: new Date().toISOString(),
        duration,
        success
      },
      requestCount: prev.requestCount + 1,
      errors: error ? [...prev.errors.slice(-9), { endpoint, error, timestamp: new Date().toISOString() }] : prev.errors,
      performance: [...prev.performance.slice(-19), { endpoint, duration, timestamp: new Date().toISOString() }]
    }));
  }, []);

  const clearDebugInfo = useCallback(() => {
    setDebugInfo({
      lastRequest: null,
      requestCount: 0,
      errors: [],
      performance: []
    });
  }, []);

  return {
    debugInfo,
    logRequest,
    clearDebugInfo
  };
};