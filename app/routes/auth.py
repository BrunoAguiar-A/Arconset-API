# 📁 backend/routes/auth.py - ROTAS DE AUTENTICAÇÃO
import os
from flask import Blueprint, request, jsonify, g
from datetime import UTC, datetime, timedelta
from werkzeug.security import check_password_hash
import structlog
import re

# Importar dependências
from database import SessionLocal
from models.user import User
from app.middleware.security import security_manager, log_security_event
from app.middleware.auth_middleware import auth_required, admin_required, get_current_user_id, validate_token_for_verification


# Configurar logger
logger = structlog.get_logger()

# Criar blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

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
        if not security_manager.redis_client.exists(rate_key):
            security_manager.redis_client.setex(rate_key, 300, 0)  # 5 minutos
        
        attempts = int(security_manager.redis_client.get(rate_key) or 0)
        if attempts >= 5:
            log_security_event('LOGIN_RATE_LIMITED', False, None,
                             ip_address=ip_address,
                             attempts=attempts)
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
                security_manager.redis_client.incr(rate_key)
                
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
                security_manager.redis_client.incr(rate_key)
                
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
            
            # Token com validade de 8 horas
            token = security_manager.generate_jwt_token(token_payload, expires_hours=8)
            
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
            security_manager.redis_client.delete(rate_key)
            
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
        if not security_manager.redis_client.exists(rate_key):
            security_manager.redis_client.setex(rate_key, 3600, 0)  # 1 hora
        
        attempts = int(security_manager.redis_client.get(rate_key) or 0)
        if attempts >= 3:
            log_security_event('REGISTER_RATE_LIMITED', False, None,
                             ip_address=ip_address,
                             attempts=attempts)
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
                security_manager.redis_client.incr(rate_key)
                
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
            security_manager.redis_client.delete(rate_key)
            
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

# 👨‍💼 GET /api/auth/profile - PERFIL DO USUÁRIO
@auth_bp.route('/profile', methods=['GET'])
@auth_required()
def get_profile():
    """Obter perfil do usuário autenticado"""
    user_id = get_current_user_id()
    
    try:
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
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            
            log_security_event('PROFILE_VIEWED', True, user_id)
            
            return jsonify({
                'success': True,
                'user': user_data,
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("profile_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# ✏️ PUT /api/auth/profile - ATUALIZAR PERFIL
@auth_bp.route('/profile', methods=['PUT'])
@auth_required()
def update_profile():
    """Atualizar perfil do usuário"""
    user_id = get_current_user_id()
    
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type deve ser application/json'
            }), 400
        
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
            
            # Campos que podem ser atualizados
            updated_fields = []
            
            # Email
            if 'email' in data:
                new_email = data['email'].strip().lower()
                if new_email != user.email:
                    if not validate_email(new_email):
                        return jsonify({
                            'success': False,
                            'error': 'Email inválido'
                        }), 400
                    
                    # Verificar se email já existe
                    existing = db.query(User).filter(
                        User.email == new_email,
                        User.id != user_id
                    ).first()
                    
                    if existing:
                        return jsonify({
                            'success': False,
                            'error': 'Email já está em uso'
                        }), 409
                    
                    user.email = new_email
                    user.is_verified = False  # Requerer nova verificação
                    updated_fields.append('email')
            
            # Nome completo
            if 'full_name' in data:
                new_full_name = data['full_name'].strip()
                if len(new_full_name) < 2:
                    return jsonify({
                        'success': False,
                        'error': 'Nome completo deve ter pelo menos 2 caracteres'
                    }), 400
                
                if new_full_name != user.full_name:
                    user.full_name = new_full_name
                    updated_fields.append('full_name')
            
            if updated_fields:
                db.commit()
                
                log_security_event('PROFILE_UPDATED', True, user_id,
                                 updated_fields=updated_fields)
                
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
                
                return jsonify({
                    'success': True,
                    'message': 'Perfil atualizado com sucesso',
                    'user': user_data,
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
        logger.error("update_profile_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🔒 POST /api/auth/change-password - ALTERAR SENHA
@auth_bp.route('/change-password', methods=['POST'])
@auth_required()
def change_password():
    """Alterar senha do usuário"""
    user_id = get_current_user_id()
    
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados não fornecidos'
            }), 400
        
        current_password = data.get('currentPassword', '')
        new_password = data.get('newPassword', '')
        confirm_password = data.get('confirmPassword', '')
        
        if not all([current_password, new_password, confirm_password]):
            return jsonify({
                'success': False,
                'error': 'Todos os campos são obrigatórios'
            }), 400
        
        if new_password != confirm_password:
            return jsonify({
                'success': False,
                'error': 'Nova senha e confirmação não conferem'
            }), 400
        
        # Validar nova senha
        valid_password, password_msg = validate_password_strength(new_password)
        if not valid_password:
            return jsonify({
                'success': False,
                'error': password_msg
            }), 400
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            # Verificar senha atual
            if not user.check_password(current_password):
                log_security_event('PASSWORD_CHANGE_INVALID_CURRENT', False, user_id)
                return jsonify({
                    'success': False,
                    'error': 'Senha atual incorreta'
                }), 401
            
            # Definir nova senha
            user.set_password(new_password)
            db.commit()
            
            log_security_event('PASSWORD_CHANGED', True, user_id)
            
            return jsonify({
                'success': True,
                'message': 'Senha alterada com sucesso',
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("change_password_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🚪 POST /api/auth/logout - LOGOUT
@auth_bp.route('/logout', methods=['POST'])
@auth_required()
def logout():
    """Fazer logout do usuário"""
    user_id = get_current_user_id()
    
    try:
        # Extrair token do header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            # Revogar token específico
            if security_manager.revoke_jwt_token(token):
                log_security_event('LOGOUT_TOKEN_REVOKED', True, user_id)
            else:
                log_security_event('LOGOUT_TOKEN_REVOKE_FAILED', False, user_id)
        
        # Limpar todas as sessões bancárias do usuário
        pattern = f"bank_session:{user_id}:*"
        revoked_sessions = 0
        
        for key in security_manager.redis_client.scan_iter(match=pattern):
            security_manager.redis_client.delete(key)
            revoked_sessions += 1
        
        log_security_event('LOGOUT_SUCCESS', True, user_id,
                          revoked_bank_sessions=revoked_sessions)
        
        return jsonify({
            'success': True,
            'message': 'Logout realizado com sucesso',
            'revokedBankSessions': revoked_sessions,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("logout_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 👥 GET /api/auth/users - LISTAR USUÁRIOS (ADMIN ONLY)
@auth_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """Listar todos os usuários (apenas admin)"""
    admin_id = get_current_user_id()
    
    try:
        db = SessionLocal()
        try:
            users = db.query(User).all()
            
            users_data = []
            for user in users:
                users_data.append({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role,
                    'is_active': user.is_active,
                    'is_verified': user.is_verified,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None
                })
            
            log_security_event('ADMIN_USERS_LISTED', True, admin_id,
                             users_count=len(users_data))
            
            return jsonify({
                'success': True,
                'users': users_data,
                'total': len(users_data),
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("list_users_endpoint_error",
                    admin_id=admin_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🔧 PUT /api/auth/users/{user_id} - ATUALIZAR USUÁRIO (ADMIN ONLY)
@auth_bp.route('/users/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Atualizar usuário específico (apenas admin)"""
    admin_id = get_current_user_id()
    
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type deve ser application/json'
            }), 400
        
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
            
            # Role
            if 'role' in data:
                new_role = data['role']
                if new_role in ['admin', 'manager', 'user']:
                    if new_role != user.role:
                        user.role = new_role
                        updated_fields.append('role')
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Role inválido'
                    }), 400
            
            # Status ativo
            if 'is_active' in data:
                new_is_active = bool(data['is_active'])
                if new_is_active != user.is_active:
                    user.is_active = new_is_active
                    updated_fields.append('is_active')
            
            # Verificado
            if 'is_verified' in data:
                new_is_verified = bool(data['is_verified'])
                if new_is_verified != user.is_verified:
                    user.is_verified = new_is_verified
                    updated_fields.append('is_verified')
            
            if updated_fields:
                db.commit()
                
                log_security_event('ADMIN_USER_UPDATED', True, admin_id,
                                 target_user_id=user_id,
                                 updated_fields=updated_fields)
                
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
                
                return jsonify({
                    'success': True,
                    'message': 'Usuário atualizado com sucesso',
                    'user': user_data,
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
        logger.error("update_user_endpoint_error",
                    admin_id=admin_id,
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🗑️ DELETE /api/auth/users/{user_id} - DELETAR USUÁRIO (ADMIN ONLY)
@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Deletar usuário específico (apenas admin)"""
    admin_id = get_current_user_id()
    
    try:
        # Verificar confirmação
        confirm_delete = request.headers.get('X-Confirm-Delete')
        if confirm_delete != 'true':
            return jsonify({
                'success': False,
                'error': 'Confirmação de exclusão requerida no header X-Confirm-Delete'
            }), 400
        
        # Não permitir auto-exclusão
        if user_id == admin_id:
            return jsonify({
                'success': False,
                'error': 'Não é possível deletar sua própria conta'
            }), 400
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            # Salvar dados para log
            deleted_user_data = {
                'username': user.username,
                'email': user.email,
                'role': user.role
            }
            
            # Limpar dados de autenticação do usuário
            from app.middleware.auth_middleware import cleanup_user_auth_data
            cleanup_result = cleanup_user_auth_data(user_id)
            
            # Deletar usuário
            db.delete(user)
            db.commit()
            
            log_security_event('ADMIN_USER_DELETED', True, admin_id,
                             target_user_id=user_id,
                             deleted_user=deleted_user_data,
                             auth_cleanup=cleanup_result)
            
            return jsonify({
                'success': True,
                'message': f'Usuário {deleted_user_data["username"]} deletado com sucesso',
                'authCleanup': cleanup_result,
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("delete_user_endpoint_error",
                    admin_id=admin_id,
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 📁 routes/auth.py - CORREÇÃO DO ENDPOINT VERIFY-TOKEN

# Adicionar esta import no topo do arquivo auth.py:
from app.middleware.auth_middleware import validate_token_for_verification

# Substituir o endpoint verify-token existente por esta versão corrigida:

# 🔍 GET /api/auth/verify-token - VERIFICAR TOKEN CORRIGIDO
@auth_bp.route('/verify-token', methods=['GET'])
def verify_token():
    """Verificar se token é válido - VERSÃO CORRIGIDA PARA PRODUÇÃO"""
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
        
        # Usar função de validação robusta
        is_valid, user_data, error_message = validate_token_for_verification(token)
        
        if is_valid and user_data:
            log_security_event('TOKEN_VERIFICATION_SUCCESS', True, user_data['id'])
            
            return jsonify({
                'success': True,
                'valid': True,
                'user': {
                    'id': user_data['id'],
                    'username': user_data['username'],
                    'email': user_data['email'],
                    'full_name': user_data['full_name'],
                    'role': user_data['role'],
                    'is_active': user_data['is_active'],
                    'is_verified': user_data['is_verified']
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

# 📊 GET /api/auth/stats - ESTATÍSTICAS DE AUTENTICAÇÃO (ADMIN ONLY)
@auth_bp.route('/stats', methods=['GET'])
@admin_required
def auth_stats():
    """Obter estatísticas de autenticação (apenas admin)"""
    admin_id = get_current_user_id()
    
    try:
        db = SessionLocal()
        try:
            # Estatísticas básicas
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            verified_users = db.query(User).filter(User.is_verified == True).count()
            admin_users = db.query(User).filter(User.role == 'admin').count()
            manager_users = db.query(User).filter(User.role == 'manager').count()
            regular_users = db.query(User).filter(User.role == 'user').count()
            
            # Usuários criados nas últimas 24h
            last_24h = datetime.now(UTC) - timedelta(hours=24)
            new_users_24h = db.query(User).filter(User.created_at >= last_24h).count()
            
            # Últimos logins nas últimas 24h
            recent_logins = db.query(User).filter(
                User.last_login >= last_24h
            ).count() if last_24h else 0
            
            stats = {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users,
                'verified_users': verified_users,
                'unverified_users': total_users - verified_users,
                'users_by_role': {
                    'admin': admin_users,
                    'manager': manager_users,
                    'user': regular_users
                },
                'new_users_24h': new_users_24h,
                'recent_logins_24h': recent_logins,
                'system_health': {
                    'database_connected': True,
                    'redis_connected': bool(security_manager.redis_client.ping()),
                    'jwt_configured': bool(security_manager.jwt_secret)
                }
            }
            
            log_security_event('ADMIN_AUTH_STATS_VIEWED', True, admin_id)
            
            return jsonify({
                'success': True,
                'stats': stats,
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("auth_stats_endpoint_error",
                    admin_id=admin_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

# 🔄 POST /api/auth/refresh - RENOVAR TOKEN
@auth_bp.route('/refresh', methods=['POST'])
@auth_required()
def refresh_token():
    """Renovar token de autenticação"""
    user_id = get_current_user_id()
    
    try:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            
            if not user or not user.is_active:
                return jsonify({
                    'success': False,
                    'error': 'Usuário inativo'
                }), 401
            
            # Gerar novo token
            token_payload = {
                'user_id': user.id,
                'username': user.username,
                'role': user.role,
                'refresh_time': datetime.now(UTC).isoformat(),
                'ip_address': request.remote_addr
            }
            
            new_token = security_manager.generate_jwt_token(token_payload, expires_hours=8)
            
            if not new_token:
                return jsonify({
                    'success': False,
                    'error': 'Erro ao gerar token'
                }), 500
            
            log_security_event('TOKEN_REFRESHED', True, user_id)
            
            return jsonify({
                'success': True,
                'token': new_token,
                'expiresIn': 8 * 60 * 60,  # 8 horas em segundos
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
        
    except Exception as e:
        logger.error("refresh_token_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
    # 🗑️ DELETE /api/auth/delete-default-admin - DELETAR ADMIN PADRÃO (TEMPORÁRIO)
@auth_bp.route('/delete-default-admin', methods=['DELETE'])
def delete_default_admin():
    """Deletar usuário admin padrão (apenas para migração)"""
    try:
        db = SessionLocal()
        try:
            # Buscar admin padrão
            admin = db.query(User).filter(
                User.username == 'admin',
                User.email == 'admin@arconset.com.br'
            ).first()
            
            if admin:
                # Limpar todos os tokens deste usuário
                if security_manager:
                    pattern = f"jwt:*{admin.id}*"
                    keys = security_manager.redis_client.keys(pattern)
                    if keys:
                        security_manager.redis_client.delete(*keys)
                
                # Deletar o usuário
                db.delete(admin)
                db.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Admin padrão deletado com sucesso',
                    'deleted_user': {
                        'id': admin.id,
                        'username': admin.username,
                        'email': admin.email
                    },
                    'tokens_revoked': len(keys) if keys else 0
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Admin padrão não encontrado'
                }), 404
                
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro ao deletar admin: {str(e)}'
        }), 500
    # 🧹 POST /api/auth/clear-all-tokens - LIMPAR TODOS OS TOKENS
@auth_bp.route('/clear-all-tokens', methods=['POST'])
def clear_all_tokens():
    """Limpar todos os tokens JWT (força logout geral)"""
    try:
        if not security_manager:
            return jsonify({
                'success': False,
                'error': 'SecurityManager não disponível'
            }), 500
            
        # Limpar todos os tokens JWT
        jwt_keys = security_manager.redis_client.keys("jwt:*")
        session_keys = security_manager.redis_client.keys("session:*")
        
        cleared_count = 0
        
        if jwt_keys:
            security_manager.redis_client.delete(*jwt_keys)
            cleared_count += len(jwt_keys)
            
        if session_keys:
            security_manager.redis_client.delete(*session_keys)
            cleared_count += len(session_keys)
        
        return jsonify({
            'success': True,
            'message': 'Todos os tokens foram invalidados',
            'jwt_tokens_cleared': len(jwt_keys) if jwt_keys else 0,
            'sessions_cleared': len(session_keys) if session_keys else 0,
            'total_cleared': cleared_count
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro ao limpar tokens: {str(e)}'
        }), 500
    
@auth_bp.route('/debug-token', methods=['POST'])
def debug_token():
    """Debug detalhado de token (apenas desenvolvimento)"""
    
    # Verificar se está em modo de desenvolvimento
    if not os.getenv('DEBUG', 'False').lower() == 'true':
        return jsonify({
            'success': False,
            'error': 'Endpoint disponível apenas em desenvolvimento'
        }), 403
    
    try:
        # Extrair token do header
        auth_header = request.headers.get('Authorization')
        
        debug_info = {
            'auth_header_present': bool(auth_header),
            'auth_header_format': None,
            'token_present': False,
            'token_length': 0,
            'token_preview': None,
            'jwt_valid': False,
            'jwt_payload': None,
            'jwt_error': None,
            'user_exists': False,
            'user_active': False,
            'security_manager_active': security_manager is not None,
            'timestamp': datetime.now(UTC).isoformat()
        }
        
        if not auth_header:
            debug_info['error'] = 'Header Authorization não encontrado'
            return jsonify({
                'success': False,
                'valid': False,
                'debug': debug_info
            })
        
        debug_info['auth_header_format'] = 'Bearer' if auth_header.startswith('Bearer ') else 'Invalid'
        
        if not auth_header.startswith('Bearer '):
            debug_info['error'] = 'Header Authorization deve começar com "Bearer "'
            return jsonify({
                'success': False,
                'valid': False,
                'debug': debug_info
            })
        
        # Extrair token
        try:
            token = auth_header.split(' ')[1]
            debug_info['token_present'] = True
            debug_info['token_length'] = len(token)
            debug_info['token_preview'] = token[:20] + '...' if len(token) > 20 else token
        except IndexError:
            debug_info['error'] = 'Token malformado no header'
            return jsonify({
                'success': False,
                'valid': False,
                'debug': debug_info
            })
        
        # Verificar token JWT
        try:
            payload = security_manager.verify_jwt_token(token)
            debug_info['jwt_valid'] = True
            debug_info['jwt_payload'] = {
                'user_id': payload.get('user_id'),
                'username': payload.get('username'),
                'role': payload.get('role'),
                'exp': payload.get('exp'),
                'iat': payload.get('iat'),
                'jti': payload.get('jti', '')[:8] + '...' if payload.get('jti') else None
            }
        except Exception as e:
            debug_info['jwt_valid'] = False
            debug_info['jwt_error'] = str(e)
            
            return jsonify({
                'success': False,
                'valid': False,
                'debug': debug_info,
                'error': f'Token JWT inválido: {str(e)}'
            })
        
        # Verificar usuário no banco
        user_id = payload.get('user_id')
        if user_id:
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                debug_info['user_exists'] = user is not None
                
                if user:
                    debug_info['user_active'] = user.is_active
                    debug_info['user_info'] = {
                        'id': user.id,
                        'username': user.username,
                        'role': user.role,
                        'is_active': user.is_active,
                        'is_verified': user.is_verified
                    }
                
            finally:
                db.close()
        
        # Resultado final
        is_valid = (
            debug_info['jwt_valid'] and 
            debug_info['user_exists'] and 
            debug_info['user_active']
        )
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'debug': debug_info,
            'message': 'Token válido' if is_valid else 'Token inválido'
        })
        
    except Exception as e:
        logger.error("debug_token_endpoint_error", error=str(e))
        
        return jsonify({
            'success': False,
            'valid': False,
            'error': f'Erro no debug: {str(e)}',
            'debug': {
                'error_type': type(e).__name__,
                'error_message': str(e)
            }
        }), 500
    
@auth_bp.route('/test-complete', methods=['GET'])
def test_complete_auth_system():
    """Teste completo do sistema de autenticação com diagnóstico detalhado"""
    
    test_results = {
        'timestamp': datetime.now(UTC).isoformat(),
        'overall_success': False,
        'tests': {}
    }
    
    # 1. Teste de conexão com banco
    print("🧪 Testando conexão com banco...")
    try:
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            test_results['tests']['database_connection'] = {
                'success': True,
                'user_count': user_count,
                'message': f'Banco conectado, {user_count} usuários encontrados'
            }
        finally:
            db.close()
    except Exception as e:
        test_results['tests']['database_connection'] = {
            'success': False,
            'error': str(e),
            'message': 'Falha na conexão com banco'
        }
    
    # 2. Teste de criação de usuário temporário
    print("🧪 Testando criação de usuário...")
    temp_user_id = None
    try:
        db = SessionLocal()
        try:
            # Verificar se usuário de teste já existe
            existing_test_user = db.query(User).filter(User.username == 'test_temp_user').first()
            if existing_test_user:
                db.delete(existing_test_user)
                db.commit()
            
            # Criar usuário temporário
            temp_user = User(
                username='test_temp_user',
                email='test@temp.com',
                full_name='Test Temp User',
                role='user',
                is_active=True
            )
            temp_user.set_password('temp123')
            
            db.add(temp_user)
            db.commit()
            temp_user_id = temp_user.id
            
            # Testar verificação de senha
            password_check = temp_user.check_password('temp123')
            wrong_password_check = temp_user.check_password('wrong_password')
            
            test_results['tests']['user_creation'] = {
                'success': True,
                'user_id': temp_user_id,
                'password_check': password_check,
                'wrong_password_rejected': not wrong_password_check,
                'message': 'Usuário criado e senha verificada com sucesso'
            }
            
        finally:
            db.close()
            
    except Exception as e:
        test_results['tests']['user_creation'] = {
            'success': False,
            'error': str(e),
            'message': 'Falha ao criar usuário temporário'
        }
    
    # 3. Teste de geração de JWT
    print("🧪 Testando geração de JWT...")
    test_token = None
    try:
        if security_manager and temp_user_id:
            token_payload = {
                'user_id': temp_user_id,
                'username': 'test_temp_user',
                'role': 'user'
            }
            
            test_token = security_manager.generate_jwt_token(token_payload, expires_hours=1)
            
            test_results['tests']['jwt_generation'] = {
                'success': bool(test_token),
                'token_length': len(test_token) if test_token else 0,
                'token_preview': test_token[:20] + '...' if test_token else None,
                'message': 'Token JWT gerado com sucesso' if test_token else 'Falha ao gerar token'
            }
        else:
            test_results['tests']['jwt_generation'] = {
                'success': False,
                'error': 'SecurityManager não disponível ou usuário não criado',
                'message': 'Não foi possível testar geração de JWT'
            }
            
    except Exception as e:
        test_results['tests']['jwt_generation'] = {
            'success': False,
            'error': str(e),
            'message': 'Erro ao gerar token JWT'
        }
    
    # 4. Teste de verificação de JWT
    print("🧪 Testando verificação de JWT...")
    try:
        if security_manager and test_token:
            verified_payload = security_manager.verify_jwt_token(test_token)
            
            payload_valid = (
                verified_payload and
                verified_payload.get('user_id') == temp_user_id and
                verified_payload.get('username') == 'test_temp_user'
            )
            
            test_results['tests']['jwt_verification'] = {
                'success': payload_valid,
                'verified_user_id': verified_payload.get('user_id') if verified_payload else None,
                'verified_username': verified_payload.get('username') if verified_payload else None,
                'message': 'Token verificado com sucesso' if payload_valid else 'Token inválido'
            }
        else:
            test_results['tests']['jwt_verification'] = {
                'success': False,
                'error': 'Token não foi gerado ou SecurityManager indisponível',
                'message': 'Não foi possível testar verificação de JWT'
            }
            
    except Exception as e:
        test_results['tests']['jwt_verification'] = {
            'success': False,
            'error': str(e),
            'message': 'Erro ao verificar token JWT'
        }
    
    # 5. Teste de middleware de autenticação
    print("🧪 Testando middleware de autenticação...")
    try:
        if test_token:
            # Simular requisição com token
            from flask import Flask
            from unittest.mock import Mock
            
            # Criar um mock request
            mock_request = Mock()
            mock_request.headers = {'Authorization': f'Bearer {test_token}'}
            mock_request.endpoint = 'test_endpoint'
            mock_request.remote_addr = '127.0.0.1'
            
            # Não vamos executar o middleware completo aqui por segurança
            # Apenas verificar se o token seria aceito pelo verify_jwt_token
            payload = security_manager.verify_jwt_token(test_token)
            
            test_results['tests']['middleware_auth'] = {
                'success': bool(payload),
                'payload_received': bool(payload),
                'message': 'Middleware aceitaria o token' if payload else 'Middleware rejeitaria o token'
            }
        else:
            test_results['tests']['middleware_auth'] = {
                'success': False,
                'error': 'Nenhum token disponível para teste',
                'message': 'Não foi possível testar middleware'
            }
            
    except Exception as e:
        test_results['tests']['middleware_auth'] = {
            'success': False,
            'error': str(e),
            'message': 'Erro ao testar middleware'
        }
    
    # 6. Teste de Redis (se disponível)
    print("🧪 Testando Redis...")
    try:
        if security_manager and hasattr(security_manager, 'redis_client'):
            # Testar operações básicas do Redis
            security_manager.redis_client.set('test_key', 'test_value', ex=60)
            retrieved_value = security_manager.redis_client.get('test_key')
            security_manager.redis_client.delete('test_key')
            
            test_results['tests']['redis'] = {
                'success': retrieved_value == 'test_value',
                'ping_success': security_manager.redis_client.ping(),
                'message': 'Redis funcionando corretamente'
            }
        else:
            test_results['tests']['redis'] = {
                'success': False,
                'error': 'Redis não configurado',
                'message': 'Redis não está disponível'
            }
            
    except Exception as e:
        test_results['tests']['redis'] = {
            'success': False,
            'error': str(e),
            'message': 'Erro ao testar Redis'
        }
    
    # 7. Limpeza - Remover usuário temporário
    print("🧪 Limpando dados de teste...")
    try:
        if temp_user_id:
            db = SessionLocal()
            try:
                temp_user = db.query(User).filter(User.id == temp_user_id).first()
                if temp_user:
                    db.delete(temp_user)
                    db.commit()
                
                test_results['tests']['cleanup'] = {
                    'success': True,
                    'message': 'Usuário temporário removido com sucesso'
                }
            finally:
                db.close()
    except Exception as e:
        test_results['tests']['cleanup'] = {
            'success': False,
            'error': str(e),
            'message': 'Erro ao limpar dados de teste'
        }
    
    # Calcular sucesso geral
    critical_tests = ['database_connection', 'user_creation', 'jwt_generation', 'jwt_verification']
    critical_success = all(
        test_results['tests'].get(test, {}).get('success', False) 
        for test in critical_tests
        if test in test_results['tests']
    )
    
    test_results['overall_success'] = critical_success
    test_results['summary'] = {
        'total_tests': len(test_results['tests']),
        'passed_tests': sum(1 for test in test_results['tests'].values() if test.get('success', False)),
        'critical_tests_passed': critical_success,
        'message': 'Sistema de autenticação funcionando corretamente' if critical_success else 'Sistema de autenticação com problemas'
    }
    
    # Status HTTP
    status_code = 200 if critical_success else 500
    
    return jsonify({
        'success': critical_success,
        'test_results': test_results,
        'timestamp': datetime.now(UTC).isoformat()
    }), status_code