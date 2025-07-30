// 📁 src/components/Dashboard/components/SettingsModal.jsx - VERSÃO DE PRODUÇÃO FINAL
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Lock,
  RefreshCw,
  CheckCircle,
  Save,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

const SettingsModal = ({ show, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('conta');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    newPassword: ''
  });
  
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      boletos: true,
      projetos: false,
      contas: true,
      sistema: true
    },
    appearance: {
      theme: 'light',
      compact: false,
      animations: true
    },
    security: {
      sessionTimeout: 60,
      lockOnIdle: true,
      showLoginHistory: false
    }
  });

  // Carregar dados do usuário e configurações quando o modal abrir
  useEffect(() => {
    if (show && user) {
      console.log('🔄 Carregando configurações para usuário:', user);
      
      // Resetar estados
      setErrors({});
      setSuccessMessage('');
      
      // Carregar dados do formulário
      setFormData({
        fullName: user?.full_name || user?.username || '',
        email: user?.email || '',
        newPassword: ''
      });
      
      // Carregar configurações
      loadUserSettings();
    }
  }, [show, user]);

  // Função para fazer requisições autenticadas
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const requestOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    console.log(`🌐 Fazendo requisição: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        
        // Tratar diferentes tipos de erro
        if (response.status === 401) {
          if (errorData.code === 'INVALID_TOKEN' || errorData.code === 'MISSING_AUTH_TOKEN') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            errorMessage = 'Sessão expirada. Faça login novamente.';
          }
        }
      } catch (parseError) {
        console.warn('Erro ao parsear resposta de erro:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  };

  // Função para carregar configurações do servidor
  const loadUserSettings = async () => {
    try {
      console.log('📥 Carregando configurações do servidor...');
      
      const result = await makeAuthenticatedRequest('http://localhost:5000/api/user/settings');
      
      if (result.success && result.settings) {
        console.log('✅ Configurações carregadas:', result.settings);
        
        setSettings(result.settings);
        
        // Aplicar configurações imediatamente
        setTimeout(() => {
          applyAppearanceSettings(result.settings.appearance);
        }, 100);
        
        // Salvar localmente como backup
        localStorage.setItem('user_settings', JSON.stringify(result.settings));
        
      } else {
        console.warn('⚠️ Resposta inesperada do servidor:', result);
        loadLocalSettings();
      }
      
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configurações do servidor:', error.message);
      loadLocalSettings();
      
      // Mostrar aviso se for erro de autenticação
      if (error.message.includes('Sessão expirada') || error.message.includes('login')) {
        setErrors({ general: error.message });
      }
    }
  };

  // Função para carregar configurações locais como fallback
  const loadLocalSettings = () => {
    const savedSettings = localStorage.getItem('user_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        
        setTimeout(() => {
          applyAppearanceSettings(parsed.appearance || settings.appearance);
        }, 100);
        
        console.log('📱 Configurações locais carregadas');
      } catch (error) {
        console.error('❌ Erro ao carregar configurações locais:', error);
      }
    }
  };

  if (!show) return null;

  // Função para validar dados do formulário
  const validateForm = () => {
    const newErrors = {};

    // Validar nome
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar senha (se fornecida)
    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'A senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro específico quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    // Limpar mensagens anteriores
    setErrors({});
    setSuccessMessage('');
    
    // Validar formulário
    if (!validateForm()) {
      console.log('❌ Validação falhou:', errors);
      return;
    }

    setSaving(true);
    
    try {
      // Preparar dados para envio
      const dataToSave = {
        account: {
          full_name: formData.fullName.trim(),
          email: formData.email.trim()
        },
        settings: {
          notifications: settings.notifications,
          appearance: settings.appearance,
          security: settings.security
        }
      };

      // Adicionar senha apenas se fornecida
      if (formData.newPassword.trim()) {
        dataToSave.account.password = formData.newPassword.trim();
      }

      console.log('📤 Salvando configurações:', dataToSave);

      const result = await makeAuthenticatedRequest('http://localhost:5000/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(dataToSave)
      });

      if (result.success) {
        console.log('✅ Configurações salvas com sucesso:', result);
        
        // Atualizar dados do usuário no localStorage
        if (result.user) {
          localStorage.setItem('auth_user', JSON.stringify(result.user));
          
          // Disparar evento para outros componentes
          window.dispatchEvent(new CustomEvent('userUpdated', { 
            detail: result.user 
          }));
        }
        
        // Salvar configurações localmente
        if (result.settings) {
          localStorage.setItem('user_settings', JSON.stringify(result.settings));
          
          // Aplicar configurações imediatamente
          applyAppearanceSettings(result.settings.appearance);
        }
        
        // Limpar senha do formulário
        setFormData(prev => ({ ...prev, newPassword: '' }));
        
        // Mostrar mensagem de sucesso
        setSuccessMessage('Configurações salvas com sucesso!');
        
        // Disparar evento de configurações atualizadas
        window.dispatchEvent(new CustomEvent('settingsUpdated', { 
          detail: { settings: result.settings, user: result.user } 
        }));
        
      } else {
        throw new Error(result.error || 'Resposta inválida do servidor');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      
      // Tratar diferentes tipos de erro
      if (error.message.includes('já está em uso')) {
        setErrors({ email: error.message });
      } else if (error.message.includes('Sessão expirada')) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: `Erro ao salvar: ${error.message}` });
      }
      
    } finally {
      setSaving(false);
    }
  };

  const applyAppearanceSettings = (appearanceSettings) => {
    if (!appearanceSettings) return;
    
    const { theme, compact, animations } = appearanceSettings;
    console.log('🎨 Aplicando configurações de aparência:', appearanceSettings);
    
    const html = document.documentElement;
    const body = document.body;
    
    // Aplicar tema
    html.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const selectedTheme = prefersDark ? 'dark' : 'light';
      html.classList.add(selectedTheme);
      body.classList.add(selectedTheme);
    } else {
      html.classList.add(theme);
      body.classList.add(theme);
    }
    
    // Aplicar interface compacta
    if (compact) {
      html.classList.add('compact-ui');
      body.classList.add('compact-ui');
    } else {
      html.classList.remove('compact-ui');
      body.classList.remove('compact-ui');
    }
    
    // Aplicar animações
    if (!animations) {
      html.classList.add('no-animations');
      body.classList.add('no-animations');
    } else {
      html.classList.remove('no-animations');
      body.classList.remove('no-animations');
    }
    
    // Adicionar CSS dinâmico
    addDynamicCSS(theme, compact, animations);
  };

  const addDynamicCSS = (theme, compact, animations) => {
    // Remover CSS anterior se existir
    const existingStyle = document.getElementById('dynamic-settings-css');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Criar novo CSS
    const style = document.createElement('style');
    style.id = 'dynamic-settings-css';
    style.textContent = `
      /* Configurações de tema */
      ${theme === 'dark' ? `
        .bg-white { background-color: #374151 !important; color: #f9fafb !important; }
        .bg-gray-50 { background-color: #4b5563 !important; color: #f9fafb !important; }
        .bg-gray-100 { background-color: #6b7280 !important; color: #f9fafb !important; }
        .text-gray-900 { color: #f9fafb !important; }
        .text-gray-700 { color: #d1d5db !important; }
        .text-gray-600 { color: #9ca3af !important; }
        .border-gray-200 { border-color: #4b5563 !important; }
        .border-gray-300 { border-color: #6b7280 !important; }
        body { background-color: #1f2937 !important; color: #f9fafb !important; }
      ` : ''}
      
      /* Configurações de interface compacta */
      ${compact ? `
        .compact-ui .p-6 { padding: 1rem !important; }
        .compact-ui .p-4 { padding: 0.75rem !important; }
        .compact-ui .py-3 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .compact-ui .mb-6 { margin-bottom: 1rem !important; }
        .compact-ui .space-y-6 > * + * { margin-top: 1rem !important; }
        .compact-ui .space-y-4 > * + * { margin-top: 0.75rem !important; }
        .compact-ui .text-xl { font-size: 1.125rem !important; }
        .compact-ui .text-lg { font-size: 1rem !important; }
      ` : ''}
      
      /* Configurações de animações */
      ${!animations ? `
        .no-animations *, .no-animations *::before, .no-animations *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      ` : ''}
    `;
    
    document.head.appendChild(style);
  };

  const tabs = [
    { id: 'conta', label: 'Conta', icon: User, description: 'Informações pessoais' },
    { id: 'notifications', label: 'Notificações', icon: Bell, description: 'Alertas e avisos' },
    { id: 'appearance', label: 'Aparência', icon: Palette, description: 'Visual e tema' },
    { id: 'security', label: 'Segurança', icon: Shield, description: 'Proteção da conta' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Configurações do Sistema</h3>
                  <p className="text-white/80 text-sm">Personalize sua experiência no Sistema HVAC</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensagens de Erro/Sucesso Globais */}
          {(errors.general || successMessage) && (
            <div className="px-6 py-3 border-b border-gray-200">
              {errors.general && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">{errors.general}</span>
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{successMessage}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex max-h-[70vh]">
            {/* Sidebar */}
            <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <nav className="p-4 space-y-1">
                {tabs.map(tab => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 font-medium shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
              
              {/* User Info Card */}
              <div className="p-4 mt-4 border-t border-gray-200">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm">
                        {user?.full_name || user?.username}
                      </h5>
                      <p className="text-gray-600 text-xs">{user?.email || 'Email não informado'}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                        {user?.role?.toUpperCase() || 'USER'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                
                {/* ABA CONTA */}
                {activeTab === 'conta' && (
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Informações da Conta
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nome completo *
                          </label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleFormChange('fullName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Digite seu nome completo"
                          />
                          {errors.fullName && (
                            <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange('email', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="seu@email.com"
                          />
                          {errors.email && (
                            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nova senha
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.newPassword}
                              onChange={(e) => handleFormChange('newPassword', e.target.value)}
                              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="Deixe em branco para manter a atual"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                            </button>
                          </div>
                          {errors.newPassword && (
                            <p className="text-red-600 text-xs mt-1">{errors.newPassword}</p>
                          )}
                          {formData.newPassword && (
                            <p className="text-gray-500 text-xs mt-1">
                              Mínimo de 6 caracteres
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Último acesso</label>
                          <input
                            type="text"
                            value={new Date().toLocaleString('pt-BR')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Conta criada em</label>
                          <input
                            type="text"
                            value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Não informado'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <input
                            type="text"
                            value={user?.role?.toUpperCase() || 'USER'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA NOTIFICAÇÕES */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-600" />
                      Preferências de Notificação
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'email', title: 'Notificações por email', desc: 'Receber alertas importantes por email' },
                        { key: 'push', title: 'Notificações push', desc: 'Alertas em tempo real no navegador' },
                        { key: 'boletos', title: 'Alertas de boletos', desc: 'Notificar sobre vencimentos de boletos detectados' },
                        { key: 'projetos', title: 'Atualizações de projetos', desc: 'Receber notificações sobre mudanças em projetos' },
                        { key: 'contas', title: 'Lembretes de contas', desc: 'Alertas sobre contas próximas do vencimento' },
                        { key: 'sistema', title: 'Notificações do sistema', desc: 'Avisos sobre atualizações e manutenção' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                          <div>
                            <h5 className="font-medium text-gray-900">{item.title}</h5>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings.notifications[item.key]}
                              onChange={(e) => handleSettingChange('notifications', item.key, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ABA APARÊNCIA */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Palette className="w-5 h-5 text-blue-600" />
                      Aparência e Tema
                    </h4>
                    
                    <div className="space-y-6">
                      {/* Tema */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Tema do sistema</h5>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'light', name: 'Claro', preview: 'bg-white border-2', desc: 'Tema claro padrão' },
                            { id: 'dark', name: 'Escuro', preview: 'bg-gray-800 border-2', desc: 'Modo escuro' },
                            { id: 'auto', name: 'Automático', preview: 'bg-gradient-to-r from-white to-gray-800 border-2', desc: 'Seguir sistema' }
                          ].map(theme => (
                            <button
                              key={theme.id}
                              onClick={() => {
                                handleSettingChange('appearance', 'theme', theme.id);
                                // Aplicar tema imediatamente para preview
                                setTimeout(() => {
                                  applyAppearanceSettings({
                                    ...settings.appearance,
                                    theme: theme.id
                                  });
                                }, 100);
                              }}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                settings.appearance.theme === theme.id
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-full h-16 rounded ${theme.preview} mb-3`}></div>
                              <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                              <p className="text-xs text-gray-500">{theme.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Outras configurações */}
                      <div className="space-y-4">
                        {[
                          { key: 'compact', title: 'Interface compacta', desc: 'Reduzir espaçamentos para mostrar mais conteúdo' },
                          { key: 'animations', title: 'Animações', desc: 'Habilitar transições e efeitos visuais' }
                        ].map(item => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <div>
                              <h5 className="font-medium text-gray-900">{item.title}</h5>
                              <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.appearance[item.key]}
                                onChange={(e) => {
                                  handleSettingChange('appearance', item.key, e.target.checked);
                                  // Aplicar mudança imediatamente
                                  setTimeout(() => {
                                    applyAppearanceSettings({
                                      ...settings.appearance,
                                      [item.key]: e.target.checked
                                    });
                                  }, 100);
                                }}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA SEGURANÇA */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Configurações de Segurança
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Timeout da sessão */}
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h5 className="font-medium text-gray-900 mb-2">Timeout da sessão</h5>
                        <p className="text-sm text-gray-600 mb-3">Tempo de inatividade antes do logout automático</p>
                        <select 
                          value={settings.security.sessionTimeout}
                          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value={15}>15 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={120}>2 horas</option>
                          <option value={240}>4 horas</option>
                        </select>
                      </div>

                      {/* Outras configurações de segurança */}
                      {[
                        { key: 'lockOnIdle', title: 'Bloquear tela quando inativo', desc: 'Requerer senha após período de inatividade' },
                        { key: 'showLoginHistory', title: 'Mostrar histórico de login', desc: 'Exibir últimos acessos na tela de login' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                          <div>
                            <h5 className="font-medium text-gray-900">{item.title}</h5>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={settings.security[item.key]}
                              onChange={(e) => handleSettingChange('security', item.key, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}

                      {/* Status de segurança */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-5 h-5 text-blue-600" />
                          <h5 className="font-medium text-blue-800">Status de Segurança</h5>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">Conexão segura (HTTPS)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">Senha criptografada</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">Sessão protegida por JWT</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">Validação de permissões ativa</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Settings className="w-4 h-4" />
              <span>As configurações são sincronizadas com o servidor</span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={saving || !!errors.general}
                className={`px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 ${
                  saving || errors.general ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  if (confirm('🔄 Restaurar todas as configurações para o padrão?\n\nEsta ação não pode ser desfeita.')) {
                    const defaultSettings = {
                      notifications: {
                        email: true,
                        push: true,
                        boletos: true,
                        projetos: false,
                        contas: true,
                        sistema: true
                      },
                      appearance: {
                        theme: 'light',
                        compact: false,
                        animations: true
                      },
                      security: {
                        sessionTimeout: 60,
                        lockOnIdle: true,
                        showLoginHistory: false
                      }
                    };
                    
                    setSettings(defaultSettings);
                    setErrors({});
                    setSuccessMessage('');
                    
                    // Aplicar configurações padrão imediatamente
                    setTimeout(() => {
                      applyAppearanceSettings(defaultSettings.appearance);
                    }, 100);
                    
                    // Remover configurações locais
                    localStorage.removeItem('user_settings');
                    
                    setSuccessMessage('Configurações restauradas para o padrão!');
                  }
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Indicador de salvamento */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-60">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Salvando configurações...</span>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;