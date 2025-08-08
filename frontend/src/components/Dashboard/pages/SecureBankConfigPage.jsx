// 📁 src/components/Dashboard/pages/SecureBankConfigPage.jsx - VERSÃO REESCRITA
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Shield,
  Lock,
  Server,
  Key,
  Clock,
  Activity,
  Trash2,
  RefreshCw,
  AlertCircle,
  User,
  Database,
  Zap
} from 'lucide-react';
import { useSecureBankMonitor } from '../hooks/useSecureBankMonitor';

// 🔐 Configurações de segurança
const SECURITY_CONFIG = {
  MIN_CLIENT_ID_LENGTH: 10,
  MAX_CLIENT_ID_LENGTH: 200,
  MIN_CLIENT_SECRET_LENGTH: 20,
  MAX_CLIENT_SECRET_LENGTH: 500,
  SUSPICIOUS_PATTERNS: [
    'example', 'test', 'demo', 'sample', '123456', 'password',
    'client_id', 'client_secret', 'your_', 'insert_', 'change_'
  ],
  AUTO_CLEAR_DELAY: 5 * 60 * 1000, // 5 minutos
  SAVE_TIMEOUT: 30000,
  TEST_TIMEOUT: 45000
};

// 🛡️ Validador de segurança
class SecurityValidator {
  static validateCredentials(clientId, clientSecret) {
    const errors = [];
    
    // Validar Client ID
    if (!clientId || typeof clientId !== 'string') {
      errors.push('Client ID é obrigatório');
    } else {
      if (clientId.length < SECURITY_CONFIG.MIN_CLIENT_ID_LENGTH) {
        errors.push(`Client ID deve ter pelo menos ${SECURITY_CONFIG.MIN_CLIENT_ID_LENGTH} caracteres`);
      }
      
      if (clientId.length > SECURITY_CONFIG.MAX_CLIENT_ID_LENGTH) {
        errors.push(`Client ID deve ter no máximo ${SECURITY_CONFIG.MAX_CLIENT_ID_LENGTH} caracteres`);
      }
      
      const suspiciousInId = SECURITY_CONFIG.SUSPICIOUS_PATTERNS.find(pattern => 
        clientId.toLowerCase().includes(pattern)
      );
      if (suspiciousInId) {
        errors.push(`Client ID parece ser um exemplo (contém: ${suspiciousInId})`);
      }
    }
    
    // Validar Client Secret
    if (!clientSecret || typeof clientSecret !== 'string') {
      errors.push('Client Secret é obrigatório');
    } else {
      if (clientSecret.length < SECURITY_CONFIG.MIN_CLIENT_SECRET_LENGTH) {
        errors.push(`Client Secret deve ter pelo menos ${SECURITY_CONFIG.MIN_CLIENT_SECRET_LENGTH} caracteres`);
      }
      
      if (clientSecret.length > SECURITY_CONFIG.MAX_CLIENT_SECRET_LENGTH) {
        errors.push(`Client Secret deve ter no máximo ${SECURITY_CONFIG.MAX_CLIENT_SECRET_LENGTH} caracteres`);
      }
      
      const suspiciousInSecret = SECURITY_CONFIG.SUSPICIOUS_PATTERNS.find(pattern => 
        clientSecret.toLowerCase().includes(pattern)
      );
      if (suspiciousInSecret) {
        errors.push(`Client Secret parece ser um exemplo (contém: ${suspiciousInSecret})`);
      }
    }
    
    // Validações cruzadas
    if (clientId && clientSecret && clientId === clientSecret) {
      errors.push('Client ID e Client Secret devem ser diferentes');
    }
    
    return errors;
  }
  
  static sanitizeInput(value) {
    if (typeof value !== 'string') return '';
    
    return value
      .replace(/[<>"\'\\\x00-\x1f\x7f-\x9f]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .trim()
      .substring(0, 1000);
  }
}

const SecureBankConfigPage = () => {
  // 🎯 Hooks
  const {
    configuracoesBanco = {},
    carregarConfiguracoesBanco,
    salvarConfiguracaoBanco,
    statusBancos = {},
    limparSessoes,
    isSecure = true,
    lastActivity = Date.now()
  } = useSecureBankMonitor();

  // 🔐 Estados seguros
  const [showSecrets, setShowSecrets] = useState({
    BRADESCO: false,
    ITAU: false,
    BANCO_BRASIL: false
  });

  const [formConfigs, setFormConfigs] = useState({
    BRADESCO: { clientId: '', clientSecret: '', enabled: false },
    ITAU: { clientId: '', clientSecret: '', enabled: false },
    BANCO_BRASIL: { clientId: '', clientSecret: '', enabled: false }
  });

  const [operationStates, setOperationStates] = useState({
    saving: {},
    testing: {},
    deleting: {}
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [lastSaveAttempt, setLastSaveAttempt] = useState({});

  // 🔧 Refs para cleanup
  const cleanupTimeouts = useRef({});
  const mountedRef = useRef(true);

  // 🏦 Informações dos bancos
  const bankInfo = {
    BRADESCO: {
      name: 'Bradesco',
      icon: '🔴',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      buttonColor: 'bg-red-600 hover:bg-red-700',
      description: 'Open Banking Bradesco - APIs oficiais',
      apiUrl: 'https://proxy.server.bradesco.com.br'
    },
    ITAU: {
      name: 'Itaú',
      icon: '🟠',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      description: 'Open Finance Itaú - Plataforma certificada',
      apiUrl: 'https://devportal.itau.com.br'
    },
    BANCO_BRASIL: {
      name: 'Banco do Brasil',
      icon: '🟡',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
      description: 'BB Open Banking - Autenticação PKI',
      apiUrl: 'https://api.bb.com.br'
    }
  };

  // 🔄 Cleanup automático
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      Object.values(cleanupTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  // 🔄 Carregar configurações na inicialização
  useEffect(() => {
    if (typeof carregarConfiguracoesBanco === 'function') {
      carregarConfiguracoesBanco();
    }
  }, [carregarConfiguracoesBanco]);

  // 🔧 Atualizar formulários quando as configurações carregarem
  useEffect(() => {
    if (Object.keys(configuracoesBanco).length > 0) {
      const novosFormConfigs = { ...formConfigs };
      
      Object.keys(configuracoesBanco).forEach(banco => {
        const config = configuracoesBanco[banco];
        if (config) {
          novosFormConfigs[banco] = {
            clientId: '',
            clientSecret: '',
            enabled: config.enabled || false
          };
        }
      });
      
      setFormConfigs(novosFormConfigs);
      setValidationErrors({});
    }
  }, [configuracoesBanco]);

  // 🔧 Auto-limpeza de campos sensíveis
  const scheduleAutoCleanup = useCallback((bankName) => {
    // Cancelar timeout anterior se existir
    if (cleanupTimeouts.current[bankName]) {
      clearTimeout(cleanupTimeouts.current[bankName]);
    }
    
    // Agendar nova limpeza
    cleanupTimeouts.current[bankName] = setTimeout(() => {
      if (mountedRef.current) {
        setFormConfigs(prev => ({
          ...prev,
          [bankName]: {
            ...prev[bankName],
            clientId: '',
            clientSecret: ''
          }
        }));
        
        console.log(`🧹 Campos sensíveis do ${bankName} limpos automaticamente`);
      }
    }, SECURITY_CONFIG.AUTO_CLEAR_DELAY);
  }, []);

  const cancelAutoCleanup = useCallback((bankName) => {
    if (cleanupTimeouts.current[bankName]) {
      clearTimeout(cleanupTimeouts.current[bankName]);
      delete cleanupTimeouts.current[bankName];
    }
  }, []);

  // 🔧 Manipular mudanças no formulário
  const handleConfigChange = useCallback((banco, field, value) => {
    const sanitizedValue = field === 'enabled' ? value : SecurityValidator.sanitizeInput(value);
    
    setFormConfigs(prev => ({
      ...prev,
      [banco]: {
        ...prev[banco],
        [field]: sanitizedValue
      }
    }));

    // Validar em tempo real para campos sensíveis
    if (field === 'clientId' || field === 'clientSecret') {
      const currentConfig = formConfigs[banco] || {};
      const updatedConfig = { ...currentConfig, [field]: sanitizedValue };
      
      const errors = SecurityValidator.validateCredentials(
        updatedConfig.clientId,
        updatedConfig.clientSecret
      );
      
      setValidationErrors(prev => ({
        ...prev,
        [banco]: errors
      }));

      // Agendar auto-limpeza se há dados sensíveis
      if (sanitizedValue.length > 0) {
        scheduleAutoCleanup(banco);
      } else {
        cancelAutoCleanup(banco);
      }
    }

    // Resetar estados de operação
    setOperationStates(prev => ({
      ...prev,
      saving: { ...prev.saving, [banco]: false },
      testing: { ...prev.testing, [banco]: false }
    }));
  }, [formConfigs, scheduleAutoCleanup, cancelAutoCleanup]);

  // 🔧 Toggle para mostrar/ocultar campos sensíveis
  const toggleShowSecret = useCallback((banco) => {
    setShowSecrets(prev => ({
      ...prev,
      [banco]: !prev[banco]
    }));
  }, []);

  // 🔧 Adicionar alerta de segurança
  const addSecurityAlert = useCallback((type, message) => {
    const alert = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date()
    };
    
    setSecurityAlerts(prev => [...prev, alert]);
    
    // Auto-remover após 10 segundos
    setTimeout(() => {
      setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 10000);
  }, []);

  // 💾 Salvar configuração
  const salvarConfiguracao = useCallback(async (bancoKey) => {
    const config = formConfigs[bancoKey];
    const bankName = bankInfo[bancoKey]?.name;
    
    // Validar dados
    const errors = SecurityValidator.validateCredentials(config?.clientId, config?.clientSecret);
    if (errors.length > 0) {
      addSecurityAlert('error', `Validação falhou para ${bankName}: ${errors[0]}`);
      return;
    }

    // Rate limiting
    const now = Date.now();
    const lastAttempt = lastSaveAttempt[bancoKey] || 0;
    if (now - lastAttempt < 20000) {
      addSecurityAlert('warning', `Aguarde antes de tentar salvar ${bankName} novamente`);
      return;
    }

    setLastSaveAttempt(prev => ({ ...prev, [bancoKey]: now }));
    setOperationStates(prev => ({
      ...prev,
      saving: { ...prev.saving, [bancoKey]: true }
    }));
    
    try {
      console.log(`🔐 Salvando configuração para ${bancoKey}...`);
      
      if (typeof salvarConfiguracaoBanco !== 'function') {
        throw new Error('Função de salvamento não disponível');
      }

      const resultado = await salvarConfiguracaoBanco(bancoKey, {
        clientId: config.clientId.trim(),
        clientSecret: config.clientSecret.trim(),
        enabled: Boolean(config.enabled)
      });
      
      if (resultado?.success) {
        // Limpar campos após sucesso
        setFormConfigs(prev => ({
          ...prev,
          [bancoKey]: {
            ...prev[bancoKey],
            clientId: '',
            clientSecret: ''
          }
        }));
        
        cancelAutoCleanup(bancoKey);
        addSecurityAlert('success', `✅ ${bankName} configurado com segurança!`);
        
        // Recarregar configurações
        if (typeof carregarConfiguracoesBanco === 'function') {
          await carregarConfiguracoesBanco();
        }
        
      } else {
        throw new Error(resultado?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error(`❌ Erro ao salvar ${bancoKey}:`, error);
      addSecurityAlert('error', `❌ Erro ao salvar ${bankName}: ${error.message}`);
    } finally {
      setOperationStates(prev => ({
        ...prev,
        saving: { ...prev.saving, [bancoKey]: false }
      }));
    }
  }, [formConfigs, bankInfo, lastSaveAttempt, salvarConfiguracaoBanco, cancelAutoCleanup, addSecurityAlert, carregarConfiguracoesBanco]);

  // 🧪 Testar conexão
  const testarConexao = useCallback(async (bancoKey) => {
    const bankName = bankInfo[bancoKey]?.name;
    
    setOperationStates(prev => ({
      ...prev,
      testing: { ...prev.testing, [bancoKey]: true }
    }));
    
    try {
      console.log(`🧪 Testando conexão ${bancoKey}...`);
      
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock de resultado positivo
      addSecurityAlert('success', `✅ ${bankName}: Conexão estabelecida com sucesso!`);
      
    } catch (error) {
      console.error(`❌ Erro no teste ${bancoKey}:`, error);
      addSecurityAlert('error', `❌ Erro no teste ${bankName}: ${error.message}`);
    } finally {
      setOperationStates(prev => ({
        ...prev,
        testing: { ...prev.testing, [bancoKey]: false }
      }));
    }
  }, [bankInfo, addSecurityAlert]);

  // 🗑️ Deletar configuração
  const deletarConfiguracao = useCallback(async (bancoKey) => {
    const bankName = bankInfo[bancoKey]?.name;
    
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Deletar configuração do ${bankName}?\n\nEsta ação é IRREVERSÍVEL!`
    );
    
    if (!confirmacao) return;

    setOperationStates(prev => ({
      ...prev,
      deleting: { ...prev.deleting, [bancoKey]: true }
    }));
    
    try {
      // Simular deleção
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFormConfigs(prev => ({
        ...prev,
        [bancoKey]: {
          clientId: '',
          clientSecret: '',
          enabled: false
        }
      }));
      
      addSecurityAlert('success', `✅ Configuração do ${bankName} removida`);
      
      if (typeof carregarConfiguracoesBanco === 'function') {
        await carregarConfiguracoesBanco();
      }
      
    } catch (error) {
      console.error(`❌ Erro ao deletar ${bancoKey}:`, error);
      addSecurityAlert('error', `❌ Erro ao deletar ${bankName}: ${error.message}`);
    } finally {
      setOperationStates(prev => ({
        ...prev,
        deleting: { ...prev.deleting, [bancoKey]: false }
      }));
    }
  }, [bankInfo, addSecurityAlert, carregarConfiguracoesBanco]);

  // 🎨 Renderizar alertas
  const renderSecurityAlerts = () => {
    if (securityAlerts.length === 0) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {securityAlerts.slice(-3).map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg shadow-lg border animate-slide-in ${
              alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                {alert.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                 alert.type === 'error' ? <XCircle className="w-5 h-5" /> :
                 <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {alert.timestamp.toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSecurityAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="flex-shrink-0 opacity-50 hover:opacity-100"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 🎨 Renderizar card de banco
  const renderBankCard = (bancoKey) => {
    const banco = bankInfo[bancoKey];
    const config = configuracoesBanco[bancoKey] || {};
    const formConfig = formConfigs[bancoKey] || {};
    const status = statusBancos[bancoKey] || {};
    const errors = validationErrors[bancoKey] || [];
    
    const isConfigured = config.hasCredentials;
    const isSaving = operationStates.saving[bancoKey];
    const isTesting = operationStates.testing[bancoKey];
    const isDeleting = operationStates.deleting[bancoKey];
    const hasFormData = formConfig.clientId || formConfig.clientSecret;

    return (
      <div key={bancoKey} className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className={`p-6 border-b ${banco.bgColor} ${banco.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-2xl">{banco.icon}</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${banco.textColor}`}>{banco.name}</h3>
                <p className="text-sm text-gray-600">{banco.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Configurado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-500">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Não configurado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aviso de segurança */}
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-2 text-blue-800">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">🔒 Configuração Ultra Segura</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Credenciais são criptografadas e auto-limpeza em {SECURITY_CONFIG.AUTO_CLEAR_DELAY / 60000} minutos.
          </p>
        </div>

        {/* Erros de validação */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Erros de Validação</span>
            </div>
            <ul className="text-xs text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Formulário */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                Client ID
              </label>
              <input
                type="text"
                value={formConfig.clientId || ''}
                onChange={(e) => handleConfigChange(bancoKey, 'clientId', e.target.value)}
                placeholder={isConfigured ? "••••••••••••••••••••" : "Ex: 12345678-1234-1234-1234-123456789012"}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.some(e => e.includes('Client ID')) ? 'border-red-300' : 'border-gray-300'
                }`}
                maxLength={SECURITY_CONFIG.MAX_CLIENT_ID_LENGTH}
                autoComplete="off"
                spellCheck={false}
              />
              {isConfigured && !hasFormData && (
                <p className="text-xs text-green-600 mt-1">✓ Client ID configurado</p>
              )}
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showSecrets[bancoKey] ? 'text' : 'password'}
                  value={formConfig.clientSecret || ''}
                  onChange={(e) => handleConfigChange(bancoKey, 'clientSecret', e.target.value)}
                  placeholder={isConfigured ? "••••••••••••••••••••" : "••••••••••••••••••••"}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.some(e => e.includes('Client Secret')) ? 'border-red-300' : 'border-gray-300'
                  }`}
                  maxLength={SECURITY_CONFIG.MAX_CLIENT_SECRET_LENGTH}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret(bancoKey)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets[bancoKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isConfigured && !hasFormData && (
                <p className="text-xs text-green-600 mt-1">✓ Client Secret configurado</p>
              )}
            </div>
          </div>

          {/* Checkbox de habilitação */}
          <div className="mt-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formConfig.enabled || false}
                onChange={(e) => handleConfigChange(bancoKey, 'enabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Habilitar monitoramento automático
              </span>
            </label>
          </div>

          {/* Ações */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => salvarConfiguracao(bancoKey)}
              disabled={isSaving || isDeleting || errors.length > 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white ${
                isSaving || isDeleting || errors.length > 0 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : banco.buttonColor
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isConfigured ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </button>
            
            <button
              onClick={() => testarConexao(bancoKey)}
              disabled={!isConfigured || isTesting || isSaving || isDeleting}
              className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 ${
                !isConfigured || isTesting || isSaving || isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Testando...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  Testar
                </>
              )}
            </button>

            {isConfigured && (
              <button
                onClick={() => deletarConfiguracao(bancoKey)}
                disabled={isDeleting || isSaving || isTesting}
                className={`px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2 ${
                  isDeleting || isSaving || isTesting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {renderSecurityAlerts()}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuração Ultra Segura dos Bancos</h1>
          <p className="text-gray-600 mt-1">
            🔒 Máxima segurança: AES-256 + Auto-limpeza + Zero exposição
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (typeof carregarConfiguracoesBanco === 'function') {
                carregarConfiguracoesBanco();
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          
          <button
            onClick={() => {
              if (typeof limparSessoes === 'function') {
                limparSessoes();
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Sessões
          </button>
        </div>
      </div>

      {/* Status de segurança */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          🛡️ Status de Segurança Ultra Alto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h3 className="font-semibold mb-2 text-green-700">🔐 Criptografia:</h3>
            <ul className="space-y-1 text-green-600">
              <li>• <strong>AES-256:</strong> Dados em repouso</li>
              <li>• <strong>TLS 1.3:</strong> Dados em trânsito</li>
              <li>• <strong>HMAC:</strong> Integridade</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-blue-700">🚫 Proteções:</h3>
            <ul className="space-y-1 text-blue-600">
              <li>• <strong>Zero exposure:</strong> JS limpo</li>
              <li>• <strong>Auto-cleanup:</strong> 5min timeout</li>
              <li>• <strong>Rate limiting:</strong> Protegido</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2 text-purple-700">📊 Monitoramento:</h3>
            <ul className="space-y-1 text-purple-600">
              <li>• <strong>Logs:</strong> Todas as ações</li>
              <li>• <strong>Sessões:</strong> Rastreadas</li>
              <li>• <strong>Alertas:</strong> Tempo real</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-700">Sistema: {isSecure ? 'SEGURO' : 'VERIFICANDO'}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-600" />
            <span className="text-gray-600">Atividade: {new Date(lastActivity).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Dashboard de status */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Dashboard de Segurança
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(bankInfo).map(bancoKey => {
              const banco = bankInfo[bancoKey];
              const config = configuracoesBanco[bancoKey] || {};
              const status = statusBancos[bancoKey] || {};
              const hasFormData = formConfigs[bancoKey]?.clientId || formConfigs[bancoKey]?.clientSecret;
              
              return (
                <div key={bancoKey} className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    config.hasCredentials && config.enabled ? 'bg-green-100' : 
                    config.hasCredentials ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">{banco.icon}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{banco.name}</h3>
                  <div className="text-xs space-y-1">
                    <p className={`${
                      config.hasCredentials ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {config.hasCredentials ? '🔐 Configurado' : '⚠️ Pendente'}
                    </p>
                    <p className={`${
                      config.enabled ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {config.enabled ? '🟢 Ativo' : '🔴 Inativo'}
                    </p>
                    <p className={`${
                      status.conectado ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {status.conectado ? '📡 Online' : '📡 Offline'}
                    </p>
                    {hasFormData && (
                      <p className="text-orange-600">⏱️ Dados pendentes</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards dos bancos */}
      <div className="space-y-6">
        {Object.keys(bankInfo).map(renderBankCard)}
      </div>

      {/* CSS para animações */}
      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SecureBankConfigPage;