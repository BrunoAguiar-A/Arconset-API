// 📁 src/components/Dashboard/components/BillsSection.jsx - SEM BOTÕES DUPLICADOS
import React from 'react';
import { 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Clock,
  ArrowRight,
  Copy,
  Zap,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useSecureBankMonitor } from '../hooks/useSecureBankMonitor';
import { formatCurrency, formatDate } from '../utils';

const BillsSection = ({ 
  bills = [], 
  onEdit, 
  onPay, 
  onViewAll, 
  onCreate,
  fullView = false,
  loading = false
}) => {
  // 🎯 Hook para monitor de boletos
  const { 
    boletos, 
    loading: boletoLoading, 
    ultimaVerificacao, 
    verificarTodosBoletos,
    getEstatisticas 
  } = useSecureBankMonitor();

  const estatisticasBoletos = getEstatisticas();

  // 🔧 FUNÇÕES OTIMIZADAS
  const handleVerificarBoletos = async () => {
    console.log('🔍 Verificando novos boletos...');
    try {
      if (typeof verificarTodosBoletos === 'function') {
        await verificarTodosBoletos();
        alert('✅ Verificação de boletos concluída!');
      } else {
        console.error('❌ verificarTodosBoletos não é uma função');
        alert('Função de verificar boletos não está disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar boletos:', error);
      alert('Erro ao verificar boletos: ' + error.message);
    }
  };

  const handleViewAll = () => {
    console.log('👁️ Visualizando todas as contas...');
    if (typeof onViewAll === 'function') {
      onViewAll();
    } else {
      console.error('❌ onViewAll não é uma função');
      alert('Função de visualizar todas as contas não está disponível');
    }
  };

  const handleEdit = (item) => {
    console.log('✏️ Editando item:', item);
    if (typeof onEdit === 'function') {
      onEdit(item);
    } else {
      console.error('❌ onEdit não é uma função');
      alert(`Editando: ${item.descricao || item.beneficiario}\n\nFuncionalidade de edição em desenvolvimento!`);
    }
  };

  const handlePay = (billId) => {
    console.log('💰 Pagando conta ID:', billId);
    if (typeof onPay === 'function') {
      onPay(billId);
    } else {
      console.error('❌ onPay não é uma função');
      if (confirm('Marcar esta conta como paga?')) {
        alert('✅ Conta marcada como paga!\n\n(Funcionalidade em desenvolvimento)');
      }
    }
  };

  const handleNovaConta = () => {
    console.log('➕ Criando nova conta...');
    if (typeof onCreate === 'function') {
      onCreate();
    } else {
      console.error('❌ onCreate não é uma função');
      alert('📝 Abrindo formulário de nova conta...\n\nFuncionalidade em desenvolvimento!');
    }
  };

  // 🔧 Copiar código de barras
  const copiarCodigoBarras = async (codigo) => {
    console.log('📋 Copiando código de barras...');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo);
        alert('✅ Código de barras copiado para área de transferência!');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = codigo;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          alert('✅ Código de barras copiado para área de transferência!');
        } catch (err) {
          console.error('Erro ao copiar:', err);
          alert('❌ Erro ao copiar código de barras');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao copiar código:', error);
      alert('❌ Erro ao copiar código de barras');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Crítica': return 'text-red-600 bg-red-100';
      case 'Alta': return 'text-orange-600 bg-orange-100';
      case 'Média': return 'text-yellow-600 bg-yellow-100';
      case 'Baixa': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBillStatusColor = (status) => {
    switch (status) {
      case 'Paga': return 'text-green-600 bg-green-100';
      case 'Pendente': return 'text-yellow-600 bg-yellow-100';
      case 'Atrasada': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 🎯 Renderizar card de conta normal
  const renderBillCard = (bill, showActions = true) => {
    const isOverdue = bill.status === 'Atrasada' || (bill.dias_vencimento !== null && bill.dias_vencimento < 0);
    const isDueSoon = bill.dias_vencimento !== null && bill.dias_vencimento >= 0 && bill.dias_vencimento <= 3;
    
    return (
      <div key={bill.id} className={`border rounded-lg p-4 transition-all hover:shadow-md ${
        isOverdue ? 'border-red-200 bg-red-50' : 
        isDueSoon ? 'border-orange-200 bg-orange-50' : 
        'bg-white hover:bg-gray-50'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium text-gray-900">{bill.descricao}</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                CONTA
              </span>
              {bill.prioridade && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(bill.prioridade)}`}>
                  {bill.prioridade}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1 font-medium">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(bill.valor)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Vencimento: {formatDate(bill.data_vencimento)}
              </span>
            </div>

            {/* Status do prazo */}
            <div className="mb-2">
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  {bill.dias_vencimento !== null ? `${Math.abs(bill.dias_vencimento)} dias em atraso` : 'Em atraso'}
                </span>
              )}
              {isDueSoon && !isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                  <Clock className="w-3 h-3" />
                  {bill.dias_vencimento === 0 ? 'Vence hoje!' : `Vence em ${bill.dias_vencimento} dias`}
                </span>
              )}
            </div>

            {bill.projeto_nome && (
              <p className="text-xs text-gray-500">Projeto: {bill.projeto_nome}</p>
            )}

            {bill.tipo && (
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getBillStatusColor(bill.status)}`}>
                  {bill.status || 'Pendente'}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {bill.tipo}
                </span>
              </div>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 ml-4">
              {bill.status !== 'Paga' && (
                <button 
                  onClick={() => handlePay(bill.id)}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                  title="Marcar como paga"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => handleEdit(bill)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 🎯 Renderizar card de boleto detectado
  const renderBoletoCard = (boleto) => {
    const hoje = new Date();
    const vencimento = new Date(boleto.dataVencimento);
    const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    const isVencido = diasRestantes < 0;
    const isVenceHoje = diasRestantes === 0;
    const isUrgente = diasRestantes <= 3 && diasRestantes >= 0;
    
    return (
      <div key={boleto.id} className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${
        isVencido ? 'border-red-300 bg-red-50' : 
        isVenceHoje ? 'border-orange-300 bg-orange-50' : 
        isUrgente ? 'border-yellow-300 bg-yellow-50' : 
        'border-purple-200 bg-purple-50 hover:bg-purple-100'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium text-gray-900">{boleto.beneficiario}</h3>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                BOLETO AUTO
              </span>
              {boleto.isNovo && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full animate-pulse">
                  NOVO!
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1 font-medium">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(boleto.valor)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Vencimento: {formatDate(boleto.dataVencimento)}
              </span>
            </div>

            {/* Status do prazo */}
            <div className="mb-3">
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
            </div>

            {/* Código de barras */}
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Código de Barras:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                  {boleto.codigoBarras}
                </code>
                <button
                  onClick={() => copiarCodigoBarras(boleto.codigoBarras)}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                  title="Copiar código de barras"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <p>Banco: {boleto.banco || 'N/A'}</p>
              <p>Detectado: {formatDate(boleto.dataDeteccao)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ VISTA RESUMIDA - SEM BOTÕES DUPLICADOS (para dashboard)
  if (!fullView) {
    const contasPendentes = bills.filter(b => b.status !== 'Paga');
    const boletosPendentes = boletos.filter(b => b.status === 'Pendente');
    const totalItens = contasPendentes.length + boletosPendentes.length;

    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Contas a Pagar</h2>
              {boletosPendentes.length > 0 && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  {boletosPendentes.length} boleto(s) detectado(s)
                </span>
              )}
            </div>
            {/* ❌ REMOVIDOS: Botões pequenos de Nova Conta e Verificar Boletos */}
            <button 
              onClick={handleViewAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Status do monitor */}
          {ultimaVerificacao && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Monitor ativo - Última verificação: {new Date(ultimaVerificacao).toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Alertas de contas/boletos em atraso */}
              {(contasPendentes.filter(b => b.status === 'Atrasada' || (b.dias_vencimento !== null && b.dias_vencimento < 0)).length > 0 || 
                boletosPendentes.filter(b => new Date(b.dataVencimento) < new Date()).length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="font-medium text-red-800">Atenção - Pendências em Atraso!</h3>
                  </div>
                  <p className="text-red-700 mt-1 text-sm">
                    Existem contas e/ou boletos vencidos que precisam de atenção imediata.
                  </p>
                </div>
              )}

              {/* Lista combinada: Boletos detectados primeiro, depois contas */}
              <div className="space-y-3">
                {/* Boletos detectados automaticamente */}
                {boletosPendentes
                  .sort((a, b) => {
                    const aVencido = new Date(a.dataVencimento) < new Date();
                    const bVencido = new Date(b.dataVencimento) < new Date();
                    if (aVencido && !bVencido) return -1;
                    if (!aVencido && bVencido) return 1;
                    return new Date(a.dataVencimento) - new Date(b.dataVencimento);
                  })
                  .slice(0, 3)
                  .map(boleto => renderBoletoCard(boleto))
                }

                {/* Contas normais */}
                {contasPendentes
                  .sort((a, b) => {
                    if (a.status === 'Atrasada' && b.status !== 'Atrasada') return -1;
                    if (b.status === 'Atrasada' && a.status !== 'Atrasada') return 1;
                    if (a.dias_vencimento !== null && b.dias_vencimento !== null) {
                      return a.dias_vencimento - b.dias_vencimento;
                    }
                    return new Date(a.data_vencimento) - new Date(b.data_vencimento);
                  })
                  .slice(0, 3)
                  .map(bill => renderBillCard(bill, true))
                }
                
                {totalItens === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                    <p className="text-lg font-medium text-green-600">Parabéns!</p>
                    <p className="text-sm">Todas as contas estão em dia</p>
                  </div>
                )}

                {totalItens > 6 && (
                  <div className="text-center py-4">
                    <button 
                      onClick={handleViewAll}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      + Ver mais {totalItens - 6} itens
                    </button>
                  </div>
                )}
              </div>

              {/* Resumo financeiro combinado */}
              {totalItens > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-500">Total Contas</p>
                      <p className="font-bold text-lg text-gray-900">
                        {formatCurrency(contasPendentes.reduce((sum, bill) => sum + (bill.valor || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-purple-600">Total Boletos</p>
                      <p className="font-bold text-lg text-purple-700">
                        {formatCurrency(boletosPendentes.reduce((sum, boleto) => sum + (boleto.valor || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-orange-600">Vence em 7 dias</p>
                      <p className="font-bold text-lg text-orange-700">
                        {formatCurrency([...contasPendentes, ...boletosPendentes].filter(item => {
                          const vencimento = new Date(item.data_vencimento || item.dataVencimento);
                          const diasRestantes = Math.ceil((vencimento - new Date()) / (1000 * 60 * 60 * 24));
                          return diasRestantes >= 0 && diasRestantes <= 7;
                        }).reduce((sum, item) => sum + (item.valor || 0), 0))}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-red-600">Em Atraso</p>
                      <p className="font-bold text-lg text-red-700">
                        {formatCurrency([...contasPendentes, ...boletosPendentes].filter(item => {
                          const vencimento = new Date(item.data_vencimento || item.dataVencimento);
                          return vencimento < new Date();
                        }).reduce((sum, item) => sum + (item.valor || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ✅ VISTA COMPLETA - SEM BOTÕES DUPLICADOS (gerenciado pelo Dashboard)
  return (
    <div className="space-y-6">
      {/* ❌ REMOVIDO: Header com botões duplicados (gerenciado pelo Dashboard) */}

      {/* Seção de Boletos Detectados */}
      {boletos.length > 0 && (
        <div className="bg-purple-50 rounded-lg border border-purple-200">
          <div className="p-4 border-b border-purple-200">
            <h2 className="text-lg font-semibold text-purple-800">
              💳 Boletos Detectados Automaticamente ({boletos.length})
            </h2>
            <p className="text-sm text-purple-600 mt-1">
              Boletos gerados para o CNPJ da sua empresa
            </p>
          </div>
          <div className="p-4 space-y-3">
            {boletos.map(boleto => renderBoletoCard(boleto))}
          </div>
        </div>
      )}

      {/* Seção de Contas Normais */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            📋 Contas Cadastradas ({bills.length})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando contas...</h3>
                <p className="text-gray-500">Aguarde enquanto buscamos os dados</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map(bill => renderBillCard(bill, true))}
              
              {bills.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">Nenhuma conta cadastrada</p>
                  <p className="text-gray-400 text-sm">Use o botão "Nova Conta" no topo da página</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillsSection;