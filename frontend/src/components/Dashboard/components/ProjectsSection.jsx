// 📁 src/components/Dashboard/components/ProjectsSection.jsx
import React from 'react';
import { 
  FolderOpen, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2 
} from 'lucide-react';

const ProjectsSection = ({ 
  projects = [], 
  fullView = false, 
  onEdit, 
  onCreate, 
  onDelete 
}) => {
  // 🔧 Formatação de moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // 🔧 Formatação de data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Em Andamento': return 'text-blue-600 bg-blue-100';
      case 'Finalizado': return 'text-green-600 bg-green-100';
      case 'Finalizando': return 'text-green-600 bg-green-100';
      case 'Pausado': return 'text-yellow-600 bg-yellow-100';
      case 'Orçamento': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderProjectCard = (project, showActions = false) => (
    <div key={project.id} className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{project.nome}</h3>
          <p className="text-sm text-gray-600">{project.cliente_nome}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {project.endereco_obra || 'Endereço não informado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          {showActions && (
            <div className="flex gap-1">
              <button 
                onClick={() => onEdit && onEdit(project)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete && onDelete(project.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progresso</span>
          <span>{project.progresso || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.progresso || 0}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Prazo: {formatDate(project.data_prazo)}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(project.valor_total)}
        </span>
      </div>

      {fullView && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <span className="text-gray-500">Valor Total:</span>
            <p className="font-medium">{formatCurrency(project.valor_total)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="text-gray-500">Valor Pago:</span>
            <p className="font-medium">{formatCurrency(project.valor_pago)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="text-gray-500">Tipo:</span>
            <p className="font-medium">{project.tipo_servico}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (fullView) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Projetos/Obras</h1>
          <button 
            onClick={onCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="space-y-6">
              {projects.map(project => renderProjectCard(project, true))}
              
              {projects.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">Nenhum projeto encontrado</p>
                  <p className="text-gray-400 text-sm">Clique em "Novo Projeto" para começar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Projetos em Andamento</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {projects.slice(0, 5).map(project => renderProjectCard(project, false))}
          
          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum projeto encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsSection;