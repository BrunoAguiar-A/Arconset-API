// 📁 src/components/ErrorBoundary.jsx - NOVO COMPONENTE
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

  logErrorToService = (error, errorInfo) => {
    // Implementar envio para serviço de logs
    try {
      // Exemplo: Sentry.captureException(error, { extra: errorInfo });
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

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Card principal do erro */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              {/* Header */}
              <div className="bg-red-50 border-b border-red-200 p-6 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-red-800">
                      Oops! Algo deu errado
                    </h1>
                    <p className="text-red-600 text-sm">
                      Ocorreu um erro inesperado na aplicação
                    </p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                {/* Mensagem de erro simplificada */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Detalhes do Erro:
                  </h2>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700 font-medium">
                      {error?.message || 'Erro desconhecido'}
                    </p>
                    {error?.name && (
                      <p className="text-gray-500 text-sm mt-1">
                        Tipo: {error.name}
                      </p>
                    )}
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
                        Multiple tentativas detectadas. Considere recarregar a página.
                      </p>
                    )}
                  </div>
                )}

                {/* Sugestões de solução */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    💡 O que você pode tentar:
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Clique em "Tentar Novamente" para recarregar o componente</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Recarregue a página inteira se o problema persistir</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Verifique sua conexão com a internet</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Limpe o cache do navegador (Ctrl+F5)</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-3">
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
                <p className="text-yellow-700 text-xs">
                  Este painel de erro detalhado só aparece em desenvolvimento. 
                  Em produção, os usuários verão uma versão simplificada.
                </p>
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

// 🎯 Hook para capturar erros em componentes funcionais
export const useErrorHandler = () => {
  const handleError = (error, errorInfo = {}) => {
    console.error('🚨 Erro capturado via hook:', error);
    
    // Em um cenário real, você enviaria isso para um serviço
    if (process.env.NODE_ENV === 'production') {
      // Enviar erro para serviço de monitoramento
      console.log('📡 Enviando erro para monitoramento...');
    }
  };

  return { handleError };
};

export default ErrorBoundary;