# 📁 routes/user_settings.py - VERSÃO CORRIGIDA PARA SUA API
from flask import Blueprint, request, jsonify, g
from database import SessionLocal
from models.user import User
from middleware.auth_middleware import auth_required, get_current_user_id
from datetime import datetime, UTC
import json
import structlog

# Logger
logger = structlog.get_logger(__name__)

# Blueprint
user_settings_bp = Blueprint('user_settings', __name__, url_prefix='/api/user')

# ===== ENDPOINTS CORRIGIDOS =====

@user_settings_bp.route('/settings', methods=['GET'])
@auth_required()
def get_user_settings():
    """Obter configurações do usuário - VERSÃO CORRIGIDA"""
    try:
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Usuário não autenticado'
            }), 401
        
        db = SessionLocal()
        try:
            # Buscar usuário
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            # ✅ MAPEAR DADOS CONFORME SEU FRONTEND ESPERA
            settings_data = {
                # Configurações de aparência
                'theme': getattr(user, 'theme', 'light'),
                'email_notifications': getattr(user, 'email_notifications', True),
                'push_notifications': getattr(user, 'push_notifications', True),
                'session_timeout': getattr(user, 'session_timeout', 3600),  # segundos
                
                # Configurações personalizadas
                'custom_settings': {}
            }
            
            # Tentar carregar custom_settings se existir
            if hasattr(user, 'custom_settings') and user.custom_settings:
                try:
                    settings_data['custom_settings'] = json.loads(user.custom_settings)
                except:
                    settings_data['custom_settings'] = {}
            
            # Se não tem custom_settings, usar padrões
            if not settings_data['custom_settings']:
                settings_data['custom_settings'] = {
                    'boletos': True,
                    'projetos': False,
                    'contas': True,
                    'sistema': True,
                    'compact': False,
                    'animations': True,
                    'lockOnIdle': True,
                    'showLoginHistory': False
                }
            
            logger.info("user_settings_loaded", user_id=user_id)
            
            return jsonify({
                'success': True,
                'data': settings_data,
                'message': 'Configurações carregadas com sucesso'
            })
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("get_user_settings_error", error=str(e), user_id=user_id)
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@user_settings_bp.route('/settings', methods=['PUT'])
@auth_required()
def update_user_settings():
    """Atualizar configurações e dados do usuário - VERSÃO CORRIGIDA"""
    try:
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'Usuário não autenticado'
            }), 401
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            updated_fields = []
            
            # ✅ DADOS PESSOAIS
            if 'full_name' in data and data['full_name'].strip():
                if data['full_name'].strip() != user.full_name:
                    user.full_name = data['full_name'].strip()
                    updated_fields.append('full_name')
            
            if 'email' in data and data['email'].strip():
                new_email = data['email'].strip().lower()
                if new_email != user.email:
                    # Verificar se email já existe
                    existing = db.query(User).filter(
                        User.email == new_email,
                        User.id != user_id
                    ).first()
                    
                    if existing:
                        return jsonify({
                            'success': False,
                            'error': 'Este email já está em uso por outro usuário'
                        }), 409
                    
                    user.email = new_email
                    updated_fields.append('email')
            
            # ✅ SENHA (se fornecida)
            if 'password' in data and data['password'].strip():
                if len(data['password']) < 6:
                    return jsonify({
                        'success': False,
                        'error': 'A senha deve ter pelo menos 6 caracteres'
                    }), 400
                
                user.set_password(data['password'])
                updated_fields.append('password')
            
            # ✅ CONFIGURAÇÕES DE APARÊNCIA
            if 'theme' in data:
                if hasattr(user, 'theme'):
                    user.theme = data['theme']
                    updated_fields.append('theme')
            
            # ✅ CONFIGURAÇÕES DE NOTIFICAÇÃO
            if 'email_notifications' in data:
                if hasattr(user, 'email_notifications'):
                    user.email_notifications = bool(data['email_notifications'])
                    updated_fields.append('email_notifications')
            
            if 'push_notifications' in data:
                if hasattr(user, 'push_notifications'):
                    user.push_notifications = bool(data['push_notifications'])
                    updated_fields.append('push_notifications')
            
            # ✅ CONFIGURAÇÕES DE SEGURANÇA
            if 'session_timeout' in data:
                if hasattr(user, 'session_timeout'):
                    # Converter minutos para segundos
                    timeout_seconds = int(data['session_timeout']) * 60 if isinstance(data['session_timeout'], int) else int(data['session_timeout'])
                    user.session_timeout = timeout_seconds
                    updated_fields.append('session_timeout')
            
            # ✅ CONFIGURAÇÕES PERSONALIZADAS
            if 'custom_settings' in data:
                custom_json = json.dumps(data['custom_settings'])
                
                if hasattr(user, 'custom_settings'):
                    user.custom_settings = custom_json
                    updated_fields.append('custom_settings')
            
            # Salvar mudanças
            if updated_fields:
                db.commit()
                db.refresh(user)
                
                logger.info("user_settings_updated", 
                           user_id=user_id, 
                           updated_fields=updated_fields)
                
                # ✅ RETORNAR DADOS ATUALIZADOS
                response_user = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'is_active': user.is_active,
                    'is_verified': getattr(user, 'is_verified', True),
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None
                }
                
                return jsonify({
                    'success': True,
                    'message': 'Configurações salvas com sucesso',
                    'user': response_user,
                    'updated_fields': updated_fields,
                    'timestamp': datetime.now(UTC).isoformat()
                })
            else:
                return jsonify({
                    'success': True,
                    'message': 'Nenhuma alteração detectada',
                    'timestamp': datetime.now(UTC).isoformat()
                })
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("update_user_settings_error", error=str(e), user_id=user_id)
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@user_settings_bp.route('/profile', methods=['GET'])
@auth_required()
def get_user_profile():
    """Obter perfil do usuário"""
    try:
        user_id = get_current_user_id()
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_verified': getattr(user, 'is_verified', True),
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None,
                'department': getattr(user, 'department', None),
                'position': getattr(user, 'position', None)
            }
            
            return jsonify({
                'success': True,
                'user': user_data,
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("get_user_profile_error", error=str(e))
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500