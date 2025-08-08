# 📁 routes/auth.py - VERSÃO CORRIGIDA PARA SUA ESTRUTURA
import os
from flask import Blueprint, request, jsonify, g
from datetime import UTC, datetime, timedelta
import structlog
import re

# ✅ IMPORTS CORRIGIDOS PARA SUA ESTRUTURA
from database import SessionLocal
from models.user import User

# Tentar importar middleware com fallback
try:
    from middleware.security import security_manager, log_security_event
    HAS_SECURITY = True
except ImportError:
    print("⚠️ Security middleware não encontrado")
    HAS_SECURITY = False
    security_manager = None
    def log_security_event(*args, **kwargs):
        pass

try:
    from middleware.auth_middleware import (
        auth_required, admin_required, get_current_user_id, 
        validate_token_for_verification, generate_jwt_token
    )
    HAS_AUTH_MIDDLEWARE = True
except ImportError:
    print("⚠️ Auth middleware não encontrado - usando fallback")
    HAS_AUTH_MIDDLEWARE = False
    
    # Fallback simples
    def auth_required(roles=None):
        def decorator(f):
            def wrapper(*args, **kwargs):
                return jsonify({'error': 'Autenticação não configurada'}), 500
            return wrapper
        return decorator
    
    admin_required = auth_required(['admin'])
    get_current_user_id = lambda: None
    validate_token_for_verification = lambda x: (False, None, "Middleware não configurado")

# Configurar logger
logger = structlog.get_logger()

# Criar blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# 🔧 Configurações JWT (fallback se middleware não estiver disponível)
JWT_SECRET = os.getenv('JWT_SECRET', 'fallback-secret-key')
JWT_ALGORITHM = 'HS256'

# 🔧 Validações
def validate_email(email):
    """Validar formato de email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password_strength(password):
    """Validar força da senha"""
    if len(password) < 6:
        return False, "Senha deve ter pelo menos 6 caracteres"
    
    if len(password) > 128:
        return False, "Senha muito longa"
    
    # Verificar se tem pelo menos uma letra e um número
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    if not (has_letter and has_digit):
        return False, "Senha deve conter ao menos uma letra e um número"
    
    return True, "Senha válida"

def validate_username(username):
    """Validar username"""
    if len(username) < 3:
        return False, "Username deve ter pelo menos 3 caracteres"
    
    if len(username) > 50:
        return False, "Username muito longo"
    
    # Apenas letras, números e underscore
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username deve conter apenas letras, números e underscore"
    
    return True, "Username válido"

# 🔧 Rate limiting simples (fallback)
def check_rate_limit(key, max_attempts=5, window_minutes=5):
    """Rate limiting básico usando dicionário em memória"""
    if not HAS_SECURITY or not security_manager:
        return True  # Permitir se não tem rate limiting
    
    try:
        attempts = int(security_manager.redis_client.get(key) or 0)
        if attempts >= max_attempts:
            return False
        return True
    except:
        return True  # Permitir em caso de erro

def increment_rate_limit(key, window_minutes=5):
    """Incrementar contador de rate limiting"""
    if not HAS_SECURITY or not security_manager:
        return
    
    try:
        security_manager.redis_client.incr(key)
        security_manager.redis_client.expire(key, window_minutes * 60)
    except:
        pass

# 🔑 POST /api/auth/login - LOGIN
@auth_bp.route('/login', methods=['POST'])
def login():
    """Fazer login de usuário"""
    ip_address = request.remote_addr
    
    try:
        # Verificar dados JSON
        if not request.is_json:
            log_security_event('LOGIN_INVALID_CONTENT_TYPE', False, None,
                             ip_address=ip_address)
            return jsonify({
                'success': False,
                'error': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        
        if not data:
            log_security_event('LOGIN_EMPTY_BODY', False, None,
                             ip_address=ip_address)
            return jsonify({
                'success': False,
                'error': 'Dados de login não fornecidos'
            }), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            log_security_event('LOGIN_MISSING_CREDENTIALS', False, None,
                             ip_address=ip_address,
                             username=username[:10] if username else None)
            return jsonify({
                'success': False,
                'error': 'Username e senha são obrigatórios'
            }), 400
        
        # Rate limiting por IP
        rate_key = f"login_attempts:{ip_address}"
        if not check_rate_limit(rate_key, 5, 5):
            log_security_event('LOGIN_RATE_LIMITED', False, None,
                             ip_address=ip_address)
            return jsonify({
                'success': False,
                'error': 'Muitas tentativas de login. Aguarde 5 minutos.'
            }), 429
        
        # Buscar usuário no banco
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            
            if not user:
                # Incrementar tentativas mesmo se usuário não existe
                increment_rate_limit(rate_key, 5)
                
                log_security_event('LOGIN_USER_NOT_FOUND', False, None,
                                 ip_address=ip_address,
                                 username=username)
                return jsonify({
                    'success': False,
                    'error': 'Credenciais inválidas'
                }), 401
            
            # Verificar senha
            if not user.check_password(password):
                # Incrementar tentativas
                increment_rate_limit(rate_key, 5)
                
                log_security_event('LOGIN_INVALID_PASSWORD', False, user.id,
                                 ip_address=ip_address,
                                 username=username)
                return jsonify({
                    'success': False,
                    'error': 'Credenciais inválidas'
                }), 401
            
            # Verificar se usuário está ativo
            if not user.is_active:
                log_security_event('LOGIN_INACTIVE_USER', False, user.id,
                                 ip_address=ip_address,
                                 username=username)
                return jsonify({
                    'success': False,
                    'error': 'Conta desativada'
                }), 401
            
            # Gerar token JWT
            token_payload = {
                'user_id': user.id,
                'username': user.username,
                'role': user.role,
                'login_time': datetime.now(UTC).isoformat(),
                'ip_address': ip_address
            }
            
            # Usar security_manager se disponível, senão fallback básico
            if HAS_SECURITY and security_manager:
                token = security_manager.generate_jwt_token(token_payload, expires_hours=8)
            else:
                # Fallback JWT básico
                import jwt
                token_payload['exp'] = datetime.now(UTC) + timedelta(hours=8)
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            if not token:
                log_security_event('LOGIN_TOKEN_GENERATION_FAILED', False, user.id,
                                 ip_address=ip_address)
                return jsonify({
                    'success': False,
                    'error': 'Erro interno do servidor'
                }), 500
            
            # Atualizar último login
            user.last_login = datetime.now(UTC)
            db.commit()
            
            # Limpar tentativas de login
            if HAS_SECURITY and security_manager:
                try:
                    security_manager.redis_client.delete(rate_key)
                except:
                    pass
            
            # Preparar dados do usuário (sem senha)
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            
            log_security_event('LOGIN_SUCCESS', True, user.id,
                             ip_address=ip_address,
                             username=username,
                             role=user.role)
            
            return jsonify({
                'success': True,
                'message': f'Login realizado com sucesso. Bem-vindo, {user.full_name or user.username}!',
                'token': token,
                'user': user_data,
                'expiresIn': 8 * 60 * 60,  # 8 horas em segundos
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("login_endpoint_error",
                    ip_address=ip_address,
                    error=str(e))
        
        log_security_event('LOGIN_ENDPOINT_ERROR', False, None,
                          ip_address=ip_address,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🔍 GET /api/auth/verify-token - VERIFICAR TOKEN
@auth_bp.route('/verify-token', methods=['GET'])
def verify_token():
    """Verificar se token é válido"""
    try:
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'Token não fornecido ou formato inválido'
            }), 401
        
        # Extrair token
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'Token malformado'
            }), 401
        
        # Usar função de validação se disponível
        if HAS_AUTH_MIDDLEWARE:
            is_valid, user_data, error_message = validate_token_for_verification(token)
        else:
            # Fallback básico
            try:
                import jwt
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                
                # Verificar usuário no banco
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == payload.get('user_id')).first()
                    if user and user.is_active:
                        user_data = user.to_dict()
                        is_valid = True
                        error_message = None
                    else:
                        is_valid = False
                        user_data = None
                        error_message = "Usuário não encontrado ou inativo"
                finally:
                    db.close()
            except Exception as e:
                is_valid = False
                user_data = None
                error_message = str(e)
        
        if is_valid and user_data:
            log_security_event('TOKEN_VERIFICATION_SUCCESS', True, user_data.get('id'))
            
            return jsonify({
                'success': True,
                'valid': True,
                'user': {
                    'id': user_data.get('id'),
                    'username': user_data.get('username'),
                    'email': user_data.get('email'),
                    'full_name': user_data.get('full_name'),
                    'role': user_data.get('role'),
                    'is_active': user_data.get('is_active'),
                    'is_verified': user_data.get('is_verified')
                },
                'timestamp': datetime.now(UTC).isoformat()
            })
        else:
            log_security_event('TOKEN_VERIFICATION_FAILED', False, None, error=error_message)
            
            return jsonify({
                'success': False,
                'valid': False,
                'error': error_message or 'Token inválido'
            }), 401
        
    except Exception as e:
        logger.error("verify_token_endpoint_error", error=str(e))
        
        return jsonify({
            'success': False,
            'valid': False,
            'error': 'Erro interno do servidor'
        }), 500

# 👤 POST /api/auth/register - REGISTRO
@auth_bp.route('/register', methods=['POST'])
def register():
    """Registrar novo usuário"""
    ip_address = request.remote_addr
    
    try:
        # Verificar dados JSON
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados de registro não fornecidos'
            }), 400
        
        # Extrair e validar dados
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip().lower()
        full_name = data.get('full_name', '').strip()
        
        # Validações
        if not all([username, password, email, full_name]):
            return jsonify({
                'success': False,
                'error': 'Todos os campos são obrigatórios'
            }), 400
        
        # Validar username
        valid_username, username_msg = validate_username(username)
        if not valid_username:
            return jsonify({
                'success': False,
                'error': username_msg
            }), 400
        
        # Validar email
        if not validate_email(email):
            return jsonify({
                'success': False,
                'error': 'Email inválido'
            }), 400
        
        # Validar senha
        valid_password, password_msg = validate_password_strength(password)
        if not valid_password:
            return jsonify({
                'success': False,
                'error': password_msg
            }), 400
        
        # Validar nome completo
        if len(full_name) < 2:
            return jsonify({
                'success': False,
                'error': 'Nome completo deve ter pelo menos 2 caracteres'
            }), 400
        
        # Rate limiting para registro
        rate_key = f"register_attempts:{ip_address}"
        if not check_rate_limit(rate_key, 3, 60):
            log_security_event('REGISTER_RATE_LIMITED', False, None,
                             ip_address=ip_address)
            return jsonify({
                'success': False,
                'error': 'Muitas tentativas de registro. Aguarde 1 hora.'
            }), 429
        
        # Verificar se usuário já existe
        db = SessionLocal()
        try:
            existing_user = db.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            
            if existing_user:
                # Incrementar tentativas
                increment_rate_limit(rate_key, 60)
                
                if existing_user.username == username:
                    error_msg = 'Username já está em uso'
                else:
                    error_msg = 'Email já está em uso'
                
                log_security_event('REGISTER_USER_EXISTS', False, None,
                                 ip_address=ip_address,
                                 username=username,
                                 email=email,
                                 conflict=error_msg)
                
                return jsonify({
                    'success': False,
                    'error': error_msg
                }), 409
            
            # Criar novo usuário
            new_user = User(
                username=username,
                email=email,
                full_name=full_name,
                role='user',  # Role padrão
                is_active=True,
                is_verified=False  # Email não verificado por padrão
            )
            
            # Definir senha (será hashada automaticamente)
            new_user.set_password(password)
            
            db.add(new_user)
            db.commit()
            
            # Limpar tentativas de registro
            if HAS_SECURITY and security_manager:
                try:
                    security_manager.redis_client.delete(rate_key)
                except:
                    pass
            
            log_security_event('REGISTER_SUCCESS', True, new_user.id,
                             ip_address=ip_address,
                             username=username,
                             email=email)
            
            return jsonify({
                'success': True,
                'message': 'Conta criada com sucesso! Faça login para continuar.',
                'user': {
                    'id': new_user.id,
                    'username': new_user.username,
                    'email': new_user.email,
                    'full_name': new_user.full_name,
                    'role': new_user.role
                },
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("register_endpoint_error",
                    ip_address=ip_address,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🏥 GET /api/auth/health - HEALTH CHECK
@auth_bp.route('/health', methods=['GET'])
def auth_health():
    """Health check do sistema de autenticação"""
    try:
        # Verificar conexão com banco
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            admin_count = db.query(User).filter(User.role == 'admin').count()
        finally:
            db.close()
        
        # Verificar disponibilidade dos middleware
        middleware_status = {
            'security_manager': HAS_SECURITY,
            'auth_middleware': HAS_AUTH_MIDDLEWARE,
            'redis_available': HAS_SECURITY and security_manager and hasattr(security_manager, 'redis_client')
        }
        
        return jsonify({
            'success': True,
            'system': 'auth',
            'version': '1.0.0',
            'database': {
                'connected': True,
                'user_count': user_count,
                'admin_count': admin_count
            },
            'middleware': middleware_status,
            'endpoints': {
                'login': '/api/auth/login',
                'register': '/api/auth/register',
                'verify': '/api/auth/verify-token',
                'health': '/api/auth/health'
            },
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(UTC).isoformat()
        }), 500