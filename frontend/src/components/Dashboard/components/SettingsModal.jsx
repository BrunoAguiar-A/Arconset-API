import React, { useState, useEffect } from 'react';
import { 
  Settings, X, User, Shield, Bell, Palette, Lock, RefreshCw, 
  CheckCircle, Save, Eye, EyeOff, RotateCcw, AlertTriangle
} from 'lucide-react';

const SettingsModal = ({ show, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('conta');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // ===== FUNÇÃO PARA FAZER REQUISIÇÕES =====
  const makeRequest = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('Token não encontrado. Faça login novamente.');
    }

    console.log(`🔗 Requisição: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    console.log(`📊 Status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      let errorMsg = `Erro ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
      } catch (e) {
        errorMsg = await response.text() || errorMsg;
      }
      
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('✅ Resposta:', data);
    return data;
  };
  // ===== CARREGAR CONFIGURAÇÕES =====
  const loadSettings = async () => {
    if (!show) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      console.log('📥 Carregando configurações...');
      const result = await makeRequest('/api/user/settings');
      
      if (result && result.success && result.data) {
        const apiData = result.data;
        console.log('📦 Dados da API:', apiData);
        
        // Mapear dados da API para o formato do frontend
        const newSettings = {
          notifications: {
            email: apiData.email_notifications ?? true,
            push: apiData.push_notifications ?? true,
            boletos: apiData.custom_settings?.boletos ?? true,
            projetos: apiData.custom_settings?.projetos ?? false,
            contas: apiData.custom_settings?.contas ?? true,
            sistema: apiData.custom_settings?.sistema ?? true
          },
          appearance: {
            theme: apiData.theme || 'light',
            compact: apiData.custom_settings?.compact ?? false,
            animations: apiData.custom_settings?.animations ?? true
          },
          security: {
            sessionTimeout: Math.floor((apiData.session_timeout || 3600) / 60), // segundos para minutos
            lockOnIdle: apiData.custom_settings?.lockOnIdle ?? true,
            showLoginHistory: apiData.custom_settings?.showLoginHistory ?? false
          }
        };
        
        setSettings(newSettings);
        applyTheme(newSettings.appearance.theme);
        
        console.log('✅ Configurações carregadas e aplicadas');
      } else {
        console.log('⚠️ Usando configurações padrão');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  // ===== SALVAR CONFIGURAÇÕES =====
  const saveSettings = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const payload = {
        // Dados pessoais
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        
        // Configurações básicas
        theme: settings.appearance.theme,
        email_notifications: settings.notifications.email,
        push_notifications: settings.notifications.push,
        session_timeout: settings.security.sessionTimeout * 60, // minutos para segundos
        
        // Configurações avançadas
        custom_settings: {
          boletos: settings.notifications.boletos,
          projetos: settings.notifications.projetos,
          contas: settings.notifications.contas,
          sistema: settings.notifications.sistema,
          compact: settings.appearance.compact,
          animations: settings.appearance.animations,
          lockOnIdle: settings.security.lockOnIdle,
          showLoginHistory: settings.security.showLoginHistory
        }
      };

      // Adicionar senha apenas se fornecida
      if (formData.newPassword.trim()) {
        payload.password = formData.newPassword.trim();
      }

      console.log('💾 Salvando:', payload);
      
      const result = await makeRequest('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (result && result.success) {
        console.log('✅ Salvo com sucesso!');
        
        // Atualizar usuário no localStorage se retornado
        if (result.user) {
          localStorage.setItem('auth_user', JSON.stringify(result.user));
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }));
        }
        
        // Aplicar tema imediatamente
        applyTheme(settings.appearance.theme);
        
        // Salvar backup local
        localStorage.setItem('user_settings', JSON.stringify(settings));
        
        setFormData(prev => ({ ...prev, newPassword: '' }));
        setSuccessMessage('Configurações salvas com sucesso!');
        
        window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
        
      } else {
        throw new Error(result?.error || 'Erro desconhecido');
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      
      if (error.message.includes('email') && error.message.includes('uso')) {
        setErrors({ email: 'Este email já está em uso' });
      } else {
        setErrors({ general: error.message });
      }
    } finally {
      setSaving(false);
    }
  };
  // ===== VALIDAÇÃO =====
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== APLICAR TEMA =====
  const applyTheme = (theme) => {
    const html = document.documentElement;
    const body = document.body;
    
    html.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const selectedTheme = isDark ? 'dark' : 'light';
      html.classList.add(selectedTheme);
      body.classList.add(selectedTheme);
    } else {
      html.classList.add(theme);
      body.classList.add(theme);
    }
    
    console.log(`🎨 Tema aplicado: ${theme}`);
  };

  // ===== HANDLERS =====
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
      [category]: { ...prev[category], [setting]: value }
    }));
    
    // Aplicar tema imediatamente se mudou
    if (category === 'appearance' && setting === 'theme') {
      setTimeout(() => applyTheme(value), 100);
    }
  };

  const resetToDefaults = () => {
    if (!confirm('Restaurar configurações padrão?\n\nEsta ação não pode ser desfeita.')) {
      return;
    }
    
    const defaults = {
      notifications: {
        email: true, push: true, boletos: true, projetos: false, contas: true, sistema: true
      },
      appearance: {
        theme: 'light', compact: false, animations: true
      },
      security: {
        sessionTimeout: 60, lockOnIdle: true, showLoginHistory: false
      }
    };
    
    setSettings(defaults);
    setErrors({});
    setSuccessMessage('Configurações restauradas!');
    applyTheme('light');
    localStorage.removeItem('user_settings');
  };

  // ===== EFFECT =====
  useEffect(() => {
    if (show && user) {
      console.log('🔄 Modal aberto para:', user?.username);
      
      setFormData({
        fullName: user?.full_name || user?.username || '',
        email: user?.email || '',
        newPassword: ''
      });
      
      setErrors({});
      setSuccessMessage('');
      
      loadSettings();
    }
  }, [show, user]);

  if (!show) return null;
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
                  <p className="text-white/80 text-sm">Personalize sua experiência</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="px-6 py-4 bg-blue-50 border-b">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando configurações...</span>
              </div>
            </div>
          )}

          {/* Messages */}
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
              
              {/* User Card */}
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
                      <p className="text-gray-600 text-xs">{user?.email}</p>
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
              <div className="p-6">{/* Conteúdo das abas virá na próxima parte */}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo *</label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleFormChange('fullName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Digite seu nome completo"
                          />
                          {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange('email', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="seu@email.com"
                          />
                          {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formData.newPassword}
                              onChange={(e) => handleFormChange('newPassword', e.target.value)}
                              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="Deixe em branco para manter"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                            </button>
                          </div>
                          {errors.newPassword && <p className="text-red-600 text-xs mt-1">{errors.newPassword}</p>}
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
                          <label className="block text-sm font-medium text-gray-700 mb-2">Conta criada</label>
                          <input
                            type="text"
                            value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Não informado'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                            disabled
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
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
                      Notificações
                    </h4>
                    
                    <div className="space-y-4">
                      {[
                        { key: 'email', title: 'Email', desc: 'Alertas importantes por email' },
                        { key: 'push', title: 'Push', desc: 'Notificações no navegador' },
                        { key: 'boletos', title: 'Boletos', desc: 'Vencimentos de boletos' },
                        { key: 'projetos', title: 'Projetos', desc: 'Atualizações de projetos' },
                        { key: 'contas', title: 'Contas', desc: 'Lembretes de contas' },
                        { key: 'sistema', title: 'Sistema', desc: 'Avisos do sistema' }
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
                      Aparência
                    </h4>
                    
                    <div className="space-y-6">
                      
                      {/* Tema */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Tema</h5>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'light', name: 'Claro', preview: 'bg-white border-2' },
                            { id: 'dark', name: 'Escuro', preview: 'bg-gray-800 border-2' },
                            { id: 'auto', name: 'Auto', preview: 'bg-gradient-to-r from-white to-gray-800 border-2' }
                          ].map(theme => (
                            <button
                              key={theme.id}
                              onClick={() => handleSettingChange('appearance', 'theme', theme.id)}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                settings.appearance.theme === theme.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-full h-16 rounded ${theme.preview} mb-3`}></div>
                              <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Outras opções */}
                      <div className="space-y-4">
                        {[
                          { key: 'compact', title: 'Interface compacta', desc: 'Reduzir espaçamentos' },
                          { key: 'animations', title: 'Animações', desc: 'Efeitos visuais' }
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
                                onChange={(e) => handleSettingChange('appearance', item.key, e.target.checked)}
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
                      Segurança
                    </h4>
                    
                    <div className="space-y-4">
                      
                      {/* Timeout */}
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h5 className="font-medium text-gray-900 mb-2">Timeout da sessão</h5>
                        <p className="text-sm text-gray-600 mb-3">Logout automático por inatividade</p>
                        <select 
                          value={settings.security.sessionTimeout}
                          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value={15}>15 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={120}>2 horas</option>
                          <option value={240}>4 horas</option>
                        </select>
                      </div>

                      {/* Outras opções */}
                      {[
                        { key: 'lockOnIdle', title: 'Bloquear quando inativo', desc: 'Requerer senha após inatividade' },
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
                onClick={saveSettings}
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
                onClick={resetToDefaults}
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