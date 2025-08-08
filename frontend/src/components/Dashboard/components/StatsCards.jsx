// 📁 src/components/Dashboard/components/StatsCards.jsx
import React from 'react';
import { 
  FolderOpen, 
  DollarSign, 
  Cloud, 
  User, 
  TrendingUp, 
  AlertTriangle, 
  Upload, 
  CheckCircle 
} from 'lucide-react';

const StatsCards = ({ stats, projects, bills, files, clientes }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Card Projetos Ativos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Projetos Ativos</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.projetos?.ativos || projects.filter(p => p.status === 'Em Andamento').length}
            </p>
          </div>
          <FolderOpen className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <TrendingUp className="w-4 h-4 inline mr-1" />
          Total: {stats.projetos?.total || projects.length}
        </p>
      </div>

      {/* Card Contas Pendentes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Contas Pendentes</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.financeiro?.contas_pendentes || bills.filter(b => b.status !== 'Paga').length}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-orange-600" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {stats.financeiro?.contas_atrasadas || bills.filter(b => b.status === 'Atrasada').length} em atraso
        </p>
      </div>

      {/* Card Arquivos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Arquivos</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.arquivos?.total || files.length}
            </p>
          </div>
          <Cloud className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <Upload className="w-4 h-4 inline mr-1" />
          {stats.arquivos?.hoje || 0} hoje
        </p>
      </div>

      {/* Card Clientes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Clientes</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.geral?.clientes || clientes.length}
            </p>
          </div>
          <User className="w-8 h-8 text-purple-600" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Ativos
        </p>
      </div>
    </div>
  );
};

export default StatsCards;