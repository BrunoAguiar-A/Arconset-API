# 📁 middleware/security_simple.py - VERSÃO ULTRA OTIMIZADA (300 linhas vs 1400)
import os
import jwt
import json
import redis
import structlog
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import hashlib
import hmac
from flask_cors import CORS
from typing import Dict, Any, Optional

# 🔧 Logger simples
logger = structlog.get_logger()

# 🔐 Classe de segurança ultra-otimizada
class SimpleSecurityManager:
    def __init__(self):
        self.encryption_key = self._init_encryption_key()
        self.jwt_secret = os.getenv('JWT_SECRET')
        self.redis_client = self._init_redis()
        
        if not self.jwt_secret or len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET deve ter pelo menos 32 caracteres")
        
        print("✅ SimpleSecurityManager inicializado")
    
    def _init_encryption_key(self) -> bytes:
        """Gerar chave de criptografia simples mas segura"""
        password = os.getenv('ENCRYPTION_PASSWORD')
        salt = os.getenv('ENCRYPTION_SALT', 'arconset_salt_2024').encode()
        
        if not password or len(base64.b64decode(password)) < 16:
            raise ValueError("ENCRYPTION_PASSWORD deve ter pelo menos 16 caracteres")
        
        # PBKDF2 com 100k iterações (balance segurança/performance)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000
        )
        
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def _init_redis(self) -> redis.Redis:
        """Conexão Redis simples com fallback"""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        
        try:
            client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Testar conexão
            client.ping()
            print("✅ Redis conectado")
            return client
            
        except Exception as e:
            print(f"❌ Redis não conectado: {e}")
            # Retornar cliente mock para desenvolvimento
            return MockRedisClient()
    
    def encrypt_data(self, data: Dict[str, Any]) -> str:
        """Criptografar dados bancários"""
        try:
            fernet = Fernet(self.encryption_key)
            json_data = json.dumps(data, sort_keys=True)
            
            # Envelope com timestamp e hash
            envelope = {
                'data': json_data,
                'timestamp': datetime.utcnow().isoformat(),
                'hash': hashlib.sha256(json_data.encode()).hexdigest()
            }
            
            encrypted = fernet.encrypt(json.dumps(envelope).encode())
            return encrypted.decode()
            
        except Exception as e:
            logger.error("encryption_failed", error=str(e))
            raise Exception(f"Falha na criptografia: {str(e)}")
    
    def decrypt_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Descriptografar dados bancários"""
        try:
            fernet = Fernet(self.encryption_key)
            decrypted = fernet.decrypt(encrypted_data.encode())
            envelope = json.loads(decrypted.decode())
            
            # Verificar integridade
            data_json = envelope['data']
            expected_hash = envelope['hash']
            actual_hash = hashlib.sha256(data_json.encode()).hexdigest()
            
            if not hmac.compare_digest(expected_hash, actual_hash):
                raise Exception("Violação de integridade")
            
            return json.loads(data_json)
            
        except Exception as e:
            logger.error("decryption_failed", error=str(e))
            raise Exception(f"Falha na descriptografia: {str(e)}")
    
    def generate_jwt_token(self, payload: Dict[str, Any], expires_hours: int = 8) -> str:
        """Gerar token JWT simples"""
        try:
            secure_payload = {
                **payload,
                'exp': datetime.utcnow() + timedelta(hours=expires_hours),
                'iat': datetime.utcnow(),
                'iss': 'arconset-api'
            }
            
            token = jwt.encode(secure_payload, self.jwt_secret, algorithm='HS256')
            
            # Armazenar no Redis para revogação
            if hasattr(self.redis_client, 'setex'):
                jti = payload.get('user_id', 'unknown')
                self.redis_client.setex(f"jwt:{jti}", expires_hours * 3600, token)
            
            return token
            
        except Exception as e:
            logger.error("jwt_generation_failed", error=str(e))
            raise Exception(f"Falha na geração do token: {str(e)}")
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verificar token JWT simples"""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=['HS256'],
                options={'verify_exp': True}
            )
            
            # Verificar se não foi revogado
            if hasattr(self.redis_client, 'exists'):
                jti = payload.get('user_id')
                if jti and not self.redis_client.exists(f"jwt:{jti}"):
                    raise jwt.InvalidTokenError("Token revogado")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise Exception("Token expirado")
        except jwt.InvalidTokenError:
            raise Exception("Token inválido")
        except Exception as e:
            raise Exception(f"Falha na verificação: {str(e)}")
    
    def revoke_jwt_token(self, token: str) -> bool:
        """Revogar token específico"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'], options={"verify_exp": False})
            jti = payload.get('user_id')
            
            if jti and hasattr(self.redis_client, 'delete'):
                self.redis_client.delete(f"jwt:{jti}")
                return True
            
            return False
            
        except Exception as e:
            logger.error("token_revocation_failed", error=str(e))
            return False

# 🏦 Gerenciador de configurações bancárias simplificado
class SimpleBankManager:
    def __init__(self, security_manager):
        self.security_manager = security_manager
        self.redis_prefix = "bank_config:"
        self.cache_ttl = 3600  # 1 hora
    
    def save_config(self, bank_name: str, config: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Salvar configuração bancária"""
        try:
            # Validação básica
            if bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
                raise ValueError("Banco não suportado")
            
            if not config.get('clientId') or not config.get('clientSecret'):
                raise ValueError("Client ID e Secret são obrigatórios")
            
            # Dados para criptografar
            sensitive_data = {
                'clientId': config['clientId'],
                'clientSecret': config['clientSecret'],
                'contas': config.get('contas', []),
                'user_id': user_id,
                'bank_name': bank_name,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Criptografar
            encrypted_data = self.security_manager.encrypt_data(sensitive_data)
            
            # Dados públicos
            public_data = {
                'bank_name': bank_name,
                'enabled': config.get('enabled', False),
                'user_id': user_id,
                'updated_at': datetime.utcnow().isoformat(),
                'config_hash': hashlib.sha256(json.dumps(sensitive_data, sort_keys=True).encode()).hexdigest()[:8]
            }
            
            # Salvar no Redis
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            config_data = {
                'encrypted_data': encrypted_data,
                'public_data': json.dumps(public_data)
            }
            
            if hasattr(self.security_manager.redis_client, 'hmset'):
                self.security_manager.redis_client.hmset(config_key, config_data)
                self.security_manager.redis_client.expire(config_key, self.cache_ttl)
            
            logger.info("bank_config_saved", bank_name=bank_name, user_id=user_id)
            
            return {
                'success': True,
                'id': f"{bank_name}_{user_id}",
                'config_hash': public_data['config_hash']
            }
            
        except Exception as e:
            logger.error("bank_config_save_failed", error=str(e))
            raise Exception(f"Erro ao salvar: {str(e)}")
    
    def get_public_config(self, bank_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Obter configuração pública (sem dados sensíveis)"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            
            if not hasattr(self.security_manager.redis_client, 'hgetall'):
                return None
            
            config_data = self.security_manager.redis_client.hgetall(config_key)
            
            if not config_data:
                return None
            
            public_data = json.loads(config_data['public_data'])
            
            return {
                'bankName': bank_name,
                'enabled': public_data.get('enabled', False),
                'hasCredentials': bool(config_data.get('encrypted_data')),
                'lastConfigured': public_data.get('updated_at'),
                'configHash': public_data.get('config_hash', '')
            }
            
        except Exception as e:
            logger.error("bank_config_get_failed", error=str(e))
            return None
    
    def get_full_config(self, bank_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Obter configuração completa descriptografada"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            
            if not hasattr(self.security_manager.redis_client, 'hgetall'):
                return None
            
            config_data = self.security_manager.redis_client.hgetall(config_key)
            
            if not config_data or not config_data.get('encrypted_data'):
                return None
            
            # Descriptografar
            sensitive_data = self.security_manager.decrypt_data(config_data['encrypted_data'])
            public_data = json.loads(config_data['public_data'])
            
            return {**sensitive_data, **public_data}
            
        except Exception as e:
            logger.error("bank_config_full_get_failed", error=str(e))
            return None
    
    def get_all_public_configs(self, user_id: str) -> Dict[str, Any]:
        """Listar todas as configurações públicas do usuário"""
        configs = {}
        
        for bank in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            config = self.get_public_config(bank, user_id)
            configs[bank] = config or {
                'bankName': bank,
                'enabled': False,
                'hasCredentials': False,
                'lastConfigured': None,
                'configHash': ''
            }
        
        return configs
    
    def delete_config(self, bank_name: str, user_id: str) -> bool:
        """Deletar configuração"""
        try:
            config_key = f"{self.redis_prefix}{bank_name}:{user_id}"
            
            if hasattr(self.security_manager.redis_client, 'delete'):
                deleted = self.security_manager.redis_client.delete(config_key)
                logger.info("bank_config_deleted", bank_name=bank_name, user_id=user_id)
                return bool(deleted)
            
            return False
            
        except Exception as e:
            logger.error("bank_config_delete_failed", error=str(e))
            return False

# 📋 Cliente Redis Mock para desenvolvimento
class MockRedisClient:
    def __init__(self):
        self.data = {}
        print("⚠️ Usando MockRedisClient - apenas para desenvolvimento")
    
    def ping(self):
        return True
    
    def setex(self, key, ttl, value):
        self.data[key] = value
        return True
    
    def get(self, key):
        return self.data.get(key)
    
    def delete(self, key):
        return self.data.pop(key, None) is not None
    
    def exists(self, key):
        return key in self.data
    
    def hmset(self, key, mapping):
        self.data[key] = mapping
        return True
    
    def hgetall(self, key):
        return self.data.get(key, {})
    
    def expire(self, key, ttl):
        return True

# 🚨 Log de eventos simples
def log_security_event(action: str, success: bool, user_id: str = None, **kwargs):
    """Log simples de eventos de segurança"""
    try:
        log_data = {
            'action': action,
            'success': success,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat(),
            **kwargs
        }
        
        if success:
            logger.info("security_event", **log_data)
        else:
            logger.warning("security_event", **log_data)
        
        # Armazenar no Redis se disponível
        if 'security_manager' in globals() and hasattr(security_manager, 'redis_client'):
            try:
                security_manager.redis_client.setex(
                    f"security_log:{int(datetime.utcnow().timestamp())}",
                    86400,  # 24 horas
                    json.dumps(log_data)
                )
            except:
                pass
        
    except Exception as e:
        logger.error("security_logging_failed", error=str(e))

# 🔧 CORS simples
def setup_simple_cors(app):
    """CORS básico para desenvolvimento"""
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    CORS(app,
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    print(f"✅ CORS configurado: {', '.join(allowed_origins)}")

# 🚀 Inicialização
def initialize_simple_security():
    """Inicializar sistema de segurança simplificado"""
    try:
        manager = SimpleSecurityManager()
        
        # Verificar variáveis obrigatórias
        required_vars = ['JWT_SECRET', 'ENCRYPTION_PASSWORD']
        missing = [var for var in required_vars if not os.getenv(var)]
        
        if missing:
            raise ValueError(f"Variáveis obrigatórias: {missing}")
        
        return manager
        
    except Exception as e:
        print(f"❌ Erro na inicialização: {e}")
        return None

# 🎯 Instâncias globais
security_manager = initialize_simple_security()
bank_manager = SimpleBankManager(security_manager) if security_manager else None

print(f"🔐 SimpleSecurityManager: {'✅ Ativo' if security_manager else '❌ Inativo'}")
print(f"🏦 SimpleBankManager: {'✅ Ativo' if bank_manager else '❌ Inativo'}")