// 📁 frontend/src/components/Login/LoginPage.jsx - COMPONENTE COMPLETO CORRIGIDO
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Shield, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Server,
  Key
} from 'lucide-react';

const LoginPage = () => {
  const { login, register, loading, error, clearError } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '', // Mudança: usar 'username' em vez de 'login'
    password: '',
    email: '',
    full_name: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 🔧 Limpar erros quando mudar de modo
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setFormErrors({});
    setSuccessMessage('');
    clearError();
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      confirmPassword: ''
    });
  };

  // 🔧 Manipular mudanças no formulário
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro específico do campo
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // Limpar erro geral
    if (error) {
      clearError();
    }
    
    // Limpar mensagem de sucesso
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  // 🔧 Validar formulário
  const validateForm = () => {
    const errors = {};

    if (mode === 'login') {
      if (!formData.username.trim()) {
        errors.username = 'Username ou email é obrigatório';
      }
      
      if (!formData.password) {
        errors.password = 'Senha é obrigatória';
      }
    } else {
      // Validações para registro
      if (!formData.username.trim()) {
        errors.username = 'Username é obrigatório';
      } else if (formData.username.length < 3) {
        errors.username = 'Username deve ter pelo menos 3 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'Username deve conter apenas letras, números e underscore';
      }
      
      if (!formData.email.trim()) {
        errors.email = 'Email é obrigatório';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Email inválido';
      }
      
      if (!formData.full_name.trim()) {
        errors.full_name = 'Nome completo é obrigatório';
      } else if (formData.full_name.length < 2) {
        errors.full_name = 'Nome deve ter pelo menos 2 caracteres';
      }
      
      if (!formData.password) {
        errors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) { // Ajustado para 6 caracteres como no backend
        errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      
      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Senhas não coincidem';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 🔧 Submeter formulário - CORRIGIDO
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('❌ Formulário inválido:', formErrors);
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    
    try {
      let result;
      
      if (mode === 'login') {
        console.log('🔑 Tentando login...');
        // Passar username e password separadamente
        result = await login(formData.username, formData.password);
      } else {
        console.log('📝 Tentando registro...');
        result = await register({
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          password: formData.password
        });
      }
      
      console.log('📋 Resultado:', result);
      
      if (result.success) {
        console.log(`✅ ${mode === 'login' ? 'Login' : 'Registro'} bem-sucedido`);
        
        if (mode === 'register') {
          setSuccessMessage('Conta criada com sucesso! Agora você pode fazer login.');
          // Limpar formulário e mudar para login
          setFormData({
            username: '',
            password: '',
            email: '',
            full_name: '',
            confirmPassword: ''
          });
          setTimeout(() => {
            setMode('login');
            setSuccessMessage('');
          }, 3000);
        }
        // Para login, o redirecionamento será feito pelo componente pai
      } else {
        console.error(`❌ Erro no ${mode}:`, result.error);
      }
      
    } catch (error) {
      console.error(`❌ Erro no ${mode}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema HVAC</h1>
          <p className="text-gray-600 mt-2">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-2" />
            Login
          </button>
          <button
            onClick={() => handleModeChange('register')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Registro
          </button>
        </div>

        {/* Mensagem de sucesso */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Erro geral */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6">
          <div className="space-y-4">
            {mode === 'login' ? (
              <>
                {/* Login - Username/Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Username ou Email
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Digite seu username ou email"
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                  {formErrors.username && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.username}</p>
                  )}
                </div>

                {/* Login - Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Digite sua senha"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Registro - Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Escolha um username"
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                  {formErrors.username && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.username}</p>
                  )}
                </div>

                {/* Registro - Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Key className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Digite seu email"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>

                {/* Registro - Nome Completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.full_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Digite seu nome completo"
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                  {formErrors.full_name && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.full_name}</p>
                  )}
                </div>

                {/* Registro - Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Crie uma senha"
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    A senha deve ter pelo menos 6 caracteres
                  </div>
                </div>

                {/* Registro - Confirmar Senha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirme sua senha"
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botão de Submit */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
          >
            {isSubmitting || loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
              </>
            ) : (
              <>
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Criar Conta
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Informações adicionais */}
        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
              <Server className="w-4 h-4" />
              <span className="text-sm font-medium">Sistema Seguro</span>
            </div>
            <div className="text-blue-700 text-xs space-y-1">
              <p>🔐 Autenticação JWT</p>
              <p>🛡️ Criptografia AES-256</p>
              <p>🔒 Dados protegidos</p>
            </div>
          </div>
        </div>

        {/* Credenciais padrão (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-800 text-xs">
                <p className="font-medium mb-1">🧪 Desenvolvimento</p>
                <p>Admin padrão: <code>admin / Admin123!</code></p>
              </div>
            </div>
          </div>
        )}

        {/* Footer com informações de suporte */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2025 Sistema HVAC - Arconset</p>
          <p className="mt-1">
            Problemas? Entre em contato: 
            <a href="mailto:suporte@arconset.com.br" className="text-blue-600 hover:text-blue-800 ml-1">
              suporte@arconset.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;