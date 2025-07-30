// 📁 src/components/Dashboard/components/FilesSection.jsx - INTERFACE OTIMIZADA
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
  loading = false 
}) => {
  // 🔧 ESTADOS DA INTERFACE
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
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
    const allowedTypes = Object.keys(supportedTypes);
    
    if (file.size > maxSize) {
      return `Arquivo muito grande. Máximo: 100MB (atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return `Tipo de arquivo não suportado: ${file.type}`;
    }
    
    return null;
  };

  // 📤 PROCESSAR UPLOAD FUNCIONAL
  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    setUploadErrors(errors);
    if (validFiles.length === 0) return;

    setUploading(true);
    setSelectedFiles(validFiles);

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Progresso realista
        for (let progress = 0; progress <= 100; progress += 25) {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 🚀 UPLOAD REAL PARA O BACKEND
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size);
        formData.append('fileType', file.type);
        formData.append('projectId', selectedProject || '');
        formData.append('description', `Arquivo ${file.name} enviado automaticamente`);

        // Chamada para o backend
        try {
          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });

          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Upload realizado com sucesso:', result);
            
            // Chamar callback do componente pai
            if (onUpload) {
              await onUpload(result.data);
            }
          } else {
            throw new Error(result.error || 'Erro no upload');
          }
        } catch (uploadError) {
          console.error('❌ Erro no upload:', uploadError);
          setUploadErrors(prev => [...prev, `${file.name}: ${uploadError.message}`]);
        }
      }

      // Finalizar upload
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadProgress({});
        setUploading(false);
        setShowUploadModal(false);
        
        // Recarregar a lista de arquivos
        if (window.location) {
          window.location.reload();
        }
      }, 1000);

    } catch (error) {
      console.error('Erro geral no upload:', error);
      setUploadErrors(prev => [...prev, `Erro geral: ${error.message}`]);
      setUploading(false);
    }
  }, [onUpload, selectedProject]);

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
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = ''; // Limpar input
  }, [processFiles]);

  // 🔍 FILTROS E BUSCA
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files.filter(file => {
      const matchesSearch = file.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = !selectedProject || file.projectId === selectedProject;
      const matchesType = !selectedType || supportedTypes[file.type]?.category === selectedType;
      
      return matchesSearch && matchesProject && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'type':
          aValue = supportedTypes[a.type]?.name || '';
          bValue = supportedTypes[b.type]?.name || '';
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
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const typeCount = {};
    
    files.forEach(file => {
      const category = supportedTypes[file.type]?.category || 'Outros';
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    const fileInfo = supportedTypes[fileType] || { icon: File, color: 'text-gray-600' };
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

  return (
    <div className="space-y-4">
      {/* 📊 HEADER COMPACTO COM BOTÃO DE UPLOAD */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Arquivos ({files.length})
            </h1>
            <p className="text-sm text-gray-600">
              {formatFileSize(stats.totalSize)} • {Object.keys(stats.typeCount).length} tipos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={`Visualização em ${viewMode === 'grid' ? 'lista' : 'grade'}`}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
            
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.dwg,.dxf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-input"
            />
            
            <label
              htmlFor="file-upload-input"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2 font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Arquivos
            </label>
          </div>
        </div>
      </div>

      {/* 🔍 BARRA DE BUSCA E FILTROS COMPACTA */}
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
                <option key={project.id} value={project.id}>{project.nome}</option>
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
              <option value="size-desc">Maior</option>
              <option value="size-asc">Menor</option>
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
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedFileIds(new Set())}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ ERROS DE UPLOAD */}
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
        </div>
      )}

      {/* 📤 MODAL DE UPLOAD ATIVO */}
      {uploading && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-blue-600 animate-pulse" />
            <h3 className="font-medium text-gray-900">Enviando arquivos...</h3>
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
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[file.name] || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📋 LISTA DE ARQUIVOS EXPANDIDA */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredAndSortedFiles.length > 0 ? (
            <div 
              className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {filteredAndSortedFiles.map(file => {
                const fileInfo = getFileIcon(file.type || file.mimeType);
                const IconComponent = fileInfo.icon;
                const isSelected = selectedFileIds.has(file.id);
                
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
                        <h3 className="font-medium text-gray-900 text-sm truncate" title={file.name}>
                          {file.name || file.fileName}
                        </h3>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>{formatFileSize(file.size || file.fileSize || 0)}</span>
                            <span className={`px-2 py-1 rounded-full ${fileInfo.color} bg-opacity-10 font-medium`}>
                              {fileInfo.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(file.uploadDate || file.created_at || new Date())}</span>
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
                              const link = document.createElement('a');
                              link.href = file.url || '#';
                              link.download = file.name || 'arquivo';
                              link.click();
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
                            {file.name || file.fileName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${fileInfo.color} bg-opacity-10`}>
                            {fileInfo.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatFileSize(file.size || file.fileSize || 0)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(file.uploadDate || file.created_at || new Date())}
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
                            const link = document.createElement('a');
                            link.href = file.url || '#';
                            link.download = file.name || 'arquivo';
                            link.click();
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
              className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg"
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
              {filteredAndSortedFiles.length} de {files.length} arquivo(s)
            </span>
            <span>
              {formatFileSize(stats.totalSize)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesSection;