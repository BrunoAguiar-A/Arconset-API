// 📁 src/hooks/useDashboardData.js - VERSÃO CORRIGIDA
import { useState, useCallback, useEffect } from 'react';

// 🔧 Configuração da API
const API_BASE_URL = 'http://localhost:5000';

// 🛡️ Função para fazer requisições seguras com melhor tratamento de erros
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
    
    // Verificar se a resposta é válida
    if (!response.ok) {
      // Tentar obter erro como JSON
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `Erro HTTP ${response.status}`;
      } catch {
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
        throw new Error('Servidor retornou página HTML em vez de JSON. Verifique se a API está rodando.');
      }
      
      throw new Error(`Resposta inválida: esperado JSON, recebido ${contentType || 'unknown'}`);
    }

    const data = await response.json();
    
    console.log(`✅ Resposta recebida de ${endpoint}:`, data);
    return data;
    
  } catch (error) {
    console.error(`❌ Erro na requisição ${endpoint}:`, error);
    
    // Melhorar mensagens de erro
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Erro de conexão: Verifique se o servidor está rodando em http://localhost:5000');
    }
    
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Conexão recusada: Servidor não está rodando na porta 5000');
    }
    
    throw error;
  }
};

// 🎯 Hook principal para dados do dashboard
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

  // 🔄 Função para carregar todos os dados
  const loadData = useCallback(async () => {
    console.log('📊 Iniciando carregamento de dados do dashboard...');
    setLoading(true);
    setError(null);

    try {
      // Tentar carregar dados consolidados primeiro
      try {
        const dashboardResponse = await secureApiRequest('/api/dashboard-data');
        
        if (dashboardResponse.success && dashboardResponse.data) {
          console.log('✅ Dados consolidados carregados com sucesso');
          setData(dashboardResponse.data);
          setLoading(false);
          return;
        }
      } catch (dashboardError) {
        console.warn('⚠️ Endpoint consolidado falhou, tentando endpoints individuais:', dashboardError.message);
      }

      // Se o endpoint consolidado falhar, carregar individualmente
      console.log('🔄 Carregando dados individuais...');
      
      const requests = [
        secureApiRequest('/api/projects').catch(e => ({ success: false, data: [], error: e.message })),
        secureApiRequest('/api/clientes').catch(e => ({ success: false, data: [], error: e.message })),
        secureApiRequest('/api/contas').catch(e => ({ success: false, data: [], error: e.message })),
        secureApiRequest('/api/notificacoes').catch(e => ({ success: false, data: [], error: e.message }))
      ];

      const [projectsRes, clientesRes, billsRes, notificationsRes] = await Promise.all(requests);

      // Extrair dados com fallbacks seguros
      const projects = (projectsRes.success ? projectsRes.data : []) || [];
      const clientes = (clientesRes.success ? clientesRes.data : []) || [];
      const bills = (billsRes.success ? billsRes.data : []) || [];
      const notifications = (notificationsRes.success ? notificationsRes.data : []) || [];

      // Simular dados de arquivos (se não existir endpoint)
      const files = [
        {
          id: 1,
          nome_original: "Contrato_Cliente_A.pdf",
          tipo_documento: "Contrato",
          projeto_nome: projects[0]?.nome || "Projeto Exemplo",
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          nome_original: "Proposta_Comercial.docx",
          tipo_documento: "Proposta",
          projeto_nome: projects[1]?.nome || "Projeto Mobile",
          created_at: new Date().toISOString()
        }
      ];

      // Calcular estatísticas
      const stats = {
        totalProjects: projects.length,
        totalClients: clientes.length,
        totalBills: bills.length,
        totalFiles: files.length,
        revenue: projects.reduce((sum, project) => sum + (project.valor || 0), 0)
      };

      const consolidatedData = {
        stats,
        projects,
        clientes,
        bills,
        files,
        notifications
      };

      setData(consolidatedData);
      console.log('✅ Dados individuais carregados e consolidados com sucesso');
      
      // Log de erros individuais para debug
      if (!projectsRes.success) console.warn('⚠️ Projetos:', projectsRes.error);
      if (!clientesRes.success) console.warn('⚠️ Clientes:', clientesRes.error);
      if (!billsRes.success) console.warn('⚠️ Contas:', billsRes.error);
      if (!notificationsRes.success) console.warn('⚠️ Notificações:', notificationsRes.error);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setError(error.message || 'Erro desconhecido ao carregar dados');
      
      // Em caso de erro total, usar dados mock básicos
      setData({
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
          id: 1,
          titulo: "Erro de Conexão",
          mensagem: "Não foi possível carregar os dados. Verifique se o servidor está rodando.",
          tipo: "error",
          lida: false,
          created_at: new Date().toISOString()
        }]
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔄 Carregar dados na inicialização
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🎯 Funções auxiliares para operações CRUD

  // Criar item
  const createItem = useCallback(async (type, itemData) => {
    try {
      setLoading(true);
      
      let endpoint;
      switch (type) {
        case 'projeto':
          endpoint = '/api/projects';
          break;
        case 'cliente':
          endpoint = '/api/clientes';
          break;
        case 'conta':
          endpoint = '/api/contas';
          break;
        default:
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });

      if (response.success) {
        await loadData(); // Recarregar dados
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Erro ao criar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao criar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Atualizar item
  const updateItem = useCallback(async (type, id, itemData) => {
    try {
      setLoading(true);
      
      let endpoint;
      switch (type) {
        case 'projeto':
          endpoint = `/api/projects/${id}`;
          break;
        case 'cliente':
          endpoint = `/api/clientes/${id}`;
          break;
        case 'conta':
          endpoint = `/api/contas/${id}`;
          break;
        default:
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });

      if (response.success) {
        await loadData(); // Recarregar dados
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Erro ao atualizar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Deletar item
  const deleteItem = useCallback(async (type, id) => {
    try {
      setLoading(true);
      
      let endpoint;
      switch (type) {
        case 'projeto':
          endpoint = `/api/projects/${id}`;
          break;
        case 'cliente':
          endpoint = `/api/clientes/${id}`;
          break;
        case 'conta':
          endpoint = `/api/contas/${id}`;
          break;
        default:
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await secureApiRequest(endpoint, {
        method: 'DELETE'
      });

      if (response.success) {
        await loadData(); // Recarregar dados
        return { success: true };
      } else {
        throw new Error(response.error || 'Erro ao deletar item');
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar ${type}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Pagar conta
  const payBill = useCallback(async (billId) => {
    try {
      setLoading(true);
      
      const response = await secureApiRequest(`/api/contas/${billId}/pagar`, {
        method: 'PATCH',
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split('T')[0]
        })
      });

      if (response.success) {
        await loadData(); // Recarregar dados
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Erro ao marcar conta como paga');
      }
    } catch (error) {
      console.error(`❌ Erro ao pagar conta:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Marcar notificação como lida
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const response = await secureApiRequest(`/api/notificacoes/${notificationId}/marcar-lida`, {
        method: 'PATCH'
      });

      if (response.success) {
        // Atualizar apenas a notificação específica sem recarregar tudo
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
        throw new Error(response.error || 'Erro ao marcar notificação como lida');
      }
    } catch (error) {
      console.error(`❌ Erro ao marcar notificação como lida:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  // Marcar todas as notificações como lidas
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await secureApiRequest('/api/notificacoes/marcar-todas-lidas', {
        method: 'PATCH'
      });

      if (response.success) {
        // Atualizar todas as notificações
        setData(prevData => ({
          ...prevData,
          notifications: prevData.notifications.map(notification => ({
            ...notification,
            lida: true
          }))
        }));
        return { success: true };
      } else {
        throw new Error(response.error || 'Erro ao marcar todas as notificações como lidas');
      }
    } catch (error) {
      console.error(`❌ Erro ao marcar todas as notificações como lidas:`, error);
      return { success: false, error: error.message };
    }
  }, []);

  // 🔧 Função para limpar erros
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 🔧 Função para verificar se há dados carregados
  const hasData = data.projects.length > 0 || 
                  data.clientes.length > 0 || 
                  data.bills.length > 0;

  // 🔧 Função para obter estatísticas derivadas
  const getDerivedStats = useCallback(() => {
    const now = new Date();
    const overdueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 dia atrás
    
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
        .reduce((sum, bill) => sum + (bill.valor || 0), 0)
    };
  }, [data]);

  return {
    // 📊 Dados principais
    data,
    loading,
    error,
    hasData,
    
    // 🔄 Funções de carregamento
    loadData,
    clearError,
    
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
    secureApiRequest // Expor para uso em outros hooks se necessário
  };
};

// 🎯 Hook específico para operações de projeto
export const useProjectOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createProject: (projectData) => createItem('projeto', projectData),
    updateProject: (id, projectData) => updateItem('projeto', id, projectData),
    deleteProject: (id) => deleteItem('projeto', id)
  };
};

// 🎯 Hook específico para operações de cliente
export const useClientOperations = () => {
  const { createItem, updateItem, deleteItem } = useDashboardData();
  
  return {
    createClient: (clientData) => createItem('cliente', clientData),
    updateClient: (id, clientData) => updateItem('cliente', id, clientData),
    deleteClient: (id) => deleteItem('cliente', id)
  };
};

// 🎯 Hook específico para operações de contas
export const useBillOperations = () => {
  const { createItem, updateItem, deleteItem, payBill } = useDashboardData();
  
  return {
    createBill: (billData) => createItem('conta', billData),
    updateBill: (id, billData) => updateItem('conta', id, billData),
    deleteBill: (id) => deleteItem('conta', id),
    payBill
  };
};