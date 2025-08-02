import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  Upload, 
  Download, 
  Edit3, 
  Trash2, 
  Move, 
  Eye,
  Plus,
  Search,
  Home,
  ChevronRight,
  Cloud,
  Database,
  Archive
} from 'lucide-react';

const CloudFileManager = () => {
  const [currentPath, setCurrentPath] = useState(null); // null = raiz
  const [pastas, setPastas] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [stats, setStats] = useState({});

  // Carregar conteúdo da pasta atual
  const loadContent = useCallback(async (pastaId = null) => {
    setLoading(true);
    try {
      const url = pastaId ? `/api/pastas/${pastaId}/conteudo` : '/api/pastas/raiz';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (pastaId) {
          setPastas(result.data.subpastas || []);
          setArquivos(result.data.arquivos || []);
          setBreadcrumb(result.data.breadcrumb || []);
        } else {
          setPastas(result.data.pastas || []);
          setArquivos(result.data.arquivos || []);
          setBreadcrumb(result.data.breadcrumb || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar nova pasta
  const createFolder = async (nome, cor = 'blue') => {
    try {
      const response = await fetch('/api/pastas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          nome,
          cor,
          pasta_pai_id: currentPath,
          criado_por: 'usuario'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        loadContent(currentPath);
        setShowCreateFolder(false);
      }
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
    }
  };

  // Upload de arquivo
  const uploadFile = async (files) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pasta_id', currentPath || '');
      formData.append('uploaded_by', 'usuario');

      try {
        const response = await fetch('/api/arquivos/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        const result = await response.json();
        console.log('Upload resultado:', result);
      } catch (error) {
        console.error('Erro no upload:', error);
      }
    }
    
    loadContent(currentPath);
  };

  // Download de arquivo
  const downloadFile = async (arquivo) => {
    try {
      const response = await fetch(`/api/arquivos/${arquivo.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();
      
      if (result.download_url) {
        // Download via URL assinada (S3)
        window.open(result.download_url, '_blank');
      }
    } catch (error) {
      console.error('Erro no download:', error);
    }
  };

  // Navegar para pasta
  const navigateToFolder = (pastaId) => {
    setCurrentPath(pastaId);
    loadContent(pastaId);
  };

  // Carregamento inicial
  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-600" />
              Sistema de Arquivos na Nuvem
            </h1>
            <p className="text-gray-600">Gerenciamento profissional com pastas virtuais</p>
          </div>
          
          <div className="flex gap-3">
            <input
              type="file"
              multiple
              onChange={(e) => uploadFile(Array.from(e.target.files))}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </label>
            
            <button
              onClick={() => setShowCreateFolder(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Pasta
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={item.id || 'root'}>
              <button
                onClick={() => navigateToFolder(item.id)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                {item.nome}
              </button>
              {index < breadcrumb.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Pastas */}
              {pastas.map(pasta => (
                <div
                  key={pasta.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onDoubleClick={() => navigateToFolder(pasta.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 bg-${pasta.cor}-100 rounded-lg flex items-center justify-center`}>
                      <Folder className={`w-6 h-6 text-${pasta.cor}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{pasta.nome}</h3>
                      <p className="text-xs text-gray-500">{pasta.total_arquivos} arquivo(s)</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{pasta.total_subpastas} pasta(s)</span>
                    <span>Pasta</span>
                  </div>
                </div>
              ))}

              {/* Arquivos */}
              {arquivos.map(arquivo => (
                <div
                  key={arquivo.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {arquivo.storage_type === 's3' ? (
                        <Cloud className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Database className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={arquivo.nome_original}>
                        {arquivo.nome_original}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {(arquivo.tamanho / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {arquivo.storage_type === 's3' ? 'AWS S3' : 'Banco'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => downloadFile(arquivo)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && pastas.length === 0 && arquivos.length === 0 && (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Pasta vazia</h3>
              <p className="text-gray-500 mb-6">Faça upload de arquivos ou crie uma nova pasta</p>
              <div className="flex justify-center gap-3">
                <label
                  htmlFor="file-upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Fazer Upload
                </label>
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Criar Pasta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Pasta */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">Criar Nova Pasta</h2>
            <input
              type="text"
              placeholder="Nome da pasta..."
              className="w-full px-3 py-2 border rounded-lg mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  createFolder(e.target.value.trim());
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Nome da pasta..."]');
                  if (input.value.trim()) {
                    createFolder(input.value.trim());
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudFileManager;