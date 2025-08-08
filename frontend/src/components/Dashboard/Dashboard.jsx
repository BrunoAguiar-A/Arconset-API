// 📁 src/components/Dashboard/Dashboard.jsx - VERSÃO HÍBRIDA OTIMIZADA
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { useSecureBankMonitor } from './hooks/useSecureBankMonitor';
import { useModal } from './hooks/useModal';
import { useAuth } from './hooks/useAuth';

// Componentes otimizados
import Sidebar from './components/Sidebar';
import DashboardContent from './components/DashboardContent';
import ClientsContent from './components/ClientsContent';
import Modal from './components/Modal';
import NotificationsDropdown from './components/NotificationsDropdown';
import SettingsModal from './components/SettingsModal';
import BoletoMonitor from './components/BoletoMonitor';
import CloudFileManager from './components/CloudFileManager';
import EnhancedFilesComponent from './components/FilesSection';
import ProjectsSection from './components/ProjectsSection';
import BillsSection from './components/BillsSection';

// Icons otimizados
import { 
  Bell, 
  User, 
  Settings, 
  RefreshCw,
  Search,
  Plus,
  ChevronDown
} from 'lucide-react';

const Dashboard = () => {
  // ===== HOOKS PRINCIPAIS =====
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook de dados otimizado
  const {
    data,
    loading,
    error,
    loadData,
    createItem,
    updateItem,
    deleteItem,
    payBill,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearError
  } = useDashboardData();

  // Monitor bancário otimizado
  const {
    boletos: boletosBancarios = [],
    loading: loadingBoletos = false,
    error: errorBoletos = null,
    ultimaVerificacao,
    statusBancos = {},
    bancosConfigurados = {},
    isSecure = false,
    userBankProfile = null,
    hasConfiguredBanks = false,
    activeBanks = 0,
    verificarTodosBoletos,
    getEstatisticas,
    manualInit,
    resetMonitor
  } = useSecureBankMonitor();

  // Modal otimizado
  const {
    showModal,
    modalType,
    editingItem,
    formData,
    openModal,
    closeModal,
    handleInputChange
  } = useModal();

  // ===== ESTATÍSTICAS OTIMIZADAS =====
  const estatisticasBoletos = useMemo(() => {
    return getEstatisticas ? getEstatisticas() : {
      total: boletosBancarios?.length || 0,
      urgentes: 0,
      pendentes: 0,
      valorTotal: 0,
      porBanco: { bradesco: 0, itau: 0, bb: 0 }
    };
  }, [boletosBancarios, getEstatisticas]);

  // Estatísticas para sidebar
  const boletoStats = useMemo(() => ({
    total: estatisticasBoletos.total,
    urgentes: estatisticasBoletos.urgentes,
    hasConfigured: hasConfiguredBanks,
    activeBanks
  }), [estatisticasBoletos, hasConfiguredBanks, activeBanks]);

  // ===== FUNÇÕES OTIMIZADAS =====
  
  // Refresh global
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadData(),
        hasConfiguredBanks && verificarTodosBoletos ? verificarTodosBoletos() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro no refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadData, verificarTodosBoletos, hasConfiguredBanks]);

  // Criar/editar item
  const handleSubmitModal = useCallback(async (data) => {
    try {
      if (editingItem) {
        const result = await updateItem(modalType, editingItem.id, data);
        if (result.success) {
          closeModal();
          await loadData();
        }
      } else {
        const result = await createItem(modalType, data);
        if (result.success) {
          closeModal();
          await loadData();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  }, [editingItem, modalType, updateItem, createItem, closeModal, loadData]);

  // Deletar item
  const handleDeleteItem = useCallback(async (type, id) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      const result = await deleteItem(type, id);
      if (result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  }, [deleteItem, loadData]);

  // Pagar conta
  const handlePayBill = useCallback(async (billId) => {
    try {
      const result = await payBill(billId);
      if (result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao pagar conta:', error);
    }
  }, [payBill, loadData]);

  // Funções de notificação otimizadas
  const handleMarkNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  }, [markNotificationAsRead]);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Erro ao marcar todas:', error);
    }
  }, [markAllNotificationsAsRead]);

  // Copiar código de barras
  const copiarCodigoBarras = useCallback(async (codigo) => {
    try {
      await navigator.clipboard.writeText(codigo);
      alert('✅ Código copiado!');
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = codigo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Código copiado!');
    }
  }, []);

  // Formatação otimizada
  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }, []);

  const formatTimestamp = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  }, []);

  // ===== CONTROLES DE NAVEGAÇÃO =====
  const isAdmin = useCallback(() => user?.role === 'admin', [user]);
  const isManager = useCallback(() => ['admin', 'manager'].includes(user?.role), [user]);

  // ===== EFEITOS OTIMIZADOS =====
  
  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      loadData();
      
      // Inicializar monitor bancário se configurado
      if (hasConfiguredBanks && manualInit) {
        manualInit();
      }
    }
  }, [user, loadData, hasConfiguredBanks, manualInit]);

  // Auto-refresh otimizado (apenas se necessário)
  useEffect(() => {
    if (!user || activeTab !== 'dashboard') return;

    const interval = setInterval(() => {
      // Refresh silencioso apenas se não estiver carregando
      if (!loading && !isRefreshing) {
        loadData();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [user, activeTab, loading, isRefreshing, loadData]);

  // ===== RENDERIZAÇÃO DOS CONTEÚDOS =====
  const renderContent = () => {
    const commonProps = {
      data,
      loading,
      error,
      openModal,
      handleDeleteItem,
      formatCurrency,
      formatDate,
      formatTimestamp,
      isRefreshing
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
            loadData={loadData}
            user={user}
            isSecure={isSecure}
            userBankProfile={userBankProfile}
          />
        );

      case 'projects':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">🏗️ Projetos</h1>
              <button 
                onClick={() => openModal('projeto')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Novo Projeto
              </button>
            </div>
            <ProjectsSection 
              {...commonProps}
              projects={data.projects || []}
              onEdit={(project) => openModal('projeto', project)}
              onCreate={() => openModal('projeto')}
              onDelete={(id) => handleDeleteItem('projeto', id)}
              fullView={true}
            />
          </div>
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">💰 Contas a Pagar</h1>
              <button 
                onClick={() => openModal('conta')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nova Conta
              </button>
            </div>
            <BillsSection 
              {...commonProps}
              bills={data.bills || []}
              onEdit={(bill) => openModal('conta', bill)}
              onPay={handlePayBill}
              onCreate={() => openModal('conta')}
              fullView={true}
            />
          </div>
        );

      case 'boleto-monitor':
        return (
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
          />
        );

      case 'bank-config':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🏦 Configuração de Bancos</h2>
              <p className="text-gray-600 mb-6">
                Configure as APIs dos bancos para monitoramento automático de boletos
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-red-600">Bradesco</h3>
                    <p className="text-sm text-gray-500">API Banking</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      Em desenvolvimento
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-blue-600">Itaú</h3>
                    <p className="text-sm text-gray-500">Itaú Connect</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      Em desenvolvimento
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-yellow-600">Banco do Brasil</h3>
                    <p className="text-sm text-gray-500">BB OpenAPI</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      Em desenvolvimento
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('boleto-monitor')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Voltar ao Monitor
                </button>
              </div>
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">📁 Gestão de Arquivos</h1>
            </div>
            <EnhancedFilesComponent
              onUpload={loadData}
              onDelete={loadData}
              onRefresh={loadData}
              projects={data.projects || []}
              initialFiles={data.files || []}
            />
          </div>
        );

      case 'users':
        if (!isAdmin()) {
          return (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🚫 Acesso Negado</h2>
              <p className="text-gray-600">Apenas administradores podem acessar esta área.</p>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">👥 Gerenciar Usuários</h1>
              <button 
                onClick={() => openModal('usuario')}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Novo Usuário
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <p className="text-gray-600">
                Sistema de gerenciamento de usuários em desenvolvimento.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🚧 Em Desenvolvimento</h2>
            <p className="text-gray-600">Esta funcionalidade está sendo desenvolvida.</p>
          </div>
        );
    }
  };

  // ===== LOADING STATE =====
  if (loading && !data.projects.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando Sistema HVAC...</h3>
          <p className="text-gray-500">Aguarde enquanto buscamos os dados</p>
        </div>
      </div>
    );
  }

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin}
        isManager={isManager}
        isRefreshing={isRefreshing}
        boletoStats={boletoStats}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Título e breadcrumb */}
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && '📊 Dashboard'}
                {activeTab === 'projects' && '🏗️ Projetos'}
                {activeTab === 'clients' && '👥 Clientes'}
                {activeTab === 'bills' && '💰 Contas'}
                {activeTab === 'boleto-monitor' && '💳 Monitor de Boletos'}
                {activeTab === 'bank-config' && '🏦 Config. Bancos'}
                {activeTab === 'files' && '📁 Arquivos'}
                {activeTab === 'users' && '👤 Usuários'}
              </h1>
              
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                  <span>⚠️ {error}</span>
                  <button onClick={clearError} className="hover:text-red-800">✕</button>
                </div>
              )}
            </div>

            {/* Ações do header */}
            <div className="flex items-center space-x-4">
              {/* Botão de refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Notificações */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {data.notifications?.filter(n => !n.lida).length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </button>
                
                <NotificationsDropdown 
                  show={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  notifications={data.notifications || []}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                  formatDate={formatTimestamp}
                />
              </div>

              {/* Menu do usuário */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center space-x-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown do usuário */}
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          setShowSettings(true); // Abrir modal de configurações
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4" />
                        Configurações
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          logout();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <span>🚪</span>
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modais */}
      <Modal
        show={showModal}
        type={modalType}
        editingItem={editingItem}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmitModal}
        onClose={closeModal}
        clientes={data.clientes || []}
        projects={data.projects || []}
      />

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
      />
    </div>
  );
};

export default Dashboard;