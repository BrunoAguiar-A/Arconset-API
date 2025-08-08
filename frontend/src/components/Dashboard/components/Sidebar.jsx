// 📁 src/components/Dashboard/components/Sidebar.jsx - VERSÃO ATUALIZADA COM MONITOR DE BOLETOS
import React from 'react';
import { 
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Landmark,
  Settings,
  FolderOpen,
  UserCog,
  LogOut,
  Shield,
  ChevronRight,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onRefresh, 
  user, 
  onLogout, 
  isAdmin, 
  isManager,
  isRefreshing,
  // 🚨 NOVAS PROPS PARA BOLETOS
  boletoStats = {
    total: 0,
    urgentes: 0,
    hasConfigured: false,
    activeBanks: 0
  }
}) => {
  
  // 📋 Configuração dos itens do menu ATUALIZADA
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Visão geral do sistema',
      color: 'blue'
    },
    {
      id: 'projects',
      label: 'Projetos/Obras',
      icon: Building2,
      description: 'Gerenciar projetos HVAC',
      color: 'green'
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      description: 'Cadastro de clientes',
      color: 'purple'
    },
    {
      id: 'bills',
      label: 'Contas a Pagar',
      icon: CreditCard,
      description: 'Gestão financeira',
      color: 'orange',
      badge: '💰'
    },
    // 🚨 ITEM ATUALIZADO: Monitor de Boletos com badges dinâmicos
    {
      id: 'boleto-monitor',
      label: 'Monitor Boletos',
      icon: Zap,
      description: 'Detecção automática de boletos',
      color: 'purple',
      badge: boletoStats.total > 0 ? `${boletoStats.total}` : null,
      urgentBadge: boletoStats.urgentes > 0,
      isNew: true, // Marcar como nova funcionalidade
      status: boletoStats.hasConfigured ? 'active' : 'setup'
    },
    {
      id: 'bank-config',
      label: 'Config. Bancos',
      icon: Settings,
      description: 'APIs Bradesco, Itaú, BB',
      color: 'yellow',
      badge: boletoStats.hasConfigured ? `${boletoStats.activeBanks}` : '⚙️'
    },
    {
      id: 'files',
      label: 'Arquivos',
      icon: FolderOpen,
      description: 'Documentos na nuvem',
      color: 'cyan'
    }
  ];

  // Adicionar item de usuários apenas para admin
  if (isAdmin && isAdmin()) {
    menuItems.push({
      id: 'users',
      label: 'Usuários',
      icon: UserCog,
      description: 'Gerenciar usuários',
      color: 'red',
      requiresRole: ['admin'],
      badge: '👥'
    });
  }

  // 🔧 Verificar se usuário tem acesso ao item
  const hasAccess = (item) => {
    if (!item.requiresRole) return true;
    if (isAdmin && isAdmin()) return true;
    if (isManager && isManager() && item.requiresRole.includes('manager')) return true;
    return false;
  };

  // 🎨 Obter classes de cor baseadas no estado - MELHORADAS
  const getItemClasses = (item) => {
    const isActive = activeTab === item.id;
    const hasAccessToItem = hasAccess(item);
    
    if (!hasAccessToItem) {
      return 'flex items-center gap-3 w-full p-3 text-gray-400 cursor-not-allowed opacity-50';
    }
    
    if (isActive) {
      return `flex items-center gap-3 w-full p-3 text-${item.color}-700 bg-${item.color}-50 border-r-3 border-${item.color}-500 font-medium shadow-sm`;
    }
    
    return `flex items-center gap-3 w-full p-3 text-gray-700 hover:text-${item.color}-600 hover:bg-${item.color}-50 transition-all duration-200 hover:border-r-3 hover:border-${item.color}-300`;
  };

  // 🚨 NOVA FUNÇÃO: Obter indicador de status para o item
  const getStatusIndicator = (item) => {
    if (item.id !== 'boleto-monitor') return null;
    
    if (!boletoStats.hasConfigured) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-xs text-yellow-600 font-medium">Setup</span>
        </div>
      );
    }
    
    if (boletoStats.urgentes > 0) {
      return (
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-xs text-red-600 font-medium">Urgente</span>
        </div>
      );
    }
    
    if (boletoStats.total > 0) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Ativo</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">Ok</span>
      </div>
    );
  };

  // 🔧 Lidar com clique no item
  const handleItemClick = (item) => {
    if (!hasAccess(item)) {
      alert(`🚫 Acesso negado!\n\nVocê precisa ser ${item.requiresRole.join(' ou ')} para acessar esta funcionalidade.`);
      return;
    }
    
    // 🚨 NOVO: Feedback especial para Monitor de Boletos
    if (item.id === 'boleto-monitor' && !boletoStats.hasConfigured) {
      const shouldConfigure = confirm(
        '🏦 Monitor de Boletos\n\n' +
        'Para usar esta funcionalidade, você precisa configurar pelo menos um banco.\n\n' +
        'Deseja ir para a configuração de bancos primeiro?'
      );
      
      if (shouldConfigure) {
        setActiveTab('bank-config');
        return;
      }
    }
    
    setActiveTab(item.id);
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* 🏢 Header da Sidebar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sistema HVAC</h1>
            <p className="text-xs text-gray-500">Arconset - Climatização</p>
          </div>
        </div>
        
        {/* Info do usuário logado */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium text-sm">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || user?.username || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role?.toUpperCase() || 'USER'}
              </p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* 📋 Menu de navegação ATUALIZADO */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasAccessToItem = hasAccess(item);
            const statusIndicator = getStatusIndicator(item);
            
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={!hasAccessToItem}
                  className={`${getItemClasses(item)} rounded-lg transition-all duration-200 group relative`}
                  title={hasAccessToItem ? item.description : 'Acesso restrito'}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      <Icon className={`w-5 h-5 ${isActive ? `text-${item.color}-600` : ''}`} />
                      {/* 🚨 NOVO: Indicador de urgência para boletos */}
                      {item.id === 'boleto-monitor' && item.urgentBadge && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                      {/* 🚨 NOVO: Indicador de nova funcionalidade */}
                      {item.isNew && (
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        {/* 🚨 NOVO: Badge de status especial para Monitor de Boletos */}
                        {item.id === 'boleto-monitor' && item.status === 'setup' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                            Setup
                          </span>
                        )}
                        {item.id === 'boleto-monitor' && item.status === 'active' && boletoStats.urgentes > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                            {boletoStats.urgentes} urgente(s)
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-75">{item.description}</div>
                      {/* 🚨 NOVO: Status indicator para Monitor de Boletos */}
                      {statusIndicator && (
                        <div className="mt-1">
                          {statusIndicator}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Badge opcional ATUALIZADO */}
                  {item.badge && (
                    <div className="flex items-center gap-1">
                      {/* Badge numérico para boletos */}
                      {item.id === 'boleto-monitor' && typeof item.badge === 'string' && !isNaN(item.badge) ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          boletoStats.urgentes > 0 
                            ? 'bg-red-100 text-red-700 animate-pulse' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.badge}
                        </span>
                      ) : (
                        <span className="text-xs">{item.badge}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Indicador de acesso restrito */}
                  {!hasAccessToItem && (
                    <div className="text-gray-400">🔒</div>
                  )}
                  
                  {/* Seta para item ativo */}
                  {isActive && (
                    <ChevronRight className={`w-4 h-4 text-${item.color}-600`} />
                  )}
                </button>
                
                {/* 🚨 NOVO: Tooltip melhorado para Monitor de Boletos */}
                {item.id === 'boleto-monitor' && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 max-w-xs">
                    <div className="space-y-1">
                      <div className="font-medium">Monitor de Boletos</div>
                      <div>Total: {boletoStats.total}</div>
                      <div>Urgentes: {boletoStats.urgentes}</div>
                      <div>Bancos: {boletoStats.activeBanks}/3</div>
                      <div className="text-yellow-300">
                        {boletoStats.hasConfigured ? '✅ Configurado' : '⚠️ Necessita configuração'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tooltip para itens restritos */}
                {!hasAccessToItem && item.requiresRole && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Requer: {item.requiresRole.join(' ou ')}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 📊 SEÇÃO DE MÉTRICAS ATUALIZADA */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Métricas do Sistema
        </h3>
        
        {/* Métricas compactas ATUALIZADAS */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <TrendingUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-blue-600 font-medium">Projetos</p>
            <p className="text-sm font-bold text-blue-700">8</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <DollarSign className="w-4 h-4 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-green-600 font-medium">Receita</p>
            <p className="text-sm font-bold text-green-700">R$ 85k</p>
          </div>
        </div>
        
        {/* 🚨 NOVA SEÇÃO: Status de Boletos */}
        {boletoStats.hasConfigured && (
          <div className="bg-purple-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
              <Zap className="w-3 h-3" />
              <span>Monitor de Boletos</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <p className="text-purple-600 font-bold text-lg">{boletoStats.total}</p>
                <p className="text-purple-500">Total</p>
              </div>
              <div className="text-center">
                <p className={`font-bold text-lg ${
                  boletoStats.urgentes > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {boletoStats.urgentes}
                </p>
                <p className={boletoStats.urgentes > 0 ? 'text-red-500' : 'text-green-500'}>
                  Urgentes
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Status do sistema compacto */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">API Principal</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">Online</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Monitor Boletos</span>
            <div className="flex items-center gap-1">
              {boletoStats.hasConfigured ? (
                <>
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span className="text-purple-600 font-medium">Ativo</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Config</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Performance</span>
            <div className="flex items-center gap-1">
              <Activity className={`w-3 h-3 ${isRefreshing ? 'text-yellow-500 animate-spin' : 'text-blue-500'}`} />
              <span className={`font-medium ${isRefreshing ? 'text-yellow-600' : 'text-blue-600'}`}>
                {isRefreshing ? 'Carregando' : 'Ótima'}
              </span>
            </div>
          </div>
        </div>

        {/* 🚨 NOVO: Alerta de configuração para Monitor de Boletos */}
        {!boletoStats.hasConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800">Setup Necessário</span>
            </div>
            <p className="text-xs text-yellow-700 mb-2">
              Configure os bancos para ativar o monitor automático de boletos.
            </p>
            <button
              onClick={() => setActiveTab('bank-config')}
              className="w-full text-xs bg-yellow-600 text-white py-1.5 px-2 rounded hover:bg-yellow-700 transition-colors"
            >
              Configurar Agora
            </button>
          </div>
        )}
      </div>

      {/* 🚪 Seção de logout */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
          title="Sair do sistema"
        >
          <LogOut className="w-5 h-5" />
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">Sair</div>
            <div className="text-xs opacity-75">Encerrar sessão</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;