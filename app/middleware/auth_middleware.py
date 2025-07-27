# 📁 middleware/auth_middleware.py - MIDDLEWARE ATUALIZADO COM INTEGRAÇÃO
from functools import wraps
from flask import request, jsonify, g
from middleware.security import security_manager, log_security_event
from database import SessionLocal
from models.user import User
import structlog

# Configurar logger
logger = structlog.get_logger()

def auth_required(roles=None):
    """
    Decorator para exigir autenticação em rotas
    
    Args:
        roles (list): Lista de roles permitidos (opcional)
        
    Exemplo:
        @auth_required()  # Qualquer usuário logado
        @auth_required(roles=['admin'])  # Apenas admin
        @auth_required(roles=['admin', 'manager'])  # Admin ou manager
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Verificar header Authorization
                auth_header = request.headers.get('Authorization')
                
                if not auth_header or not auth_header.startswith('Bearer '):
                    log_security_event('MISSING_AUTH_TOKEN', False, None,
                                     endpoint=request.endpoint,
                                     ip_address=request.remote_addr)
                    return jsonify({
                        'success': False,
                        'error': 'Token de autenticação não fornecido'
                    }), 401
                
                # Extrair token
                token = auth_header.split(' ')[1]
                
                # ✅ VERIFICAR TOKEN JWT USANDO SECURITY MANAGER
                payload = security_manager.verify_jwt_token(token)
                
                if not payload:
                    log_security_event('INVALID_JWT_TOKEN', False, None,
                                     endpoint=request.endpoint,
                                     ip_address=request.remote_addr)
                    return jsonify({
                        'success': False,
                        'error': 'Token inválido ou expirado'
                    }), 401
                
                # Verificar se é token de banco (não permitido para autenticação geral)
                if payload.get('sessionType') == 'bank_access':
                    log_security_event('BANK_TOKEN_MISUSE', False, payload.get('id'),
                                     endpoint=request.endpoint)
                    return jsonify({
                        'success': False,
                        'error': 'Token bancário não pode ser usado para autenticação geral'
                    }), 401
                
                # Buscar usuário no banco
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == payload['user_id']).first()
                    
                    if not user:
                        log_security_event('USER_NOT_FOUND', False, payload['user_id'],
                                         endpoint=request.endpoint)
                        return jsonify({
                            'success': False,
                            'error': 'Usuário não encontrado'
                        }), 401
                    
                    if not user.is_active:
                        log_security_event('INACTIVE_USER_ACCESS', False, user.id,
                                         endpoint=request.endpoint)
                        return jsonify({
                            'success': False,
                            'error': 'Conta desativada'
                        }), 401
                    
                    # Verificar roles se especificados
                    if roles:
                        user_role = user.role
                        required_roles = roles if isinstance(roles, list) else [roles]
                        
                        if user_role not in required_roles:
                            log_security_event('INSUFFICIENT_PERMISSIONS', False, user.id,
                                             endpoint=request.endpoint,
                                             user_role=user_role,
                                             required_roles=required_roles)
                            return jsonify({
                                'success': False,
                                'error': 'Permissão insuficiente'
                            }), 403
                    
                    # ✅ ADICIONAR USUÁRIO AO CONTEXTO DA REQUISIÇÃO
                    g.current_user = user
                    g.user_id = user.id
                    g.user_role = user.role
                    g.username = user.username
                    
                    # ✅ LOG DE ACESSO AUTORIZADO
                    log_security_event('AUTHORIZED_ACCESS', True, user.id,
                                     endpoint=request.endpoint,
                                     user_role=user.role,
                                     ip_address=request.remote_addr)
                    
                finally:
                    db.close()
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error("auth_middleware_error", 
                           endpoint=request.endpoint,
                           error=str(e),
                           ip_address=request.remote_addr)
                
                log_security_event('AUTH_MIDDLEWARE_ERROR', False, None,
                                 endpoint=request.endpoint,
                                 error_message=str(e))
                
                return jsonify({
                    'success': False,
                    'error': 'Erro de autenticação'
                }), 401
        
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator para exigir role admin"""
    return auth_required(roles=['admin'])(f)

def manager_required(f):
    """Decorator para exigir role admin ou manager"""
    return auth_required(roles=['admin', 'manager'])(f)

def get_current_user():
    """Obter usuário atual do contexto"""
    return getattr(g, 'current_user', None)

def get_current_user_id():
    """Obter ID do usuário atual (função segura)"""
    user_id = getattr(g, 'user_id', None)
    if not user_id:
        # ✅ FALLBACK SEGURO - tentar extrair do token se disponível
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                payload = security_manager.verify_jwt_token(token)
                if payload and 'user_id' in payload:
                    return payload['user_id']
            except:
                pass
    return user_id

def get_current_user_role():
    """Obter role do usuário atual"""
    return getattr(g, 'user_role', None)

def get_current_username():
    """Obter username do usuário atual"""
    return getattr(g, 'username', None)

# ✅ FUNÇÃO PARA VALIDAR PERMISSÕES ESPECÍFICAS
def check_permission(permission_name, user_id=None):
    """
    Verificar se usuário tem permissão específica
    
    Args:
        permission_name (str): Nome da permissão
        user_id (str): ID do usuário (opcional, usa o atual se não fornecido)
    
    Returns:
        bool: True se tem permissão, False caso contrário
    """
    if not user_id:
        user_id = get_current_user_id()
    
    if not user_id:
        return False
    
    user_role = get_current_user_role()
    
    # Mapeamento de permissões por role
    permissions_map = {
        'admin': [
            'manage_users',
            'manage_bank_config',
            'view_security_stats',
            'clear_cache',
            'revoke_sessions',
            'system_integrity',
            'all_bank_operations'
        ],
        'manager': [
            'manage_bank_config',
            'view_own_bank_data',
            'manage_projects',
            'manage_clients'
        ],
        'user': [
            'view_own_bank_data',
            'manage_own_bank_config',
            'view_projects',
            'view_clients'
        ]
    }
    
    user_permissions = permissions_map.get(user_role, [])
    return permission_name in user_permissions

def permission_required(permission_name):
    """
    Decorator para exigir permissão específica
    
    Args:
        permission_name (str): Nome da permissão requerida
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_current_user_id()
            
            if not user_id:
                return jsonify({
                    'success': False,
                    'error': 'Autenticação requerida'
                }), 401
            
            if not check_permission(permission_name, user_id):
                log_security_event('PERMISSION_DENIED', False, user_id,
                                 endpoint=request.endpoint,
                                 permission=permission_name,
                                 user_role=get_current_user_role())
                
                return jsonify({
                    'success': False,
                    'error': f'Permissão {permission_name} requerida'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def create_default_admin():
    """Criar usuário admin padrão se não existir"""
    try:
        from models.user import User
        
        db = SessionLocal()
        try:
            # Verificar se já existe admin
            admin = db.query(User).filter(User.role == 'admin').first()
            
            if not admin:
                logger.info("creating_default_admin")
                
                admin = User(
                    username='admin',
                    email='admin@arconset.com.br',
                    full_name='Administrador do Sistema',
                    role='admin',
                    is_active=True,
                    is_verified=True
                )
                admin.set_password('Admin123!')  # Senha padrão - DEVE SER ALTERADA
                
                db.add(admin)
                db.commit()
                
                logger.info("default_admin_created",
                          username=admin.username,
                          email=admin.email)
                
                # ✅ LOG DE SEGURANÇA
                log_security_event('DEFAULT_ADMIN_CREATED', True, admin.id,
                                 username=admin.username,
                                 email=admin.email)
                
                print("✅ Usuário admin criado:")
                print("   Username: admin")
                print("   Email: admin@arconset.com.br")
                print("   Senha: Admin123!")
                print("   ⚠️  ALTERE A SENHA IMEDIATAMENTE!")
                
                return True
            else:
                logger.info("default_admin_exists", admin_id=admin.id)
                return False
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error("create_default_admin_error", error=str(e))
        print(f"❌ Erro ao criar admin padrão: {e}")
        return False

# ✅ FUNÇÃO PARA VERIFICAR SAÚDE DO SISTEMA DE AUTH
def check_auth_system_health():
    """Verificar se o sistema de autenticação está funcionando"""
    try:
        # Verificar se consegue conectar no banco
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            admin_exists = db.query(User).filter(User.role == 'admin').first() is not None
            
            return {
                'database_connection': True,
                'user_count': user_count,
                'admin_exists': admin_exists,
                'security_manager_active': security_manager is not None,
                'jwt_configured': bool(security_manager and hasattr(security_manager, 'jwt_secret')),
                'healthy': True
            }
        finally:
            db.close()
            
    except Exception as e:
        logger.error("auth_system_health_check_failed", error=str(e))
        return {
            'database_connection': False,
            'error': str(e),
            'healthy': False
        }

# ✅ MIDDLEWARE PARA ADICIONAR INFORMAÇÕES DE AUTENTICAÇÃO EM TODAS AS RESPOSTAS
def add_auth_info_to_response():
    """Middleware para adicionar informações de autenticação em respostas"""
    from flask import g, jsonify
    
    # Só aplicar em rotas da API
    if request.path.startswith('/api/'):
        user_id = get_current_user_id()
        if user_id:
            # Adicionar informações básicas do usuário logado
            auth_info = {
                'authenticated': True,
                'user_id': user_id,
                'role': get_current_user_role(),
                'username': get_current_username()
            }
            
            # Se a resposta for JSON, adicionar auth_info
            # (Isso seria implementado em um after_request handler)
            g.auth_info = auth_info

# ✅ FUNÇÃO PARA LIMPAR DADOS DE AUTENTICAÇÃO
def cleanup_user_auth_data(user_id):
    """Limpar todos os dados de autenticação de um usuário"""
    try:
        # Revogar tokens JWT
        if security_manager:
            revoked_tokens = security_manager.revoke_all_user_tokens(user_id)
        else:
            revoked_tokens = 0
        
        # Remover sessões bancárias
        if security_manager and security_manager.redis_client:
            pattern = f"bank_session:{user_id}:*"
            revoked_sessions = 0
            for key in security_manager.redis_client.scan_iter(match=pattern):
                security_manager.redis_client.delete(key)
                revoked_sessions += 1
        else:
            revoked_sessions = 0
        
        log_security_event('USER_AUTH_DATA_CLEANUP', True, user_id,
                          revoked_tokens=revoked_tokens,
                          revoked_sessions=revoked_sessions)
        
        return {
            'success': True,
            'revoked_tokens': revoked_tokens,
            'revoked_sessions': revoked_sessions
        }
        
    except Exception as e:
        logger.error("cleanup_user_auth_data_error",
                    user_id=user_id,
                    error=str(e))
        
        return {
            'success': False,
            'error': str(e)
        }