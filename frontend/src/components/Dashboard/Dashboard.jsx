// 📁 src/components/Dashboard/Dashboard.jsx - VERSÃO DE PRODUÇÃO SEM HEALTH CHECKS AUTOMÁTICOS
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  RefreshCw, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  LogOut, 
  User, 
  Settings,
  Shield,
  Bell,
  Calendar,
  Activity,
  Lock,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Users,
  Database,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';

// 📋 Componentes
import StatsCards from './components/StatsCards';
import ProjectsSection from './components/ProjectsSection';
import BillsSection from './components/BillsSection';
import NotificationsSection from './components/NotificationsSection';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import SecureBankConfigPage from './pages/SecureBankConfigPage';

// 🔧 Hooks OTIMIZADOS
import { useSecureBankMonitor } from './hooks/useSecureBankMonitor';
import { useDashboardData } from './hooks/useDashboardData';
import { useModal } from './hooks/useModal';
import { useAuth } from './hooks/useAuth'; 

// 🎯 Utilitários centralizados
import { formatCurrency, formatDate } from './utils';

// 🔐 CONFIGURAÇÕES DE PRODUÇÃO - SEM HEALTH CHECKS AUTOMÁTICOS
const DASHBOARD_CONFIG = {
  AUTO_LOGOUT_TIME: 60 * 60 * 1000, // 1 hora em produção
  SESSION_CHECK_INTERVAL: 10 * 60 * 1000, // 10 minutos
  MAX_FAILED_REQUESTS: 5, // Mais tolerante em produção
  SENSITIVE_DATA_CLEANUP: 10 * 60 * 1000, // 10 minutos
  HEALTH_CHECK_ENABLED: false, // 🚨 DESABILITADO: Sem health checks automáticos
  SECURITY_ALERTS_ENABLED: true,
  REQUEST_TIMEOUT: 30000, // 30 segundos em produção
  PRODUCTION_MODE: true,
  DEBUG_ENABLED: false, // 🚨 DESABILITADO: Sem logs de debug
  MANUAL_REFRESH_ENABLED: true,
  AUTO_REFRESH_ENABLED: false // 🚨 DESABILITADO: Sem refresh automático
};

const Dashboard = () => {
  // 🔧 Estados principais
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    lastCheck: Date.now(),
    version: '2.0.0-production'
  });
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [failedRequests, setFailedRequests] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 🔐 Hook de autenticação
  const { user, logout, isAdmin, isManager, isAuthenticated } = useAuth();
  
  // 🎯 Hooks principais
  const { data, loading, error, loadData, clearError } = useDashboardData();
  const { 
    showModal, 
    modalType, 
    editingItem, 
    formData,
    openModal, 
    closeModal,
    handleInputChange 
  } = useModal();

  // 🏦 Hook bancário OTIMIZADO
  const {
    boletos: boletosBancarios = [],
    loading: loadingBoletos = false,
    error: errorBoletos = null,
    ultimaVerificacao,
    statusBancos = {},
    verificarTodosBoletos,
    getEstatisticas,
    bancosConfigurados = {},
    isSecure = false,
    userBankProfile
  } = useSecureBankMonitor();

  // 🔧 Referencias para controle
  const mountedRef = useRef(true);
  const failedRequestsRef = useRef(0);
  const refreshTimeoutRef = useRef(null);

  // 📊 Estatísticas memoizadas para performance
  const estatisticasBoletos = useMemo(() => {
    try {
      return getEstatisticas();
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
  }, [getEstatisticas]);

  // 🔐 SISTEMA DE ALERTAS DE SEGURANÇA - PRODUÇÃO
  const addSecurityAlert = useCallback((type, message, autoHide = true) => {
    if (!DASHBOARD_CONFIG.SECURITY_ALERTS_ENABLED) {
      return;
    }

    const alert = {
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    setSecurityAlerts(prev => [...prev.slice(-2), alert]);
    
    // Auto-remover em produção (mais rápido)
    if (autoHide) {
      setTimeout(() => {
        if (mountedRef.current) {
          setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id));
        }
      }, 5000); // 5 segundos em produção
    }
    
    // Log simplificado em produção
    if (type === 'error') {
      console.error(`🔐 Security Alert: ${message}`);
    }
  }, []);

  // 🔐 VERIFICAÇÃO DE SISTEMA - SEM HEALTH CHECKS AUTOMÁTICOS
  const checkSystemHealth = useCallback(async () => {
    // 🚨 VERIFICAÇÃO CRÍTICA: Health checks desabilitados em produção
    if (!DASHBOARD_CONFIG.HEALTH_CHECK_ENABLED) {
      console.log('🔍 Health checks desabilitados em produção');
      return;
    }

    // Esta função só é executada manualmente agora
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_CONFIG.REQUEST_TIMEOUT);

      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const healthData = await response.json();
        
        if (mountedRef.current) {
          setSystemStatus({
            online: true,
            lastCheck: Date.now(),
            version: healthData.version || '2.0.0-production',
            security: healthData.security
          });
        }

        failedRequestsRef.current = 0;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Timeout silencioso em produção
      }

      failedRequestsRef.current += 1;
      
      if (mountedRef.current) {
        setSystemStatus(prev => ({ ...prev, online: false }));
      }

      if (failedRequestsRef.current >= DASHBOARD_CONFIG.MAX_FAILED_REQUESTS) {
        addSecurityAlert('error', 'Problemas de conectividade detectados');
        failedRequestsRef.current = 0;
      }
    }
  }, [addSecurityAlert]);

  // 🔐 DETECTOR DE ATIVIDADE PARA SESSÃO
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // 🚨 FUNÇÃO PARA VERIFICAÇÃO MANUAL (apenas para admins)
  const manualSystemCheck = useCallback(async () => {
    if (!isAdmin()) {
      addSecurityAlert('warning', 'Acesso negado - apenas administradores');
      return;
    }

    console.log('🔍 Verificação manual do sistema solicitada');
    
    // Temporariamente habilitar para esta execução
    const originalEnabled = DASHBOARD_CONFIG.HEALTH_CHECK_ENABLED;
    DASHBOARD_CONFIG.HEALTH_CHECK_ENABLED = true;
    
    try {
      setIsRefreshing(true);
      await checkSystemHealth();
      addSecurityAlert('success', 'Verificação do sistema concluída');
    } catch (error) {
      addSecurityAlert('error', `Erro na verificação: ${error.message}`);
    } finally {
      DASHBOARD_CONFIG.HEALTH_CHECK_ENABLED = originalEnabled;
      setIsRefreshing(false);
    }
  }, [checkSystemHealth, addSecurityAlert, isAdmin]);

  // 🔐 INICIALIZAÇÃO DE PRODUÇÃO - SEM HEALTH CHECKS AUTOMÁTICOS
  useEffect(() => {
    if (!isAuthenticated || !mountedRef.current) {
      setSystemStatus({
        online: true,
        lastCheck: 0,
        version: '2.0.0-production'
      });
      setSecurityAlerts([]);
      return;
    }

    console.log('🚀 Dashboard iniciado em modo produção para:', user?.username);

    // 🚨 REMOVIDO: Verificações automáticas de health
    // 🚨 REMOVIDO: setInterval para health checks
    // 🚨 REMOVIDO: Polling automático

    // ✅ APENAS: Configurar estado inicial
    if (mountedRef.current) {
      setSystemStatus({
        online: true,
        lastCheck: Date.now(),
        version: '2.0.0-production',
        security: {
          security_enabled: true,
          production_mode: true
        }
      });
      
      addSecurityAlert('success', 'Sistema iniciado em modo produção', false);
    }

    return () => {
      // Cleanup básico
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      console.log('🧹 Dashboard desmontado');
    };
  }, [isAuthenticated, user?.username, addSecurityAlert]);

  // 🔐 MONITORAMENTO DE ATIVIDADE - PRODUÇÃO
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Auto-logout por inatividade em produção
    const inactivityCheck = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > DASHBOARD_CONFIG.AUTO_LOGOUT_TIME) {
        addSecurityAlert('warning', 'Sessão expirada por inatividade');
        handleSecureLogout();
      }
    }, 60000); // Verificar a cada minuto
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, [lastActivity, updateActivity]);

  // 🔄 CARREGAMENTO INICIAL - SEM POLLING AUTOMÁTICO
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('📊 Carregando dados iniciais...');
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        addSecurityAlert('error', 'Erro ao carregar dados do dashboard');
      }
    };
    
    if (isAuthenticated && mountedRef.current) {
      loadInitialData();
    }
  }, [loadData, isAuthenticated, addSecurityAlert]);

  // 🧹 CLEANUP GERAL
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // 🔐 LOGOUT SEGURO EM PRODUÇÃO
  const handleSecureLogout = useCallback(async () => {
    try {
      // Limpeza de dados sensíveis
      setSystemStatus({
        online: false,
        lastCheck: 0,
        version: '2.0.0-production'
      });
      setSecurityAlerts([]);
      setLastActivity(0);
      
      await logout();
      console.log('🔓 Logout seguro concluído');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Forçar logout em caso de erro
      window.location.reload();
    }
  }, [logout]);

  // 🔄 REFRESH MANUAL DE DADOS
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      updateActivity();
      clearError();
      
      console.log('🔄 Refresh manual iniciado');
      await loadData();
      
      addSecurityAlert('success', 'Dados atualizados com sucesso');
    } catch (error) {
      console.error('Erro no refresh:', error);
      addSecurityAlert('error', 'Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadData, clearError, updateActivity, addSecurityAlert]);

  // 🛠️ REQUISIÇÕES SEGURAS EM PRODUÇÃO
  const handleSecureRequest = useCallback(async (url, options = {}) => {
    try {
      updateActivity();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DASHBOARD_CONFIG.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          ...options.headers
        },
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          addSecurityAlert('error', 'Sessão expirada');
          await handleSecureLogout();
          return null;
        }
        
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        addSecurityAlert('warning', 'Requisição cancelada por timeout');
        return null;
      }
      
      console.error('Erro na requisição:', error);
      addSecurityAlert('error', `Erro de rede: ${error.message}`);
      throw error;
    }
  }, [updateActivity, addSecurityAlert, handleSecureLogout]);

  // 🛠️ FUNÇÕES CRUD - PRODUÇÃO
  const handleCreateItem = useCallback(async (type, itemData) => {
    try {
      let endpoint = '';
      
      switch (type) {
        case 'cliente':
          endpoint = '/api/clientes';
          break;
        case 'projeto':
          endpoint = '/api/projects';
          break;
        case 'conta':
          endpoint = '/api/contas';
          break;
        default:
          throw new Error(`Tipo inválido: ${type}`);
      }

      const result = await handleSecureRequest(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(itemData)
      });

      if (result?.success) {
        closeModal();
        await loadData();
        addSecurityAlert('success', `${type.charAt(0).toUpperCase() + type.slice(1)} criado`);
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao criar ${type}:`, error);
      addSecurityAlert('error', `Erro ao criar ${type}`);
    }
  }, [handleSecureRequest, closeModal, loadData, addSecurityAlert]);

  const handleUpdateItem = useCallback(async (type, id, itemData) => {
    try {
      let endpoint = '';

      switch (type) {
        case 'cliente':
          endpoint = `/api/clientes/${id}`;
          break;
        case 'projeto':
          endpoint = `/api/projects/${id}`;
          break;
        case 'conta':
          endpoint = `/api/contas/${id}`;
          break;
        default:
          throw new Error(`Tipo inválido: ${type}`);
      }

      const result = await handleSecureRequest(`http://localhost:5000${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });

      if (result?.success) {
        closeModal();
        await loadData();
        addSecurityAlert('success', `${type.charAt(0).toUpperCase() + type.slice(1)} atualizado`);
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao atualizar ${type}:`, error);
      addSecurityAlert('error', `Erro ao atualizar ${type}`);
    }
  }, [handleSecureRequest, closeModal, loadData, addSecurityAlert]);

  const handleDeleteItem = useCallback(async (type, id) => {
    if (!confirm(`⚠️ Confirma a exclusão deste ${type}?`)) return;

    try {
      let endpoint = '';

      switch (type) {
        case 'cliente':
          endpoint = `/api/clientes/${id}`;
          break;
        case 'projeto':
          endpoint = `/api/projects/${id}`;
          break;
        case 'conta':
          endpoint = `/api/contas/${id}`;
          break;
        default:
          throw new Error(`Tipo inválido: ${type}`);
      }

      const result = await handleSecureRequest(`http://localhost:5000${endpoint}`, {
        method: 'DELETE'
      });

      if (result?.success) {
        await loadData();
        addSecurityAlert('success', `${type.charAt(0).toUpperCase() + type.slice(1)} excluído`);
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao excluir ${type}:`, error);
      addSecurityAlert('error', `Erro ao excluir ${type}`);
    }
  }, [handleSecureRequest, loadData, addSecurityAlert]);

  const handlePayBill = useCallback(async (id) => {
    if (!confirm('💰 Confirmar pagamento?')) return;

    try {
      const result = await handleSecureRequest(`http://localhost:5000/api/contas/${id}/pagar`, {
        method: 'PATCH',
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split('T')[0]
        })
      });

      if (result?.success) {
        await loadData();
        addSecurityAlert('success', 'Conta marcada como paga');
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao pagar conta:', error);
      addSecurityAlert('error', 'Erro ao pagar conta');
    }
  }, [handleSecureRequest, loadData, addSecurityAlert]);

  // 🔔 FUNÇÕES DE NOTIFICAÇÕES
  const handleMarkNotificationAsRead = useCallback(async (id) => {
    try {
      await handleSecureRequest(`http://localhost:5000/api/notificacoes/${id}/marcar-lida`, {
        method: 'PATCH'
      });
      await loadData();
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  }, [handleSecureRequest, loadData]);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    try {
      await handleSecureRequest('http://localhost:5000/api/notificacoes/marcar-todas-lidas', {
        method: 'PATCH'
      });
      await loadData();
      addSecurityAlert('success', 'Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar notificações:', error);
    }
  }, [handleSecureRequest, loadData, addSecurityAlert]);

  // 📋 COPIAR CÓDIGO DE BARRAS
  const copiarCodigoBarras = useCallback(async (codigo) => {
    try {
      if (!codigo || typeof codigo !== 'string') {
        throw new Error('Código inválido');
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo);
        addSecurityAlert('success', 'Código copiado');
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = codigo;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          addSecurityAlert('success', 'Código copiado');
        } catch (err) {
          throw new Error('Falha na cópia');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      updateActivity();
    } catch (error) {
      console.error('Erro ao copiar:', error);
      addSecurityAlert('error', 'Erro ao copiar código');
    }
  }, [addSecurityAlert, updateActivity]);

  // 🔧 FORMATAÇÃO SEGURA
  const formatTimestamp = useCallback((date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  }, []);

  // 🎨 LOADING STATE - PRODUÇÃO
  if (loading && !data.projects && !data.clientes) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-blue-600" />
            <Shield className="w-4 h-4 absolute -top-1 -right-1 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema HVAC</h2>
          <p className="text-gray-600 font-medium">Carregando dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Modo Produção • Seguro • Otimizado</p>
        </div>
      </div>
    );
  }

  // 🎨 ERROR STATE - PRODUÇÃO
  if (error && !data.projects && !data.clientes) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Carregando...' : 'Tentar Novamente'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 📋 RENDERIZAR CONTEÚDO POR ABA
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return (
          <DashboardContent 
            data={data}
            boletosBancarios={boletosBancarios}
            estatisticasBoletos={estatisticasBoletos}
            statusBancos={statusBancos}
            loadingBoletos={loadingBoletos}
            verificarTodosBoletos={verificarTodosBoletos}
            ultimaVerificacao={ultimaVerificacao}
            bancosConfigurados={bancosConfigurados}
            errorBoletos={errorBoletos}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatTimestamp={formatTimestamp}
            copiarCodigoBarras={copiarCodigoBarras}
            setActiveTab={setActiveTab}
            openModal={openModal}
            handlePayBill={handlePayBill}
            handleMarkNotificationAsRead={handleMarkNotificationAsRead}
            handleMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
            loadData={handleManualRefresh}
            user={user}
            systemStatus={systemStatus}
            isSecure={isSecure}
            userBankProfile={userBankProfile}
            isRefreshing={isRefreshing}
          />
        );
      
      case 'projects': 
        return (
          <ProjectsSection 
            projects={data.projects || []} 
            fullView={true}
            onEdit={(project) => openModal('projeto', project)}
            onCreate={() => openModal('projeto')}
            onDelete={(id) => handleDeleteItem('projeto', id)}
            loading={loading}
          />
        );
      
      case 'clients':
        return (
          <ClientsContent 
            clientes={data.clientes || []}
            openModal={openModal}
            handleDeleteItem={handleDeleteItem}
            loading={loading}
          />
        );
      
      case 'bills':
        return (
          <BillsSection 
            bills={data.bills || []}
            onEdit={(bill) => openModal('conta', bill)}
            onPay={handlePayBill}
            onCreate={() => openModal('conta')}
            onDelete={(id) => handleDeleteItem('conta', id)}
            fullView={true}
            loading={loading}
          />
        );

      case 'boleto-monitor':
        return (
          <BoletoMonitorContent 
            boletosBancarios={boletosBancarios}
            estatisticasBoletos={estatisticasBoletos}
            statusBancos={statusBancos}
            loadingBoletos={loadingBoletos}
            verificarTodosBoletos={verificarTodosBoletos}
            ultimaVerificacao={ultimaVerificacao}
            bancosConfigurados={bancosConfigurados}
            errorBoletos={errorBoletos}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatTimestamp={formatTimestamp}
            copiarCodigoBarras={copiarCodigoBarras}
            setActiveTab={setActiveTab}
          />
        );

      case 'bank-config':
        return <SecureBankConfigPage />;
      
      case 'files':
        return (
          <FilesContent 
            files={data.files || []}
            formatDate={formatDate}
            loading={loading}
          />
        );

      case 'users':
        if (!isAdmin()) {
          return (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
              <p className="text-gray-600">Apenas administradores podem gerenciar usuários.</p>
            </div>
          );
        }
        return <UsersManagement />;
      
      default: 
        return (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Página não encontrada</h2>
            <p className="text-gray-600 mb-4">A aba '{activeTab}' não existe.</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 🔐 ALERTAS DE SEGURANÇA - PRODUÇÃO */}
      {securityAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {securityAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg shadow-lg border animate-slide-in ${
                alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {alert.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                   alert.type === 'error' ? <XCircle className="w-4 h-4" /> :
                   <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id))}
                  className="flex-shrink-0 opacity-50 hover:opacity-100"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📁 SIDEBAR */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleManualRefresh}
        user={user}
        onLogout={handleSecureLogout}
        isAdmin={isAdmin}
        isManager={isManager}
        isRefreshing={isRefreshing}
      />

      {/* 📋 CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-auto">
        {/* ✅ HEADER DE PRODUÇÃO */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Sistema HVAC</h1>
                <div className="flex gap-1">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    PRODUÇÃO
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    🔐 SEGURO
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <h2 className="text-lg font-medium text-gray-700">
                {activeTab === 'dashboard' ? '📊 Dashboard' :
                 activeTab === 'projects' ? '🏗️ Projetos' :
                 activeTab === 'clients' ? '👥 Clientes' :
                 activeTab === 'bills' ? '💰 Contas a Pagar' :
                 activeTab === 'boleto-monitor' ? '🏦 Monitor de Boletos' :
                 activeTab === 'bank-config' ? '⚙️ Configuração Bancária' :
                 activeTab === 'files' ? '📁 Arquivos' :
                 activeTab === 'users' ? '👤 Usuários' :
                 '📄 Página'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* INDICADORES DE STATUS - PRODUÇÃO */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    systemStatus?.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className={systemStatus?.online ? 'text-green-600' : 'text-red-600'}>
                    {systemStatus?.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Server className="w-3 h-3" />
                  <span>Produção</span>
                </div>
                
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <Lock className="w-3 h-3" />
                  <span>{isSecure ? 'Protegido' : 'Seguro'}</span>
                </div>
                
                {/* REFRESH MANUAL */}
                <button 
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="Atualizar dados"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                
                {/* VERIFICAÇÃO MANUAL (APENAS ADMIN) */}
                {isAdmin() && (
                  <button 
                    onClick={manualSystemCheck}
                    disabled={isRefreshing}
                    className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                    title="Verificação manual do sistema (Admin)"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                )}
                
                {/* NOTIFICAÇÕES */}
                <button className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  {data?.notifications?.filter(n => !n.lida).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {data.notifications.filter(n => !n.lida).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300"></div>
              
              {/* USUÁRIO */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center relative">
                    <User className="w-4 h-4 text-white" />
                    {isSecure && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white">
                        <Lock className="w-1.5 h-1.5 text-white m-0.5" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user?.full_name || user?.username}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{user?.role?.toUpperCase()}</span>
                      {userBankProfile?.configured_banks?.length > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                          🏦 {userBankProfile.configured_banks.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* MENU DO USUÁRIO */}
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSecureLogout}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Logout Seguro"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📋 ÁREA DE CONTEÚDO */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* 🎨 MODAL */}
      <Modal 
        show={showModal}
        type={modalType}
        editingItem={editingItem}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={(data) => {
          if (editingItem) {
            handleUpdateItem(modalType, editingItem.id, data);
          } else {
            handleCreateItem(modalType, data);
          }
        }}
        onClose={closeModal}
        clientes={data.clientes || []}
        projects={data.projects || []}
      />

      {/* CSS PARA ANIMAÇÕES */}
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// 🎯 COMPONENTE DASHBOARD CONTENT - PRODUÇÃO
const DashboardContent = ({
  data,
  boletosBancarios,
  estatisticasBoletos,
  statusBancos,
  loadingBoletos,
  verificarTodosBoletos,
  ultimaVerificacao,
  bancosConfigurados,
  errorBoletos,
  formatCurrency,
  formatDate,
  formatTimestamp,
  copiarCodigoBarras,
  setActiveTab,
  openModal,
  handlePayBill,
  handleMarkNotificationAsRead,
  handleMarkAllNotificationsAsRead,
  loadData,
  user,
  systemStatus,
  isSecure,
  userBankProfile,
  isRefreshing
}) => {
  return (
    <div className="space-y-6">
      {/* ✅ BOAS-VINDAS DE PRODUÇÃO */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center relative">
            <User className="w-6 h-6 text-white" />
            {isSecure && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                <Lock className="w-2 h-2 text-white m-0.5" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Bem-vindo, {user?.full_name?.split(' ')[0] || user?.username}! 👋
            </h2>
            <p className="text-gray-600">
              Sistema em produção • <span className="font-medium text-blue-600">{user?.role}</span> • 
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700">Sistema Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Produção Segura</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700">Alta Performance</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-600" />
            <span className="text-orange-700">Dados Protegidos</span>
          </div>
        </div>

        {/* INDICADORES DE SISTEMA */}
        {systemStatus && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Versão:</span>
                <span className="font-medium text-blue-600">{systemStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${systemStatus.online ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus.online ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Modo:</span>
                <span className="font-medium text-purple-600">Produção</span>
              </div>
            </div>
            
            {userBankProfile?.configured_banks?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-blue-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Bancos Configurados:</span>
                  <div className="flex gap-1">
                    {userBankProfile.configured_banks.map(banco => (
                      <span key={banco} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {banco === 'BRADESCO' ? '🔴 BRA' : banco === 'ITAU' ? '🟠 ITA' : '🟡 BB'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTROLES E STATUS */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Última atualização: {new Date().toLocaleString('pt-BR')}</span>
          {systemStatus && (
            <>
              <span className="text-gray-400">•</span>
              <span className={`font-medium flex items-center gap-1 ${systemStatus.online ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {systemStatus.online ? 'Conectado' : 'Desconectado'}
              </span>
            </>
          )}
        </div>
        <button 
          onClick={loadData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Atualização manual"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <Lock className="w-3 h-3" />
          <span className="text-sm font-medium">
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </span>
        </button>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <StatsCards 
        stats={data.stats || {}} 
        projects={data.projects || []}
        bills={data.bills || []}
        files={data.files || []}
        clientes={data.clientes || []}
        loading={isRefreshing}
      />

      {/* SEÇÕES PRINCIPAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PROJETOS */}
        <div className="bg-white rounded-lg shadow-sm border">
          <ProjectsSection 
            projects={data.projects || []}
            onEdit={(project) => openModal('projeto', project)}
            onCreate={() => openModal('projeto')}
            fullView={false}
            loading={isRefreshing}
          />
        </div>

        {/* CONTAS A PAGAR */}
        <div className="bg-white rounded-lg shadow-sm border">
          <BillsSection 
            bills={data.bills || []}
            onEdit={(bill) => openModal('conta', bill)}
            onPay={handlePayBill}
            onCreate={() => openModal('conta')}
            onViewAll={() => setActiveTab('bills')}
            fullView={false}
            loading={isRefreshing}
          />
        </div>
      </div>

      {/* MONITOR BANCÁRIO (SE CONFIGURADO) */}
      {isSecure && userBankProfile?.configured_banks?.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Monitor Bancário</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {userBankProfile.configured_banks.length} banco(s)
                </span>
              </div>
              <button 
                onClick={() => setActiveTab('boleto-monitor')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver detalhes →
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {estatisticasBoletos.total || 0}
                </div>
                <div className="text-sm text-gray-600">Total de Boletos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {estatisticasBoletos.pendentes || 0}
                </div>
                <div className="text-sm text-gray-600">Pendentes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(estatisticasBoletos.valorTotal || 0)}
                </div>
                <div className="text-sm text-gray-600">Valor Total</div>
              </div>
            </div>
            
            {ultimaVerificacao && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  Última verificação: {formatTimestamp(ultimaVerificacao)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICAÇÕES */}
      <div className="bg-white rounded-lg shadow-sm border">
        <NotificationsSection 
          notifications={data.notifications || []}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          loading={isRefreshing}
        />
      </div>
    </div>
  );
};

// 🎯 COMPONENTES AUXILIARES - SIMPLIFICADOS PARA PRODUÇÃO
const ClientsContent = ({ clientes, openModal, handleDeleteItem, loading }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">👥 Clientes</h1>
        <p className="text-gray-600 mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
      </div>
      <button 
        onClick={() => openModal('cliente')}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
      >
        <Users className="w-4 h-4" />
        Novo Cliente
      </button>
    </div>
    
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : clientes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map(cliente => (
              <div key={cliente.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600">📧 {cliente.email}</p>
                    <p className="text-sm text-gray-500">📞 {cliente.telefone}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openModal('cliente', cliente)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDeleteItem('cliente', cliente.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>📍 {cliente.endereco}</p>
                  <p>🏙️ {cliente.cidade}, {cliente.estado}</p>
                  <p>📮 CEP: {cliente.cep}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-gray-500 mb-4">Comece adicionando seu primeiro cliente</p>
            <button 
              onClick={() => openModal('cliente')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4 inline mr-2" />
              Adicionar Cliente
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

const BoletoMonitorContent = (props) => (
  <div className="bg-white rounded-lg shadow-sm border">
    <div className="px-6 py-4 border-b border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-purple-600" />
        Monitor de Boletos
      </h1>
    </div>
    <div className="p-6 text-center py-12">
      <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Monitor Bancário Completo</h3>
      <p className="text-gray-600">Funcionalidade em desenvolvimento para produção</p>
    </div>
  </div>
);

const FilesContent = ({ files, formatDate, loading }) => (
  <div className="bg-white rounded-lg shadow-sm border">
    <div className="px-6 py-4 border-b border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Arquivos
      </h1>
    </div>
    <div className="p-6 text-center py-12">
      {loading ? (
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
      ) : (
        <>
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Gerenciamento de Arquivos</h3>
          <p className="text-gray-600">{files.length} arquivo(s) • Sistema em desenvolvimento</p>
        </>
      )}
    </div>
  </div>
);

const UsersManagement = () => (
  <div className="bg-white rounded-lg shadow-sm border">
    <div className="px-6 py-4 border-b border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Users className="w-6 h-6 text-green-600" />
        Gerenciar Usuários
      </h1>
    </div>
    <div className="p-6 text-center py-12">
      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Gerenciamento de Usuários</h3>
      <p className="text-gray-600">Painel administrativo em desenvolvimento</p>
    </div>
  </div>
);

export default Dashboard;