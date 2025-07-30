// 📁 src/components/Dashboard/components/NotificationsDropdown.jsx - DROPDOWN COMPACTO
import React, { useRef, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings,
  ExternalLink
} from 'lucide-react';

const NotificationsDropdown = ({ 
  show, 
  onClose, 
  notifications = [], 
  onMarkAsRead, 
  onMarkAllAsRead,
  formatDate
}) => {
  const dropdownRef = useRef(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [show, onClose]);

  if (!show) return null;

  const unreadCount = notifications.filter(n => !n.lida).length;

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'error': 
      case 'urgente': 
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success': 
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': 
      case 'importante': 
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: 
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (tipo) => {
    switch (tipo) {
      case 'error': 
      case 'urgente': 
        return 'border-l-red-500 bg-red-50';
      case 'success': 
        return 'border-l-green-500 bg-green-50';
      case 'warning': 
      case 'importante': 
        return 'border-l-yellow-500 bg-yellow-50';
      default: 
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
      style={{ transform: 'translateX(-1rem)' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">Notificações</h3>
              <p className="text-white/80 text-xs">
                {unreadCount > 0 ? `${unreadCount} não lidas` : 'Tudo em dia! 🎉'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 8).map(notification => (
              <div
                key={notification.id}
                className={`p-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getNotificationColor(notification.tipo)} ${
                  !notification.lida ? 'bg-blue-50/30' : ''
                }`}
                onClick={() => !notification.lida && onMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notification.tipo)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium text-gray-900 leading-tight ${
                          !notification.lida ? 'font-semibold' : ''
                        }`}>
                          {notification.titulo || notification.message}
                        </p>
                        
                        {notification.descricao && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.descricao}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDate ? formatDate(notification.created_at) : 
                             new Date(notification.created_at).toLocaleDateString('pt-BR', {
                               day: '2-digit',
                               month: '2-digit',
                               hour: '2-digit',
                               minute: '2-digit'
                             })}
                          </div>
                          
                          {notification.tipo && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              notification.tipo === 'urgente' ? 'bg-red-100 text-red-700' :
                              notification.tipo === 'importante' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {notification.tipo}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!notification.lida && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length > 8 && (
              <div className="p-3 bg-gray-50 text-center">
                <p className="text-xs text-gray-500">
                  Mostrando 8 de {notifications.length} notificações
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-300" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Nenhuma notificação</h4>
            <p className="text-xs text-gray-500">Você está em dia com tudo! 🎉</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {unreadCount > 0 ? `${unreadCount} não lidas` : 'Tudo lido'}
            </span>
            
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAllAsRead();
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Aqui você pode abrir uma página completa de notificações
                  alert('Abrir página completa de notificações (implementar se necessário)');
                }}
                className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                Ver todas
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;