// 📁 src/components/Dashboard/Dashboard.jsx - VERSÃO CORRIGIDA COM LAYOUT ADEQUADO
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Calendar
} from 'lucide-react';

// 📋 Componentes
import StatsCards from './components/StatsCards';
import ProjectsSection from './components/ProjectsSection';
import BillsSection from './components/BillsSection';
import NotificationsSection from './components/NotificationsSection';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import SecureBankConfigPage from './pages/SecureBankConfigPage';

// 🔧 Hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useModal } from './hooks/useModal';
import { useSecureBankMonitor } from './hooks/useSecureBankMonitor';
import { useAuth } from './hooks/useAuth'; 

// 🎯 Utilitários
import { formatCurrency, formatDate } from './utils';

const Dashboard = () => {
  // 🔧 Estado principal
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 🔐 Hook de autenticação
  const { user, logout, isAdmin, isManager } = useAuth();
  
  // 🎯 Hooks SEMPRE no top level
  const { data, loading, error, loadData } = useDashboardData();
  const { 
    showModal, 
    modalType, 
    editingItem, 
    formData,
    openModal, 
    closeModal,
    handleInputChange 
  } = useModal();

  const {
    boletos: boletosBancarios = [],
    loading: loadingBoletos = false,
    ultimaVerificacao,
    statusBancos = {},
    verificarTodosBoletos,
    getEstatisticas,
    bancosConfigurados = {}
  } = useSecureBankMonitor();

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

  // 🔄 Carregar dados na inicialização
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };
    
    loadInitialData();
  }, [loadData]);

  // 🔐 Função para logout
  const handleLogout = useCallback(async () => {
    if (confirm('🔓 Tem certeza que deseja sair?')) {
      try {
        await logout();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  }, [logout]);

  // 🛠️ Funções CRUD (mantidas iguais)
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
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        closeModal();
        await loadData();
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} criado com sucesso!`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao criar ${type}:`, error);
      alert(`❌ Erro ao criar ${type}: ${error.message}`);
    }
  }, [closeModal, loadData]);

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
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        closeModal();
        await loadData();
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} atualizado com sucesso!`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao atualizar ${type}:`, error);
      alert(`❌ Erro ao atualizar ${type}: ${error.message}`);
    }
  }, [closeModal, loadData]);

  const handleDeleteItem = useCallback(async (type, id) => {
    if (!confirm(`⚠️ Tem certeza que deseja deletar este ${type}?`)) return;

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
          throw new Error(`Tipo de item inválido: ${type}`);
      }

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        await loadData();
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} deletado com sucesso!`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`Erro ao deletar ${type}:`, error);
      alert(`❌ Erro ao deletar ${type}: ${error.message}`);
    }
  }, [loadData]);

  const handlePayBill = useCallback(async (id) => {
    if (!confirm('💰 Marcar esta conta como paga?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/contas/${id}/pagar`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        await loadData();
        alert('✅ Conta marcada como paga!');
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao pagar conta:', error);
      alert(`❌ Erro ao pagar conta: ${error.message}`);
    }
  }, [loadData]);

  // 🔔 Funções para notificações
  const handleMarkNotificationAsRead = useCallback(async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notificacoes/${id}/marcar-lida`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  }, [loadData]);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notificacoes/marcar-todas-lidas', {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        await loadData();
        alert('✅ Todas as notificações foram marcadas como lidas!');
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações:', error);
    }
  }, [loadData]);

  // 📋 Função para copiar código de barras
  const copiarCodigoBarras = useCallback(async (codigo) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo);
        alert('✅ Código de barras copiado!');
      } else {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = codigo;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          alert('✅ Código de barras copiado!');
        } catch (err) {
          alert('❌ Erro ao copiar código de barras');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('❌ Erro ao copiar código de barras');
    }
  }, []);

  // 🔧 Formatação de timestamp
  const formatTimestamp = useCallback((date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar timestamp:', error);
      return 'Data inválida';
    }
  }, []);

  // 🎨 Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 font-medium">Carregando dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Conectando ao servidor...</p>
        </div>
      </div>
    );
  }

  // 🎨 Error state
  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={loadData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 mx-auto"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 📋 Renderizar conteúdo baseado na aba ativa
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
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatTimestamp={formatTimestamp}
            copiarCodigoBarras={copiarCodigoBarras}
            setActiveTab={setActiveTab}
            openModal={openModal}
            handlePayBill={handlePayBill}
            handleMarkNotificationAsRead={handleMarkNotificationAsRead}
            handleMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
            loadData={loadData}
            user={user}
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
          />
        );
      
      case 'clients':
        return (
          <ClientsContent 
            clientes={data.clientes || []}
            openModal={openModal}
            handleDeleteItem={handleDeleteItem}
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
        return (
          <UsersManagement />
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
      {/* 📁 Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={loadData}
        user={user}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isManager={isManager}
      />

      {/* 📋 Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        {/* ✅ BARRA DE USUÁRIO NO TOPO */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Sistema HVAC</h1>
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
              {/* Indicadores de sistema */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
                
                {/* Notificações */}
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
              
              {/* Info do usuário */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{user?.full_name || user?.username}</p>
                    <p className="text-gray-500">{user?.role?.toUpperCase()}</p>
                  </div>
                </div>
                
                {/* Menu do usuário */}
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📋 Área de conteúdo */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* 🎨 Modal */}
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
    </div>
  );
};

// 🎯 Componente DashboardContent separado
const DashboardContent = ({
  data,
  boletosBancarios,
  estatisticasBoletos,
  statusBancos,
  loadingBoletos,
  verificarTodosBoletos,
  ultimaVerificacao,
  bancosConfigurados,
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
  user
}) => {
  return (
    <div className="space-y-6">
      {/* ✅ BOAS-VINDAS PERSONALIZADAS */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Bem-vindo, {user?.full_name?.split(' ')[0] || user?.username}! 👋
            </h2>
            <p className="text-gray-600">
              Você está logado como <span className="font-medium text-blue-600">{user?.role}</span> • 
              Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-700">Sistema Online</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Dados em Tempo Real</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-600" />
            <span className="text-purple-700">Configurado e Seguro</span>
          </div>
        </div>
      </div>

      {/* Controles e última atualização */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Última atualização: {new Date().toLocaleString('pt-BR')}</span>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">Atualizar</span>
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <StatsCards 
        stats={data.stats || {}} 
        projects={data.projects || []}
        bills={data.bills || []}
        files={data.files || []}
        clientes={data.clientes || []}
      />

      {/* Monitor de Boletos Bancários */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                🏦 Monitor de Boletos Bancários
              </h2>
              <p className="text-gray-600 text-sm mt-1">Detecção automática via APIs oficiais dos bancos</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (typeof verificarTodosBoletos === 'function') {
                    verificarTodosBoletos();
                  }
                }}
                disabled={loadingBoletos}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBoletos ? 'animate-spin' : ''}`} />
                {loadingBoletos ? 'Verificando...' : 'Verificar'}
              </button>
              <button
                onClick={() => setActiveTab('bank-config')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ⚙️ Configurar
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status dos bancos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(statusBancos).map(([banco, status]) => (
              <div key={banco} className={`p-4 rounded-lg border-2 transition-all ${
                status.conectado ? 'border-green-200 bg-green-50' :
                status.erro ? 'border-red-200 bg-red-50' : 
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {banco === 'BRADESCO' ? '🔴 Bradesco' : 
                     banco === 'ITAU' ? '🟠 Itaú' : '🟡 Banco do Brasil'}
                  </h3>
                  <div className={`w-3 h-3 rounded-full ${
                    status.conectado ? 'bg-green-500' :
                    status.erro ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <p className={`text-sm font-medium ${
                  status.conectado ? 'text-green-600' :
                  status.erro ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {status.conectado ? '✅ Conectado' :
                   status.erro ? '❌ Erro' : '⏳ Aguardando'}
                </p>
                {status.totalBoletos > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    📄 {status.totalBoletos} boleto(s)
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{estatisticasBoletos.total}</p>
              <p className="text-sm text-blue-600 font-medium">Total</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-2xl font-bold text-orange-600">{estatisticasBoletos.urgentes}</p>
              <p className="text-sm text-orange-600 font-medium">Urgentes</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-600">{estatisticasBoletos.pendentes}</p>
              <p className="text-sm text-green-600 font-medium">Pendentes</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-lg font-bold text-purple-600">{formatCurrency(estatisticasBoletos.valorTotal)}</p>
              <p className="text-sm text-purple-600 font-medium">Valor Total</p>
            </div>
          </div>

          {/* Lista de boletos (resto igual) */}
          {boletosBancarios.length > 0 ? (
            <div className="space-y-3">
              {boletosBancarios.slice(0, 3).map(boleto => (
                <div key={boleto.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900">{boleto.beneficiario}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          boleto.banco === 'Bradesco' ? 'bg-red-100 text-red-700' :
                          boleto.banco === 'Itaú' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {boleto.banco}
                        </span>
                        {boleto.urgente && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full animate-pulse">
                            🚨 URGENTE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        💰 {formatCurrency(boleto.valor)} • 📅 Vence: {formatDate(boleto.dataVencimento)}
                      </p>
                      <p className="text-xs text-gray-500">🏦 Conta: {boleto.conta}</p>
                    </div>
                    <button
                      onClick={() => copiarCodigoBarras(boleto.codigoBarras)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </button>
                  </div>
                </div>
              ))}
              
              {boletosBancarios.length > 3 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setActiveTab('boleto-monitor')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                  >
                    📋 Ver todos os {boletosBancarios.length} boletos →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              {Object.values(bancosConfigurados).some(Boolean) ? (
                <div>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-green-600">✅ Nenhum boleto pendente</h3>
                  <p className="text-gray-600 text-sm">Todos os bancos estão sendo monitorados</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-yellow-600 text-xl">⚙️</span>
                  </div>
                  <h3 className="text-lg font-medium text-yellow-600">Configuração Necessária</h3>
                  <p className="text-gray-600 text-sm mb-4">Configure as credenciais dos bancos para começar</p>
                  <button
                    onClick={() => setActiveTab('bank-config')}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    ⚙️ Configurar Bancos
                  </button>
                </div>
              )}
            </div>
          )}

          {ultimaVerificacao && (
            <div className="mt-4 pt-4 border-t text-center text-xs text-gray-500">
              ⏰ Última verificação: {formatTimestamp(ultimaVerificacao)}
            </div>
          )}
        </div>
      </div>

      {/* Projetos em Andamento */}
      <ProjectsSection 
        projects={data.projects || []}
        onEdit={(project) => openModal('projeto', project)}
      />

      {/* Contas a Pagar */}
      <BillsSection 
        bills={data.bills || []}
        onEdit={(bill) => openModal('conta', bill)}
        onPay={handlePayBill}
        onViewAll={() => setActiveTab('bills')}
        fullView={false}
      />

      {/* Notificações */}
      <NotificationsSection 
        notifications={data.notifications || []}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
      />
    </div>
  );
};

// Componentes auxiliares (mantidos iguais)
const ClientsContent = ({ clientes, openModal, handleDeleteItem }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">👥 Clientes</h1>
        <button 
          onClick={() => openModal('cliente')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          ➕ Novo Cliente
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {clientes.length > 0 ? (
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
                        title="Editar cliente"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('cliente', cliente.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar cliente"
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
                <span className="text-gray-400 text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-gray-500 mb-4">Comece adicionando seu primeiro cliente</p>
              <button 
                onClick={() => openModal('cliente')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ Adicionar Cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BoletoMonitorContent = ({
  boletosBancarios,
  estatisticasBoletos,
  statusBancos,
  loadingBoletos,
  verificarTodosBoletos,
  ultimaVerificacao,
  bancosConfigurados,
  formatCurrency,
  formatDate,
  formatTimestamp,
  copiarCodigoBarras,
  setActiveTab
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏦 Monitor de Boletos</h1>
          <p className="text-gray-600 mt-1">Boletos detectados via APIs bancárias oficiais</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('bank-config')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ⚙️ Configurar
          </button>
          <button
            onClick={() => {
              if (typeof verificarTodosBoletos === 'function') {
                verificarTodosBoletos();
              }
            }}
            disabled={loadingBoletos}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBoletos ? 'animate-spin' : ''}`} />
            {loadingBoletos ? 'Verificando...' : 'Verificar Agora'}
          </button>
        </div>
      </div>

      {/* Status dos Bancos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusBancos).map(([banco, status]) => (
          <div key={banco} className={`p-6 rounded-lg border-2 transition-colors ${
            status.conectado ? 'border-green-200 bg-green-50' :
            status.erro ? 'border-red-200 bg-red-50' : 
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                {banco === 'BRADESCO' ? '🔴 Bradesco' : 
                 banco === 'ITAU' ? '🟠 Itaú' : '🟡 Banco do Brasil'}
              </h3>
              <div className={`w-3 h-3 rounded-full ${
                status.conectado ? 'bg-green-500' :
                status.erro ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
            </div>
            
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Status:</span>{' '}
                {status.conectado ? '✅ Conectado' : 
                 status.erro ? '❌ Erro de conexão' : '⏳ Aguardando configuração'}
              </p>
              
              {status.ultimaConsulta && (
                <p>
                  <span className="font-medium">Última consulta:</span>{' '}
                  {formatTimestamp(status.ultimaConsulta)}
                </p>
              )}
              
              <p>
                <span className="font-medium">Boletos:</span>{' '}
                📄 {status.totalBoletos || 0}
              </p>
              
              {status.erro && (
                <p className="text-red-600 text-xs mt-2">
                  {status.erro}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resto do conteúdo seria igual ao original, mas com ícones melhorados */}
    </div>
  );
};

const FilesContent = ({ files, formatDate }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">📁 Arquivos na Nuvem</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
          📤 Upload
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <div key={file.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-blue-600 text-2xl">📄</div>
                    <div className="flex gap-1">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar">👁️</button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download">⬇️</button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deletar">🗑️</button>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 truncate">{file.nome_original}</h3>
                  <p className="text-sm text-gray-600 mb-2">🏗️ {file.projeto_nome || 'Sem projeto'}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>📋 {file.tipo_documento}</span>
                    <span>📅 {formatDate(file.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">☁️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum arquivo encontrado</h3>
              <p className="text-gray-500 mb-4">Faça upload dos seus primeiros arquivos</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                📤 Fazer Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UsersManagement = () => {
  const { authenticatedRequest } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await authenticatedRequest('/api/auth/users');
        if (response.success) {
          setUsers(response.users);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [authenticatedRequest]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">👤 Gerenciar Usuários</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors">
          ➕ Novo Usuário
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {users.length > 0 ? (
            <div className="space-y-4">
              {users.map(user => (
                <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-600">👤 {user.username} • 📧 {user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-700' :
                          user.role === 'manager' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                        {user.is_active ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">✅ ATIVO</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">❌ INATIVO</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Desativar">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-500">Configure os usuários do sistema</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;