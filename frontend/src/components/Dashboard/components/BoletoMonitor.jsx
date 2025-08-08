// 📁 src/components/Dashboard/components/BoletoMonitor.jsx - VERSÃO FINAL INTEGRADA
import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Copy,
  Zap,
  FileText,
  RefreshCw,
  Search,
  Download,
  Eye,
  Clock,
  Building,
  CreditCard,
  Info,
  X,
  Settings,
  TrendingUp,
  AlertCircle,
  Database
} from 'lucide-react';

const BoletoMonitor = ({
  // Props vindas do Dashboard via useSecureBankMonitor
  boletos = [],
  loading = false,
  error = null,
  ultimaVerificacao = null,
  statusBancos = {},
  bancosConfigurados = {},
  estatisticas = {
    total: 0,
    urgentes: 0,
    pendentes: 0,
    vencidos: 0,
    valorTotal: 0,
    porBanco: { bradesco: 0, itau: 0, bb: 0 }
  },
  // Funções vindas do Dashboard
  onVerificarBoletos,
  onCopiarCodigo,
  onConfigureBanks,
  // Status do sistema
  userBankProfile = null,
  isSecure = false,
  hasConfiguredBanks = false,
  activeBanks = 0,
  totalBanks = 3
}) => {
  // Estados locais para filtros e UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBank, setSelectedBank] = useState('TODOS');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [sortBy, setSortBy] = useState('vencimento');
  const [selectedBoleto, setSelectedBoleto] = useState(null);

  // Funções auxiliares
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    const hoje = new Date();
    const vencimento = new Date(dueDate);
    return Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
  };

  const getBoletoStatusInfo = (boleto) => {
    const diasRestantes = getDaysUntilDue(boleto.dataVencimento);
    
    if (diasRestantes < 0) {
      return {
        status: 'Vencido',
        color: 'red',
        icon: AlertTriangle,
        text: `${Math.abs(diasRestantes)} dias em atraso`
      };
    } else if (diasRestantes === 0) {
      return {
        status: 'Vence Hoje',
        color: 'orange',
        icon: AlertCircle,
        text: 'Vence hoje!'
      };
    } else if (diasRestantes <= 3) {
      return {
        status: 'Urgente',
        color: 'yellow',
        icon: Clock,
        text: `Vence em ${diasRestantes} dias`
      };
    } else {
      return {
        status: 'Normal',
        color: 'green',
        icon: CheckCircle,
        text: `Vence em ${diasRestantes} dias`
      };
    }
  };

  const getBankColor = (banco) => {
    switch (banco) {
      case 'Bradesco': return 'bg-red-100 text-red-800';
      case 'Itaú': return 'bg-blue-100 text-blue-800';
      case 'Banco do Brasil': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar e ordenar boletos
  const filteredBoletos = useMemo(() => {
    if (!Array.isArray(boletos)) return [];
    
    let filtered = boletos.filter(boleto => {
      if (!boleto) return false;
      
      const matchesSearch = 
        (boleto.beneficiario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (boleto.codigoBarras || '').includes(searchTerm) ||
        (boleto.banco || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBank = selectedBank === 'TODOS' || boleto.banco === selectedBank;
      
      const statusInfo = getBoletoStatusInfo(boleto);
      const matchesStatus = selectedStatus === 'TODOS' || statusInfo.status === selectedStatus;
      
      return matchesSearch && matchesBank && matchesStatus;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'vencimento':
          return new Date(a.dataVencimento || 0) - new Date(b.dataVencimento || 0);
        case 'valor':
          return (b.valor || 0) - (a.valor || 0);
        case 'banco':
          return (a.banco || '').localeCompare(b.banco || '');
        case 'beneficiario':
          return (a.beneficiario || '').localeCompare(b.beneficiario || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [boletos, searchTerm, selectedBank, selectedStatus, sortBy]);

  // Handlers
  const handleVerificarBoletos = async () => {
    if (typeof onVerificarBoletos === 'function') {
      try {
        await onVerificarBoletos();
      } catch (error) {
        console.error('Erro ao verificar boletos:', error);
      }
    }
  };

  const handleCopiarCodigo = async (codigo) => {
    if (typeof onCopiarCodigo === 'function') {
      await onCopiarCodigo(codigo);
    } else {
      // Fallback se a função não foi passada
      try {
        await navigator.clipboard.writeText(codigo);
        alert('✅ Código copiado!');
      } catch (error) {
        console.error('Erro ao copiar:', error);
        alert('❌ Erro ao copiar código');
      }
    }
  };

  const handleConfigureBanks = () => {
    if (typeof onConfigureBanks === 'function') {
      onConfigureBanks();
    }
  };

  // Exportar dados
  const exportarDados = () => {
    if (filteredBoletos.length === 0) {
      alert('Não há boletos para exportar');
      return;
    }

    const csvData = filteredBoletos.map(boleto => ({
      'Banco': boleto.banco || '',
      'Beneficiário': boleto.beneficiario || '',
      'Valor': boleto.valor || 0,
      'Vencimento': boleto.dataVencimento || '',
      'Status': getBoletoStatusInfo(boleto).status,
      'Código de Barras': boleto.codigoBarras || '',
      'Data Detecção': boleto.dataDeteccao || ''
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boletos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Modal de detalhes
  const BoletoModal = ({ boleto, onClose }) => {
    if (!boleto) return null;

    const statusInfo = getBoletoStatusInfo(boleto);
    const StatusIcon = statusInfo.icon;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Detalhes do Boleto</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Status e Urgência */}
            <div className={`p-4 rounded-lg border-2 ${
              statusInfo.color === 'red' ? 'bg-red-50 border-red-200' :
              statusInfo.color === 'orange' ? 'bg-orange-50 border-orange-200' :
              statusInfo.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-6 h-6 ${
                  statusInfo.color === 'red' ? 'text-red-600' :
                  statusInfo.color === 'orange' ? 'text-orange-600' :
                  statusInfo.color === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div>
                  <h3 className={`font-semibold ${
                    statusInfo.color === 'red' ? 'text-red-800' :
                    statusInfo.color === 'orange' ? 'text-orange-800' :
                    statusInfo.color === 'yellow' ? 'text-yellow-800' :
                    'text-green-800'
                  }`}>
                    {statusInfo.status}
                  </h3>
                  <p className={`text-sm ${
                    statusInfo.color === 'red' ? 'text-red-600' :
                    statusInfo.color === 'orange' ? 'text-orange-600' :
                    statusInfo.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {statusInfo.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Informações principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Beneficiário</label>
                  <p className="text-lg font-medium text-gray-900">{boleto.beneficiario || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(boleto.valor)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Banco</label>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBankColor(boleto.banco)}`}>
                      {boleto.banco || 'N/A'}
                    </span>
                    <span className="text-gray-600">{boleto.conta || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Vencimento</label>
                  <p className="text-lg font-medium text-gray-900">{formatDate(boleto.dataVencimento)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Detecção</label>
                  <p className="text-lg font-medium text-gray-900">{formatDateTime(boleto.dataDeteccao)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Origem</label>
                  <p className="text-lg font-medium text-gray-900">{boleto.origem || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Código de barras */}
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Código de Barras</label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                <code className="flex-1 font-mono text-sm break-all">
                  {boleto.codigoBarras || 'N/A'}
                </code>
                <button
                  onClick={() => handleCopiarCodigo(boleto.codigoBarras)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Copiar código"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Informações da empresa */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Informações da Empresa</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Empresa:</strong> {boleto.empresa || 'ArconSet Climatização'}</p>
                <p><strong>CNPJ:</strong> {boleto.cnpj || '12.345.678/0001-90'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Se não há bancos configurados, mostrar tela de setup
  if (!hasConfiguredBanks) {
    return (
      <div className="space-y-6">
        {/* Card de configuração necessária */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure os Bancos</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Para usar o Monitor de Boletos, você precisa configurar pelo menos um banco. 
            O sistema detectará automaticamente os boletos gerados para o CNPJ da sua empresa.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleConfigureBanks}
              className="bg-yellow-600 text-white px-8 py-3 rounded-lg hover:bg-yellow-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Settings className="w-5 h-5" />
              Configurar Bancos Agora
            </button>
            
            <div className="text-sm text-gray-500">
              <p>Bancos suportados: Bradesco, Itaú, Banco do Brasil</p>
            </div>
          </div>
        </div>

        {/* Informações sobre como funciona */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Como funciona o Monitor de Boletos</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• <strong>Detecção Automática:</strong> Os boletos são detectados automaticamente através de webhooks dos bancos configurados.</p>
                <p>• <strong>Monitoramento em Tempo Real:</strong> O sistema verifica continuamente por novos boletos gerados para o CNPJ da sua empresa.</p>
                <p>• <strong>Alertas Inteligentes:</strong> Boletos próximos do vencimento ou vencidos são destacados automaticamente.</p>
                <p>• <strong>Integração Bancária:</strong> Funciona com Bradesco, Itaú e Banco do Brasil através de APIs oficiais.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderização principal
  return (
    <div className="space-y-6">
      {/* Header com estatísticas rápidas */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">Monitor de Boletos</h1>
              {isSecure && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  🔐 Seguro
                </span>
              )}
            </div>
            <p className="text-gray-600">
              Monitoramento automático • {activeBanks}/{totalBanks} bancos ativos
            </p>
            {ultimaVerificacao && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Última verificação: {formatDateTime(ultimaVerificacao)}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleVerificarBoletos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Verificando...' : 'Verificar Boletos'}
            </button>
            
            <button 
              onClick={exportarDados}
              disabled={filteredBoletos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-600">{estatisticas.vencidos}</p>
              <p className="text-sm text-gray-600">Vencidos</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-600">{estatisticas.urgentes}</p>
              <p className="text-sm text-gray-600">Urgentes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-600">{estatisticas.pendentes}</p>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(estatisticas.valorTotal)}</p>
              <p className="text-sm text-gray-600">Valor Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por beneficiário, código ou banco..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="TODOS">Todos os Bancos</option>
            <option value="Bradesco">Bradesco</option>
            <option value="Itaú">Itaú</option>
            <option value="Banco do Brasil">Banco do Brasil</option>
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="Vencido">Vencidos</option>
            <option value="Vence Hoje">Vence Hoje</option>
            <option value="Urgente">Urgentes</option>
            <option value="Normal">Normais</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="vencimento">Ordenar por Vencimento</option>
            <option value="valor">Ordenar por Valor</option>
            <option value="banco">Ordenar por Banco</option>
            <option value="beneficiario">Ordenar por Beneficiário</option>
          </select>
        </div>
      </div>

      {/* Lista de Boletos */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Boletos Encontrados ({filteredBoletos.length})
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando boletos...</h3>
                <p className="text-gray-500">Verificando webhooks dos bancos</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar boletos</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={handleVerificarBoletos}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredBoletos.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum boleto encontrado</h3>
              <p className="text-gray-500">
                {boletos.length === 0 ? 
                  'Não há boletos detectados ainda' : 
                  'Nenhum boleto corresponde aos filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBoletos.map((boleto) => {
                const statusInfo = getBoletoStatusInfo(boleto);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div 
                    key={boleto.id} 
                    className={`border-2 rounded-lg p-6 transition-all hover:shadow-md cursor-pointer ${
                      statusInfo.color === 'red' ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                      statusInfo.color === 'orange' ? 'border-orange-200 bg-orange-50 hover:bg-orange-100' :
                      statusInfo.color === 'yellow' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                      'border-green-200 bg-green-50 hover:bg-green-100'
                    }`}
                    onClick={() => setSelectedBoleto(boleto)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusIcon className={`w-5 h-5 ${
                            statusInfo.color === 'red' ? 'text-red-600' :
                            statusInfo.color === 'orange' ? 'text-orange-600' :
                            statusInfo.color === 'yellow' ? 'text-yellow-600' :
                            'text-green-600'
                          }`} />
                          
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {boleto.beneficiario || 'Beneficiário não informado'}
                            </h3>
                            <p className={`text-sm font-medium ${
                              statusInfo.color === 'red' ? 'text-red-600' :
                              statusInfo.color === 'orange' ? 'text-orange-600' :
                              statusInfo.color === 'yellow' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {statusInfo.text}
                            </p>
                          </div>
                          
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBankColor(boleto.banco)}`}>
                            {boleto.banco || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="font-bold text-xl text-gray-900">
                              {formatCurrency(boleto.valor)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                              Vencimento: {formatDate(boleto.dataVencimento)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                              {boleto.conta || 'Conta não informada'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Detectado: {formatDateTime(boleto.dataDeteccao)}</span>
                          <span>•</span>
                          <span>Origem: {boleto.origem || 'N/A'}</span>
                          <span>•</span>
                          <span>ID: {boleto.id}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopiarCodigo(boleto.codigoBarras);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Copiar código de barras"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoleto(boleto);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status dos Bancos */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Bancos Configurados</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(bancosConfigurados).map(([banco, configurado]) => (
            <div key={banco} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {banco === 'BANCO_BRASIL' ? 'Banco do Brasil' : 
                   banco === 'BRADESCO' ? 'Bradesco' :
                   banco === 'ITAU' ? 'Itaú' :
                   banco.charAt(0) + banco.slice(1).toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  configurado ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className={`text-sm font-medium ${
                  configurado ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {configurado ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-xs text-gray-500">
                  ({estatisticas.porBanco[banco.toLowerCase().replace('_', '')] || 0} boletos)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Como funciona o Monitor de Boletos</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>Detecção Automática:</strong> Os boletos são detectados automaticamente através de webhooks dos bancos configurados.</p>
              <p>• <strong>Monitoramento em Tempo Real:</strong> O sistema verifica continuamente por novos boletos gerados para o CNPJ da sua empresa.</p>
              <p>• <strong>Alertas Inteligentes:</strong> Boletos próximos do vencimento ou vencidos são destacados automaticamente.</p>
              <p>• <strong>Integração Bancária:</strong> Funciona com Bradesco, Itaú e Banco do Brasil através de APIs oficiais.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <BoletoModal 
        boleto={selectedBoleto} 
        onClose={() => setSelectedBoleto(null)} 
      />
    </div>
  );
};

export default BoletoMonitor;