# 📁 middleware/auth_middleware_simple.py - VERSÃO ULTRA OTIMIZADA (150 linhas vs 700)
from functools import wraps
from flask import request, jsonify, g
from app.middleware.security import security_manager, log_security_event
from database import SessionLocal
from models.user import User
import structlog

# Logger simples
logger = structlog.get_logger()

def auth_required(roles=None):
    """
    Decorator simples para autenticação - VERSÃO OTIMIZADA
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Verificar header Authorization
                auth_header = request.headers.get('Authorization')
                
                if not auth_header or not auth_header.startswith('Bearer '):
                    log_security_event('MISSING_AUTH_TOKEN', False, None)
                    return jsonify({
                        'success': False,
                        'error': 'Token de autenticação requerido'
                    }), 401
                
                # Extrair token
                try:
                    token = auth_header.split(' ')[1]
                except IndexError:
                    return jsonify({
                        'success': False,
                        'error': 'Token malformado'
                    }), 401
                
                # Verificar token JWT
                if not security_manager:
                    return jsonify({
                        'success': False,
                        'error': 'Sistema de segurança não disponível'
                    }), 503
                
                try:
                    payload = security_manager.verify_jwt_token(token)
                except Exception as e:
                    log_security_event('INVALID_JWT_TOKEN', False, None)
                    return jsonify({
                        'success': False,
                        'error': str(e)
                    }), 401
                
                # Buscar usuário no banco
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == payload['user_id']).first()
                    
                    if not user or not user.is_active:
                        log_security_event('USER_NOT_FOUND_OR_INACTIVE', False, payload.get('user_id'))
                        return jsonify({
                            'success': False,
                            'error': 'Usuário não encontrado ou inativo'
                        }), 401
                    
                    # Verificar roles se especificados
                    if roles:
                        required_roles = roles if isinstance(roles, list) else [roles]
                        if user.role not in required_roles:
                            log_security_event('INSUFFICIENT_PERMISSIONS', False, user.id)
                            return jsonify({
                                'success': False,
                                'error': 'Permissão insuficiente'
                            }), 403
                    
                    # Adicionar usuário ao contexto
                    g.current_user = user
                    g.user_id = user.id
                    g.user_role = user.role
                    g.username = user.username
                    
                    log_security_event('AUTHORIZED_ACCESS', True, user.id)
                    
                finally:
                    db.close()
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error("auth_middleware_error", error=str(e))
                log_security_event('AUTH_MIDDLEWARE_ERROR', False, None)
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
    """Obter ID do usuário atual"""
    user_id = getattr(g, 'user_id', None)
    
    if not user_id:
        # Fallback: tentar extrair do token
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer ') and security_manager:
            try:
                token = auth_header.split(' ')[1]
                payload = security_manager.verify_jwt_token(token)
                return payload.get('user_id')
            except:
                pass
    
    return user_id

def get_current_user_role():
    """Obter role do usuário atual"""
    return getattr(g, 'user_role', None)

def get_current_username():
    """Obter username do usuário atual"""
    return getattr(g, 'username', None)

def create_default_admin():
    """Criar usuário admin padrão se não existir"""
    try:
        db = SessionLocal()
        try:
            # Verificar se já existe admin
            admin = db.query(User).filter(User.role == 'admin').first()
            
            if not admin:
                admin = User(
                    username='admin',
                    email='admin@arconset.com.br',
                    full_name='Administrador do Sistema',
                    role='admin',
                    is_active=True,
                    is_verified=True
                )
                admin.set_password('Admin123!')
                
                db.add(admin)
                db.commit()
                
                log_security_event('DEFAULT_ADMIN_CREATED', True, admin.id)
                
                print("✅ Usuário admin criado:")
                print("   Username: admin")
                print("   Email: admin@arconset.com.br")
                print("   Senha: Admin123!")
                print("   ⚠️  ALTERE A SENHA IMEDIATAMENTE!")
                
                return True
            else:
                return False
                
        finally:
            db.close()
            
    except Exception as e:
        logger.error("create_default_admin_error", error=str(e))
        return False

def cleanup_user_auth_data(user_id):
    """Limpar dados de autenticação de um usuário"""
    try:
        revoked_tokens = 0
        revoked_sessions = 0
        
        # Revogar tokens JWT
        if security_manager and hasattr(security_manager.redis_client, 'delete'):
            security_manager.redis_client.delete(f"jwt:{user_id}")
            revoked_tokens = 1
        
        # Remover sessões bancárias
        if security_manager and hasattr(security_manager.redis_client, 'scan_iter'):
            pattern = f"bank_session:{user_id}:*"
            for key in security_manager.redis_client.scan_iter(match=pattern):
                security_manager.redis_client.delete(key)
                revoked_sessions += 1
        
        log_security_event('USER_AUTH_DATA_CLEANUP', True, user_id,
                          revoked_tokens=revoked_tokens,
                          revoked_sessions=revoked_sessions)
        
        return {
            'success': True,
            'revoked_tokens': revoked_tokens,
            'revoked_sessions': revoked_sessions
        }
        
    except Exception as e:
        logger.error("cleanup_user_auth_data_error", error=str(e))
        return {'success': False, 'error': str(e)}

def check_auth_system_health():
    """Verificar saúde do sistema de autenticação"""
    try:
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

def initialize_auth_system():
    """Inicializar sistema de autenticação"""
    print("🔐 Inicializando sistema de autenticação simplificado...")
    
    # Verificar se security_manager está disponível
    if not security_manager:
        print("❌ SecurityManager não disponível")
        return False
    
    # Testar função básica
    try:
        test_payload = {'user_id': 'test', 'username': 'test', 'role': 'user'}
        test_token = security_manager.generate_jwt_token(test_payload, expires_hours=1)
        verified = security_manager.verify_jwt_token(test_token)
        
        if verified and verified.get('user_id') == 'test':
            print("✅ Sistema de autenticação funcionando")
            return True
        else:
            print("❌ Teste de JWT falhou")
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False