// FilesSection.jsx - VERSÃO COMPLETAMENTE CORRIGIDA
import React, { useState, useCallback, useMemo } from 'react';
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
  Share2,
  Star,
  Clock,
  User,
  Folder,
  MoreVertical,
  Archive,
  Building2,
  Plus,
  Zap
} from 'lucide-react';

const FilesSection = ({ 
  files = [], 
  projects = [], 
  onUpload, 
  onDelete, 
  onPreview, 
  loading = false,
  onRefresh
}) => {
  // 🔧 ESTADOS DA INTERFACE
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadSuccess, setUploadSuccess] = useState([]);
  
  // 🎯 ESTADOS DE FILTROS E BUSCA
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  
  // 🗂️ ESTADOS DE SELEÇÃO
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());

  // 📎 TIPOS DE ARQUIVO SUPORTADOS
  const supportedTypes = {
    'application/pdf': { icon: FileText, color: 'text-red-600', name: 'PDF', category: 'Documento' },
    'application/msword': { icon: FileText, color: 'text-blue-600', name: 'DOC', category: 'Documento' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-600', name: 'DOCX', category: 'Documento' },
    'application/vnd.ms-excel': { icon: FileSpreadsheet, color: 'text-green-600', name: 'XLS', category: 'Planilha' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, color: 'text-green-600', name: 'XLSX', category: 'Planilha' },
    'image/jpeg': { icon: Image, color: 'text-purple-600', name: 'JPG', category: 'Imagem' },
    'image/png': { icon: Image, color: 'text-purple-600', name: 'PNG', category: 'Imagem' },
    'image/gif': { icon: Image, color: 'text-purple-600', name: 'GIF', category: 'Imagem' },
    'text/plain': { icon: File, color: 'text-gray-600', name: 'TXT', category: 'Texto' },
    'application/zip': { icon: Archive, color: 'text-orange-600', name: 'ZIP', category: 'Arquivo' },
    'application/dwg': { icon: Building2, color: 'text-indigo-600', name: 'DWG', category: 'CAD' },
    'application/dxf': { icon: Building2, color: 'text-indigo-600', name: 'DXF', category: 'CAD' }
  };

  // 📝 VALIDAR ARQUIVO
  const validateFile = (file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'];
    
    if (file.size > maxSize) {
      return `Arquivo muito grande. Máximo: 100MB (atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return `Tipo de arquivo não suportado: .${extension}`;
    }
    
    return null;
  };

  // 🔧 TESTAR CONECTIVIDADE
  const testConnection = useCallback(async () => {
    try {
      console.log('🔍 Testando conectividade...');
      
      const response = await fetch('/api/arquivos/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Resposta do servidor:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Teste bem-sucedido:', result);
        
        setUploadSuccess(prev => [...prev, '✅ Conexão com API funcionando!']);
        
        // Limpar após 3s
        setTimeout(() => {
          setUploadSuccess(prev => prev.filter(msg => !msg.includes('Conexão')));
        }, 3000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      setUploadErrors(prev => [...prev, `❌ Erro na conexão: ${error.message}`]);
    }
  }, []);

  // 📤 PROCESSAR UPLOAD - VERSÃO SUPER CORRIGIDA
  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    const validFiles = [];
    const errors = [];

    console.log(`📁 Processando ${files.length} arquivo(s)...`);

    // Validar arquivos
    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
        console.log(`✅ Arquivo válido: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      }
    });

    setUploadErrors(errors);
    if (validFiles.length === 0) {
      console.log('❌ Nenhum arquivo válido para upload');
      return;
    }

    setUploading(true);
    setSelectedFiles(validFiles);
    setUploadSuccess([]);

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        console.log(`📤 [${i + 1}/${validFiles.length}] Uploading: ${file.name}`);
        
        // Progresso inicial
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 10
        }));

        try {
          // 🚀 FORMDATA CORRIGIDO
          const formData = new FormData();
          formData.append('file', file);
          
          // Campos opcionais
          if (selectedProject) {
            formData.append('projeto_id', selectedProject);
          }
          
          formData.append('tipo_documento', supportedTypes[file.type]?.category || 'Geral');
          formData.append('descricao', `Upload via interface - ${file.name}`);

          console.log('📦 FormData preparado:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            projeto_id: selectedProject
          });

          // Progresso intermediário
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 50
          }));

          // 🌐 CHAMADA AJAX SIMPLIFICADA
          const response = await fetch('/api/arquivos/upload', {
            method: 'POST',
            body: formData,
            // NÃO definir Content-Type - deixar o browser definir
          });

          console.log(`📡 Resposta HTTP: ${response.status} ${response.statusText}`);

          // Verificar se a resposta é JSON
          const contentType = response.headers.get('content-type');
          console.log('📄 Content-Type:', contentType);

          let result;
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
          } else {
            const text = await response.text();
            console.error('❌ Resposta não é JSON:', text);
            throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}`);
          }

          console.log('📄 Resultado do upload:', result);

          if (response.ok && result.success) {
            // Progresso final
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: 100
            }));
            
            console.log(`✅ Upload concluído: ${file.name}`);
            setUploadSuccess(prev => [...prev, `✅ ${file.name} enviado com sucesso!`]);
            
          } else {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
          }
          
        } catch (uploadError) {
          console.error(`❌ Erro no upload de ${file.name}:`, uploadError);
          setUploadErrors(prev => [...prev, `${file.name}: ${uploadError.message}`]);
          
          // Zerar progresso em caso de erro
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 0
          }));
        }
      }

      // Aguardar um pouco para mostrar progresso completo
      setTimeout(() => {
        console.log('🔄 Finalizando upload e atualizando lista...');
        
        // Chamar callback do componente pai para atualizar lista
        if (onUpload) {
          onUpload();
        }
        
        // Atualizar via refresh se disponível
        if (onRefresh) {
          onRefresh();
        }
        
        // Limpar estados
        setSelectedFiles([]);
        setUploadProgress({});
        setUploading(false);
        
        // Limpar mensagens de sucesso após 5s
        setTimeout(() => {
          setUploadSuccess([]);
        }, 5000);
        
      }, 1500);

    } catch (error) {
      console.error('❌ Erro geral no upload:', error);
      setUploadErrors(prev => [...prev, `Erro geral: ${error.message}`]);
      setUploading(false);
    }
  }, [selectedProject, onUpload, onRefresh]);

  // 🎯 EVENTOS DE DRAG & DROP
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      console.log('🎯 Arquivos arrastados:', files.length);
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      console.log('📁 Arquivos selecionados:', files.length);
      processFiles(files);
    }
    e.target.value = ''; // Limpar input
  }, [processFiles]);

  // 🔍 FILTROS E BUSCA
  const filteredAndSortedFiles = useMemo(() => {
    if (!Array.isArray(files)) return [];
    
    let filtered = files.filter(file => {
      const matchesSearch = (file.name || file.nome_original || '')
        .toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.description || file.descricao || '')
        .toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = !selectedProject || 
        String(file.projectId || file.projeto_id || '') === String(selectedProject);
      
      const fileCategory = supportedTypes[file.type || file.tipo_mime]?.category;
      const matchesType = !selectedType || fileCategory === selectedType;
      
      return matchesSearch && matchesProject && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || a.nome_original || '';
          bValue = b.name || b.nome_original || '';
          break;
        case 'size':
          aValue = a.size || a.tamanho || 0;
          bValue = b.size || b.tamanho || 0;
          break;
        case 'type':
          aValue = supportedTypes[a.type || a.tipo_mime]?.name || '';
          bValue = supportedTypes[b.type || b.tipo_mime]?.name || '';
          break;
        case 'date':
        default:
          aValue = new Date(a.uploadDate || a.created_at || 0);
          bValue = new Date(b.uploadDate || b.created_at || 0);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [files, searchTerm, selectedProject, selectedType, sortBy, sortOrder]);

  // 📊 ESTATÍSTICAS
  const stats = useMemo(() => {
    if (!Array.isArray(files)) return { totalFiles: 0, totalSize: 0, typeCount: {} };
    
    const totalSize = files.reduce((sum, file) => sum + (file.size || file.tamanho || 0), 0);
    const typeCount = {};
    
    files.forEach(file => {
      const category = supportedTypes[file.type || file.tipo_mime]?.category || 'Outros';
      typeCount[category] = (typeCount[category] || 0) + 1;
    });

    return {
      totalFiles: files.length,
      totalSize,
      typeCount
    };
  }, [files]);

  // 🎨 FORMATAÇÃO
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    const fileInfo = supportedTypes[fileType] || { icon: File, color: 'text-gray-600', name: '?' };
    return fileInfo;
  };

  // 🗑️ AÇÕES
  const handleFileSelection = (fileId) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };

  const handleBulkDelete = () => {
    if (confirm(`Excluir ${selectedFileIds.size} arquivo(s) selecionado(s)?`)) {
      selectedFileIds.forEach(fileId => {
        onDelete && onDelete(fileId);
      });
      setSelectedFileIds(new Set());
    }
  };

  // 🔧 LIMPAR MENSAGENS
  const clearErrors = () => setUploadErrors([]);
  const clearSuccess = () => setUploadSuccess([]);

  return (
    <div className="space-y-4">
      {/* 📊 HEADER COM ESTATÍSTICAS */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Arquivos ({stats.totalFiles})
            </h1>
            <p className="text-sm text-gray-600">
              {formatFileSize(stats.totalSize)} • {Object.keys(stats.typeCount).length} categorias
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botão de teste de conectividade */}
            <button
              onClick={testConnection}
              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Testar conexão com API"
            >
              <Zap className="w-5 h-5" />
            </button>
            
            {/* Botão de refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Atualizar lista"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {/* Toggle de visualização */}
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={`Visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
            
            {/* Input de upload (hidden) */}
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-input"
            />
            
            {/* Botão de upload */}
            <label
              htmlFor="file-upload-input"
              className={`px-4 py-2 rounded-lg font-medium cursor-pointer inline-flex items-center gap-2 transition-colors ${
                uploading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Enviando...' : 'Upload Arquivos'}
            </label>
          </div>
        </div>
      </div>

      {/* ✅ MENSAGENS DE SUCESSO */}
      {uploadSuccess.length > 0 && (
        <div className="space-y-2">
          {uploadSuccess.map((message, index) => (
            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800">{message}</p>
              </div>
              <button
                onClick={clearSuccess}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ⚠️ MENSAGENS DE ERRO */}
      {uploadErrors.length > 0 && (
        <div className="space-y-2">
          {uploadErrors.map((error, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setUploadErrors(prev => prev.filter((_, i) => i !== index))}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={clearErrors}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Limpar todos os erros
          </button>
        </div>
      )}

      {/* 📤 PROGRESSO DE UPLOAD */}
      {uploading && selectedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            <h3 className="font-medium text-gray-900">
              Enviando {selectedFiles.length} arquivo(s)...
            </h3>
          </div>
          <div className="space-y-3">
            {selectedFiles.map(file => (
              <div key={file.name} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">
                    {file.name}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {uploadProgress[file.name] || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress[file.name] || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 FILTROS */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar arquivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Todos os projetos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.nome || project.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(stats.typeCount).map(([type, count]) => (
                <option key={type} value={type}>{type} ({count})</option>
              ))}
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="date-desc">Mais recentes</option>
              <option value="date-asc">Mais antigos</option>
              <option value="name-asc">Nome A-Z</option>
              <option value="name-desc">Nome Z-A</option>
              <option value="size-desc">Maior tamanho</option>
              <option value="size-asc">Menor tamanho</option>
            </select>
          </div>
        </div>

        {/* Ações em massa */}
        {selectedFileIds.size > 0 && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-blue-700 text-sm font-medium">
              {selectedFileIds.size} selecionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedFileIds(new Set())}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📋 LISTA DE ARQUIVOS */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Carregando arquivos...</span>
            </div>
          ) : filteredAndSortedFiles.length > 0 ? (
            <div 
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {filteredAndSortedFiles.map(file => {
                const fileInfo = getFileIcon(file.type || file.tipo_mime);
                const IconComponent = fileInfo.icon;
                const isSelected = selectedFileIds.has(file.id);
                
                const fileName = file.name || file.nome_original || 'Arquivo sem nome';
                const fileSize = file.size || file.tamanho || 0;
                const fileDate = file.uploadDate || file.created_at;
                
                if (viewMode === 'grid') {
                  return (
                    <div 
                      key={file.id} 
                      className={`border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleFileSelection(file.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-50'} ${fileInfo.color}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFileSelection(file.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 text-sm truncate" title={fileName}>
                          {fileName}
                        </h3>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>{formatFileSize(fileSize)}</span>
                            <span className={`px-2 py-1 rounded-full ${fileInfo.color} bg-opacity-10 font-medium`}>
                              {fileInfo.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(fileDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview && onPreview(file);
                          }}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <Eye className="w-3 h-3" />
                          Ver
                        </button>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const downloadUrl = file.url || `/api/arquivos/${file.id}/download`;
                              window.open(downloadUrl, '_blank');
                            }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Baixar"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Excluir este arquivo?')) {
                                onDelete && onDelete(file.id);
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Visualização em lista
                return (
                  <div 
                    key={file.id} 
                    className={`border rounded-lg p-2 hover:shadow-sm transition-all cursor-pointer ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileSelection(file.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFileSelection(file.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className={`p-2 rounded ${isSelected ? 'bg-blue-100' : 'bg-gray-50'} ${fileInfo.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate text-sm">
                            {fileName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${fileInfo.color} bg-opacity-10`}>
                            {fileInfo.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatFileSize(fileSize)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(fileDate)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview && onPreview(file);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const downloadUrl = file.url || `/api/arquivos/${file.id}/download`;
                            window.open(downloadUrl, '_blank');
                          }}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Excluir este arquivo?')) {
                              onDelete && onDelete(file.id);
                            }
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
            <div 
              className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedProject || selectedType ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo carregado'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedProject || selectedType 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Arraste arquivos aqui ou use o botão de upload'
                }
              </p>
              {(!searchTerm && !selectedProject && !selectedType) && (
                <label
                  htmlFor="file-upload-input"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Fazer Upload do Primeiro Arquivo
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📊 RESUMO FINAL */}
      {filteredAndSortedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {filteredAndSortedFiles.length} de {stats.totalFiles} arquivo(s)
            </span>
            <span>
              {formatFileSize(stats.totalSize)}
            </span>
          </div>
        </div>
      )}

      {/* 🔧 DEBUG INFO (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Total de arquivos: {files.length}</div>
              <div>Arquivos filtrados: {filteredAndSortedFiles.length}</div>
              <div>Upload ativo: {uploading ? 'Sim' : 'Não'}</div>
              <div>Erros: {uploadErrors.length}</div>
              <div>Sucessos: {uploadSuccess.length}</div>
              <div>API Base: /api/arquivos</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default FilesSection;