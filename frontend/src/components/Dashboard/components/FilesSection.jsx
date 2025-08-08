import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  File, 
  Image, 
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Filter,
  Grid,
  List,
  Link,
  Clock,
  Building2,
  Tag,
  Archive,
  ExternalLink,
  Copy,
  Settings,
  FolderOpen,
  Plus,
  Zap,
  Database,
  HardDrive,
  Cloud
} from 'lucide-react';

const EnhancedFilesComponent = ({ 
  onUpload,
  onDelete,
  onRefresh,
  projects = [],
  initialFiles = []
}) => {
  // Estados principais
  const [files, setFiles] = useState(initialFiles);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [dragActive, setDragActive] = useState(false);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de UI
  const [notifications, setNotifications] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState({});
  
  const fileInputRef = useRef(null);

  // Configurações
  const maxFileSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.tiff',
    '.dwg', '.dxf', '.skp', '.rvt', '.ifc',
    '.zip', '.rar', '.7z', '.txt', '.csv', '.json'
  ];

  // Categorias profissionais
  const categories = {
    'Contratos': { icon: FileText, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    'Projetos': { icon: Building2, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
    'Técnicos': { icon: Settings, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    'Financeiro': { icon: FileSpreadsheet, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    'Imagens': { icon: Image, color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-700' },
    'CAD': { icon: Building2, color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
    'Geral': { icon: File, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700' }
  };

  // Tipos de arquivo com ícones
  const fileIcons = {
    'application/pdf': { icon: FileText, color: 'text-red-600' },
    'application/msword': { icon: FileText, color: 'text-blue-600' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-600' },
    'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-600' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600' },
    'image/jpeg': { icon: Image, color: 'text-purple-600' },
    'image/png': { icon: Image, color: 'text-purple-600' },
    'image/gif': { icon: Image, color: 'text-purple-600' },
    'application/dwg': { icon: Building2, color: 'text-indigo-600' },
    'application/dxf': { icon: Building2, color: 'text-indigo-600' },
    'application/zip': { icon: Archive, color: 'text-orange-600' },
    'default': { icon: File, color: 'text-gray-600' }
  };

  // Adicionar notificação
  const addNotification = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    const notification = { id, type, message, timestamp: new Date() };
    
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Carregar arquivos
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/arquivos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setFiles(data.data || []);
        calculateStats(data.data || []);
        addNotification('success', `${data.total || 0} arquivo(s) carregado(s)`);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error);
      addNotification('error', `Erro ao carregar: ${error.message}`);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calcular estatísticas
  const calculateStats = useCallback((fileList) => {
    const totalSize = fileList.reduce((sum, file) => sum + (file.tamanho || file.size || 0), 0);
    const byCategory = {};
    const byProject = {};
    const byExtension = {};
    
    fileList.forEach(file => {
      const category = file.tipo_documento || 'Geral';
      const project = file.projeto_nome || 'Sem projeto';
      const extension = (file.nome_original || file.name || '').split('.').pop()?.toUpperCase() || 'SEM EXT';
      
      byCategory[category] = (byCategory[category] || 0) + 1;
      byProject[project] = (byProject[project] || 0) + 1;
      byExtension[extension] = (byExtension[extension] || 0) + 1;
    });

    const recentCount = fileList.filter(file => {
      const uploadDate = new Date(file.created_at || file.uploadDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return uploadDate > weekAgo;
    }).length;

    setStats({
      totalFiles: fileList.length,
      totalSize,
      byCategory,
      byProject,
      byExtension,
      recentCount
    });
  }, []);

  // Upload de arquivos
  const handleFileUpload = useCallback(async (fileList) => {
    const validFiles = [];
    const errors = [];
    
    Array.from(fileList).forEach(file => {
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: Arquivo muito grande (máx: ${formatFileSize(maxFileSize)})`);
        return;
      }
      
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(extension)) {
        errors.push(`${file.name}: Tipo não permitido (${extension})`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      errors.forEach(error => addNotification('error', error));
    }
    
    if (validFiles.length === 0) return;
    
    setUploading(true);
    
    for (const file of validFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formData = new FormData();
        formData.append('file', file);
        
        if (selectedProject) {
          formData.append('projeto_id', selectedProject);
          formData.append('projectId', selectedProject);
        }
        
        const category = getFileCategory(file.type);
        formData.append('tipo_documento', category);
        formData.append('fileType', category);
        formData.append('descricao', `Upload via interface - ${file.name}`);
        formData.append('description', `Upload via interface - ${file.name}`);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));
        
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:5000/api/arquivos/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 80 }));
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          addNotification('success', `${file.name} enviado com sucesso!`);
        } else {
          throw new Error(result.error || `HTTP ${response.status}`);
        }
        
      } catch (error) {
        console.error(`Erro no upload de ${file.name}:`, error);
        addNotification('error', `${file.name}: ${error.message}`);
      }
      
      setTimeout(() => {
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[file.name];
          return updated;
        });
      }, 2000);
    }
    
    setUploading(false);
    
    // Atualizar lista após upload
    setTimeout(async () => {
      await loadFiles();
      if (onUpload) await onUpload();
    }, 1000);
    
  }, [selectedProject, addNotification, loadFiles, onUpload]);

  // Download de arquivo - CORRIGIDO
  const handleDownload = useCallback(async (file) => {
    try {
      const downloadUrl = `http://localhost:5000/api/arquivos/${file.id}/download`;
      const token = localStorage.getItem('auth_token');
      
      // Método 1: Usar fetch para criar blob e download
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Arquivo não encontrado (HTTP ${response.status})`);
      }
      
      // Criar blob do arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = file.nome_original || file.name || 'arquivo';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addNotification('success', `Download de "${file.nome_original}" concluído`);
      
    } catch (error) {
      console.error('Erro no download:', error);
      addNotification('error', `Erro no download: ${error.message}`);
    }
  }, [addNotification]);

  // Preview de arquivo
  const handlePreview = useCallback(async (file) => {
    try {
      const previewTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf'];
      
      if (!previewTypes.includes(file.tipo_mime || file.type)) {
        addNotification('info', 'Preview não disponível para este tipo de arquivo');
        return;
      }
      
      setPreviewFile(file);
      setShowPreview(true);
      
    } catch (error) {
      addNotification('error', 'Erro ao abrir preview');
    }
  }, [addNotification]);

  // Deletar arquivo
  const handleDelete = useCallback(async (fileId) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/arquivos/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        await loadFiles();
        addNotification('success', 'Arquivo excluído com sucesso');
        if (onDelete) await onDelete(fileId);
      } else {
        throw new Error(result.error || 'Erro ao excluir arquivo');
      }
      
    } catch (error) {
      addNotification('error', `Erro ao excluir: ${error.message}`);
    }
  }, [loadFiles, onDelete, addNotification]);

  // Copiar link do arquivo
  const handleCopyLink = useCallback(async (file) => {
    try {
      const link = `${window.location.origin}/api/arquivos/${file.id}/download`;
      await navigator.clipboard.writeText(link);
      addNotification('success', 'Link copiado para a área de transferência');
    } catch (error) {
      addNotification('error', 'Erro ao copiar link');
    }
  }, [addNotification]);

  // Vincular arquivo a projeto
  const handleLinkToProject = useCallback(async (fileId, projectId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:5000/api/arquivos/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projeto_id: projectId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadFiles();
        addNotification('success', 'Arquivo vinculado ao projeto');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      addNotification('error', 'Erro ao vincular arquivo');
    }
  }, [loadFiles, addNotification]);

  // Seleção múltipla
  const toggleFileSelection = useCallback((fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  // Obter categoria do arquivo baseado no tipo MIME
  const getFileCategory = useCallback((mimeType) => {
    const categoryMap = {
      'application/pdf': 'Contratos',
      'application/msword': 'Projetos',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Projetos',
      'application/vnd.ms-excel': 'Financeiro',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Financeiro',
      'image/jpeg': 'Imagens',
      'image/png': 'Imagens',
      'image/gif': 'Imagens',
      'application/dwg': 'CAD',
      'application/dxf': 'CAD'
    };
    
    return categoryMap[mimeType] || 'Geral';
  }, []);

  // Obter ícone do arquivo
  const getFileIcon = useCallback((file) => {
    const mimeType = file.tipo_mime || file.type || 'default';
    return fileIcons[mimeType] || fileIcons.default;
  }, []);

  // Filtrar e ordenar arquivos
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files.filter(file => {
      const matchesSearch = (file.nome_original || file.name || '')
        .toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.descricao || file.description || '')
        .toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = !selectedProject || 
        String(file.projeto_id || file.projectId || '') === selectedProject ||
        (file.projeto_nome || '').toLowerCase().includes(selectedProject.toLowerCase());
      
      const matchesCategory = !selectedCategory || 
        (file.tipo_documento || file.category) === selectedCategory;
      
      const fileExtension = (file.nome_original || file.name || '').split('.').pop()?.toUpperCase();
      const matchesExtension = !selectedExtension || fileExtension === selectedExtension;
      
      let matchesDate = true;
      if (dateFilter) {
        const fileDate = new Date(file.created_at || file.uploadDate);
        const now = new Date();
        const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'today': matchesDate = daysDiff === 0; break;
          case 'week': matchesDate = daysDiff <= 7; break;
          case 'month': matchesDate = daysDiff <= 30; break;
          case 'year': matchesDate = daysDiff <= 365; break;
        }
      }
      
      return matchesSearch && matchesProject && matchesCategory && matchesExtension && matchesDate;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.nome_original || a.name || '').toLowerCase();
          bValue = (b.nome_original || b.name || '').toLowerCase();
          break;
        case 'size':
          aValue = a.tamanho || a.size || 0;
          bValue = b.tamanho || b.size || 0;
          break;
        case 'type':
          aValue = a.tipo_documento || a.category || '';
          bValue = b.tipo_documento || b.category || '';
          break;
        case 'project':
          aValue = a.projeto_nome || '';
          bValue = b.projeto_nome || '';
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at || a.uploadDate || 0);
          bValue = new Date(b.created_at || b.uploadDate || 0);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [files, searchTerm, selectedProject, selectedCategory, selectedExtension, dateFilter, sortBy, sortOrder]);

  // Formatação
  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Data não disponível';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Drag and Drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  // Carregar arquivos na inicialização
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Atualizar estatísticas quando files mudar
  useEffect(() => {
    calculateStats(files);
  }, [files, calculateStats]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notificações */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 animate-slide-in ${
              notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
              'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {notification.timestamp.toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              Gestão de Arquivos
            </h1>
            <p className="text-gray-600 mt-2">
              Sistema profissional para organização de documentos HVAC
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept={allowedTypes.join(',')}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Enviando...' : 'Upload Arquivos'}
            </button>
            
            <button
              onClick={loadFiles}
              disabled={loading}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Arquivos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalFiles || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Espaço Utilizado</p>
              <p className="text-3xl font-bold text-gray-900">{formatFileSize(stats.totalSize || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorias</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.byCategory || {}).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Tag className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recentes</p>
              <p className="text-3xl font-bold text-gray-900">{stats.recentCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border mb-8">
        <div className="p-4 border-b">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <Filter className="w-5 h-5" />
            <span className="font-medium">
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </span>
          </button>
        </div>
        
        {showFilters && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome do arquivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Projeto</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos os projetos</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.nome || project.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todas as categorias</option>
                  {Object.keys(stats.byCategory || {}).map(category => (
                    <option key={category} value={category}>
                      {category} ({stats.byCategory[category]})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Extensão</label>
                <select
                  value={selectedExtension}
                  onChange={(e) => setSelectedExtension(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todas as extensões</option>
                  {Object.keys(stats.byExtension || {}).map(ext => (
                    <option key={ext} value={ext}>
                      {ext} ({stats.byExtension[ext]})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos os períodos</option>
                  <option value="today">Hoje</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mês</option>
                  <option value="year">Último ano</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="date">Data</option>
                    <option value="name">Nome</option>
                    <option value="size">Tamanho</option>
                    <option value="type">Categoria</option>
                    <option value="project">Projeto</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={`Ordenação ${sortOrder === 'asc' ? 'crescente' : 'decrescente'}`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Projeto selecionado para novos uploads */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Novos uploads serão vinculados ao projeto:
              </span>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded bg-white text-sm"
              >
                <option value="">Nenhum projeto</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.nome || project.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Enviando arquivos...
          </h3>
          <div className="space-y-3">
            {Object.entries(uploadProgress).map(([filename, progress]) => (
              <div key={filename} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">
                    {filename}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 mb-8 transition-all cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {dragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos aqui ou clique para selecionar'}
          </p>
          <p className="text-gray-500 mb-4">
            Suporta múltiplos arquivos • Máximo {formatFileSize(maxFileSize)} por arquivo
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            {allowedTypes.slice(0, 8).map(type => (
              <span key={type} className="bg-gray-100 px-2 py-1 rounded">
                {type.toUpperCase().replace('.', '')}
              </span>
            ))}
            <span className="bg-gray-100 px-2 py-1 rounded">+{allowedTypes.length - 8} mais</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Arquivos ({filteredAndSortedFiles.length})
          </h2>
          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedFiles.size} selecionado(s)
              </span>
              <button
                onClick={() => {
                  if (confirm(`Excluir ${selectedFiles.size} arquivo(s) selecionado(s)?`)) {
                    selectedFiles.forEach(id => handleDelete(id));
                    setSelectedFiles(new Set());
                  }
                }}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Excluir Selecionados
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={`Visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Files Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Carregando arquivos...</span>
        </div>
      ) : filteredAndSortedFiles.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-2'
        }>
          {filteredAndSortedFiles.map(file => {
            const fileInfo = getFileIcon(file);
            const IconComponent = fileInfo.icon;
            const isSelected = selectedFiles.has(file.id);
            const category = categories[file.tipo_documento || file.category] || categories['Geral'];
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={file.id}
                  className={`
                    bg-white rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-gray-300'}
                  `}
                  onClick={() => toggleFileSelection(file.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-blue-100' : category.bgColor
                      }`}>
                        <IconComponent className={`w-6 h-6 ${fileInfo.color}`} />
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm truncate" title={file.nome_original || file.name}>
                          {file.nome_original || file.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {file.descricao || file.description || 'Sem descrição'}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(file.tamanho || file.size)}</span>
                        <span className={`px-2 py-1 rounded-full ${category.bgColor} ${category.textColor} font-medium`}>
                          {file.tipo_documento || file.category || 'Geral'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(file.created_at || file.uploadDate)}</span>
                      </div>
                      
                      {(file.projeto_nome || file.projectName) && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />
                          <span className="truncate">{file.projeto_nome || file.projectName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(file);
                          }}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Copiar link"
                        >
                          <Link className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.id);
                          }}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // List view
            return (
              <div 
                key={file.id}
                className={`
                  bg-white rounded-lg shadow-sm border p-4 transition-all cursor-pointer hover:shadow-md
                  ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-gray-300'}
                `}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFileSelection(file.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-100' : category.bgColor
                  }`}>
                    <IconComponent className={`w-5 h-5 ${fileInfo.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {file.nome_original || file.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.bgColor} ${category.textColor}`}>
                        {file.tipo_documento || file.category || 'Geral'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatFileSize(file.tamanho || file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(file.created_at || file.uploadDate)}
                      </span>
                      {(file.projeto_nome || file.projectName) && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {file.projeto_nome || file.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(file);
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copiar link"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || selectedProject || selectedCategory || selectedExtension || dateFilter 
              ? 'Nenhum arquivo encontrado' 
              : 'Nenhum arquivo cadastrado'
            }
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedProject || selectedCategory || selectedExtension || dateFilter
              ? 'Tente ajustar os filtros de busca para encontrar o que procura'
              : 'Comece fazendo upload do seu primeiro arquivo'
            }
          </p>
          {(!searchTerm && !selectedProject && !selectedCategory && !selectedExtension && !dateFilter) && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              Fazer Primeiro Upload
            </button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {previewFile.nome_original || previewFile.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(previewFile.tamanho || previewFile.size)} • {previewFile.tipo_documento || previewFile.category}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-8 text-center mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const fileInfo = getFileIcon(previewFile);
                    const IconComponent = fileInfo.icon;
                    return <IconComponent className={`w-8 h-8 ${fileInfo.color}`} />;
                  })()}
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Preview do Arquivo
                </h4>
                <p className="text-gray-500 mb-6">
                  {['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(previewFile.tipo_mime || previewFile.type)
                    ? 'Visualização disponível para este tipo de arquivo' 
                    : 'Preview não disponível para este tipo de arquivo'
                  }
                </p>
                
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  
                  <button
                    onClick={() => handleCopyLink(previewFile)}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copiar Link
                  </button>
                </div>
              </div>
              
              {/* File Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Informações do Arquivo</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nome:</span>
                      <span className="text-gray-900">{previewFile.nome_original || previewFile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tamanho:</span>
                      <span className="text-gray-900">{formatFileSize(previewFile.tamanho || previewFile.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="text-gray-900">{previewFile.tipo_mime || previewFile.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Categoria:</span>
                      <span className="text-gray-900">{previewFile.tipo_documento || previewFile.category}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Detalhes do Projeto</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Projeto:</span>
                      <span className="text-gray-900">{previewFile.projeto_nome || previewFile.projectName || 'Não vinculado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Upload:</span>
                      <span className="text-gray-900">{formatDate(previewFile.created_at || previewFile.uploadDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Descrição:</span>
                      <span className="text-gray-900">{previewFile.descricao || previewFile.description || 'Sem descrição'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Ações Rápidas</h5>
                <div className="flex flex-wrap gap-2">
                  {projects.length > 0 && (
                    <select
                      value={previewFile.projeto_id || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleLinkToProject(previewFile.id, parseInt(e.target.value));
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Vincular a projeto...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.nome || project.name}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <button
                    onClick={() => {
                      const newDescription = prompt('Nova descrição:', previewFile.descricao || previewFile.description || '');
                      if (newDescription !== null) {
                        // Aqui você implementaria a atualização da descrição
                        addNotification('info', 'Funcionalidade de edição em desenvolvimento');
                      }
                    }}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                  >
                    Editar Descrição
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer com resumo */}
      {filteredAndSortedFiles.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              Mostrando {filteredAndSortedFiles.length} de {stats.totalFiles || 0} arquivo(s)
            </span>
            <span>
              Espaço total: {formatFileSize(stats.totalSize || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFilesComponent;