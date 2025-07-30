# 📁 routes/user_settings.py - BLUEPRINT FINAL PARA PRODUÇÃO
from flask import Blueprint, request, jsonify
from database import SessionLocal, Base
from models.user import User
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from datetime import datetime, UTC
import json
import structlog
import bcrypt

# Logger estruturado para produção
logger = structlog.get_logger(__name__)

# Blueprint para configurações do usuário
user_settings_bp = Blueprint('user_settings', __name__)

# ===== MODELO USER SETTINGS INTEGRADO =====
class UserSettings(Base):
    __tablename__ = 'user_settings'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    
    # Configurações em JSON
    notifications = Column(Text, nullable=True)
    appearance = Column(Text, nullable=True) 
    security = Column(Text, nullable=True)
    privacy = Column(Text, nullable=True)
    performance = Column(Text, nullable=True)
    integrations = Column(Text, nullable=True)
    advanced = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        """Converter para dicionário"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'notifications': json.loads(self.notifications) if self.notifications else {},
            'appearance': json.loads(self.appearance) if self.appearance else {},
            'security': json.loads(self.security) if self.security else {},
            'privacy': json.loads(self.privacy) if self.privacy else {},
            'performance': json.loads(self.performance) if self.performance else {},
            'integrations': json.loads(self.integrations) if self.integrations else {},
            'advanced': json.loads(self.advanced) if self.advanced else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# ===== MIDDLEWARE DE AUTENTICAÇÃO SIMPLIFICADO =====
def get_current_user_from_request():
    """Extrair usuário atual da requisição - VERSÃO PRODUÇÃO"""
    try:
        # Tentar pegar do header Authorization
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None, 'Token não fornecido'
        
        token = auth_header.split(' ')[1]
        if not token:
            return None, 'Token inválido'
        
        # Verificar token JWT (usando sua implementação de segurança)
        try:
            from middleware.security import security_manager
            if security_manager:
                payload = security_manager.verify_jwt_token(token)
                if payload and 'user_id' in payload:
                    db = SessionLocal()
                    try:
                        user = db.query(User).filter(User.id == payload['user_id']).first()
                        if user and user.is_active:
                            return user, None
                        else:
                            return None, 'Usuário não encontrado ou inativo'
                    finally:
                        db.close()
                else:
                    return None, 'Token inválido'
            else:
                return None, 'Sistema de segurança não disponível'
        except Exception as e:
            logger.error("jwt_verification_error", error=str(e))
            return None, f'Erro na verificação do token: {str(e)}'
            
    except Exception as e:
        logger.error("auth_extraction_error", error=str(e))
        return None, f'Erro na autenticação: {str(e)}'

def require_auth(f):
    """Decorator para exigir autenticação"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user, error = get_current_user_from_request()
        if not user:
            return jsonify({
                'success': False,
                'error': error or 'Acesso negado'
            }), 401
        
        # Adicionar usuário ao contexto da requisição
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

# ===== CONFIGURAÇÕES PADRÃO =====
def get_default_settings():
    """Configurações padrão para novos usuários"""
    return {
        'notifications': {
            'email': True,
            'push': True,
            'boletos': True,
            'projetos': False,
            'contas': True,
            'sistema': True,
            'desktop': True,
            'mobile': False,
            'weekends': False,
            'nightTime': False,
            'critical': True,
            'marketing': False,
            'newsletter': True,
            'reports': True,
            'maintenance': True,
            'backup': False
        },
        'appearance': {
            'theme': 'light',
            'compact': False,
            'animations': True,
            'fontSize': 'medium',
            'language': 'pt-BR',
            'dateFormat': 'DD/MM/YYYY',
            'timeFormat': '24h',
            'currency': 'BRL',
            'sidebar': 'expanded',
            'density': 'comfortable',
            'roundedCorners': True,
            'shadows': True,
            'colorScheme': 'blue',
            'backgroundImage': False
        },
        'security': {
            'sessionTimeout': 60,
            'lockOnIdle': True,
            'showLoginHistory': False,
            'twoFactorAuth': False,
            'biometric': False,
            'deviceTrust': True,
            'loginNotifications': True,
            'passwordExpiry': 90,
            'minPasswordLength': 8,
            'requireSpecialChars': True,
            'allowRemoteAccess': False,
            'ipWhitelist': False,
            'autoLogout': True,
            'encryptData': True
        },
        'privacy': {
            'shareAnalytics': False,
            'allowCookies': True,
            'trackUsage': False,
            'shareWithPartners': False,
            'personalizedAds': False,
            'dataRetention': '1year',
            'exportData': True,
            'deleteAccount': False
        },
        'performance': {
            'autoSave': True,
            'cacheDuration': 30,
            'preloadData': True,
            'compressionLevel': 'medium',
            'maxFileSize': 50,
            'backgroundSync': True,
            'offlineMode': False,
            'lowDataMode': False,
            'graphicsQuality': 'high'
        },
        'integrations': {
            'googleCalendar': False,
            'microsoftOffice': False,
            'dropbox': False,
            'slack': False,
            'whatsapp': False,
            'telegram': False,
            'email': True,
            'webhooks': False,
            'apiAccess': False
        },
        'advanced': {
            'debugMode': False,
            'logLevel': 'info',
            'cachePolicy': 'normal',
            'apiTimeout': 30,
            'retryAttempts': 3,
            'compression': True,
            'encryption': 'AES256',
            'backupFrequency': 'daily',
            'maintenanceWindow': 'night'
        }
    }

# ===== ENDPOINTS DE PRODUÇÃO =====

@user_settings_bp.route('/api/user/settings', methods=['GET'])
@require_auth
def get_user_settings():
    """Carregar configurações do usuário"""
    current_user = request.current_user
    
    db = SessionLocal()
    try:
        logger.info("loading_user_settings", user_id=current_user.id)
        
        # Buscar configurações existentes
        user_settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()
        
        if user_settings:
            settings_dict = user_settings.to_dict()
            logger.info("user_settings_found", user_id=current_user.id)
            
            # Mesclar com padrões para garantir completude
            default_settings = get_default_settings()
            merged_settings = {}
            
            for category in default_settings:
                merged_settings[category] = {
                    **default_settings[category],
                    **settings_dict.get(category, {})
                }
            
            return jsonify({
                'success': True,
                'settings': merged_settings,
                'user': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'email': current_user.email,
                    'full_name': current_user.full_name,
                    'role': current_user.role,
                    'is_active': current_user.is_active,
                    'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
                    'created_at': current_user.created_at.isoformat() if current_user.created_at else None
                },
                'message': 'Configurações carregadas com sucesso'
            })
        else:
            # Retornar configurações padrão
            default_settings = get_default_settings()
            logger.info("returning_default_settings", user_id=current_user.id)
            
            return jsonify({
                'success': True,
                'settings': default_settings,
                'user': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'email': current_user.email,
                    'full_name': current_user.full_name,
                    'role': current_user.role,
                    'is_active': current_user.is_active,
                    'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
                    'created_at': current_user.created_at.isoformat() if current_user.created_at else None
                },
                'message': 'Configurações padrão carregadas'
            })
            
    except Exception as e:
        logger.error("get_user_settings_error", error=str(e), user_id=current_user.id)
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    finally:
        db.close()

@user_settings_bp.route('/api/user/settings', methods=['PUT'])
@require_auth
def update_user_settings():
    """Salvar/atualizar configurações do usuário"""
    current_user = request.current_user
    
    db = SessionLocal()
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        logger.info("updating_user_settings", user_id=current_user.id, data_keys=list(data.keys()))
        
        # Extrair dados
        account_data = data.get('account', {})
        settings_data = data.get('settings', {})
        
        # 1. Atualizar dados da conta se fornecidos
        if account_data:
            # Atualizar nome completo
            if 'full_name' in account_data:
                new_name = account_data['full_name'].strip() if account_data['full_name'] else None
                if new_name and new_name != current_user.full_name:
                    logger.info("updating_full_name", user_id=current_user.id, old_name=current_user.full_name, new_name=new_name)
                    current_user.full_name = new_name
            
            # Atualizar email com validação
            if 'email' in account_data:
                new_email = account_data['email'].strip().lower() if account_data['email'] else None
                current_email = current_user.email.lower() if current_user.email else None
                
                if new_email and new_email != current_email:
                    # Validar formato de email
                    import re
                    email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
                    if not re.match(email_pattern, new_email):
                        return jsonify({
                            'success': False,
                            'error': 'Formato de email inválido'
                        }), 400
                    
                    # Verificar se email já existe
                    existing_user = db.query(User).filter(
                        User.email.ilike(new_email),
                        User.id != current_user.id
                    ).first()
                    
                    if existing_user:
                        logger.warning("email_already_exists", user_id=current_user.id, email=new_email)
                        return jsonify({
                            'success': False,
                            'error': f'O email "{new_email}" já está em uso por outro usuário'
                        }), 400
                    
                    current_user.email = new_email
                    logger.info("email_updated", user_id=current_user.id, new_email=new_email)
            
            # Atualizar outros campos
            if 'phone' in account_data:
                current_user.phone = account_data['phone'].strip() if account_data['phone'] else None
            
            if 'department' in account_data:
                current_user.department = account_data['department'].strip() if account_data['department'] else None
            
            if 'position' in account_data:
                current_user.position = account_data['position'].strip() if account_data['position'] else None
            
            # Atualizar senha se fornecida
            if 'password' in account_data and account_data['password']:
                password = account_data['password'].strip()
                if len(password) < 6:
                    return jsonify({
                        'success': False,
                        'error': 'A senha deve ter pelo menos 6 caracteres'
                    }), 400
                
                # Criptografar senha
                salt = bcrypt.gensalt()
                current_user.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
                logger.info("password_updated", user_id=current_user.id)
        
        # 2. Atualizar configurações se fornecidas
        if settings_data:
            # Buscar ou criar registro de configurações
            user_settings = db.query(UserSettings).filter(
                UserSettings.user_id == current_user.id
            ).first()
            
            if not user_settings:
                user_settings = UserSettings(user_id=current_user.id)
                db.add(user_settings)
                logger.info("user_settings_created", user_id=current_user.id)
            
            # Atualizar cada categoria de configurações
            for category, settings in settings_data.items():
                if hasattr(user_settings, category):
                    setattr(user_settings, category, json.dumps(settings))
                    logger.info(f"{category}_updated", user_id=current_user.id)
        
        # 3. Salvar no banco
        db.commit()
        logger.info("user_settings_saved_successfully", user_id=current_user.id)
        
        # 4. Preparar resposta
        response_user = {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'full_name': current_user.full_name,
            'role': current_user.role,
            'is_active': current_user.is_active,
            'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
            'created_at': current_user.created_at.isoformat() if current_user.created_at else None
        }
        
        response_settings = {}
        if settings_data:
            # Buscar configurações atualizadas
            updated_settings = db.query(UserSettings).filter(
                UserSettings.user_id == current_user.id
            ).first()
            
            if updated_settings:
                settings_dict = updated_settings.to_dict()
                for category in ['notifications', 'appearance', 'security', 'privacy', 'performance', 'integrations', 'advanced']:
                    response_settings[category] = settings_dict.get(category, {})
        
        return jsonify({
            'success': True,
            'user': response_user,
            'settings': response_settings,
            'message': 'Configurações salvas com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        logger.error("update_user_settings_error", error=str(e), user_id=current_user.id)
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    finally:
        db.close()

@user_settings_bp.route('/api/user/settings/reset', methods=['POST'])
@require_auth
def reset_user_settings():
    """Resetar configurações para o padrão"""
    current_user = request.current_user
    
    db = SessionLocal()
    try:
        logger.info("resetting_user_settings", user_id=current_user.id)
        
        # Buscar configurações existentes
        user_settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()
        
        # Configurações padrão
        default_settings = get_default_settings()
        
        if user_settings:
            # Atualizar com padrões
            for category, settings in default_settings.items():
                setattr(user_settings, category, json.dumps(settings))
        else:
            # Criar novo registro com padrões
            user_settings = UserSettings(user_id=current_user.id)
            for category, settings in default_settings.items():
                setattr(user_settings, category, json.dumps(settings))
            db.add(user_settings)
        
        db.commit()
        logger.info("user_settings_reset_success", user_id=current_user.id)
        
        return jsonify({
            'success': True,
            'settings': default_settings,
            'message': 'Configurações resetadas para o padrão'
        })
        
    except Exception as e:
        db.rollback()
        logger.error("reset_user_settings_error", error=str(e), user_id=current_user.id)
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    finally:
        db.close()

@user_settings_bp.route('/api/user/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """Obter perfil completo do usuário com configurações"""
    current_user = request.current_user
    
    db = SessionLocal()
    try:
        logger.info("loading_user_profile", user_id=current_user.id)
        
        # Buscar configurações
        user_settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()
        
        settings = {}
        if user_settings:
            settings_dict = user_settings.to_dict()
            for category in ['notifications', 'appearance', 'security', 'privacy', 'performance', 'integrations', 'advanced']:
                settings[category] = settings_dict.get(category, {})
        else:
            settings = get_default_settings()
        
        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'full_name': current_user.full_name,
                'role': current_user.role,
                'is_active': current_user.is_active,
                'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
                'created_at': current_user.created_at.isoformat() if current_user.created_at else None
            },
            'settings': settings,
            'message': 'Perfil carregado com sucesso'
        })
        
    except Exception as e:
        logger.error("get_user_profile_error", error=str(e), user_id=current_user.id)
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    finally:
        db.close()

@user_settings_bp.route('/api/user/account', methods=['PUT'])
@require_auth
def update_user_account():
    """Atualizar apenas dados da conta do usuário"""
    current_user = request.current_user
    
    db = SessionLocal()
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        logger.info("updating_user_account", user_id=current_user.id, data_keys=list(data.keys()))
        
        # Atualizar campos permitidos
        if 'full_name' in data:
            new_name = data['full_name'].strip() if data['full_name'] else None
            if new_name:
                current_user.full_name = new_name
                logger.info("account_name_updated", user_id=current_user.id, new_name=new_name)
        
        if 'email' in data:
            new_email = data['email'].strip().lower() if data['email'] else None
            current_email = current_user.email.lower() if current_user.email else None
            
            if new_email and new_email != current_email:
                # Validar formato
                import re
                if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', new_email):
                    return jsonify({
                        'success': False,
                        'error': 'Formato de email inválido'
                    }), 400
                
                # Verificar se já existe
                existing_user = db.query(User).filter(
                    User.email.ilike(new_email),
                    User.id != current_user.id
                ).first()
                
                if existing_user:
                    return jsonify({
                        'success': False,
                        'error': f'O email "{new_email}" já está em uso'
                    }), 400
                
                current_user.email = new_email
                logger.info("account_email_updated", user_id=current_user.id, new_email=new_email)
        
        if 'password' in data and data['password']:
            password = data['password'].strip()
            if len(password) < 6:
                return jsonify({
                    'success': False,
                    'error': 'A senha deve ter pelo menos 6 caracteres'
                }), 400
            
            salt = bcrypt.gensalt()
            current_user.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            logger.info("account_password_updated", user_id=current_user.id)
        
        # Atualizar timestamp
        current_user.updated_at = datetime.now(UTC)
        
        db.commit()
        logger.info("account_updated_successfully", user_id=current_user.id)
        
        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'full_name': current_user.full_name,
                'role': current_user.role,
                'is_active': current_user.is_active,
                'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
                'created_at': current_user.created_at.isoformat() if current_user.created_at else None
            },
            'message': 'Conta atualizada com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        logger.error("update_account_error", error=str(e), user_id=current_user.id)
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    finally:
        db.close()

# ===== FUNÇÃO DE INICIALIZAÇÃO =====
def initialize_user_settings_system():
    """Inicializar sistema de configurações de usuário"""
    try:
        logger.info("initializing_user_settings_system")
        
        # Criar tabela se não existir
        from database import engine
        UserSettings.__table__.create(bind=engine, checkfirst=True)
        
        logger.info("user_settings_system_initialized")
        return True
        
    except Exception as e:
        logger.error("user_settings_initialization_error", error=str(e))
        return False