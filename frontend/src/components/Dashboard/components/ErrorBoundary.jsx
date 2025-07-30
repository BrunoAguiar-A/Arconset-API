// 📁 src/components/ErrorBoundary.jsx - SEU CÓDIGO MELHORADO
import React from 'react';
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para mostrar a UI de erro
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log do erro para debugging
    console.error('🚨 ErrorBoundary capturou um erro:', error);
    console.error('📍 Stack trace:', errorInfo);
    
    // Salvar error info no state
    this.setState({
      error,
      errorInfo
    });

    // Aqui você poderia enviar o erro para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  // ✅ MELHORIA 2: Detectar tipo de erro para ações específicas
  getErrorType = (error) => {
    const message = error?.message?.toLowerCase() || '';
    const stack = error?.stack?.toLowerCase() || '';
    
    if (message.includes('auth') || 
        message.includes('token') || 
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        stack.includes('auth')) {
      return 'auth';
    }
    
    if (message.includes('network') || 
        message.includes('fetch') ||
        message.includes('connection') ||
        error?.name === 'TypeError' && message.includes('failed to fetch')) {
      return 'network';
    }
    
    if (error?.name === 'ChunkLoadError' || 
        message.includes('loading chunk') ||
        message.includes('loading css chunk')) {
      return 'chunk';
    }
    
    if (message.includes('session') || 
        message.includes('expired') ||
        message.includes('invalid session')) {
      return 'session';
    }
    
    return 'general';
  };

  // ✅ MELHORIA 4: Log melhorado com mais contexto
  logErrorToService = (error, errorInfo) => {
    try {
      const errorType = this.getErrorType(error);
      
      // Obter dados do usuário se disponível
      let userData = null;
      try {
        const savedUser = localStorage.getItem('auth_user');
        userData = savedUser ? JSON.parse(savedUser) : null;
      } catch (e) {
        // Ignorar erro de parse
      }
      
      const errorData = {
        // Dados básicos do erro
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        
        // Contexto da aplicação
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        errorType: errorType,
        retryCount: this.state.retryCount,
        
        // Dados do usuário (sem informações sensíveis)
        userId: userData?.id || null,
        userRole: userData?.role || null,
        
        // Informações do navegador
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        
        // Estado da aplicação
        hasLocalStorage: !!localStorage.getItem('auth_token'),
        connectionType: navigator.connection?.effectiveType || 'unknown'
      };
      
      console.log('📡 Dados completos do erro para monitoramento:', errorData);
      
      // Exemplo para Sentry (descomente quando configurar):
      // Sentry.captureException(error, { 
      //   extra: errorData,
      //   tags: { 
      //     errorType: errorData.errorType,
      //     userRole: errorData.userRole 
      //   },
      //   user: {
      //     id: errorData.userId,
      //     role: errorData.userRole
      //   }
      // });
      
      // Exemplo para LogRocket (descomente quando configurar):
      // LogRocket.captureException(error);
      
      console.log('📡 Erro enviado para serviço de monitoramento');
      
    } catch (logError) {
      console.error('❌ Erro ao enviar log:', logError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  // ✅ MELHORIA 1: Reset de autenticação para erros relacionados a auth
  handleAuthReset = () => {
    try {
      // Limpar todos os dados de autenticação
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('last_token_check');
      sessionStorage.clear();
      
      console.log('🔐 Dados de autenticação limpos devido a erro');
      
      // Redirecionar para home/login
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Erro ao limpar dados de auth:', error);
      // Fallback: reload forçado
      window.location.reload();
    }
  };

  // Função para obter mensagem de erro específica por tipo
  getErrorMessage = (errorType, error) => {
    switch (errorType) {
      case 'auth':
        return 'Problema de autenticação detectado. Suas credenciais podem ter expirado.';
      case 'network':
        return 'Problema de conectividade. Verifique sua conexão com a internet.';
      case 'chunk':
        return 'Erro ao carregar recursos. A aplicação pode ter sido atualizada.';
      case 'session':
        return 'Sua sessão expirou. É necessário fazer login novamente.';
      default:
        return error?.message || 'Erro desconhecido na aplicação.';
    }
  };

  // Função para obter sugestões específicas por tipo de erro
  getErrorSuggestions = (errorType) => {
    const baseSuggestions = [
      'Clique em "Tentar Novamente" para recarregar o componente',
      'Recarregue a página inteira se o problema persistir',
      'Verifique sua conexão com a internet',
      'Limpe o cache do navegador (Ctrl+F5)'
    ];

    switch (errorType) {
      case 'auth':
      case 'session':
        return [
          'Clique em "Reset de Autenticação" para limpar dados corrompidos',
          'Faça login novamente com suas credenciais',
          ...baseSuggestions.slice(1)
        ];
      case 'network':
        return [
          'Verifique sua conexão com a internet',
          'Tente novamente em alguns momentos',
          'Verifique se o servidor está acessível',
          ...baseSuggestions.slice(2)
        ];
      case 'chunk':
        return [
          'Recarregue a página para baixar os recursos atualizados',
          'Limpe o cache do navegador (Ctrl+Shift+R)',
          'A aplicação pode ter sido atualizada recentemente',
          ...baseSuggestions.slice(1)
        ];
      default:
        return baseSuggestions;
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorType = this.getErrorType(error);
      const isAuthError = errorType === 'auth' || errorType === 'session';
      const isNetworkError = errorType === 'network';
      const isChunkError = errorType === 'chunk';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Card principal do erro */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              {/* Header */}
              <div className={`border-b p-6 rounded-t-lg ${
                isAuthError ? 'bg-red-50 border-red-200' :
                isNetworkError ? 'bg-yellow-50 border-yellow-200' :
                isChunkError ? 'bg-blue-50 border-blue-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isAuthError ? 'bg-red-100' :
                    isNetworkError ? 'bg-yellow-100' :
                    isChunkError ? 'bg-blue-100' :
                    'bg-red-100'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${
                      isAuthError ? 'text-red-600' :
                      isNetworkError ? 'text-yellow-600' :
                      isChunkError ? 'text-blue-600' :
                      'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h1 className={`text-xl font-bold ${
                      isAuthError ? 'text-red-800' :
                      isNetworkError ? 'text-yellow-800' :
                      isChunkError ? 'text-blue-800' :
                      'text-red-800'
                    }`}>
                      {isAuthError ? 'Problema de Autenticação' :
                       isNetworkError ? 'Problema de Conectividade' :
                       isChunkError ? 'Erro de Carregamento' :
                       'Oops! Algo deu errado'}
                    </h1>
                    <p className={`text-sm ${
                      isAuthError ? 'text-red-600' :
                      isNetworkError ? 'text-yellow-600' :
                      isChunkError ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {this.getErrorMessage(errorType, error)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                {/* Mensagem de erro detalhada */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Detalhes do Erro:
                  </h2>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 font-medium">
                      {this.getErrorMessage(errorType, error)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {error?.name && (
                        <span>Tipo: {error.name}</span>
                      )}
                      <span>Categoria: {errorType}</span>
                      {isDevelopment && (
                        <span>ID: {Date.now().toString(36).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informações adicionais para desenvolvimento */}
                {isDevelopment && errorInfo && (
                  <div className="mb-6">
                    <details className="group">
                      <summary className="cursor-pointer flex items-center gap-2 text-gray-700 hover:text-gray-900">
                        <Bug className="w-4 h-4" />
                        <span className="font-medium">Detalhes Técnicos (Desenvolvimento)</span>
                        <span className="ml-auto group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-64">
                        <div className="mb-3">
                          <strong>Tipo de Erro:</strong> {errorType}
                        </div>
                        <div className="mb-3">
                          <strong>Stack Trace:</strong>
                          <pre className="whitespace-pre-wrap mt-1">{error?.stack}</pre>
                        </div>
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap mt-1">{errorInfo.componentStack}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {/* Estatísticas do erro */}
                {retryCount > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Tentativas de recuperação: {retryCount}
                      </span>
                    </div>
                    {retryCount >= 3 && (
                      <p className="text-yellow-700 text-sm mt-1">
                        Múltiplas tentativas detectadas. 
                        {isAuthError ? ' Considere fazer reset de autenticação.' : 
                         isChunkError ? ' Considere recarregar a página.' :
                         ' Considere recarregar a página.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Sugestões de solução específicas por tipo */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    💡 O que você pode tentar:
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {this.getErrorSuggestions(errorType).map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações específicas por tipo de erro */}
                <div className="flex flex-wrap gap-3">
                  {/* Botões padrão */}
                  <button 
                    onClick={this.handleRetry}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                  </button>
                  
                  <button 
                    onClick={this.handleReload}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recarregar Página
                  </button>
                  
                  <button 
                    onClick={this.handleGoHome}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Ir para Início
                  </button>

                  {/* ✅ MELHORIA 3: Botão de reset de auth para erros de autenticação */}
                  {isAuthError && (
                    <button 
                      onClick={this.handleAuthReset}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Reset de Autenticação
                    </button>
                  )}
                </div>

                {/* Informações de suporte */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      🛠️ Precisa de ajuda?
                    </h4>
                    <div className="text-blue-700 text-sm space-y-1">
                      <p>Se o problema persistir, entre em contato com o suporte:</p>
                      <div className="space-y-1 mt-2">
                        <p>• <strong>Email:</strong> suporte@arconset.com.br</p>
                        <p>• <strong>Telefone:</strong> (11) 99999-9999</p>
                        <p>• <strong>Horário:</strong> Segunda a Sexta, 8h às 18h</p>
                      </div>
                      {/* Informação específica do erro para suporte */}
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
                        <strong>Para o suporte:</strong> 
                        Erro tipo "{errorType}" em {new Date().toLocaleString('pt-BR')}
                        {isDevelopment && ` - ID: ${Date.now().toString(36).toUpperCase()}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Erro ID: {Date.now().toString(36).toUpperCase()}
                  </span>
                  <span>
                    {new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Debug info adicional em desenvolvimento */}
            {isDevelopment && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <Bug className="w-4 h-4" />
                  <span className="font-medium text-sm">Modo Desenvolvimento</span>
                </div>
                <div className="text-yellow-700 text-xs space-y-1">
                  <p>Este painel de erro detalhado só aparece em desenvolvimento.</p>
                  <p>Em produção, os usuários verão uma versão simplificada.</p>
                  <p><strong>Tipo detectado:</strong> {errorType}</p>
                  <p><strong>Retry count:</strong> {retryCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 🎯 HOC para wrapping de componentes específicos
export const withErrorBoundary = (Component, fallback) => {
  return (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// 🎯 Hook para capturar erros em componentes funcionais - MELHORADO
export const useErrorHandler = () => {
  const handleError = (error, errorInfo = {}) => {
    console.error('🚨 Erro capturado via hook:', error);
    
    // Detectar tipo de erro
    const errorType = error?.message?.includes('auth') ? 'auth' : 'general';
    
    // Em um cenário real, você enviaria isso para um serviço
    if (process.env.NODE_ENV === 'production') {
      try {
        const errorData = {
          message: error.message,
          stack: error.stack,
          type: errorType,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          ...errorInfo
        };
        
        console.log('📡 Enviando erro para monitoramento via hook...', errorData);
        
        // Aqui você enviaria para Sentry, LogRocket, etc.
        // Sentry.captureException(error, { extra: errorData });
        
      } catch (logError) {
        console.error('❌ Erro ao enviar log via hook:', logError);
      }
    }
  };

  return { handleError };
};

export default ErrorBoundary;