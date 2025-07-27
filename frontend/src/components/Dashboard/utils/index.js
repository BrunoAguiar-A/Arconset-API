// 📁 src/components/Dashboard/utils/index.js - CONSOLIDADO

// 🎯 FORMATADORES
export const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  } catch (error) {
    console.error('Erro ao formatar moeda:', error);
    return 'R$ 0,00';
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return 'Data inválida';
  }
};

export const formatCPF = (cpf) => {
  if (!cpf) return '';
  try {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } catch (error) {
    return cpf;
  }
};

export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  try {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  } catch (error) {
    return cnpj;
  }
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  try {
    const numbers = phone.replace(/\D/g, '');
    
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  } catch (error) {
    return phone;
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  try {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  } catch (error) {
    return '0 B';
  }
};

export const formatPercentage = (value) => {
  try {
    return `${Number(value) || 0}%`;
  } catch (error) {
    return '0%';
  }
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  try {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  } catch (error) {
    return String(text);
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Agora há pouco';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
    
    return formatDate(dateString);
  } catch (error) {
    return formatDate(dateString);
  }
};

// 🎨 CORES E ESTILOS
export const PROJECT_STATUS_COLORS = {
  'Em Andamento': 'text-blue-600 bg-blue-100',
  'Finalizado': 'text-green-600 bg-green-100',
  'Finalizando': 'text-green-600 bg-green-100',
  'Pausado': 'text-yellow-600 bg-yellow-100',
  'Orçamento': 'text-purple-600 bg-purple-100'
};

export const BILL_STATUS_COLORS = {
  'Paga': 'text-green-600 bg-green-100',
  'Pendente': 'text-yellow-600 bg-yellow-100',
  'Atrasada': 'text-red-600 bg-red-100'
};

export const PRIORITY_COLORS = {
  'Crítica': 'text-red-600 bg-red-100',
  'Alta': 'text-orange-600 bg-orange-100',
  'Média': 'text-yellow-600 bg-yellow-100',
  'Baixa': 'text-green-600 bg-green-100'
};

export const NOTIFICATION_COLORS = {
  'error': 'bg-red-50 border-red-200',
  'success': 'bg-green-50 border-green-200',
  'warning': 'bg-yellow-50 border-yellow-200',
  'info': 'bg-blue-50 border-blue-200'
};

// 🔧 CONSTANTES ESSENCIAIS
export const API_BASE_URL =  'http://localhost:5000';

export const SERVICE_TYPES = [
  'Instalação',
  'Manutenção', 
  'Reparo',
  'Consultoria'
];

export const BILL_TYPES = [
  'Fornecedor',
  'Serviço',
  'Material',
  'Aluguel',
  'Boleto',
  'Outros'
];

export const DOCUMENT_TYPES = [
  'Projeto',
  'Contrato',
  'Foto',
  'CAD',
  'Orçamento',
  'Documento'
];

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// 🛠️ UTILITÁRIOS
export const validateEmail = (email) => {
  try {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  } catch (error) {
    return false;
  }
};

export const validateCPF = (cpf) => {
  try {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  } catch (error) {
    return false;
  }
};

export const validateCNPJ = (cnpj) => {
  try {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
  } catch (error) {
    return false;
  }
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 📊 HELPERS DE CÁLCULO
export const calculateDaysUntilDue = (dueDate) => {
  try {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
};

export const isOverdue = (dueDate) => {
  try {
    return calculateDaysUntilDue(dueDate) < 0;
  } catch (error) {
    return false;
  }
};

export const isDueSoon = (dueDate, daysThreshold = 7) => {
  try {
    const days = calculateDaysUntilDue(dueDate);
    return days >= 0 && days <= daysThreshold;
  } catch (error) {
    return false;
  }
};

// 🔍 HELPERS DE BUSCA E FILTRO
export const filterBySearchTerm = (items, searchTerm, fields = ['nome', 'descricao']) => {
  if (!searchTerm || !Array.isArray(items)) return items;
  
  try {
    const term = searchTerm.toLowerCase();
    return items.filter(item => {
      return fields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      });
    });
  } catch (error) {
    return items;
  }
};

export const sortByField = (items, field, direction = 'asc') => {
  if (!Array.isArray(items)) return [];
  
  try {
    return [...items].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  } catch (error) {
    return items;
  }
};

// 🎯 HELPERS DE STATUS
export const getStatusColor = (status, type = 'project') => {
  try {
    switch (type) {
      case 'project':
        return PROJECT_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
      case 'bill':
        return BILL_STATUS_COLORS[status] || 'text-gray-600 bg-gray-100';
      case 'priority':
        return PRIORITY_COLORS[status] || 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  } catch (error) {
    return 'text-gray-600 bg-gray-100';
  }
};

export const getNotificationColor = (type) => {
  try {
    return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.info;
  } catch (error) {
    return NOTIFICATION_COLORS.info;
  }
};

// 💰 HELPERS FINANCEIROS
export const calculateTotal = (items, field = 'valor') => {
  if (!Array.isArray(items)) return 0;
  
  try {
    return items.reduce((sum, item) => {
      const value = Number(item[field]) || 0;
      return sum + value;
    }, 0);
  } catch (error) {
    return 0;
  }
};

export const calculatePercentage = (value, total) => {
  try {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  } catch (error) {
    return 0;
  }
};

// 📁 HELPERS DE ARQUIVO
export const getFileIcon = (fileName) => {
  if (!fileName) return '📄';
  
  try {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const iconMap = {
      // Imagens
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'svg': '🖼️',
      // Documentos
      'pdf': '📕', 'doc': '📘', 'docx': '📘', 'txt': '📄',
      // Planilhas
      'xls': '📗', 'xlsx': '📗', 'csv': '📊',
      // Apresentações
      'ppt': '📙', 'pptx': '📙',
      // CAD
      'dwg': '📐', 'dxf': '📐', 'skp': '🏗️',
      // Comprimidos
      'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
      // Código
      'js': '💻', 'jsx': '⚛️', 'ts': '💻', 'tsx': '⚛️', 'html': '🌐', 'css': '🎨'
    };
    
    return iconMap[ext] || '📄';
  } catch (error) {
    return '📄';
  }
};

export const isValidFileType = (fileName, allowedTypes = []) => {
  if (!fileName || !Array.isArray(allowedTypes)) return false;
  
  try {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(ext);
  } catch (error) {
    return false;
  }
};

export const isValidFileSize = (fileSize, maxSize = 50 * 1024 * 1024) => {
  try {
    return Number(fileSize) <= maxSize;
  } catch (error) {
    return false;
  }
};

// 🔧 HELPERS DE URL E NAVEGAÇÃO
export const createDownloadLink = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Erro ao criar link de download:', error);
    return false;
  }
};

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } catch (err) {
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Erro ao copiar para clipboard:', error);
    return false;
  }
};

// 🎯 HELPERS DE VALIDAÇÃO DE DADOS
export const sanitizeInput = (input, maxLength = 1000) => {
  if (!input) return '';
  
  try {
    return String(input)
      .replace(/[<>"\'\\\x00-\x1f\x7f-\x9f]/g, '') // Remove caracteres perigosos
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/data:/gi, '') // Remove data:
      .replace(/vbscript:/gi, '') // Remove vbscript:
      .trim()
      .substring(0, maxLength);
  } catch (error) {
    return '';
  }
};

export const isValidDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  } catch (error) {
    return false;
  }
};

export const isValidNumber = (value, min = null, max = null) => {
  try {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  } catch (error) {
    return false;
  }
};

// 🌟 HELPERS DE UI
export const getInitials = (name) => {
  if (!name) return '??';
  
  try {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  } catch (error) {
    return '??';
  }
};

export const generateRandomColor = (name = '') => {
  try {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    const index = name.length % colors.length;
    return colors[index];
  } catch (error) {
    return 'bg-gray-500';
  }
};

// 🔐 HELPERS DE SEGURANÇA
export const hashString = async (str) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // Fallback simples para ambientes sem crypto.subtle
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

export const generateId = (prefix = 'id') => {
  try {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } catch (error) {
    return `${prefix}_${Date.now()}`;
  }
};

// 📱 HELPERS DE RESPONSIVE
export const isMobile = () => {
  try {
    return window.innerWidth < 768;
  } catch (error) {
    return false;
  }
};

export const isTablet = () => {
  try {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  } catch (error) {
    return false;
  }
};

export const isDesktop = () => {
  try {
    return window.innerWidth >= 1024;
  } catch (error) {
    return true;
  }
};

// 🔄 HELPERS DE CACHE E STORAGE
export const setLocalStorage = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.warn('Erro ao salvar no localStorage:', error);
    return false;
  }
};

export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.warn('Erro ao ler do localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Erro ao remover do localStorage:', error);
    return false;
  }
};

// 🎯 CONSTANTES DE CONFIGURAÇÃO
export const APP_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: [
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 
    'doc', 'docx', 'xls', 'xlsx', 'dwg', 'dxf'
  ],
  DEFAULT_ITEMS_PER_PAGE: 10,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
  AUTO_SAVE_DELAY: 5000
};

// Export default com todos os helpers principais
export default {
  formatCurrency,
  formatDate,
  formatDateTime,
  PROJECT_STATUS_COLORS,
  BILL_STATUS_COLORS,
  PRIORITY_COLORS,
  validateEmail,
  validateCPF,
  debounce,
  throttle,
  calculateDaysUntilDue,
  isOverdue,
  isDueSoon,
  getStatusColor,
  calculateTotal,
  getFileIcon,
  copyToClipboard,
  sanitizeInput,
  generateId,
  isMobile,
  isTablet,
  isDesktop,
  APP_CONFIG
};