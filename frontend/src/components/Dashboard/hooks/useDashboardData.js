// 📁 src/hooks/useDashboardData.js - VERSÃO HÍBRIDA OTIMIZADA
import { useState, useCallback, useEffect, useRef } from 'react';

// 🔧 Configuração otimizada
const API_BASE_URL = 'http://localhost:5000';
const REQUEST_TIMEOUT = 10000; // 10 segundos
const RETRY_LIMIT = 2;
const CACHE_TTL = 30000; // 30 segundos

// 🛡️ Cache simples em memória
const cache = {
  data: null,
  timestamp: 0,
  ttl: CACHE_TTL
};

// 🛡️ Função de requisição otimizada
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Token de autenticação não encontrado');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      credentials: 'include',
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Resposta inválida do servidor');
    }

    const data = await response.json();
    console.log(`✅ API Success: ${endpoint}`);
    return data;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout na requisição');
    }
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
    }
    
    throw error;
  }
};

// 🎯 Hook principal otimizado
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
  
  const mountedRef = useRef(true);
  const lastRequestRef = useRef(0);

  // 🔄 Carregamento otimizado com cache
  const loadData = useCallback(async (forceRefresh = false) => {
    // Verificar cache
    const now = Date.now();
    if (!forceRefresh && cache.data && (now - cache.timestamp) < cache.ttl) {
      console.log('📦 Usando dados do cache');
      setData(cache.data);
      return cache.data;
    }

    // Evitar requisições duplas
    if (now - lastRequestRef.current < 1000) {
      console.log('⏳ Requisição muito recente, aguardando...');
      return;
    }
    
    lastRequestRef.current = now;
    setLoading(true);
    setError(null);

    try {
      console.log('📊 Carregando dados do dashboard...');
      
      // Tentar endpoint principal primeiro
      let dashboardData;
      try {
        dashboardData = await apiRequest('/api/dashboard-data');
      } catch (primaryError) {
        console.warn('⚠️ Endpoint principal falhou, tentando alternativas...');
        
        // Tentar endpoints alternativos
        try {
          dashboardData = await apiRequest('/api/dashboard/stats');
        } catch (secondaryError) {
          try {
            dashboardData = await apiRequest('/api/stats');
          } catch (tertiaryError) {
            throw new Error('Todos os endpoints de dados falharam');
          }
        }
      }

      if (!dashboardData?.success) {
        throw new Error(dashboardData?.error || 'Resposta inválida do servidor');
      }

      const processedData = {
        stats: {
          totalProjects: dashboardData.data?.stats?.totalProjects || 0,
          totalClients: dashboardData.data?.stats?.totalClients || 0,
          totalBills: dashboardData.data?.stats?.totalBills || 0,
          totalFiles: dashboardData.data?.stats?.totalFiles || 0,
          revenue: dashboardData.data?.stats?.revenue || 0
        },
        projects: Array.isArray(dashboardData.data?.projects) ? dashboardData.data.projects : [],
        clientes: Array.isArray(dashboardData.data?.clientes) ? dashboardData.data.clientes : [],
        bills: Array.isArray(dashboardData.data?.bills) ? dashboardData.data.bills : [],
        files: Array.isArray(dashboardData.data?.files) ? dashboardData.data.files : [],
        notifications: Array.isArray(dashboardData.data?.notifications) ? dashboardData.data.notifications : []
      };

      // Atualizar cache
      cache.data = processedData;
      cache.timestamp = now;

      if (mountedRef.current) {
        setData(processedData);
        setRetryCount(0);
        console.log('✅ Dados carregados com sucesso');
      }

      return processedData;

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      
      if (mountedRef.current) {
        setError(error.message);
        setRetryCount(prev => prev + 1);
        
        // Dados padrão em caso de erro
        const fallbackData = {
          stats: { totalProjects: 0, totalClients: 0, totalBills: 0, totalFiles: 0, revenue: 0 },
          projects: [],
          clientes: [],
          bills: [],
          files: [],
          notifications: [{
            id: Date.now(),
            titulo: "Erro de Conexão",
            mensagem: `Não foi possível carregar os dados: ${error.message}`,
            tipo: "error",
            lida: false,
            created_at: new Date().toISOString()
          }]
        };
        
        setData(fallbackData);
      }
      
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // 🔄 Auto-retry com backoff exponencial
  useEffect(() => {
    if (error && retryCount < RETRY_LIMIT && retryCount > 0) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`🔄 Auto-retry ${retryCount}/${RETRY_LIMIT} em ${retryDelay}ms...`);
      
      const timeoutId = setTimeout(() => {
        if (mountedRef.current && retryCount < RETRY_LIMIT) {
          loadData(true);
        }
      }, retryDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [error, retryCount, loadData]);

  // 🔄 Carregamento inicial
  useEffect(() => {
    loadData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // 🎯 Operações CRUD otimizadas
  const createItem = useCallback(async (type, itemData) => {
    try {
      setLoading(true);
      
      const endpointMap = {
        'projeto': '/api/projects',
        'cliente': '/api/clientes',
        'conta': '/api/contas',
        'usuario': '/api/users'
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });

      if (response?.success) {
        // Invalidar cache
        cache.timestamp = 0;
        
        // Recarregar dados
        await loadData(true);
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
        'conta': `/api/contas/${id}`,
        'usuario': `/api/users/${id}`
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });

      if (response?.success) {
        cache.timestamp = 0;
        await loadData(true);
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
        'conta': `/api/contas/${id}`,
        'usuario': `/api/users/${id}`
      };
      
      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await apiRequest(endpoint, {
        method: 'DELETE'
      });

      if (response?.success) {
        cache.timestamp = 0;
        await loadData(true);
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
      
      const response = await apiRequest(`/api/contas/${billId}/pagar`, {
        method: 'PATCH',
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split('T')[0],
          status: 'Paga'
        })
      });

      if (response?.success) {
        cache.timestamp = 0;
        await loadData(true);
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
      const response = await apiRequest(`/api/notificacoes/${notificationId}/marcar-lida`, {
        method: 'PATCH'
      });

      if (response?.success) {
        // Atualizar estado local sem recarregar tudo
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
      console.error(`❌ Erro ao marcar notificação:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await apiRequest('/api/notificacoes/marcar-todas-lidas', {
        method: 'PATCH'
      });

      if (response?.success) {
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
      console.error(`❌ Erro ao marcar todas as notificações:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  // 🧹 Limpar erro
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  // 📊 Estatísticas derivadas otimizadas
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
    
    const overdueBills = data.bills.filter(bill => {
      if (bill.status === 'Paga') return false;
      const dueDate = new Date(bill.data_vencimento);
      return dueDate < now;
    });

    const dueSoonBills = data.bills.filter(bill => {
      if (bill.status === 'Paga') return false;
      const dueDate = new Date(bill.data_vencimento);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });

    const activeProjects = data.projects.filter(project => 
      ['Em Andamento', 'Iniciado'].includes(project.status)
    );

    const unreadNotifications = data.notifications.filter(notification => !notification.lida);

    const pendingBillsValue = data.bills
      .filter(bill => bill.status !== 'Paga')
      .reduce((sum, bill) => sum + (parseFloat(bill.valor) || 0), 0);

    return {
      overdueBills: overdueBills.length,
      dueSoonBills: dueSoonBills.length,
      activeProjects: activeProjects.length,
      unreadNotifications: unreadNotifications.length,
      totalRevenue: data.stats.revenue,
      pendingBillsValue
    };
  }, [data]);

  // 🔄 Retry manual
  const retryLoadData = useCallback(() => {
    if (retryCount < RETRY_LIMIT) {
      console.log(`🔄 Retry manual - tentativa ${retryCount + 1}...`);
      setError(null);
      loadData(true);
    }
  }, [loadData, retryCount]);

  // 📊 Verificar se há dados
  const hasData = data.projects.length > 0 || 
                  data.clientes.length > 0 || 
                  data.bills.length > 0 ||
                  data.files.length > 0;

  return {
    // 📊 Dados principais
    data,
    loading,
    error,
    hasData,
    retryCount,
    
    // 🔄 Funções de carregamento
    loadData: useCallback(() => loadData(true), [loadData]),
    clearError,
    retryLoadData,
    
    // 🛠️ Operações CRUD
    createItem,
    updateItem,
    deleteItem,
    payBill,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // 📈 Estatísticas derivadas
    derivedStats: getDerivedStats(),
    
    // 🔧 Utilitários
    secureApiRequest: apiRequest
  };
};

// 🎯 Hooks específicos otimizados
export const useProjectOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createProject: useCallback((projectData) => createItem('projeto', projectData), [createItem]),
    updateProject: useCallback((id, projectData) => updateItem('projeto', id, projectData), [updateItem]),
    deleteProject: useCallback((id) => deleteItem('projeto', id), [deleteItem])
  };
};

export const useClientOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createClient: useCallback((clientData) => createItem('cliente', clientData), [createItem]),
    updateClient: useCallback((id, clientData) => updateItem('cliente', id, clientData), [updateItem]),
    deleteClient: useCallback((id) => deleteItem('cliente', id), [deleteItem])
  };
};

export const useBillOperations = () => {
  const { createItem, updateItem, deleteItem, payBill } = useDashboardData();
  
  return {
    createBill: useCallback((billData) => createItem('conta', billData), [createItem]),
    updateBill: useCallback((id, billData) => updateItem('conta', id, billData), [updateItem]),
    deleteBill: useCallback((id) => deleteItem('conta', id), [deleteItem]),
    payBill
  };
};

export default useDashboardData;