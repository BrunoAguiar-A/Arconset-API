// 📁 src/components/Dashboard/components/NotificationsSection.jsx
import React from 'react';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { formatDate } from '../utils';

const NotificationsSection = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead 
}) => {
  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': 
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (tipo) => {
    switch (tipo) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const renderNotificationCard = (notification) => (
    <div 
      key={notification.id} 
      className={`flex items-start gap-3 p-4 rounded-lg border ${getNotificationBg(notification.tipo)} ${!notification.lida ? 'ring-2 ring-blue-200' : ''}`}
    >
      {getNotificationIcon(notification.tipo)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {notification.titulo}
          </p>
          {!notification.lida && (
            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-2">{notification.mensagem}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(notification.created_at)}
          </p>
          {!notification.lida && (
            <button 
              onClick={() => onMarkAsRead(notification.id)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar como lida
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Notificações Recentes</h2>
        <div className="flex items-center gap-2">
          {notifications.filter(n => !n.lida).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {notifications.filter(n => !n.lida).length} novas
            </span>
          )}
          <button 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => {
              alert('Funcionalidade de visualizar todas as notificações pode ser implementada');
            }}
          >
            Ver todas →
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {notifications.slice(0, 8).map(renderNotificationCard)}
          
          {notifications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nenhuma notificação</p>
              <p className="text-sm">Você está em dia com tudo!</p>
            </div>
          )}
        </div>

        {/* Botão para marcar todas como lidas */}
        {notifications.filter(n => !n.lida).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button 
              onClick={onMarkAllAsRead}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2 mx-auto"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsSection;