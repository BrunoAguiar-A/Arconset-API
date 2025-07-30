// 📁 src/components/Dashboard/components/S3FileUpload.jsx - CORRIGIDO
import React, { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Archive, AlertCircle, CheckCircle, Loader2, Cloud, HardDrive } from 'lucide-react';

const S3FileUpload = ({ 
  projetoId = null, 
  onUploadComplete = () => {}, 
  className = "",
  tipoDocumento = "Geral" 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [isS3Enabled, setIsS3Enabled] = useState(null);
  const fileInputRef = useRef(null);

  // Verificar se S3 está habilitado
  React.useEffect(() => {
    fetch('/api/s3/test')
      .then(res => res.json())
      .then(data => setIsS3Enabled(data.enabled))
      .catch(() => setIsS3Enabled(false));
  }, []);

  // Configurações
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
    '.dwg', '.dxf', '.skp', '.rvt',
    '.zip', '.rar', '.7z', '.txt', '.csv'
  ];

  // Ícone do arquivo
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(ext)) {
      return <Image className="w-6 h-6 text-blue-500" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (['zip', 'rar', '7z'].includes(ext)) {
      return <Archive className="w-6 h-6 text-purple-500" />;
    }
    return <File className="w-6 h-6 text-gray-500" />;
  };

  // Validar arquivo
  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > maxFileSize) {
      errors.push(`Arquivo muito grande (máx: ${maxFileSize / (1024 * 1024)}MB)`);
    }
    
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      errors.push(`Tipo não permitido: ${ext}`);
    }
    
    return errors;
  };

  // Upload S3 direto
  const uploadToS3 = async (file, uploadData) => {
    const response = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': uploadData.contentType,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Upload falhou: ${response.status}`);
    }
    
    return uploadData.fileUrl;
  };

  // Upload tradicional (fallback)
  const uploadTraditional = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_documento', tipoDocumento);
    if (projetoId) formData.append('projeto_id', projetoId);
    
    const response = await fetch('/api/arquivos/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  };

  // Confirmar upload S3
  const confirmS3Upload = async (uploadData, file) => {
    const response = await fetch('/api/arquivos/confirm-s3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: uploadData.key,
        fileName: file.name,
        fileUrl: uploadData.fileUrl,
        projetoId: projetoId,
        tipoDocumento: tipoDocumento,
        contentType: uploadData.contentType
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  };

  // Processar arquivos
  const processFiles = async (fileList) => {
    const files = Array.from(fileList);
    
    for (const file of files) {
      const uploadId = Date.now() + Math.random();
      
      // Validar
      const errors = validateFile(file);
      if (errors.length > 0) {
        setUploads(prev => [...prev, {
          id: uploadId,
          file,
          status: 'error',
          error: errors.join(', '),
          progress: 0
        }]);
        continue;
      }
      
      // Adicionar à lista
      setUploads(prev => [...prev, {
        id: uploadId,
        file,
        status: 'uploading',
        progress: 0,
        method: isS3Enabled ? 's3' : 'local'
      }]);
      
      try {
        let result;
        
        if (isS3Enabled) {
          // Método S3
          setUploads(prev => prev.map(u => 
            u.id === uploadId ? { ...u, progress: 10, status: 'getting-url' } : u
          ));
          
          // 1. Obter URL assinada
          const urlResponse = await fetch('/api/arquivos/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              projetoId: projetoId
            })
          });
          
          const urlResult = await urlResponse.json();
          if (!urlResult.success) {
            throw new Error(urlResult.error);
          }
          
          if (urlResult.method === 's3') {
            // 2. Upload direto para S3
            setUploads(prev => prev.map(u => 
              u.id === uploadId ? { ...u, progress: 50, status: 'uploading-s3' } : u
            ));
            
            await uploadToS3(file, urlResult.data);
            
            // 3. Confirmar no backend
            setUploads(prev => prev.map(u => 
              u.id === uploadId ? { ...u, progress: 80, status: 'confirming' } : u
            ));
            
            result = await confirmS3Upload(urlResult.data, file);
          } else {
            // Fallback para upload tradicional
            throw new Error('S3 indisponível, usando método tradicional');
          }
        } else {
          // Método tradicional
          setUploads(prev => prev.map(u => 
            u.id === uploadId ? { ...u, progress: 30, status: 'uploading-local', method: 'local' } : u
          ));
          
          result = await uploadTraditional(file);
        }
        
        // Sucesso
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { 
            ...u, 
            progress: 100, 
            status: 'success',
            result: result
          } : u
        ));
        
        // Callback
        onUploadComplete(result);
        
        // Remover da lista após 3s
        setTimeout(() => {
          setUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 3000);
        
      } catch (error) {
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { 
            ...u, 
            status: 'error',
            error: error.message
          } : u
        ));
      }
    }
  };

  // Handlers de drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  };

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status, method) => {
    switch (status) {
      case 'uploading':
      case 'getting-url':
      case 'uploading-s3':
      case 'uploading-local':
      case 'confirming':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return method === 's3' ? <Cloud className="w-4 h-4 text-blue-500" /> : <HardDrive className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status, method) => {
    switch (status) {
      case 'getting-url': return 'Preparando...';
      case 'uploading-s3': return 'Enviando para S3...';
      case 'uploading-local': return 'Enviando...';
      case 'confirming': return 'Finalizando...';
      case 'success': return method === 's3' ? 'Enviado para S3' : 'Enviado localmente';
      case 'error': return 'Erro';
      default: return 'Enviando...';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Status S3 */}
      {isS3Enabled !== null && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2 text-sm">
          {isS3Enabled ? (
            <>
              <Cloud className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700">Armazenamento: <strong>AWS S3</strong> (Upload direto)</span>
            </>
          ) : (
            <>
              <HardDrive className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">Armazenamento: <strong>Local</strong> (Upload tradicional)</span>
            </>
          )}
        </div>
      )}

      {/* Área de Upload */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Máximo {maxFileSize / (1024 * 1024)}MB por arquivo
        </p>
        <p className="text-xs text-gray-400">
          Tipos permitidos: PDF, DOC, XLS, IMG, CAD, ZIP, TXT
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Lista de Uploads */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Uploads em andamento ({uploads.length})
          </h4>
          
          {uploads.map((upload) => (
            <div key={upload.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getFileIcon(upload.file.name)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {upload.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(upload.status, upload.method)}
                  {upload.status !== 'success' && upload.status !== 'error' && (
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Barra de Progresso */}
              {upload.status !== 'error' && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      upload.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              
              {/* Status */}
              <div className="flex items-center justify-between text-xs">
                <span className={`${
                  upload.status === 'error' ? 'text-red-600' : 
                  upload.status === 'success' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {upload.error || getStatusText(upload.status, upload.method)}
                </span>
                
                {upload.status !== 'error' && (
                  <span className="text-gray-500">
                    {upload.progress}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default S3FileUpload;