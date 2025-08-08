// 📁 src/components/Dashboard/components/DashboardContent.jsx
import React from 'react';
import { 
  User, 
  Lock, 
  Server, 
  Building2, 
  RefreshCw, 
  Zap, 
  DollarSign, 
  ArrowRight,
  Calendar,
  Copy,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';

// Importar componentes
import StatsCards from './StatsCards';
import ProjectsSection from './ProjectsSection';
import BillsSection from './BillsSection';
import NotificationsSection from './NotificationsSection';

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
      {/* ✅ HEADER OTIMIZADO */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          {/* Info do usuário */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative">
              <User className="w-8 h-8 text-white" />
              {isSecure && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white">
                  <Lock className="w-2 h-2 text-white m-1" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                Olá, {user?.full_name?.split(' ')[0] || user?.username}! 👋
              </h2>
              <p className="text-white/80 text-sm">
                {user?.role?.toUpperCase()} • {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>
          
          {/* Ações rápidas */}
          <div className="flex items-center gap-3">
            <button
              onClick={verificarTodosBoletos}
              disabled={loadingBoletos}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Verificar novos boletos automaticamente"
            >
              <Zap className={`w-4 h-4 ${loadingBoletos ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">
                {loadingBoletos ? 'Verificando...' : 'Verificar Boletos'}
              </span>
            </button>
            
            <button
              onClick={() => openModal('conta')}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200"
              title="Adicionar nova conta a pagar"
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Nova Conta</span>
            </button>
            
            <button 
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </span>
            </button>
          </div>
        </div>
        
        {/* Indicadores de status */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/90">Sistema Online</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-white/80" />
              <span className="text-white/90">Produção Segura</span>
            </div>
            {userBankProfile?.configured_banks?.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/80" />
                <span className="text-white/90">
                  {userBankProfile.configured_banks.length} banco(s) configurado(s)
                </span>
              </div>
            )}
          </div>
          
          <div className="text-right text-sm text-white/80">
            <p>Última atualização: {new Date().toLocaleString('pt-BR')}</p>
            {ultimaVerificacao && (
              <p>Última verificação bancária: {formatTimestamp(ultimaVerificacao)}</p>
            )}
          </div>
        </div>
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

      {/* 🚀 SEÇÃO DE BOLETOS - SEMPRE VISÍVEL */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">💳 Monitor de Boletos</h3>
                <p className="text-white/90 text-sm">
                  {loadingBoletos ? 'Verificando boletos...' : 
                   boletosBancarios?.length > 0 ? `${boletosBancarios.length} boleto(s) encontrado(s)` :
                   'Sistema de detecção automática ativo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={verificarTodosBoletos}
                disabled={loadingBoletos}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                title="Verificar novos boletos"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBoletos ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {loadingBoletos ? 'Verificando...' : 'Verificar'}
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('boleto-monitor')}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">Ver detalhes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {boletosBancarios?.length || 0}
              </div>
              <div className="text-sm text-purple-700 font-medium">Total de Boletos</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {boletosBancarios?.filter(b => {
                  const vencimento = new Date(b.dataVencimento);
                  const hoje = new Date();
                  const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                  return diasRestantes >= 0 && diasRestantes <= 7;
                }).length || 0}
              </div>
              <div className="text-sm text-yellow-700 font-medium">Vence em 7 dias</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {boletosBancarios?.filter(b => {
                  const vencimento = new Date(b.dataVencimento);
                  return vencimento < new Date();
                }).length || 0}
              </div>
              <div className="text-sm text-red-700 font-medium">Vencidos</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(boletosBancarios?.reduce((sum, b) => sum + (b.valor || 0), 0) || 0)}
              </div>
              <div className="text-sm text-green-700 font-medium">Valor Total</div>
            </div>
          </div>

          {/* Conteúdo principal */}
          {loadingBoletos ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Verificando boletos...</h4>
                <p className="text-gray-600">Conectando com os bancos configurados</p>
              </div>
            </div>
          ) : boletosBancarios && boletosBancarios.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">Boletos Recentes</h4>
                <button 
                  onClick={() => setActiveTab('boleto-monitor')}
                  className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                >
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              
              {/* Lista de boletos */}
              <div className="space-y-3">
                {boletosBancarios
                  .sort((a, b) => new Date(b.dataDeteccao || b.created_at) - new Date(a.dataDeteccao || a.created_at))
                  .slice(0, 3)
                  .map((boleto, index) => {
                    const hoje = new Date();
                    const vencimento = new Date(boleto.dataVencimento);
                    const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                    const isVencido = diasRestantes < 0;
                    const isVenceHoje = diasRestantes === 0;
                    const isUrgente = diasRestantes <= 3 && diasRestantes >= 0;
                    
                    return (
                      <div 
                        key={boleto.id || index} 
                        className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                          isVencido ? 'border-red-200 bg-red-50' : 
                          isVenceHoje ? 'border-orange-200 bg-orange-50' : 
                          isUrgente ? 'border-yellow-200 bg-yellow-50' : 
                          'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-purple-600" />
                              <h3 className="font-medium text-gray-900">
                                {boleto.beneficiario || 'Beneficiário N/A'}
                              </h3>
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                AUTO
                              </span>
                              {boleto.isNovo && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full animate-pulse">
                                  NOVO!
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1 font-medium">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(boleto.valor || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Vence: {formatDate(boleto.dataVencimento) || 'Data N/A'}
                              </span>
                            </div>

                            {/* Status do prazo */}
                            <div className="mb-2">
                              {isVencido && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  {Math.abs(diasRestantes)} dias em atraso
                                </span>
                              )}
                              {isVenceHoje && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  Vence hoje!
                                </span>
                              )}
                              {isUrgente && !isVenceHoje && (
                                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  Vence em {diasRestantes} dias
                                </span>
                              )}
                              {!isVencido && !isVenceHoje && !isUrgente && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Em dia
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              <p>
                                Banco: {boleto.banco || 'N/A'} • 
                                Detectado: {formatDate(boleto.dataDeteccao) || formatDate(boleto.created_at) || 'Data N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Ações */}
                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => copiarCodigoBarras(boleto.codigoBarras || boleto.linha_digitavel)}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                              title="Copiar código de barras"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                alert(`Funcionalidade de download em desenvolvimento\nBoleto: ${boleto.beneficiario}`);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Baixar boleto"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-500" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhum boleto detectado</h4>
              <p className="text-gray-600 mb-4">
                {errorBoletos ? 
                  'Erro na verificação. Tente novamente.' : 
                  'Configure seus bancos para começar a detectar boletos automaticamente.'
                }
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={verificarTodosBoletos}
                  disabled={loadingBoletos}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Verificar Boletos
                </button>
                <button 
                  onClick={() => setActiveTab('bank-config')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Configurar Bancos
                </button>
              </div>
            </div>
          )}

          {/* Rodapé com informações */}
          {ultimaVerificacao && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Última verificação: {formatTimestamp(ultimaVerificacao)} • 
                Monitor automático {isSecure ? 'ativo' : 'configurando...'}
              </p>
              {userBankProfile?.configured_banks?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {userBankProfile.configured_banks.length} banco(s) configurado(s): {userBankProfile.configured_banks.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

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

export default DashboardContent;