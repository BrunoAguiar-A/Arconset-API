// 📁 src/components/Dashboard/components/Modal.jsx
import React from 'react';
import { X, Save, User, Building, DollarSign } from 'lucide-react';

const Modal = ({ 
  show, 
  type, 
  editingItem, 
  formData, 
  onInputChange, 
  onSubmit, 
  onClose, 
  clientes = [], 
  projects = [] 
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    onInputChange(field, value);
  };

  // 🎯 Formulário de Cliente
  const renderClienteForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Informações do Cliente</h3>
      </div>

      {/* Nome e Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            required
            value={formData.nome || ''}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            placeholder="Digite o nome completo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="exemplo@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Telefone e CPF/CNPJ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="text"
            value={formData.telefone || ''}
            onChange={(e) => handleInputChange('telefone', e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF/CNPJ
          </label>
          <input
            type="text"
            value={formData.cpf_cnpj || ''}
            onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Endereço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endereço Completo
        </label>
        <input
          type="text"
          value={formData.endereco || ''}
          onChange={(e) => handleInputChange('endereco', e.target.value)}
          placeholder="Rua, número, complemento"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Cidade, Estado e CEP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade
          </label>
          <input
            type="text"
            value={formData.cidade || ''}
            onChange={(e) => handleInputChange('cidade', e.target.value)}
            placeholder="São Paulo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={formData.estado || ''}
            onChange={(e) => handleInputChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Selecione</option>
            <option value="SP">SP</option>
            <option value="RJ">RJ</option>
            <option value="MG">MG</option>
            <option value="RS">RS</option>
            <option value="PR">PR</option>
            <option value="SC">SC</option>
            <option value="BA">BA</option>
            <option value="GO">GO</option>
            <option value="ES">ES</option>
            <option value="DF">DF</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP
          </label>
          <input
            type="text"
            value={formData.cep || ''}
            onChange={(e) => handleInputChange('cep', e.target.value)}
            placeholder="00000-000"
            maxLength="9"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>
    </div>
  );

  // 🏗️ Formulário de Projeto
  const renderProjetoForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Detalhes do Projeto</h3>
      </div>

      {/* Nome do Projeto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Projeto *
        </label>
        <input
          type="text"
          required
          value={formData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
          placeholder="Ex: Instalação HVAC Shopping Center"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cliente *
        </label>
        <select
          required
          value={formData.cliente_id || ''}
          onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="">Selecione um cliente</option>
          {clientes.map(cliente => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição do Projeto
        </label>
        <textarea
          value={formData.descricao || ''}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          placeholder="Descreva detalhes do projeto, equipamentos, escopo..."
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
        />
      </div>

      {/* Valor e Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Total (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_total || ''}
            onChange={(e) => handleInputChange('valor_total', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Progresso (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.progresso || 0}
            onChange={(e) => handleInputChange('progresso', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Status e Tipo de Serviço */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status do Projeto
          </label>
          <select
            value={formData.status || 'Orçamento'}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="Orçamento">📋 Orçamento</option>
            <option value="Em Andamento">⚙️ Em Andamento</option>
            <option value="Pausado">⏸️ Pausado</option>
            <option value="Finalizado">✅ Finalizado</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Serviço
          </label>
          <select
            value={formData.tipo_servico || ''}
            onChange={(e) => handleInputChange('tipo_servico', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Selecione o tipo</option>
            <option value="Instalação">🔧 Instalação</option>
            <option value="Manutenção">🛠️ Manutenção</option>
            <option value="Reparo">⚡ Reparo</option>
            <option value="Consultoria">💼 Consultoria</option>
          </select>
        </div>
      </div>

      {/* Endereço da Obra */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Endereço da Obra
        </label>
        <input
          type="text"
          value={formData.endereco_obra || ''}
          onChange={(e) => handleInputChange('endereco_obra', e.target.value)}
          placeholder="Local onde será executado o projeto"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Início
          </label>
          <input
            type="date"
            value={formData.data_inicio || ''}
            onChange={(e) => handleInputChange('data_inicio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Limite (Prazo)
          </label>
          <input
            type="date"
            value={formData.data_prazo || ''}
            onChange={(e) => handleInputChange('data_prazo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações Adicionais
        </label>
        <textarea
          value={formData.observacoes || ''}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Informações extras, requisitos especiais, observações..."
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
        />
      </div>
    </div>
  );

  // 💰 Formulário de Conta
  const renderContaForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Detalhes da Conta</h3>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição da Conta *
        </label>
        <input
          type="text"
          required
          value={formData.descricao || ''}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          placeholder="Ex: Material elétrico, Fornecedor HVAC..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Valor e Data de Vencimento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.valor || ''}
            onChange={(e) => handleInputChange('valor', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Vencimento *
          </label>
          <input
            type="date"
            required
            value={formData.data_vencimento || ''}
            onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Tipo e Prioridade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo da Conta
          </label>
          <select
            value={formData.tipo || 'Fornecedor'}
            onChange={(e) => handleInputChange('tipo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="Fornecedor">🏪 Fornecedor</option>
            <option value="Serviço">⚙️ Serviço</option>
            <option value="Material">📦 Material</option>
            <option value="Aluguel">🏠 Aluguel</option>
            <option value="Boleto">💳 Boleto</option>
            <option value="Outros">📋 Outros</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridade
          </label>
          <select
            value={formData.prioridade || 'Média'}
            onChange={(e) => handleInputChange('prioridade', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="Baixa">🟢 Baixa</option>
            <option value="Média">🟡 Média</option>
            <option value="Alta">🟠 Alta</option>
            <option value="Crítica">🔴 Crítica</option>
          </select>
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoria
        </label>
        <input
          type="text"
          value={formData.categoria || ''}
          onChange={(e) => handleInputChange('categoria', e.target.value)}
          placeholder="Ex: Material, Equipamento, Mão de obra..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Projeto Relacionado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Projeto Relacionado
        </label>
        <select
          value={formData.projeto_id || ''}
          onChange={(e) => handleInputChange('projeto_id', e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="">Nenhum projeto específico</option>
          {projects.map(projeto => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Fornecedor e Documento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fornecedor/Empresa
          </label>
          <input
            type="text"
            value={formData.fornecedor || ''}
            onChange={(e) => handleInputChange('fornecedor', e.target.value)}
            placeholder="Nome da empresa fornecedora"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número do Documento
          </label>
          <input
            type="text"
            value={formData.numero_documento || ''}
            onChange={(e) => handleInputChange('numero_documento', e.target.value)}
            placeholder="NF, Boleto, Recibo..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações
        </label>
        <textarea
          value={formData.observacoes || ''}
          onChange={(e) => handleInputChange('observacoes', e.target.value)}
          placeholder="Informações adicionais sobre a conta..."
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
        />
      </div>
    </div>
  );

  // 🎯 Obter título do modal
  const getModalTitle = () => {
    const action = editingItem ? 'Editar' : 'Novo';
    const icons = {
      cliente: '👤',
      projeto: '🏗️',
      conta: '💰'
    };
    const entityNames = {
      cliente: 'Cliente',
      projeto: 'Projeto',
      conta: 'Conta'
    };
    
    return `${icons[type] || '📋'} ${action} ${entityNames[type] || 'Item'}`;
  };

  // 🎯 Renderizar formulário baseado no tipo
  const renderFormContent = () => {
    switch (type) {
      case 'cliente': return renderClienteForm();
      case 'projeto': return renderProjetoForm();
      case 'conta': return renderContaForm();
      default: return <div className="text-center text-gray-500">Tipo de formulário não encontrado</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header do Modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {getModalTitle()}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6">
            {renderFormContent()}

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 font-medium transition-colors"
              >
                <Save className="w-5 h-5" />
                {editingItem ? 'Salvar Alterações' : 'Criar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Modal;