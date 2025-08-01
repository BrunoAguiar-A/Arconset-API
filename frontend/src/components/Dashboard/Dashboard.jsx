// 📁 src/components/Dashboard/Dashboard.jsx - VERSÃO ATUALIZADA COM MONITOR DE BOLETOS
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { 
  RefreshCw, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  User, 
  Settings,
  Shield,
  Bell,
  Server,
  Lock,
  Building2,
  Users,
  Database,
  FileText,
  Zap
} from 'lucide-react';

// 📋 COMPONENTES ORGANIZADOS
import DashboardContent from './components/DashboardContent';
import ClientsContent from './components/ClientsContent.jsx';
import ProjectsSection from './components/ProjectsSection';
import BillsSection from './components/BillsSection';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import FilesSection from './components/FilesSection';
import NotificationsDropdown from './components/NotificationsDropdown';
import SettingsModal from './components/SettingsModal';
import SecureBankConfigPage from './pages/SecureBankConfigPage';

// 🚨 NOVO: Import do Monitor de Boletos
import BoletoMonitor from './components/BoletoMonitor';

// 🔧 HOOKS OTIMIZADOS
import { useSecureBankMonitor } from './hooks/useSecureBankMonitor';
import { useDashboardData } from './hooks/useDashboardData';
import { useModal } from './hooks/useModal';
import { useAuth } from './hooks/useAuth'; 

// 🎯 UTILITÁRIOS CENTRALIZADOS
import { formatCurrency, formatDate } from './utils';

// 🔐 CONFIGURAÇÕES DE PRODUÇÃO
const DASHBOARD_CONFIG = {
  AUTO_LOGOUT_TIME: 60 * 60 * 1000, // 1 hora
  SESSION_CHECK_INTERVAL: 10 * 60 * 1000, // 10 minutos
  MAX_FAILED_REQUESTS: 5,
  SENSITIVE_DATA_CLEANUP: 10 * 60 * 1000, // 10 minutos
  HEALTH_CHECK_ENABLED: false, // 🚨 DESABILITADO em produção
  SECURITY_ALERTS_ENABLED: true,
  REQUEST_TIMEOUT: 30000, // 30 segundos
  PRODUCTION_MODE: true,
  DEBUG_ENABLED: false, // 🚨 DESABILITADO em produção
  MANUAL_REFRESH_ENABLED: true,
  AUTO_REFRESH_ENABLED: false // 🚨 DESABILITADO em produção
};

const Dashboard = () => {
  // 🔧 ESTADOS PRINCIPAIS
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
  
  // 🎨 ESTADOS DE UI
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // 🔐 HOOK DE AUTENTICAÇÃO
  const { user, logout, isAdmin, isManager, isAuthenticated } = useAuth();
  
  // 🎯 HOOKS PRINCIPAIS
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

  // 🏦 HOOK BANCÁRIO OTIMIZADO
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
    userBankProfile,
    // 🚨 NOVAS FUNÇÕES PARA O MONITOR
    manualInit,
    resetMonitor,
    hasConfiguredBanks,
    totalBanks,
    activeBanks
  } = useSecureBankMonitor();

  // 🔧 REFERENCIAS PARA CONTROLE
  const mountedRef = useRef(true);
  const failedRequestsRef = useRef(0);
  const refreshTimeoutRef = useRef(null);

  // 📊 ESTATÍSTICAS MEMOIZADAS
  const estatisticasBoletos = useMemo(() => {
    try {
      return getEstatisticas();
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        total: 0,
        pendentes: 0,
        urgentes: 0,
        vencidos: 0,
        valorTotal: 0,
        porBanco: { bradesco: 0, itau: 0, bb: 0 }
      };
    }
  }, [getEstatisticas]);

  // 🔐 SISTEMA DE ALERTAS DE SEGURANÇA
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
    
    if (autoHide) {
      setTimeout(() => {
        if (mountedRef.current) {
          setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id));
        }
      }, 5000);
    }
    
    if (type === 'error') {
      console.error(`🔐 Security Alert: ${message}`);
    }
  }, []);

  // 🔐 VERIFICAÇÃO DE SISTEMA MANUAL
  const checkSystemHealth = useCallback(async () => {
    if (!DASHBOARD_CONFIG.HEALTH_CHECK_ENABLED) {
      console.log('🔍 Health checks desabilitados em produção');
      return;
    }

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
        return;
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

  // 🔐 DETECTOR DE ATIVIDADE
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // 🚨 VERIFICAÇÃO MANUAL DO SISTEMA (apenas admins)
  const manualSystemCheck = useCallback(async () => {
    if (!isAdmin()) {
      addSecurityAlert('warning', 'Acesso negado - apenas administradores');
      return;
    }

    console.log('🔍 Verificação manual do sistema solicitada');
    
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

  // 🚨 NOVA FUNÇÃO: Inicializar Monitor de Boletos
  const initializeBoletoMonitor = useCallback(async () => {
    try {
      addSecurityAlert('info', 'Inicializando monitor de boletos...');
      await manualInit();
      addSecurityAlert('success', 'Monitor de boletos inicializado');
    } catch (error) {
      console.error('Erro ao inicializar monitor:', error);
      addSecurityAlert('error', 'Erro ao inicializar monitor de boletos');
    }
  }, [manualInit, addSecurityAlert]);

  // 🔐 INICIALIZAÇÃO DE PRODUÇÃO
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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      console.log('🧹 Dashboard desmontado');
    };
  }, [isAuthenticated, user?.username, addSecurityAlert]);

  // 🔐 MONITORAMENTO DE ATIVIDADE
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    const inactivityCheck = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > DASHBOARD_CONFIG.AUTO_LOGOUT_TIME) {
        addSecurityAlert('warning', 'Sessão expirada por inatividade');
        handleSecureLogout();
      }
    }, 60000);
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, [lastActivity, updateActivity]);

  // 🔄 CARREGAMENTO INICIAL
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

  // 🔐 LOGOUT SEGURO
  const handleSecureLogout = useCallback(async () => {
    try {
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
      window.location.reload();
    }
  }, [logout]);

  // 🔄 REFRESH MANUAL
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      updateActivity();
      clearError();
      
      console.log('🔄 Refresh manual iniciado');
      await loadData();
      
      // 🚨 NOVO: Também atualizar boletos se estivermos na aba do monitor
      if (activeTab === 'boleto-monitor') {
        await verificarTodosBoletos();
      }
      
      addSecurityAlert('success', 'Dados atualizados com sucesso');
    } catch (error) {
      console.error('Erro no refresh:', error);
      addSecurityAlert('error', 'Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadData, clearError, updateActivity, addSecurityAlert, activeTab, verificarTodosBoletos]);

  // 🛠️ REQUISIÇÕES SEGURAS
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

  // 🛠️ FUNÇÕES CRUD (mantidas iguais)
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

  // 🎨 LOADING STATE
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

  // 🎨 ERROR STATE
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

  // 📋 RENDERIZAR CONTEÚDO POR ABA - NOVA LÓGICA ORGANIZADA
  const renderContent = () => {
    // Props comuns que todos os componentes precisam
    const commonProps = {
      data,
      loading: isRefreshing,
      formatCurrency,
      formatDate,
      formatTimestamp,
      openModal,
      handleDeleteItem,
      user
    };

    switch (activeTab) {
      case 'dashboard': 
        return (
          <DashboardContent 
            {...commonProps}
            boletosBancarios={boletosBancarios}
            estatisticasBoletos={estatisticasBoletos}
            statusBancos={statusBancos}
            loadingBoletos={loadingBoletos}
            verificarTodosBoletos={verificarTodosBoletos}
            ultimaVerificacao={ultimaVerificacao}
            bancosConfigurados={bancosConfigurados}
            errorBoletos={errorBoletos}
            copiarCodigoBarras={copiarCodigoBarras}
            setActiveTab={setActiveTab}
            handlePayBill={handlePayBill}
            handleMarkNotificationAsRead={handleMarkNotificationAsRead}
            handleMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
            loadData={handleManualRefresh}
            systemStatus={systemStatus}
            isSecure={isSecure}
            userBankProfile={userBankProfile}
            isRefreshing={isRefreshing}
          />
        );
      
      case 'projects': 
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  🏗️ Projetos
                </h1>
                <p className="text-gray-600 mt-2">
                  {data.projects?.length || 0} projeto(s) em andamento
                </p>
              </div>
              <button 
                onClick={() => openModal('projeto')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                Novo Projeto
              </button>
            </div>
            <ProjectsSection 
              projects={data.projects || []} 
              fullView={true}
              onEdit={(project) => openModal('projeto', project)}
              onCreate={() => openModal('projeto')}
              onDelete={(id) => handleDeleteItem('projeto', id)}
              loading={isRefreshing}
            />
          </div>
        );
      
      case 'clients':
        return (
          <ClientsContent 
            {...commonProps}
            clientes={data.clientes || []}
          />
        );
      
      case 'bills':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  💰 Contas a Pagar
                </h1>
                <p className="text-gray-600 mt-2">
                  {data.bills?.length || 0} conta(s) cadastrada(s)
                </p>
              </div>
              <button 
                onClick={() => openModal('conta')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Nova Conta
              </button>
            </div>
            <BillsSection 
              bills={data.bills || []}
              onEdit={(bill) => openModal('conta', bill)}
              onPay={handlePayBill}
              onCreate={() => openModal('conta')}
              onDelete={(id) => handleDeleteItem('conta', id)}
              fullView={true}
              loading={isRefreshing}
            />
          </div>
        );

      // 🚨 NOVO CASE: Monitor de Boletos
      case 'boleto-monitor':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
            </div>
            
            {/* Renderizar o componente BoletoMonitor */}
            <BoletoMonitor 
              boletos={boletosBancarios}
              loading={loadingBoletos}
              error={errorBoletos}
              ultimaVerificacao={ultimaVerificacao}
              statusBancos={statusBancos}
              bancosConfigurados={bancosConfigurados}
              estatisticas={estatisticasBoletos}
              onVerificarBoletos={verificarTodosBoletos}
              onCopiarCodigo={copiarCodigoBarras}
              onConfigureBanks={() => setActiveTab('bank-config')}
              userBankProfile={userBankProfile}
              isSecure={isSecure}
              hasConfiguredBanks={hasConfiguredBanks}
              activeBanks={activeBanks}
              totalBanks={totalBanks}
            />
          </div>
        );

      case 'bank-config':
        return <SecureBankConfigPage />;
      
      case 'files':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-cyan-600" />
                  </div>
                  📁 Arquivos
                </h1>
                <p className="text-gray-600 mt-2">
                  {data.files?.length || 0} arquivo(s) no sistema
                </p>
              </div>
              <button 
                onClick={() => {
                  // Implementar upload de arquivos
                  alert('Funcionalidade de upload em desenvolvimento');
                }}
                className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Upload Arquivo
              </button>
            </div>
            <FilesSection 
              files={data.files || []}
              projects={data.projects || []}
              onUpload={(files) => {
                console.log('Arquivos para upload:', files);
                // Implementar lógica de upload
              }}
              onDelete={(fileId) => {
                console.log('Excluir arquivo:', fileId);
                // Implementar lógica de exclusão
              }}
              onPreview={(file) => {
                console.log('Preview do arquivo:', file);
                // Implementar preview
              }}
              loading={isRefreshing}
            />
          </div>
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
        return (
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
      {/* 🔐 ALERTAS DE SEGURANÇA */}
      {securityAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {securityAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg shadow-lg border animate-slide-in ${
                alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                alert.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {alert.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                   alert.type === 'error' ? <XCircle className="w-4 h-4" /> :
                   alert.type === 'info' ? <Shield className="w-4 h-4" /> :
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

      {/* 📁 SIDEBAR ATUALIZADA */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleManualRefresh}
        user={user}
        onLogout={handleSecureLogout}
        isAdmin={isAdmin}
        isManager={isManager}
        isRefreshing={isRefreshing}
        // 🚨 NOVAS PROPS PARA BOLETOS
        boletoStats={{
          total: estatisticasBoletos.total,
          urgentes: estatisticasBoletos.urgentes,
          hasConfigured: hasConfiguredBanks,
          activeBanks: activeBanks
        }}
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
                  {/* 🚨 NOVO: Badge para boletos */}
                  {activeTab === 'boleto-monitor' && estatisticasBoletos.total > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      🏦 {estatisticasBoletos.total} boletos
                    </span>
                  )}
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
              {/* INDICADORES DE STATUS */}
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
                
                {/* NOTIFICAÇÕES COM DROPDOWN */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotificationsModal(!showNotificationsModal)}
                    className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver notificações"
                  >
                    <Bell className="w-5 h-5" />
                    {data?.notifications?.filter(n => !n.lida).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {data.notifications.filter(n => !n.lida).length}
                      </span>
                    )}
                  </button>
                  
                  <NotificationsDropdown 
                    show={showNotificationsModal}
                    onClose={() => setShowNotificationsModal(false)}
                    notifications={data?.notifications || []}
                    onMarkAsRead={handleMarkNotificationAsRead}
                    onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                    formatDate={formatDate}
                  />
                </div>
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
                    onClick={() => setShowSettingsModal(true)}
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

      {/* 🎨 MODAIS */}
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

      {/* MODAL DE CONFIGURAÇÕES */}
      <SettingsModal 
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
      />

    </div>
  );  
};

export default Dashboard;