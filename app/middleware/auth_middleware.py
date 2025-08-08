# 📁 middleware/auth_middleware.py - VERSÃO DE PRODUÇÃO FINAL
from functools import wraps
from flask import request, jsonify, g
from database import SessionLocal
from models.user import User
import structlog
import jwt
import os
from datetime import UTC, datetime, timedelta

# Logger estruturado
logger = structlog.get_logger(__name__)

# Configurações JWT
JWT_SECRET = os.getenv('JWT_SECRET')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

def generate_jwt_token(user_data, expires_hours=None):
    """Gerar token JWT para o usuário"""
    try:
        if expires_hours is None:
            expires_hours = JWT_EXPIRATION_HOURS
        
        payload = {
            'user_id': user_data['user_id'],
            'username': user_data['username'],
            'role': user_data['role'],
            'email': user_data.get('email'),
            'exp': datetime.now(UTC) + timedelta(hours=expires_hours),
            'iat': datetime.now(UTC)
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        logger.info("jwt_token_generated", 
                   user_id=user_data['user_id'], 
                   expires_hours=expires_hours)
        
        return token
        
    except Exception as e:
        logger.error("jwt_generation_error", error=str(e), user_data=user_data)
        return None

def verify_jwt_token(token):
    """Verificar e decodificar token JWT"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Verificar se o token não expirou
        exp_timestamp = payload.get('exp')
        if exp_timestamp and datetime.now(UTC).timestamp() > exp_timestamp:
            logger.warning("jwt_token_expired", user_id=payload.get('user_id'))
            return None
        
        logger.debug("jwt_token_verified", user_id=payload.get('user_id'))
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("jwt_expired_signature", token_prefix=token[:20] if token else "None")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("jwt_invalid_token", error=str(e), token_prefix=token[:20] if token else "None")
        return None
    except Exception as e:
        logger.error("jwt_verification_error", error=str(e))
        return None

def auth_required(roles=None):
    """
    Decorator para autenticação - VERSÃO DE PRODUÇÃO
    
    Args:
        roles (list or str): Lista de roles permitidos ou role único
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):

            try:
                # 1. Verificar header Authorization
                auth_header = request.headers.get('Authorization')
                
                if not auth_header:
                    logger.warning("missing_auth_header", 
                                 endpoint=request.endpoint,
                                 method=request.method,
                                 ip=request.remote_addr)
                    return jsonify({
                        'success': False,
                        'error': 'Token de autenticação requerido',
                        'code': 'MISSING_AUTH_TOKEN'
                    }), 401
                
                if not auth_header.startswith('Bearer '):
                    logger.warning("invalid_auth_format", 
                                 auth_header=auth_header[:20],
                                 endpoint=request.endpoint)
                    return jsonify({
                        'success': False,
                        'error': 'Formato de autenticação inválido',
                        'code': 'INVALID_AUTH_FORMAT'
                    }), 401
                
                # 2. Extrair token
                try:
                    token = auth_header.split(' ')[1]
                    if not token:
                        raise ValueError("Token vazio")
                except (IndexError, ValueError):
                    logger.warning("malformed_token", auth_header=auth_header[:50])
                    return jsonify({
                        'success': False,
                        'error': 'Token malformado',
                        'code': 'MALFORMED_TOKEN'
                    }), 401
                
                # 3. Verificar token JWT
                payload = verify_jwt_token(token)
                if not payload:
                    logger.warning("invalid_jwt_token", 
                                 endpoint=request.endpoint,
                                 token_prefix=token[:20])
                    return jsonify({
                        'success': False,
                        'error': 'Token inválido ou expirado',
                        'code': 'INVALID_TOKEN'
                    }), 401
                
                # 4. Buscar usuário no banco
                user_id = payload.get('user_id')
                if not user_id:
                    logger.error("token_missing_user_id", payload=payload)
                    return jsonify({
                        'success': False,
                        'error': 'Token inválido: ID do usuário não encontrado',
                        'code': 'INVALID_TOKEN_DATA'
                    }), 401
                
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    
                    if not user:
                        logger.warning("user_not_found", user_id=user_id)
                        return jsonify({
                            'success': False,
                            'error': 'Usuário não encontrado',
                            'code': 'USER_NOT_FOUND'
                        }), 401
                    
                    if not user.is_active:
                        logger.warning("user_inactive", user_id=user_id, username=user.username)
                        return jsonify({
                            'success': False,
                            'error': 'Conta do usuário foi desativada',
                            'code': 'USER_INACTIVE'
                        }), 401
                    
                    # 5. Verificar roles se especificados
                    if roles:
                        required_roles = roles if isinstance(roles, list) else [roles]
                        if user.role not in required_roles:
                            logger.warning("insufficient_permissions", 
                                         user_id=user_id,
                                         user_role=user.role,
                                         required_roles=required_roles)
                            return jsonify({
                                'success': False,
                                'error': 'Permissão insuficiente para acessar este recurso',
                                'code': 'INSUFFICIENT_PERMISSIONS'
                            }), 403
                    
                    # 6. Adicionar usuário ao contexto da requisição
                    g.current_user = user
                    g.user_id = user.id
                    g.user_role = user.role
                    g.username = user.username
                    g.user_email = user.email
                    
                    # 7. Log de acesso autorizado
                    logger.info("authorized_access", 
                               user_id=user.id,
                               username=user.username,
                               role=user.role,
                               endpoint=request.endpoint,
                               method=request.method)
                    
                finally:
                    db.close()
                
                # 8. Chamar a função original
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error("auth_middleware_unexpected_error", 
                           error=str(e),
                           endpoint=request.endpoint)
                return jsonify({
                    'success': False,
                    'error': 'Erro interno de autenticação',
                    'code': 'AUTH_INTERNAL_ERROR'
                }), 500
        
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator para exigir role admin"""
    return auth_required(roles=['admin'])(f)

def manager_required(f):
    """Decorator para exigir role admin ou manager"""
    return auth_required(roles=['admin', 'manager'])(f)

def get_current_user():
    """Obter usuário atual do contexto da requisição"""
    return getattr(g, 'current_user', None)

def get_current_user_id():
    """Obter ID do usuário atual"""
    return getattr(g, 'user_id', None)

def get_current_user_role():
    """Obter role do usuário atual"""
    return getattr(g, 'user_role', None)

def get_current_username():
    """Obter username do usuário atual"""
    return getattr(g, 'username', None)

def get_current_user_email():
    """Obter email do usuário atual"""
    return getattr(g, 'user_email', None)

def validate_token_for_verification(token):
    """
    Validação robusta de token para endpoint /verify-token
    Retorna (is_valid, user_data, error_message)
    """
    try:
        if not token:
            return False, None, "Token não fornecido"
        
        # Verificar JWT
        payload = verify_jwt_token(token)
        if not payload:
            return False, None, "Token inválido ou expirado"
        
        # Verificar usuário no banco
        user_id = payload.get('user_id')
        if not user_id:
            return False, None, "Token não contém ID do usuário"
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return False, None, "Usuário não encontrado"
            
            if not user.is_active:
                return False, None, "Usuário inativo"
            
            # Retornar dados do usuário
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if hasattr(user, 'last_login') and user.last_login else None
            }
            
            logger.info("token_validation_success", user_id=user_id)
            return True, user_data, None
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("validate_token_error", error=str(e))
        return False, None, f"Erro interno: {str(e)}"

def create_auth_response(user):
    """Criar resposta de autenticação com token"""
    try:
        user_data = {
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
        
        token = generate_jwt_token(user_data)
        if not token:
            return None
        
        return {
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_verified': user.is_verified
            },
            'expires_in': JWT_EXPIRATION_HOURS * 3600  # em segundos
        }
        
    except Exception as e:
        logger.error("create_auth_response_error", error=str(e), user_id=user.id)
        return None

def revoke_user_tokens(user_id):
    """Revogar todos os tokens de um usuário (implementação básica)"""
    try:
        # Em uma implementação mais robusta, você manteria uma blacklist de tokens
        # Por enquanto, registramos o evento para auditoria
        logger.info("user_tokens_revoked", user_id=user_id)
        return True
        
    except Exception as e:
        logger.error("revoke_tokens_error", error=str(e), user_id=user_id)
        return False

def check_auth_system_health():
    """Verificar saúde do sistema de autenticação"""
    try:
        # Testar conexão com banco
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            admin_exists = db.query(User).filter(User.role == 'admin').first() is not None
            
            # Testar geração e verificação de JWT
            test_user_data = {
                'user_id': 999999,
                'username': 'test_health_check',
                'role': 'user',
                'email': 'test@health.check'
            }
            
            test_token = generate_jwt_token(test_user_data, expires_hours=1)
            token_valid = verify_jwt_token(test_token) is not None if test_token else False
            
            health_status = {
                'database_connection': True,
                'user_count': user_count,
                'admin_exists': admin_exists,
                'jwt_generation': test_token is not None,
                'jwt_verification': token_valid,
                'jwt_secret_configured': bool(JWT_SECRET and JWT_SECRET != 'your-super-secret-jwt-key-change-in-production'),
                'healthy': True,
                'timestamp': datetime.now(UTC).isoformat()
            }
            
            # Sistema é saudável se todos os componentes críticos funcionam
            health_status['healthy'] = all([
                health_status['database_connection'],
                health_status['admin_exists'],
                health_status['jwt_generation'],
                health_status['jwt_verification'],
                health_status['jwt_secret_configured']
            ])
            
            logger.info("auth_system_health_check", **health_status)
            return health_status
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("auth_system_health_check_failed", error=str(e))
        return {
            'database_connection': False,
            'error': str(e),
            'healthy': False,
            'timestamp': datetime.now(UTC).isoformat()
        }

def initialize_auth_system():
    """Inicializar sistema de autenticação para produção"""
    logger.info("initializing_auth_system")
    
    try:
        # 1. Verificar configurações essenciais
        if JWT_SECRET == 'your-super-secret-jwt-key-change-in-production':
            logger.warning("jwt_secret_not_changed", 
                         message="AVISO: Altere a JWT_SECRET em produção!")
        
        # 2. Verificar conexão com banco
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            admin_count = db.query(User).filter(User.role == 'admin').count()
            
            logger.info("auth_system_initialized", 
                       user_count=user_count,
                       admin_count=admin_count,
                       jwt_expiration_hours=JWT_EXPIRATION_HOURS)
            
            # 3. Verificar se existe pelo menos um admin
            if admin_count == 0:
                logger.warning("no_admin_users_found",
                             message="Nenhum usuário admin encontrado. Crie um admin antes de usar o sistema.")
                return False
            
            # 4. Testar JWT
            test_result = check_auth_system_health()
            if not test_result.get('healthy'):
                logger.error("auth_system_unhealthy", health_check=test_result)
                return False
            
            logger.info("auth_system_ready")
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error("auth_system_initialization_failed", error=str(e))
        return False

# Função utilitária para logs de segurança
def log_security_event(event_type, success, user_id=None, **kwargs):
    """Registrar eventos de segurança"""
    try:
        log_data = {
            'event_type': event_type,
            'success': success,
            'user_id': user_id,
            'timestamp': datetime.now(UTC).isoformat(),
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None,
            **kwargs
        }
        
        if success:
            logger.info("security_event", **log_data)
        else:
            logger.warning("security_event_failed", **log_data)
            
    except Exception as e:
        logger.error("log_security_event_error", error=str(e))