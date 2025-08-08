// src/components/Dashboard/components/CloudFileManager.jsx - VERSÃO CORRIGIDA
import React, { useState, useEffect, useCallback } from 'react';

import { 
  FolderIcon, 
  DocumentIcon, 
  CloudArrowUpIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  HomeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const CloudFileManager = () => {
  // Estados principais
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([{ id: null, nome: 'Raiz', url: '/api/pastas/raiz' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modais
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  // Estados para drag & drop
  const [dragOver, setDragOver] = useState(false);


  // Token de autenticação
  const getAuthToken = () => {
  // Tentar várias fontes de token
  let token = localStorage.getItem('token') || 
              localStorage.getItem('authToken') || 
              sessionStorage.getItem('token') || 
              sessionStorage.getItem('authToken');
  
  console.log('🔍 Token encontrado:', token ? 'SIM' : 'NÃO');
  
  if (!token) {
    console.error('❌ Nenhum token encontrado. Verifique se fez login.');
  }
  
  return token;
};

  // Headers com autenticação
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Carregar conteúdo da pasta atual
  const loadFolderContent = useCallback(async (folderId = null) => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      let url;
      if (folderId) {
        url = `/api/pastas/${folderId}/conteudo`;
      } else {
        url = '/api/pastas/raiz';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        if (folderId) {
          setCurrentFolder(data.data.pasta);
          setFolders(data.data.subpastas || []);
          setFiles(data.data.arquivos || []);
          setBreadcrumb(data.data.breadcrumb || []);
        } else {
          setCurrentFolder(null);
          setFolders(data.data.pastas || []);
          setFiles(data.data.arquivos || []);
          setBreadcrumb([{ id: null, nome: 'Raiz', url: '/api/pastas/raiz' }]);
        }
      } else {
        throw new Error(data.error || 'Erro ao carregar conteúdo');
      }
    } catch (err) {
      console.error('Erro ao carregar pasta:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar conteúdo inicial
  useEffect(() => {
    loadFolderContent();
  }, [loadFolderContent]);

  // Criar nova pasta
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Nome da pasta é obrigatório');
      return;
    }

    try {
      const response = await fetch('/api/pastas', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nome: newFolderName.trim(),
          pasta_pai_id: currentFolder?.id || null,
          cor: 'blue',
          icone: 'folder'
        })
      });

      const data = await response.json();

      if (data.success) {
        setNewFolderName('');
        setShowNewFolderModal(false);
        loadFolderContent(currentFolder?.id);
      } else {
        alert(data.error || 'Erro ao criar pasta');
      }
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
      alert('Erro ao criar pasta');
    }
  };

  // Upload de arquivos
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Selecione pelo menos um arquivo');
      return;
    }

    const newProgress = {};
    selectedFiles.forEach((_, index) => {
      newProgress[index] = 0;
    });
    setUploadProgress(newProgress);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        
        if (currentFolder?.id) {
          formData.append('pasta_id', currentFolder.id.toString());
        }

        const response = await fetch('/api/arquivos/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          setUploadProgress(prev => ({ ...prev, [i]: 100 }));
        } else {
          throw new Error(data.error || 'Erro no upload');
        }
      }

      setSelectedFiles([]);
      setShowUploadModal(false);
      setUploadProgress({});
      loadFolderContent(currentFolder?.id);
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro no upload: ' + err.message);
    }
  };

  // Navegação para pasta
  const navigateToFolder = (folder) => {
    setCurrentFolder(folder);
    loadFolderContent(folder.id);
  };

  // Voltar para pasta pai
  const navigateUp = () => {
    if (breadcrumb.length > 1) {
      const parentBreadcrumb = breadcrumb[breadcrumb.length - 2];
      if (parentBreadcrumb.id) {
        loadFolderContent(parentBreadcrumb.id);
      } else {
        loadFolderContent();
      }
    }
  };

  // Download de arquivo
  const downloadFile = (file) => {
    const token = getAuthToken();
    const url = `/api/arquivos/${file.id}/download`;
    
    const a = document.createElement('a');
    a.href = `${url}?token=${encodeURIComponent(token)}`;
    a.download = file.nome_original || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Deletar arquivo
  const deleteFile = async (file) => {
    if (!confirm(`Tem certeza que deseja deletar "${file.nome_original || file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/arquivos/${file.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        loadFolderContent(currentFolder?.id);
      } else {
        alert(data.error || 'Erro ao deletar arquivo');
      }
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
      alert('Erro ao deletar arquivo');
    }
  };

  // Deletar pasta
  const deleteFolder = async (folder) => {
    if (!confirm(`Tem certeza que deseja deletar a pasta "${folder.nome}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/pastas/${folder.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        loadFolderContent(currentFolder?.id);
      } else {
        alert(data.error || 'Erro ao deletar pasta');
      }
    } catch (err) {
      console.error('Erro ao deletar pasta:', err);
      alert('Erro ao deletar pasta');
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setSelectedFiles(droppedFiles);
    setShowUploadModal(true);
  };

  // Filtrar arquivos por busca
  const filteredFiles = files.filter(file => 
    !searchTerm || 
    (file.nome_original || file.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    !searchTerm || 
    folder.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Renderizar ícone do arquivo
  const getFileIcon = (file) => {
    const fileName = file.nome_original || file.name || '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    const iconClass = "h-8 w-8 text-blue-500";

    switch (extension) {
      case 'pdf':
        return <DocumentIcon className={`${iconClass} text-red-500`} />;
      case 'doc':
      case 'docx':
        return <DocumentIcon className={`${iconClass} text-blue-600`} />;
      case 'xls':
      case 'xlsx':
        return <DocumentIcon className={`${iconClass} text-green-600`} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <DocumentIcon className={`${iconClass} text-purple-500`} />;
      default:
        return <DocumentIcon className={iconClass} />;
    }
  };

  // Formatear tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FolderIcon className="h-6 w-6 mr-2 text-blue-500" />
              Gerenciador de Arquivos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sistema híbrido com AWS S3 e organização em pastas
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nova Pasta
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Upload
            </button>
            <button
              onClick={() => loadFolderContent(currentFolder?.id)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
            >
              Atualizar
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{folders.length}</div>
            <div className="text-sm text-gray-500">Pastas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{files.length}</div>
            <div className="text-sm text-gray-500">Arquivos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatFileSize(files.reduce((sum, file) => sum + (file.tamanho || file.size || 0), 0))}
            </div>
            <div className="text-sm text-gray-500">Tamanho Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {files.filter(f => f.storage_type === 's3' || f.is_cloud).length}
            </div>
            <div className="text-sm text-gray-500">No S3</div>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div className="border-b border-gray-200 p-4">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => loadFolderContent()}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Raiz
          </button>
          
          {breadcrumb.slice(1).map((item, index) => (
            <React.Fragment key={item.id}>
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => loadFolderContent(item.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                {item.nome}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar arquivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div 
        className={`p-6 min-h-96 ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">
            <p>{error}</p>
            <button
              onClick={() => loadFolderContent(currentFolder?.id)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {/* Pastas */}
            {filteredFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Pastas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group relative p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                      onDoubleClick={() => navigateToFolder(folder)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <FolderIcon className={`h-12 w-12 mb-2 text-${folder.cor || 'blue'}-500`} />
                        <span className="text-sm font-medium text-gray-900 truncate w-full">
                          {folder.nome}
                        </span>
                        <span className="text-xs text-gray-500">
                          {folder.total_arquivos || 0} arquivo(s)
                        </span>
                      </div>
                      
                      {/* Ações da pasta */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arquivos */}
            {filteredFiles.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Arquivos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group relative p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getFileIcon(file)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {file.nome_original || file.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(file.tamanho || file.size)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.tipo_documento || file.category || 'Geral'}
                          </p>
                          {(file.storage_type === 's3' || file.is_cloud) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mt-1">
                              ☁️ S3
                            </span>
                          )}
                        </div>

                        {/* Ações do arquivo */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => downloadFile(file)}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteFile(file)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Deletar"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !loading && filteredFolders.length === 0 && (
              <div className="text-center py-12">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum arquivo</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Arraste arquivos aqui ou use o botão de upload
                </p>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Nova Pasta
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Upload Arquivos
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nova Pasta */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nova Pasta</h3>
            <input
              type="text"
              placeholder="Nome da pasta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload de Arquivos</h3>
            
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
              className="w-full mb-4"
            />

            {selectedFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFiles.length} arquivo(s) selecionado(s):
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setUploadProgress({});
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={uploadFiles}
                disabled={selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudFileManager;