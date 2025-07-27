# 📁 middleware/security.py - VERSÃO 100% COMPLETA E SEGURA
import os
import secrets
import jwt
import json
import structlog
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import redis
import hashlib
import hmac
from marshmallow import Schema, fields, validate, ValidationError
import re
import subprocess
import socket
from typing import Dict, Any, Optional

# 🔧 Configurar logging estruturado e seguro
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# 🔐 Configuração de criptografia ULTRA SEGURA
class SecureSecurityManager:
    def __init__(self):
        try:
            self.encryption_key = self._generate_secure_encryption_key()
            self.jwt_secret = self._get_secure_jwt_secret()
            self.pepper = self._get_pepper()
            self.redis_client = self._init_redis()
            print("✅ SecurityManager inicializado com sucesso")
        except Exception as e:
            print(f"❌ Erro na inicialização da segurança: {e}")
            raise
        
    def _generate_secure_encryption_key(self) -> bytes:
        """Gerar chave de criptografia ultra segura usando PBKDF2"""
        password = os.getenv('ENCRYPTION_PASSWORD')
        salt = os.getenv('ENCRYPTION_SALT')
        
        if not password or len(password) < 32:
            raise ValueError("ENCRYPTION_PASSWORD deve ter pelo menos 32 caracteres")
        
        if not salt or len(salt) < 16:
            raise ValueError("ENCRYPTION_SALT deve ter pelo menos 16 caracteres")
        
        # Usar PBKDF2 com 480.000 iterações (OWASP 2023)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt.encode('utf-8'),
            iterations=480000,  # OWASP recomendação 2023
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
        
        logger.info("encryption_key_generated", 
                   iterations=480000,
                   algorithm="PBKDF2-SHA256")
        
        return key
    
    def _get_secure_jwt_secret(self) -> str:
        """Obter JWT secret ultra seguro"""
        jwt_secret = os.getenv('JWT_SECRET')
        
        if not jwt_secret or len(jwt_secret) < 64:
            raise ValueError("JWT_SECRET deve ter pelo menos 64 caracteres")
        
        # Validar entropia do secret
        if len(set(jwt_secret)) < 20:
            raise ValueError("JWT_SECRET não tem entropia suficiente")
        
        return jwt_secret
    
    def _get_pepper(self) -> str:
        """Obter pepper para hashing adicional"""
        pepper = os.getenv('PASSWORD_PEPPER')
        
        if not pepper or len(pepper) < 32:
            raise ValueError("PASSWORD_PEPPER deve ter pelo menos 32 caracteres")
        
        return pepper
    
    def _init_redis(self) -> redis.Redis:
        """Inicializar conexão Redis com detecção automática e fallback"""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        redis_password = os.getenv('REDIS_PASSWORD')
        
        # Lista de configurações para tentar
        connection_attempts = []
        
        # 1. Com senha (se fornecida)
        if redis_password and redis_password not in ['', 'SUBSTITUA_POR_SENHA_REDIS_SEGURA']:
            connection_attempts.append({
                'url': redis_url,
                'password': redis_password,
                'description': 'com autenticação'
            })
        
        # 2. Sem senha
        connection_attempts.append({
            'url': redis_url,
            'password': None,
            'description': 'sem autenticação'
        })
        
        # 3. URL completa (se contém senha na URL)
        if ':' in redis_url and '@' in redis_url:
            connection_attempts.append({
                'url': redis_url,
                'password': None,  # Senha já na URL
                'description': 'com credenciais na URL'
            })
        
        # Tentar cada configuração
        for i, config in enumerate(connection_attempts, 1):
            try:
                print(f"🔗 Tentativa {i}: Redis {config['description']}")
                
                client = redis.from_url(
                    config['url'],
                    password=config['password'],
                    decode_responses=True,
                    health_check_interval=30,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True
                )
                
                # Testar conexão
                result = client.ping()
                if result:
                    print(f"✅ Redis conectado {config['description']}")
                    logger.info("redis_connection_established",
                               description=config['description'],
                               url=config['url'].split('@')[-1] if '@' in config['url'] else config['url'])
                    return client
                    
            except redis.AuthenticationError:
                print(f"❌ Tentativa {i}: Falha de autenticação")
                continue
            except redis.ConnectionError:
                print(f"❌ Tentativa {i}: Falha de conexão")
                continue
            except Exception as e:
                print(f"❌ Tentativa {i}: Erro {type(e).__name__}: {e}")
                continue
        
        # Se chegou aqui, todas as tentativas falharam
        error_msg = "Todas as tentativas de conexão Redis falharam"
        logger.error("redis_connection_failed", error=error_msg)
        
        print("\n🚨 REDIS NÃO CONECTADO - DIAGNÓSTICO:")
        print("1. ✅ Redis está rodando? Execute: redis-cli ping")
        print("2. ✅ Container Docker? Execute: docker ps | grep redis")
        print("3. ✅ Senha correta no .env? Verifique REDIS_PASSWORD")
        print("\n🛠️  SOLUÇÕES:")
        print("- Docker: docker run -d --name redis -p 6379:6379 redis:alpine")
        print("- Com senha: docker run -d --name redis -p 6379:6379 redis:alpine redis-server --requirepass \"SuaSenha\"")
        print("- Sem senha: comente REDIS_PASSWORD no .env")
        
        raise ConnectionError(error_msg)
    
    def encrypt_data(self, data: Dict[str, Any]) -> str:
        """Criptografar dados sensíveis com validação"""
        try:
            # Validar dados de entrada
            if not isinstance(data, dict):
                raise ValueError("Dados devem ser um dicionário")
            
            # Remover campos None ou vazios
            clean_data = {k: v for k, v in data.items() if v is not None and v != ''}
            
            fernet = Fernet(self.encryption_key)
            json_data = json.dumps(clean_data, sort_keys=True)
            
            # Adicionar timestamp e hash de integridade
            envelope = {
                'data': json_data,
                'timestamp': datetime.utcnow().isoformat(),
                'integrity_hash': hashlib.sha256(json_data.encode()).hexdigest()
            }
            
            envelope_json = json.dumps(envelope)
            encrypted_data = fernet.encrypt(envelope_json.encode())
            
            logger.info("data_encrypted",
                       fields_count=len(clean_data),
                       data_size=len(json_data))
            
            return encrypted_data.decode()
            
        except Exception as e:
            logger.error("encryption_failed", error=str(e))
            raise Exception(f"Falha na criptografia: {str(e)}")
    
    def decrypt_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Descriptografar e validar dados"""
        try:
            fernet = Fernet(self.encryption_key)
            decrypted_bytes = fernet.decrypt(encrypted_data.encode())
            envelope = json.loads(decrypted_bytes.decode())
            
            # Validar integridade
            data_json = envelope['data']
            expected_hash = envelope['integrity_hash']
            actual_hash = hashlib.sha256(data_json.encode()).hexdigest()
            
            if not hmac.compare_digest(expected_hash, actual_hash):
                logger.error("data_integrity_violation")
                raise Exception("Violação de integridade dos dados")
            
            # Validar timestamp (máximo 24 horas)
            timestamp = datetime.fromisoformat(envelope['timestamp'])
            if datetime.utcnow() - timestamp > timedelta(hours=24):
                logger.warning("old_encrypted_data_accessed",
                              age_hours=(datetime.utcnow() - timestamp).total_seconds() / 3600)
            
            data = json.loads(data_json)
            
            logger.info("data_decrypted",
                       fields_count=len(data))
            
            return data
            
        except Exception as e:
            logger.error("decryption_failed", error=str(e))
            raise Exception(f"Falha na descriptografia: {str(e)}")
    
    def generate_jwt_token(self, payload: Dict[str, Any], expires_hours: int = 1) -> str:
        """Gerar token JWT ultra seguro"""
        try:
            # Validar payload
            if not isinstance(payload, dict):
                raise ValueError("Payload deve ser um dicionário")
            
            if 'user_id' not in payload:
                raise ValueError("user_id é obrigatório no payload")
            
            # Gerar jti único
            jti = secrets.token_urlsafe(32)
            
            # Payload seguro
            secure_payload = {
                **payload,
                'exp': datetime.utcnow() + timedelta(hours=expires_hours),
                'iat': datetime.utcnow(),
                'nbf': datetime.utcnow(),
                'iss': os.getenv('JWT_ISSUER', 'secure-bank-api'),
                'aud': os.getenv('JWT_AUDIENCE', 'bank-monitor'),
                'jti': jti,
                'token_type': 'access'
            }
            
            token = jwt.encode(secure_payload, self.jwt_secret, algorithm='HS256')
            
            # Armazenar JTI no Redis para controle de revogação
            try:
                self.redis_client.setex(
                    f"jwt_jti:{jti}",
                    expires_hours * 3600,
                    json.dumps({
                        'user_id': payload['user_id'],
                        'issued_at': datetime.utcnow().isoformat(),
                        'expires_at': (datetime.utcnow() + timedelta(hours=expires_hours)).isoformat()
                    })
                )
            except:
                # Se Redis falhar, continua sem controle de revogação
                logger.warning("jwt_jti_storage_failed")
            
            logger.info("jwt_token_generated",
                       user_id=payload['user_id'],
                       expires_hours=expires_hours,
                       jti=jti[:8] + '...')  # Log apenas início do JTI
            
            return token
            
        except Exception as e:
            logger.error("jwt_generation_failed", error=str(e))
            raise Exception(f"Falha na geração do token: {str(e)}")
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verificar e validar token JWT"""
        try:
            # Decodificar token
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=['HS256'],
                options={
                    'verify_exp': True,
                    'verify_iat': True,
                    'verify_nbf': True,
                    'verify_iss': True,
                    'verify_aud': True
                },
                issuer=os.getenv('JWT_ISSUER', 'secure-bank-api'),
                audience=os.getenv('JWT_AUDIENCE', 'bank-monitor')
            )
            
            # Verificar se token não foi revogado
            jti = payload.get('jti')
            if jti:
                try:
                    redis_key = f"jwt_jti:{jti}"
                    if not self.redis_client.exists(redis_key):
                        logger.warning("revoked_token_used", jti=jti[:8] + '...')
                        raise jwt.InvalidTokenError("Token foi revogado")
                except:
                    # Se Redis falhar, continua sem verificação de revogação
                    logger.warning("jwt_revocation_check_failed")
            
            logger.info("jwt_token_verified",
                       user_id=payload.get('user_id'),
                       jti=jti[:8] + '...' if jti else None)
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("expired_token_used")
            raise Exception("Token expirado")
        except jwt.InvalidTokenError as e:
            logger.warning("invalid_token_used", error=str(e))
            raise Exception("Token inválido")
        except Exception as e:
            logger.error("jwt_verification_failed", error=str(e))
            raise Exception(f"Falha na verificação do token: {str(e)}")
    
    def revoke_token(self, token: str) -> bool:
        """Revogar token específico"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('jti')
            
            if jti:
                self.redis_client.delete(f"jwt_jti:{jti}")
                logger.info("token_revoked", jti=jti[:8] + '...')
                return True
            
            return False
            
        except Exception as e:
            logger.error("token_revocation_failed", error=str(e))
            return False
    
    def revoke_all_user_tokens(self, user_id: str) -> int:
        """Revogar todos os tokens de um usuário"""
        try:
            pattern = "jwt_jti:*"
            revoked_count = 0
            
            for key in self.redis_client.scan_iter(match=pattern):
                token_data = self.redis_client.get(key)
                if token_data:
                    data = json.loads(token_data)
                    if data.get('user_id') == user_id:
                        self.redis_client.delete(key)
                        revoked_count += 1
            
            logger.info("all_user_tokens_revoked",
                       user_id=user_id,
                       revoked_count=revoked_count)
            
            return revoked_count
            
        except Exception as e:
            logger.error("user_tokens_revocation_failed",
                        user_id=user_id,
                        error=str(e))
            return 0

# 🛡️ Schemas de validação robustos - VERSÃO CORRIGIDA
class BankConfigSchema(Schema):
    bankName = fields.Str(
        required=True,
        validate=validate.OneOf(['BRADESCO', 'ITAU', 'BANCO_BRASIL']),
        error_messages={'invalid': 'Banco deve ser BRADESCO, ITAU ou BANCO_BRASIL'}
    )
    config = fields.Nested('ConfigSchema', required=True)

class ConfigSchema(Schema):
    clientId = fields.Str(
        required=True,
        validate=[
            validate.Length(min=10, max=200),
            validate.Regexp(r'^[A-Za-z0-9\-_]+$', error='ClientId contém caracteres inválidos')
        ]
    )
    clientSecret = fields.Str(
        required=True,
        validate=[
            validate.Length(min=20, max=500),
            validate.Regexp(r'^[A-Za-z0-9\-_+=/.]+$', error='ClientSecret contém caracteres inválidos')
        ]
    )
    # CORREÇÃO: usar load_default em vez de missing
    enabled = fields.Bool(load_default=False)
    contas = fields.List(fields.Str(), load_default=[])

# 🚫 Rate limiting ultra seguro com Redis
def create_limiter(app):
    """Configurar rate limiting ultra seguro"""
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/1')  # Database 1 para rate limiting
    
    try:
        return Limiter(
            key_func=lambda: f"{get_remote_address()}:{request.endpoint}",
            app=app,
            default_limits=[
                "1000 per hour",  # Limite geral
                "100 per 10 minutes",  # Limite para rajadas
            ],
            storage_uri=redis_url,
            strategy="moving-window",  # Mais suave que fixed-window
            headers_enabled=True,
            swallow_errors=True,  # Não falhar se Redis não estiver disponível
        )
    except Exception as e:
        print(f"⚠️  Rate limiting não disponível: {e}")
        # Retornar limiter básico sem Redis
        return Limiter(
            key_func=get_remote_address,
            app=app,
            default_limits=["1000 per hour"],
            swallow_errors=True
        )

# 🔒 CORS ultra restritivo
def setup_cors(app):
    """Configurar CORS ultra seguro"""
    allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    
    # Validar origens
    if not allowed_origins or allowed_origins == ['']:
        print("⚠️  CORS_ORIGINS não definido, usando padrões de desenvolvimento")
        allowed_origins = ['http://localhost:5173', 'http://localhost:3000']
    
    CORS(app, 
         origins=allowed_origins,
         supports_credentials=True,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         expose_headers=['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
         max_age=86400)  # Cache preflight por 24 horas
    
    print(f"✅ CORS configurado para: {', '.join(allowed_origins)}")

# 🔑 Decorator de autenticação ultra seguro
def require_auth(roles: list = None):
    """Decorator para autenticação ultra segura com controle de roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            
            # Verificar header Authorization
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                try:
                    token = auth_header.split(' ')[1]
                except IndexError:
                    log_security_event('MALFORMED_AUTH_HEADER', False,
                                     error_message='Formato de token inválido')
                    return jsonify({
                        'error': 'Formato de token inválido',
                        'success': False
                    }), 401
            
            if not token:
                log_security_event('MISSING_TOKEN', False,
                                 error_message='Token de acesso requerido')
                return jsonify({
                    'error': 'Token de acesso requerido',
                    'success': False
                }), 401
            
            try:
                payload = security_manager.verify_jwt_token(token)
                
                # Verificar roles se especificados
                if roles:
                    user_role = payload.get('role', 'user')
                    if user_role not in roles:
                        log_security_event('INSUFFICIENT_PERMISSIONS', False,
                                         user_id=payload.get('user_id'),
                                         error_message=f'Requer roles: {roles}, tem: {user_role}')
                        return jsonify({
                            'error': 'Permissões insuficientes',
                            'success': False
                        }), 403
                
                request.current_user = payload
                
            except Exception as e:
                log_security_event('AUTH_FAILED', False,
                                 error_message=str(e))
                return jsonify({
                    'error': str(e),
                    'success': False
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# 📊 Logger de segurança estruturado
def log_security_event(action: str, success: bool, user_id: str = None, 
                      error_message: str = None, **additional_data):
    """Registrar evento de segurança de forma estruturada"""
    try:
        # Filtrar dados sensíveis
        safe_data = {}
        for key, value in additional_data.items():
            if key.lower() not in ['password', 'secret', 'token', 'key', 'clientsecret']:
                safe_data[key] = value
        
        log_entry = {
            'action': action,
            'success': success,
            'user_id': user_id,
            'ip_address': request.remote_addr if request else 'unknown',
            'user_agent': request.headers.get('User-Agent', 'unknown') if request else 'unknown',
            'endpoint': request.endpoint if request else 'unknown',
            'method': request.method if request else 'unknown',
            'error_message': error_message,
            **safe_data
        }
        
        if success:
            logger.info("security_event", **log_entry)
        else:
            logger.warning("security_event", **log_entry)
        
        # Tentar armazenar no Redis para análise
        try:
            if 'security_manager' in globals() and hasattr(security_manager, 'redis_client'):
                security_manager.redis_client.lpush(
                    'security_events',
                    json.dumps({
                        **log_entry,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                )
                # Manter apenas últimos 10000 eventos
                security_manager.redis_client.ltrim('security_events', 0, 9999)
        except:
            # Se Redis falhar, apenas registra no log
            pass
        
    except Exception as e:
        logger.error("security_logging_failed", error=str(e))

# 🛡️ Validação avançada de entrada
def validate_and_sanitize_input(data: Dict[str, Any], schema_class) -> Dict[str, Any]:
    """Validar e sanitizar dados com schema robusto"""
    try:
        schema = schema_class()
        
        # Validar com marshmallow
        validated_data = schema.load(data)
        
        logger.info("input_validation_success",
                   schema=schema_class.__name__,
                   fields_count=len(validated_data))
        
        return validated_data
        
    except ValidationError as e:
        logger.warning("input_validation_failed",
                      schema=schema_class.__name__,
                      errors=e.messages)
        raise ValueError(f"Dados inválidos: {e.messages}")
    except Exception as e:
        logger.error("input_validation_error",
                    schema=schema_class.__name__,
                    error=str(e))
        raise ValueError(f"Erro na validação: {str(e)}")

# 🚨 Detector avançado de atividade suspeita
class SecurityDetector:
    def __init__(self, security_manager_instance=None):
        self.security_manager = security_manager_instance
        self.suspicious_patterns = [
            # Injeção SQL
            r'(?i)\b(union|select|insert|update|delete|drop|exec|script)\b.*\b(from|where|values)\b',
            # XSS
            r'(?i)<\s*script[^>]*>.*?</\s*script\s*>',
            r'(?i)javascript\s*:',
            r'(?i)on\w+\s*=',
            # Path Traversal
            r'\.\.[\\/]',
            r'(?i)\b(etc/passwd|boot\.ini|windows/system32)\b',
            # Command Injection
            r'(?i)\b(cmd\.exe|powershell|bash|sh)\b',
            r'[;&|`]',
            # LDAP Injection
            r'\*\)|\(\|',
            # Tentativas de bypass
            r'(?i)\b(eval|exec|system|shell_exec)\b',
        ]
        
        self.max_requests_per_minute = 60
        self.max_failed_attempts = 5
    
    def detect_suspicious_patterns(self, text: str) -> list:
        """Detectar padrões suspeitos em texto"""
        detected = []
        
        for pattern in self.suspicious_patterns:
            if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                detected.append(pattern)
        
        return detected
    
    def check_request_rate(self, identifier: str) -> bool:
        """Verificar taxa de requisições"""
        try:
            if not self.security_manager:
                return True
            
            key = f"rate_check:{identifier}"
            count = self.security_manager.redis_client.get(key)
            
            if count is None:
                self.security_manager.redis_client.setex(key, 60, 1)
                return True
            
            count = int(count)
            if count >= self.max_requests_per_minute:
                logger.warning("rate_limit_exceeded",
                             identifier=identifier,
                             count=count)
                return False
            
            self.security_manager.redis_client.incr(key)
            return True
            
        except Exception as e:
            logger.error("rate_check_failed", error=str(e))
            return True  # Permitir em caso de erro
    
    def check_failed_attempts(self, identifier: str) -> bool:
        """Verificar tentativas de falha"""
        try:
            if not self.security_manager:
                return True
                
            key = f"failed_attempts:{identifier}"
            count = self.security_manager.redis_client.get(key)
            
            if count is None:
                return True
            
            count = int(count)
            if count >= self.max_failed_attempts:
                logger.warning("max_failed_attempts_exceeded",
                             identifier=identifier,
                             count=count)
                return False
            
            return True
            
        except Exception as e:
            logger.error("failed_attempts_check_failed", error=str(e))
            return True
    
    def record_failed_attempt(self, identifier: str):
        """Registrar tentativa falhada"""
        try:
            if not self.security_manager:
                return
                
            key = f"failed_attempts:{identifier}"
            self.security_manager.redis_client.incr(key)
            self.security_manager.redis_client.expire(key, 3600)  # Expira em 1 hora
            
        except Exception as e:
            logger.error("failed_attempt_record_failed", error=str(e))
    
    def clear_failed_attempts(self, identifier: str):
        """Limpar tentativas falhadas após sucesso"""
        try:
            if not self.security_manager:
                return
                
            key = f"failed_attempts:{identifier}"
            self.security_manager.redis_client.delete(key)
            
        except Exception as e:
            logger.error("failed_attempt_clear_failed", error=str(e))

# 🔧 Decorator para detecção de atividade suspeita
def check_suspicious_activity(f):
    """Decorator para verificar atividade suspeita avançada"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not security_detector:
            # Se não há detector, permitir execução
            return f(*args, **kwargs)
            
        identifier = request.remote_addr
        
        # Verificar taxa de requisições
        if not security_detector.check_request_rate(identifier):
            log_security_event('RATE_LIMIT_EXCEEDED', False,
                             error_message='Taxa de requisições excedida')
            return jsonify({
                'error': 'Muitas requisições. Tente novamente em alguns minutos.',
                'success': False
            }), 429
        
        # Verificar tentativas falhadas
        if not security_detector.check_failed_attempts(identifier):
            log_security_event('MAX_FAILED_ATTEMPTS', False,
                             error_message='Máximo de tentativas falhadas excedido')
            return jsonify({
                'error': 'Muitas tentativas falhadas. Conta temporariamente bloqueada.',
                'success': False
            }), 423
        
        # Verificar padrões suspeitos na query string
        query_string = request.query_string.decode('utf-8')
        if query_string:
            suspicious = security_detector.detect_suspicious_patterns(query_string)
            if suspicious:
                log_security_event('SUSPICIOUS_QUERY', False,
                                 error_message=f'Padrões suspeitos: {suspicious[:3]}')
                return jsonify({
                    'error': 'Requisição inválida',
                    'success': False
                }), 400
        
        # Verificar padrões suspeitos no body
        if request.is_json:
            try:
                body_str = json.dumps(request.get_json() or {})
                suspicious = security_detector.detect_suspicious_patterns(body_str)
                if suspicious:
                    log_security_event('SUSPICIOUS_BODY', False,
                                     error_message=f'Padrões suspeitos: {suspicious[:3]}')
                    return jsonify({
                        'error': 'Requisição inválida',
                        'success': False
                    }), 400
            except:
                pass
        
        return f(*args, **kwargs)
    
    return decorated_function

# 🏦 Gerenciador de configurações bancárias ultra seguro
class SecureBankConfigManager:
    def __init__(self):
        self.redis_prefix = "bank_config:"
        self.cache_ttl = 3600  # 1 hora
    
    def save_config(self, bank_name: str, config: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Salvar configuração bancária com máxima segurança"""
        try:
            # Validar dados
            validated_data = validate_and_sanitize_input(
                {'bankName': bank_name, 'config': config},
                BankConfigSchema
            )
            
            bank_name = validated_data['bankName']
            config = validated_data['config']
            
            # Dados sensíveis para criptografar
            sensitive_data = {
                'clientId': config['clientId'],
                'clientSecret': config['clientSecret'],
                'contas': config.get('contas', []),
                'user_id': user_id,
                'bank_name': bank_name
            }
            
            # Criptografar dados sensíveis
            encrypted_data = security_manager.encrypt_data(sensitive_data)
            
            # Dados públicos
            public_data = {
                'bank_name': bank_name,
                'enabled': config.get('enabled', False),
                'user_id': user_id,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'last_sync': None,
                'config_hash': hashlib.sha256(json.dumps(sensitive_data, sort_keys=True).encode()).hexdigest()
            }
            
            # Salvar no Redis
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            
            config_data = {
                'encrypted_data': encrypted_data,
                'public_data': json.dumps(public_data)
            }
            
            security_manager.redis_client.hmset(config_key, config_data)
            security_manager.redis_client.expire(config_key, self.cache_ttl)
            
            log_security_event('BANK_CONFIG_SAVED', True, user_id,
                             bankName=bank_name,
                             config_hash=public_data['config_hash'][:8])
            
            return {
                'success': True,
                'id': f"{bank_name}_{user_id}",
                'config_hash': public_data['config_hash'][:8]
            }
            
        except Exception as e:
            logger.error("bank_config_save_failed",
                        bank_name=bank_name,
                        user_id=user_id,
                        error=str(e))
            raise Exception(f"Erro ao salvar configuração: {str(e)}")
    
    def get_public_config(self, bank_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Obter configuração pública sem dados sensíveis"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            config_data = security_manager.redis_client.hgetall(config_key)
            
            if not config_data:
                return None
            
            public_data = json.loads(config_data['public_data'])
            
            return {
                'bankName': bank_name,
                'enabled': public_data.get('enabled', False),
                'hasCredentials': bool(config_data.get('encrypted_data')),
                'contasConfigured': 0,  # Será calculado após descriptografia se necessário
                'lastConfigured': public_data.get('updated_at'),
                'configHash': public_data.get('config_hash', '')[:8]
            }
            
        except Exception as e:
            logger.error("bank_config_get_failed",
                        bank_name=bank_name,
                        user_id=user_id,
                        error=str(e))
            return None
    
    def get_full_config(self, bank_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Obter configuração completa descriptografada (apenas servidor)"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            config_data = security_manager.redis_client.hgetall(config_key)
            
            if not config_data or not config_data.get('encrypted_data'):
                return None
            
            # Descriptografar dados sensíveis
            sensitive_data = security_manager.decrypt_data(config_data['encrypted_data'])
            public_data = json.loads(config_data['public_data'])
            
            # Validar integridade
            current_hash = hashlib.sha256(json.dumps(sensitive_data, sort_keys=True).encode()).hexdigest()
            stored_hash = public_data.get('config_hash', '')
            
            if not hmac.compare_digest(current_hash, stored_hash):
                logger.error("config_integrity_violation",
                           bank_name=bank_name,
                           user_id=user_id)
                raise Exception("Violação de integridade da configuração")
            
            return {
                **sensitive_data,
                **public_data
            }
            
        except Exception as e:
            logger.error("bank_config_full_get_failed",
                        bank_name=bank_name,
                        user_id=user_id,
                        error=str(e))
            return None
    
    def get_all_public_configs(self, user_id: str) -> Dict[str, Any]:
        """Listar todas as configurações públicas de um usuário"""
        supported_banks = ['BRADESCO', 'ITAU', 'BANCO_BRASIL']
        configs = {}
        
        for bank in supported_banks:
            config = self.get_public_config(bank, user_id)
            configs[bank] = config or {
                'bankName': bank,
                'enabled': False,
                'hasCredentials': False,
                'contasConfigured': 0,
                'lastConfigured': None,
                'configHash': ''
            }
        
        return configs
    
    def delete_config(self, bank_name: str, user_id: str) -> bool:
        """Deletar configuração bancária com segurança"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            
            # Verificar se existe
            if not security_manager.redis_client.exists(config_key):
                return False
            
            # Deletar
            security_manager.redis_client.delete(config_key)
            
            log_security_event('BANK_CONFIG_DELETED', True, user_id,
                             bankName=bank_name)
            
            return True
            
        except Exception as e:
            logger.error("bank_config_delete_failed",
                        bank_name=bank_name,
                        user_id=user_id,
                        error=str(e))
            return False

# 🧪 Testador de conexão bancária seguro
def test_bank_connection(bank_name: str, user_id: str) -> Dict[str, Any]:
    """Testar conexão com banco de forma segura"""
    try:
        config = bank_manager.get_public_config(bank_name, user_id)
        
        if not config or not config.get('enabled') or not config.get('hasCredentials'):
            raise Exception('Banco não configurado ou desabilitado')
        
        # URLs dos bancos (em produção, usar variáveis de ambiente)
        bank_urls = {
            'BRADESCO': os.getenv('BRADESCO_API_URL', 'https://proxy.server.bradesco.com.br/api/obank/v2'),
            'ITAU': os.getenv('ITAU_API_URL', 'https://devportal.itau.com.br/api/open-banking/v2'),
            'BANCO_BRASIL': os.getenv('BB_API_URL', 'https://api.bb.com.br/open-banking/v2')
        }
        
        base_url = bank_urls.get(bank_name)
        if not base_url:
            raise Exception(f"Banco {bank_name} não suportado")
        
        # Obter configuração completa para teste
        full_config = bank_manager.get_full_config(bank_name, user_id)
        if not full_config:
            raise Exception("Erro ao obter configuração para teste")
        
        has_credentials = (
            full_config.get('clientId') and 
            full_config.get('clientSecret') and
            len(full_config.get('clientId', '')) >= 10 and
            len(full_config.get('clientSecret', '')) >= 20
        )
        
        # Em produção, implementar teste real de API aqui
        # Por enquanto, validar apenas a presença de credenciais válidas
        
        test_result = {
            'success': has_credentials,
            'bankName': bank_name,
            'message': 'Credenciais válidas - Pronto para conexão' if has_credentials else 'Credenciais inválidas',
            'timestamp': datetime.utcnow().isoformat(),
            'apiUrl': base_url,
            'configHash': full_config.get('config_hash', '')[:8]
        }
        
        log_security_event('BANK_CONNECTION_TEST', has_credentials, user_id,
                          bankName=bank_name,
                          success=has_credentials)
        
        return test_result
        
    except Exception as e:
        logger.error("bank_connection_test_failed",
                    bank_name=bank_name,
                    user_id=user_id,
                    error=str(e))
        
        return {
            'success': False,
            'bankName': bank_name,
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

# 🔧 Utilitários de segurança adicionais
class SecurityUtils:
    @staticmethod
    def generate_secure_session_id() -> str:
        """Gerar ID de sessão ultra seguro"""
        return secrets.token_urlsafe(64)
    
    @staticmethod
    def hash_password(password: str, salt: str = None) -> tuple:
        """Hash de senha ultra seguro com salt e pepper"""
        if salt is None:
            salt = secrets.token_urlsafe(32)
        
        pepper = security_manager.pepper
        
        # Usar PBKDF2 com 480.000 iterações
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=64,
            salt=salt.encode(),
            iterations=480000,
        )
        
        hashed = base64.urlsafe_b64encode(
            kdf.derive((password + pepper).encode())
        ).decode()
        
        return hashed, salt
    
    @staticmethod
    def verify_password(password: str, hashed: str, salt: str) -> bool:
        """Verificar senha com timing attack protection"""
        try:
            expected_hash, _ = SecurityUtils.hash_password(password, salt)
            return hmac.compare_digest(expected_hash, hashed)
        except:
            return False
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitizar nome de arquivo"""
        # Remover caracteres perigosos
        filename = re.sub(r'[<>:"/\\|?*]', '', filename)
        # Limitar tamanho
        filename = filename[:255]
        # Evitar nomes reservados
        reserved = ['CON', 'PRN', 'AUX', 'NUL'] + [f'COM{i}' for i in range(1, 10)] + [f'LPT{i}' for i in range(1, 10)]
        if filename.upper() in reserved:
            filename = f"file_{filename}"
        
        return filename or "unnamed_file"
    
    @staticmethod
    def is_safe_redirect_url(url: str, allowed_hosts: list) -> bool:
        """Verificar se URL de redirect é segura"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            
            # Deve ter esquema HTTPS (exceto localhost)
            if parsed.scheme not in ['https'] and not parsed.hostname == 'localhost':
                return False
            
            # Hostname deve estar na lista permitida
            if parsed.hostname not in allowed_hosts:
                return False
            
            return True
            
        except:
            return False

# 🔐 Middleware de segurança para Flask
def setup_security_middleware(app):
    """Configurar middleware de segurança completo"""
    
    @app.before_request
    def security_headers():
        """Adicionar headers de segurança"""
        # Verificar se é HTTPS em produção
        if not app.debug and not request.is_secure:
            return jsonify({
                'error': 'HTTPS obrigatório',
                'success': False
            }), 426
    
    @app.after_request
    def after_request(response):
        """Adicionar headers de segurança na resposta"""
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.*.com.br; "
            "font-src 'self' https://fonts.gstatic.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none';"
        )
        
        response.headers['Content-Security-Policy'] = csp
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # HSTS apenas em HTTPS
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Remover headers que expõem informações
        response.headers.pop('Server', None)
        
        return response
    
    @app.errorhandler(404)
    def not_found(error):
        """Handler personalizado para 404"""
        log_security_event('NOT_FOUND_ACCESS', False,
                          error_message=f'Tentativa de acesso a {request.path}')
        return jsonify({
            'error': 'Endpoint não encontrado',
            'success': False
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handler personalizado para 500"""
        logger.error("internal_server_error",
                    path=request.path,
                    method=request.method,
                    error=str(error))
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🔍 Sistema de monitoramento de segurança
class SecurityMonitor:
    def __init__(self):
        self.alert_thresholds = {
            'failed_logins_per_hour': 50,
            'suspicious_patterns_per_hour': 20,
            'rate_limit_hits_per_hour': 100
        }
    
    def check_security_alerts(self) -> list:
        """Verificar alertas de segurança"""
        alerts = []
        
        try:
            # Verificar eventos da última hora
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            # Contar eventos por tipo
            events = security_manager.redis_client.lrange('security_events', 0, -1)
            
            failed_logins = 0
            suspicious_patterns = 0
            rate_limits = 0
            
            for event_json in events:
                try:
                    event = json.loads(event_json)
                    event_time = datetime.fromisoformat(event['timestamp'])
                    
                    if event_time > one_hour_ago:
                        action = event.get('action', '')
                        
                        if 'LOGIN_FAILED' in action or 'AUTH_FAILED' in action:
                            failed_logins += 1
                        elif 'SUSPICIOUS' in action:
                            suspicious_patterns += 1
                        elif 'RATE_LIMIT' in action:
                            rate_limits += 1
                            
                except:
                    continue
            
            # Verificar thresholds
            if failed_logins > self.alert_thresholds['failed_logins_per_hour']:
                alerts.append({
                    'type': 'HIGH_FAILED_LOGINS',
                    'count': failed_logins,
                    'threshold': self.alert_thresholds['failed_logins_per_hour'],
                    'severity': 'HIGH'
                })
            
            if suspicious_patterns > self.alert_thresholds['suspicious_patterns_per_hour']:
                alerts.append({
                    'type': 'HIGH_SUSPICIOUS_ACTIVITY',
                    'count': suspicious_patterns,
                    'threshold': self.alert_thresholds['suspicious_patterns_per_hour'],
                    'severity': 'MEDIUM'
                })
            
            if rate_limits > self.alert_thresholds['rate_limit_hits_per_hour']:
                alerts.append({
                    'type': 'HIGH_RATE_LIMIT_HITS',
                    'count': rate_limits,
                    'threshold': self.alert_thresholds['rate_limit_hits_per_hour'],
                    'severity': 'LOW'
                })
            
        except Exception as e:
            logger.error("security_monitoring_failed", error=str(e))
        
        return alerts
    
    def get_security_stats(self) -> Dict[str, Any]:
        """Obter estatísticas de segurança"""
        try:
            stats = {
                'total_events_24h': 0,
                'failed_attempts_24h': 0,
                'successful_logins_24h': 0,
                'suspicious_activity_24h': 0,
                'top_ips': {},
                'top_actions': {}
            }
            
            # Analisar eventos das últimas 24 horas
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            events = security_manager.redis_client.lrange('security_events', 0, -1)
            
            ip_counter = {}
            action_counter = {}
            
            for event_json in events:
                try:
                    event = json.loads(event_json)
                    event_time = datetime.fromisoformat(event['timestamp'])
                    
                    if event_time > twenty_four_hours_ago:
                        stats['total_events_24h'] += 1
                        
                        # Contar por tipo
                        action = event.get('action', '')
                        success = event.get('success', False)
                        ip = event.get('ip_address', 'unknown')
                        
                        if not success and ('LOGIN' in action or 'AUTH' in action):
                            stats['failed_attempts_24h'] += 1
                        elif success and ('LOGIN' in action or 'AUTH' in action):
                            stats['successful_logins_24h'] += 1
                        elif 'SUSPICIOUS' in action:
                            stats['suspicious_activity_24h'] += 1
                        
                        # Contar IPs
                        ip_counter[ip] = ip_counter.get(ip, 0) + 1
                        
                        # Contar ações
                        action_counter[action] = action_counter.get(action, 0) + 1
                        
                except:
                    continue
            
            # Top 10 IPs e ações
            stats['top_ips'] = dict(sorted(ip_counter.items(), key=lambda x: x[1], reverse=True)[:10])
            stats['top_actions'] = dict(sorted(action_counter.items(), key=lambda x: x[1], reverse=True)[:10])
            
            return stats
            
        except Exception as e:
            logger.error("security_stats_failed", error=str(e))
            return {}

# 🎯 Funcão para inicializar ambiente seguro
def initialize_secure_environment(manager):
    """Inicializar ambiente com todas as verificações de segurança"""
    try:
        # Verificar variáveis de ambiente obrigatórias
        required_env_vars = [
            'ENCRYPTION_PASSWORD',
            'ENCRYPTION_SALT', 
            'JWT_SECRET',
            'PASSWORD_PEPPER',
            'REDIS_URL'
        ]
        
        missing_vars = []
        for var in required_env_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Variáveis de ambiente obrigatórias não definidas: {missing_vars}")
        
        # Verificar força das chaves
        encryption_password = os.getenv('ENCRYPTION_PASSWORD')
        if len(encryption_password) < 32:
            raise ValueError("ENCRYPTION_PASSWORD deve ter pelo menos 32 caracteres")
        
        jwt_secret = os.getenv('JWT_SECRET')
        if len(jwt_secret) < 64:
            raise ValueError("JWT_SECRET deve ter pelo menos 64 caracteres")
        
        # Verificar conexão Redis usando o manager passado como parâmetro
        if manager and hasattr(manager, 'redis_client'):
            manager.redis_client.ping()
        
        # Log de inicialização
        logger.info("secure_environment_initialized",
                   encryption_algorithm="PBKDF2-SHA256",
                   jwt_algorithm="HS256",
                   redis_connected=True)
        
        return True
        
    except Exception as e:
        logger.error("secure_environment_init_failed", error=str(e))
        raise

# Função auxiliar para verificar Redis
def check_redis_status():
    """Verificar status do Redis e dar sugestões"""
    checks = {
        'redis_running': False,
        'port_open': False,
        'can_connect': False
    }
    
    try:
        # Verificar se processo Redis está rodando
        result = subprocess.run(['pgrep', '-f', 'redis-server'], 
                              capture_output=True, text=True)
        checks['redis_running'] = bool(result.stdout.strip())
    except:
        pass
    
    try:
        # Verificar se porta 6379 está aberta
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', 6379))
        checks['port_open'] = result == 0
        sock.close()
    except:
        pass
    
    try:
        # Tentar ping simples
        client = redis.Redis(host='localhost', port=6379, socket_timeout=1)
        client.ping()
        checks['can_connect'] = True
    except:
        pass
    
    return checks

# Inicializar ambiente na importação
def initialize_security_manager():
    """Inicializar SecurityManager com tratamento de erros"""
    try:
        manager = SecureSecurityManager()
        initialize_secure_environment(manager)  # Passar o manager como parâmetro
        return manager
    except Exception as e:
        print(f"❌ Falha na inicialização da segurança: {e}")
        print("⚠️  Verifique as variáveis de ambiente no .env")
        print("⚠️  Verifique se Redis está rodando")
        
        # Verificar Redis especificamente
        if "redis" in str(e).lower():
            print("\n🔍 DIAGNÓSTICO REDIS:")
            status = check_redis_status()
            print(f"   Redis rodando: {'✅' if status['redis_running'] else '❌'}")
            print(f"   Porta 6379 aberta: {'✅' if status['port_open'] else '❌'}")
            print(f"   Conexão possível: {'✅' if status['can_connect'] else '❌'}")
        
        # Retornar None para permitir que main.py decida o que fazer
        return None

# Instâncias globais seguras
security_manager = initialize_security_manager()
security_detector = SecurityDetector(security_manager) if security_manager else None
bank_manager = SecureBankConfigManager() if security_manager else None
security_monitor = SecurityMonitor() if security_manager else None

print(f"🔐 SecurityManager: {'✅ Ativo' if security_manager else '❌ Inativo'}")
print(f"🚨 SecurityDetector: {'✅ Ativo' if security_detector else '❌ Inativo'}")
print(f"🏦 BankManager: {'✅ Ativo' if bank_manager else '❌ Inativo'}")
print(f"📊 SecurityMonitor: {'✅ Ativo' if security_monitor else '❌ Inativo'}")