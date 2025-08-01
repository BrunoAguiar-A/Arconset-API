// 📁 services/api.js - VERSÃO SEM HEALTH CHECKS AUTOMÁTICOS
import axios from 'axios';

// Configuração da API - SUA API PYTHON
const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 🚨 NOVO: Timeout para evitar requests infinitos
  timeout: 15000, // 15 segundos
});

// 🚨 INTERCEPTOR CORRIGIDO - SEM HEALTH CHECKS AUTOMÁTICOS
api.interceptors.response.use(
  (response) => {
    // ✅ Apenas log de sucesso, sem ações automáticas
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // ✅ Log de erro, mas SEM health checks automáticos
    console.error('❌ Erro na API:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.message
    });
    
    if (error.response?.status === 404) {
      console.error('🔍 Endpoint não encontrado:', error.config?.url);
    }
    

    
    return Promise.reject(error);
  }
);

// ===== CLIENTES ===== ✅ MANTIDO
export const clientesAPI = {
  // Buscar todos os clientes
  getAll: () => api.get('/api/clientes'),
  
  // Buscar cliente por ID
  getById: (id) => api.get(`/api/clientes/${id}`),
  
  // Criar novo cliente
  create: (clienteData) => api.post('/api/clientes', clienteData),
  
  // Atualizar cliente
  update: (id, clienteData) => api.put(`/api/clientes/${id}`, clienteData),
  
  // Deletar cliente
  delete: (id) => api.delete(`/api/clientes/${id}`),
  
  // Buscar clientes
  search: (query) => api.get(`/api/clientes/search?q=${encodeURIComponent(query)}`),
};

// ===== PROJETOS/OBRAS ===== ✅ MANTIDO
export const projectsAPI = {
  // Buscar todos os projetos
  getAll: () => api.get('/api/projects'),
  
  // Buscar projeto por ID
  getById: (id) => api.get(`/api/projects/${id}`),
  
  // Criar novo projeto
  create: (projectData) => api.post('/api/projects', projectData),
  
  // Atualizar projeto
  update: (id, projectData) => api.put(`/api/projects/${id}`, projectData),
  
  // Deletar projeto
  delete: (id) => api.delete(`/api/projects/${id}`),
  
  // Atualizar progresso do projeto
  updateProgress: (id, progress) => api.patch(`/api/projects/${id}/progress`, { progress }),
};

// ===== CONTAS A PAGAR ===== ✅ MANTIDO
export const contasAPI = {
  // Buscar todas as contas
  getAll: () => api.get('/api/contas'),
  
  // Buscar conta por ID
  getById: (id) => api.get(`/api/contas/${id}`),
  
  // Criar nova conta
  create: (contaData) => api.post('/api/contas', contaData),
  
  // Atualizar conta
  update: (id, contaData) => api.put(`/api/contas/${id}`, contaData),
  
  // Deletar conta
  delete: (id) => api.delete(`/api/contas/${id}`),
  
  // Marcar conta como paga
  markAsPaid: (id, paymentData = {}) => api.patch(`/api/contas/${id}/pagar`, paymentData),
  
  // Buscar contas por vencimento
  getByVencimento: (periodo = 'proximos_7_dias') => api.get(`/api/contas/vencimento?periodo=${periodo}`),
  
  // Relatório financeiro
  getRelatorio: () => api.get('/api/contas/relatorio'),
};

// ===== FUNCIONÁRIOS ===== ✅ MANTIDO
export const funcionariosAPI = {
  // Buscar todos os funcionários
  getAll: () => api.get('/api/funcionarios'),
  
  // Buscar funcionário por ID
  getById: (id) => api.get(`/api/funcionarios/${id}`),
  
  // Criar novo funcionário
  create: (funcionarioData) => api.post('/api/funcionarios', funcionarioData),
  
  // Atualizar funcionário
  update: (id, funcionarioData) => api.put(`/api/funcionarios/${id}`, funcionarioData),
  
  // Deletar funcionário
  delete: (id) => api.delete(`/api/funcionarios/${id}`),
  
  // Funcionários disponíveis
  getDisponiveis: () => api.get('/api/funcionarios/disponiveis'),
  
  // Adicionar funcionário a projeto
  addToProjeto: (funcionarioId, projetoData) => api.post(`/api/funcionarios/${funcionarioId}/projetos`, projetoData),
  
  // Remover funcionário de projeto
  removeFromProjeto: (funcionarioId, projetoId) => api.delete(`/api/funcionarios/${funcionarioId}/projetos/${projetoId}`),
};

// ===== ARQUIVOS ===== ✅ MANTIDO
export const arquivosAPI = {
  // Buscar todos os arquivos
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/api/arquivos${queryParams ? '?' + queryParams : ''}`);
  },
  
  // Buscar arquivo por ID
  getById: (id) => api.get(`/api/arquivos/${id}`),
  
  // Upload de arquivo
  upload: (formData) => api.post('/api/arquivos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // Download de arquivo
  download: (id, filename) => api.get(`/api/arquivos/${id}/download`, {
    responseType: 'blob',
  }).then(response => {
    // Criar blob e fazer download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `arquivo_${id}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }),
  
  // Deletar arquivo
  delete: (id) => api.delete(`/api/arquivos/${id}`),
  
  // Buscar arquivos
  search: (query) => api.get(`/api/arquivos/search?q=${encodeURIComponent(query)}`),
  
  // Estatísticas de arquivos
  getEstatisticas: () => api.get('/api/arquivos/estatisticas'),
  
  // Tipos de documento
  getTipos: () => api.get('/api/arquivos/tipos'),
};

// ===== DASHBOARD/ESTATÍSTICAS ===== ✅ MANTIDO
export const dashboardAPI = {
  // Buscar estatísticas gerais
  getStats: () => api.get('/api/dashboard/stats'),
  
  // Projetos recentes
  getProjetosRecentes: (limit = 5) => api.get(`/api/dashboard/projetos-recentes?limit=${limit}`),
  
  // Contas próximas do vencimento
  getContasVencimento: (dias = 7) => api.get(`/api/dashboard/contas-vencimento?dias=${dias}`),
  
  // Atividade mensal
  getAtividadeMensal: (meses = 6) => api.get(`/api/dashboard/atividade-mensal?meses=${meses}`),
  
  // Resumo executivo
  getResumoExecutivo: () => api.get('/api/dashboard/resumo-executivo'),
  
  // Alertas do sistema
  getAlertas: () => api.get('/api/dashboard/alertas'),
};

// ===== NOTIFICAÇÕES ===== ✅ MANTIDO
export const notificacoesAPI = {
  // Buscar notificações
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/api/notificacoes${queryParams ? '?' + queryParams : ''}`);
  },
  
  // Marcar notificação como lida
  markAsRead: (id) => api.patch(`/api/notificacoes/${id}/marcar-lida`),
  
  // Marcar todas como lidas
  markAllAsRead: () => api.patch('/api/notificacoes/marcar-todas-lidas'),
};


export const manualHealthCheck = async () => {
  try {
    console.log('🔍 Health check manual solicitado...');
    const response = await api.get('/api/health');
    console.log('✅ Health check manual bem-sucedido:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Health check manual falhou:', error.message);
    throw error;
  }
};

// 🎯 NOVA FUNÇÃO: Testar conectividade MANUAL
export const testConnection = async () => {
  try {
    console.log('🌐 Testando conectividade manual...');
    const startTime = Date.now();
    
    const response = await api.get('/api/health');
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`✅ Conectividade OK - ${responseTime}ms`);
    
    return {
      success: true,
      responseTime,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Teste de conectividade falhou:', error.message);
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 0
    };
  }
};

// 🎯 NOVA FUNÇÃO: Debug de API (apenas para desenvolvimento)
export const debugAPI = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('⚠️ Debug API disponível apenas em desenvolvimento');
    return;
  }
  
  console.log('🔧 Debug da API:', {
    baseURL: api.defaults.baseURL,
    timeout: api.defaults.timeout,
    headers: api.defaults.headers,
    interceptors: {
      request: api.interceptors.request.handlers.length,
      response: api.interceptors.response.handlers.length
    }
  });
};

// 🎯 EXPORTAÇÃO LIMPA - SEM HEALTH CHECK AUTOMÁTICO
export default api;