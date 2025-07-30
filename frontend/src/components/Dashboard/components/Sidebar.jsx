// 📁 src/components/Dashboard/components/Sidebar.jsx - VERSÃO OTIMIZADA
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
  DollarSign
} from 'lucide-react';

const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  onRefresh, 
  user, 
  onLogout, 
  isAdmin, 
  isManager 
}) => {
  
  // 📋 Configuração dos itens do menu
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
    {
      id: 'boleto-monitor',
      label: 'Monitor Boletos',
      icon: Landmark,
      description: 'Detecção automática',
      color: 'pink',
      badge: '🤖'
    },
    {
      id: 'bank-config',
      label: 'Config. Bancos',
      icon: Settings,
      description: 'APIs Bradesco, Itaú, BB',
      color: 'yellow'
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

  // 🎨 Obter classes de cor baseadas no estado
  const getItemClasses = (item) => {
    const isActive = activeTab === item.id;
    const hasAccessToItem = hasAccess(item);
    
    if (!hasAccessToItem) {
      return 'flex items-center gap-3 w-full p-3 text-gray-400 cursor-not-allowed opacity-50';
    }
    
    if (isActive) {
      return `flex items-center gap-3 w-full p-3 text-${item.color}-700 bg-${item.color}-50 border-r-3 border-${item.color}-500 font-medium`;
    }
    
    return `flex items-center gap-3 w-full p-3 text-gray-700 hover:text-${item.color}-600 hover:bg-${item.color}-50 transition-all duration-200 hover:border-r-3 hover:border-${item.color}-300`;
  };

  // 🔧 Lidar com clique no item
  const handleItemClick = (item) => {
    if (!hasAccess(item)) {
      alert(`🚫 Acesso negado!\n\nVocê precisa ser ${item.requiresRole.join(' ou ')} para acessar esta funcionalidade.`);
      return;
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

      {/* 📋 Menu de navegação */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasAccessToItem = hasAccess(item);
            
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={!hasAccessToItem}
                  className={`${getItemClasses(item)} rounded-lg transition-all duration-200 group relative`}
                  title={hasAccessToItem ? item.description : 'Acesso restrito'}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${isActive ? `text-${item.color}-600` : ''}`} />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </div>
                  
                  {/* Badge opcional */}
                  {item.badge && (
                    <span className="text-xs">{item.badge}</span>
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

      {/* 📊 NOVA SEÇÃO: MÉTRICAS RÁPIDAS */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Métricas do Sistema
        </h3>
        
        {/* Métricas compactas */}
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
              <Zap className="w-3 h-3 text-purple-500" />
              <span className="text-purple-600 font-medium">Ativo</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Performance</span>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-blue-600 font-medium">Ótima</span>
            </div>
          </div>
        </div>
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