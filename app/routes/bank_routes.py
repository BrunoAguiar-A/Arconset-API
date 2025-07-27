# 📁 backend/routes/bank_routes.py - VERSÃO ATUALIZADA COM AUTENTICAÇÃO
from flask import Blueprint, request, jsonify, g
from datetime import UTC, datetime, timedelta
import os
import structlog
import json
from typing import Dict, Any, Optional

# ✅ IMPORTAR MIDDLEWARE DE AUTENTICAÇÃO ATUALIZADO
from middleware.auth_middleware import auth_required, admin_required, get_current_user_id

# Importar módulo de segurança ultra seguro
from middleware.security import (
    bank_manager, 
    security_manager,
    log_security_event,
    BankConfigSchema,
    check_suspicious_activity,
    test_bank_connection,
    validate_and_sanitize_input,
    security_detector,
    security_monitor,
    SecurityUtils
)

# Configurar logger estruturado
logger = structlog.get_logger()

# Criar blueprint para rotas bancárias
bank_bp = Blueprint('bank', __name__, url_prefix='/api')

# 🔒 DECORATOR PARA OPERAÇÕES CRÍTICAS BANCÁRIAS - ATUALIZADO
def critical_bank_operation(admin_only: bool = False):
    """Decorator ultra seguro para operações bancárias críticas"""
    def decorator(f):
        from functools import wraps
        
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # ✅ USAR DADOS DO g (contexto da requisição)
            user_id = get_current_user_id()
            user_role = getattr(g, 'user_role', 'user')
            ip_address = request.remote_addr
            
            if not user_id:
                log_security_event('UNAUTHENTICATED_BANK_ACCESS', False, None,
                                 endpoint=request.endpoint,
                                 error_message='Usuário não autenticado')
                return jsonify({
                    'error': 'Autenticação requerida',
                    'success': False
                }), 401
            
            # Verificar se é operação admin-only
            if admin_only and user_role != 'admin':
                log_security_event('UNAUTHORIZED_ADMIN_ACCESS', False, user_id,
                                 endpoint=request.endpoint,
                                 error_message='Tentativa de acesso admin sem permissão')
                return jsonify({
                    'error': 'Acesso negado - Permissões administrativas requeridas',
                    'success': False
                }), 403
            
            # Rate limiting específico para operações bancárias
            rate_key = f"bank_operation:{user_id}:{request.endpoint}"
            if not security_detector.check_request_rate(rate_key):
                log_security_event('BANK_OPERATION_RATE_LIMITED', False, user_id,
                                 endpoint=request.endpoint)
                return jsonify({
                    'error': 'Muitas operações bancárias. Aguarde alguns minutos.',
                    'success': False
                }), 429
            
            # Log da operação
            logger.info("bank_operation_started",
                       user_id=user_id,
                       endpoint=request.endpoint,
                       ip_address=ip_address,
                       user_role=user_role)
            
            try:
                result = f(*args, **kwargs)
                
                # Log de sucesso
                logger.info("bank_operation_completed",
                           user_id=user_id,
                           endpoint=request.endpoint)
                
                return result
                
            except Exception as e:
                # Log de erro
                logger.error("bank_operation_failed",
                           user_id=user_id,
                           endpoint=request.endpoint,
                           error=str(e))
                
                # Registrar tentativa falhada
                security_detector.record_failed_attempt(f"bank_op:{user_id}")
                
                raise
        
        return decorated_function
    return decorator

# 🔐 POST /api/bank-config - CONFIGURAÇÃO ULTRA SEGURA
@bank_bp.route('/bank-config', methods=['POST'])
@check_suspicious_activity
@auth_required()  # ✅ USAR NOVO DECORATOR
@critical_bank_operation()
def save_bank_config():
    """Salvar configuração bancária com máxima segurança"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        # Validar dados JSON
        if not request.is_json:
            log_security_event('INVALID_CONTENT_TYPE', False, user_id,
                             content_type=request.content_type)
            return jsonify({
                'error': 'Content-Type deve ser application/json',
                'success': False
            }), 400
        
        data = request.get_json()
        if not data:
            log_security_event('EMPTY_REQUEST_BODY', False, user_id)
            return jsonify({
                'error': 'Corpo da requisição não pode estar vazio',
                'success': False
            }), 400
        
        # Validar e sanitizar dados com schema robusto
        try:
            validated_data = validate_and_sanitize_input(data, BankConfigSchema)
        except ValueError as e:
            log_security_event('BANK_CONFIG_VALIDATION_FAILED', False, user_id,
                             error_message=str(e))
            return jsonify({
                'error': 'Dados de entrada inválidos',
                'details': str(e),
                'success': False
            }), 400
        
        bank_name = validated_data['bankName']
        config = validated_data['config']
        
        # Validações adicionais de segurança
        client_id = config.get('clientId', '')
        client_secret = config.get('clientSecret', '')
        
        # Verificar se não são dados de exemplo/teste
        dangerous_patterns = [
            'example', 'test', 'demo', 'sample', '123456', 'password',
            'client_id', 'client_secret', 'your_', 'insert_', 'change_'
        ]
        
        for pattern in dangerous_patterns:
            if pattern.lower() in client_id.lower() or pattern.lower() in client_secret.lower():
                log_security_event('SUSPICIOUS_CREDENTIALS', False, user_id,
                                 bankName=bank_name,
                                 pattern=pattern)
                return jsonify({
                    'error': f'Credenciais parecem ser dados de exemplo. Use credenciais reais.',
                    'success': False
                }), 400
        
        # Verificar se client_id e client_secret são diferentes
        if client_id == client_secret:
            log_security_event('IDENTICAL_CREDENTIALS', False, user_id,
                             bankName=bank_name)
            return jsonify({
                'error': 'Client ID e Client Secret devem ser diferentes',
                'success': False
            }), 400
        
        # Salvar configuração
        try:
            result = bank_manager.save_config(bank_name, config, user_id)
            
            # Limpar tentativas falhadas após sucesso
            security_detector.clear_failed_attempts(f"bank_config:{user_id}")
            
            log_security_event('BANK_CONFIG_SAVED', True, user_id,
                             bankName=bank_name,
                             configId=result.get('id'))
            
            return jsonify({
                'success': True,
                'message': f'Configuração do {bank_name} salva com máxima segurança',
                'id': result['id'],
                'configHash': result.get('config_hash', ''),
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        except Exception as e:
            log_security_event('BANK_CONFIG_SAVE_ERROR', False, user_id,
                             bankName=bank_name,
                             error_message=str(e))
            return jsonify({
                'error': 'Erro ao salvar configuração bancária',
                'success': False
            }), 500
        
    except Exception as e:
        logger.error("bank_config_endpoint_error",
                    user_id=user_id,
                    error=str(e))
        
        log_security_event('BANK_CONFIG_ENDPOINT_ERROR', False, user_id,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🔍 GET /api/bank-config - LISTAGEM SEGURA
@bank_bp.route('/bank-config', methods=['GET'])
@auth_required()  # ✅ USAR NOVO DECORATOR
def list_bank_configs():
    """Listar configurações bancárias públicas"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        logger.info("bank_config_list_requested", user_id=user_id)
        
        # Obter configurações públicas (sem dados sensíveis)
        configs = bank_manager.get_all_public_configs(user_id)
        
        log_security_event('BANK_CONFIG_LISTED', True, user_id,
                          configs_count=len(configs))
        
        return jsonify({
            'success': True,
            'configs': configs,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("bank_config_list_error",
                    user_id=user_id,
                    error=str(e))
        
        log_security_event('BANK_CONFIG_LIST_ERROR', False, user_id,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🧪 POST /api/bank-config/test - TESTE SEGURO DE CONEXÃO
@bank_bp.route('/bank-config/test', methods=['POST'])
@check_suspicious_activity
@auth_required()  # ✅ USAR NOVO DECORATOR
@critical_bank_operation()
def test_bank_config():
    """Testar conexão bancária com validação rigorosa"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        data = request.get_json()
        
        if not data or 'bankName' not in data:
            return jsonify({
                'error': 'bankName é obrigatório',
                'success': False
            }), 400
        
        bank_name = data['bankName'].strip().upper()
        
        # Validar nome do banco
        allowed_banks = ['BRADESCO', 'ITAU', 'BANCO_BRASIL']
        if bank_name not in allowed_banks:
            log_security_event('INVALID_BANK_NAME', False, user_id,
                             bankName=bank_name)
            return jsonify({
                'error': f'Banco {bank_name} não suportado',
                'success': False
            }), 400
        
        logger.info("bank_connection_test_started",
                   user_id=user_id,
                   bankName=bank_name)
        
        # Executar teste de conexão
        test_result = test_bank_connection(bank_name, user_id)
        
        log_security_event('BANK_CONNECTION_TESTED', test_result['success'], user_id,
                          bankName=bank_name,
                          message=test_result.get('message'))
        
        return jsonify({
            'success': True,
            'testResult': test_result,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("bank_connection_test_error",
                    user_id=user_id,
                    error=str(e))
        
        log_security_event('BANK_CONNECTION_TEST_ERROR', False, user_id,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🏦 POST /api/bank/authenticate - AUTENTICAÇÃO BANCÁRIA SEGURA
@bank_bp.route('/bank/authenticate', methods=['POST'])
@check_suspicious_activity
@auth_required()  # ✅ USAR NOVO DECORATOR
@critical_bank_operation()
def authenticate_bank():
    """Autenticar com banco usando OAuth2/Open Banking"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        data = request.get_json()
        
        if not data or 'bankName' not in data:
            return jsonify({
                'error': 'bankName é obrigatório',
                'success': False
            }), 400
        
        bank_name = data['bankName'].strip().upper()
        
        # Validar nome do banco
        if bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            return jsonify({
                'error': 'Nome do banco inválido',
                'success': False
            }), 400
        
        logger.info("bank_authentication_started",
                   user_id=user_id,
                   bankName=bank_name)
        
        # Verificar se banco está configurado
        config = bank_manager.get_public_config(bank_name, user_id)
        if not config or not config['hasCredentials'] or not config['enabled']:
            log_security_event('BANK_NOT_CONFIGURED', False, user_id,
                             bankName=bank_name)
            return jsonify({
                'error': 'Banco não configurado ou desabilitado',
                'success': False
            }), 400
        
        # Obter configuração completa para autenticação
        full_config = bank_manager.get_full_config(bank_name, user_id)
        if not full_config:
            log_security_event('BANK_CONFIG_DECRYPT_FAILED', False, user_id,
                             bankName=bank_name)
            return jsonify({
                'error': 'Erro ao acessar configuração bancária',
                'success': False
            }), 500
        
        # ✅ GERAR TOKEN COM DADOS DO USUÁRIO AUTENTICADO
        session_payload = {
            'id': user_id,
            'bankName': bank_name,
            'sessionType': 'bank_access',
            'scope': 'read_accounts,read_transactions',
            'configHash': full_config.get('config_hash', '')[:8],
            'userRole': getattr(g, 'user_role', 'user')  # ✅ INCLUIR ROLE
        }
        
        # Token com validade de apenas 30 minutos para operações bancárias
        session_token = security_manager.generate_jwt_token(session_payload, expires_hours=0.5)
        
        # Armazenar sessão bancária no Redis com TTL
        session_key = f"bank_session:{user_id}:{bank_name}"
        session_data = {
            'token': session_token,
            'created_at': datetime.now(UTC).isoformat(),
            'expires_at': (datetime.now(UTC) + timedelta(minutes=30)).isoformat(),
            'client_id': full_config.get('clientId')[:8] + '...',  # Apenas início para log
            'last_activity': datetime.now(UTC).isoformat(),
            'user_role': getattr(g, 'user_role', 'user')  # ✅ INCLUIR ROLE
        }
        
        security_manager.redis_client.setex(
            session_key,
            1800,  # 30 minutos
            json.dumps(session_data)
        )
        
        log_security_event('BANK_AUTHENTICATED', True, user_id,
                          bankName=bank_name,
                          sessionDuration=30)
        
        return jsonify({
            'success': True,
            'sessionToken': session_token,
            'expiresIn': 1800,  # 30 minutos em segundos
            'bankName': bank_name,
            'scope': 'read_accounts,read_transactions',
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("bank_authentication_error",
                    user_id=user_id,
                    error=str(e))
        
        log_security_event('BANK_AUTH_ERROR', False, user_id,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 💳 GET /api/bank/boletos - CONSULTA SEGURA DE BOLETOS
@bank_bp.route('/bank/boletos', methods=['GET'])
@auth_required()  # ✅ USAR NOVO DECORATOR
@critical_bank_operation()
def get_bank_boletos():
    """Consultar boletos bancários com validação rigorosa"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        # Validar parâmetros
        bank_name = request.args.get('bankName', '').strip().upper()
        
        if not bank_name:
            return jsonify({
                'error': 'Parâmetro bankName é obrigatório',
                'success': False
            }), 400
        
        if bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            return jsonify({
                'error': 'Nome do banco inválido',
                'success': False
            }), 400
        
        logger.info("bank_boletos_query_started",
                   user_id=user_id,
                   bankName=bank_name)
        
        # Verificar se há sessão bancária ativa
        session_key = f"bank_session:{user_id}:{bank_name}"
        session_data = security_manager.redis_client.get(session_key)
        
        if not session_data:
            log_security_event('NO_BANK_SESSION', False, user_id,
                             bankName=bank_name)
            return jsonify({
                'error': 'Sessão bancária expirada. Autentique novamente.',
                'success': False
            }), 401
        
        # Atualizar última atividade
        session_info = json.loads(session_data)
        session_info['last_activity'] = datetime.now(UTC).isoformat()
        security_manager.redis_client.setex(session_key, 1800, json.dumps(session_info))
        
        # Verificar se banco está configurado
        config = bank_manager.get_public_config(bank_name, user_id)
        if not config or not config['hasCredentials'] or not config['enabled']:
            return jsonify({
                'error': 'Banco não configurado ou desabilitado',
                'success': False
            }), 400
        
        # SIMULAÇÃO SEGURA - Em produção, implementar chamadas reais para APIs
        # Por enquanto, retornar dados simulados mas seguros
        mock_boletos = generate_secure_mock_boletos(bank_name, user_id)
        
        log_security_event('BANK_BOLETOS_QUERIED', True, user_id,
                          bankName=bank_name,
                          boletosCount=len(mock_boletos))
        
        return jsonify({
            'success': True,
            'boletos': mock_boletos,
            'bankName': bank_name,
            'isDemo': True,  # Remover em produção
            'timestamp': datetime.now(UTC).isoformat(),
            'sessionValid': True
        })
        
    except Exception as e:
        logger.error("bank_boletos_query_error",
                    user_id=user_id,
                    error=str(e))
        
        log_security_event('BANK_BOLETOS_ERROR', False, user_id,
                          error_message='Erro interno do servidor')
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🗑️ DELETE /api/bank-config/{bank_name} - REMOÇÃO SEGURA
@bank_bp.route('/bank-config/<bank_name>', methods=['DELETE'])
@auth_required()  # ✅ USAR NOVO DECORATOR
@critical_bank_operation()
def delete_bank_config(bank_name):
    """Deletar configuração bancária com confirmação"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        bank_name = bank_name.strip().upper()
        
        if bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            return jsonify({
                'error': 'Nome do banco inválido',
                'success': False
            }), 400
        
        # Verificar se configuração existe
        config = bank_manager.get_public_config(bank_name, user_id)
        if not config:
            return jsonify({
                'error': 'Configuração não encontrada',
                'success': False
            }), 404
        
        # Verificar confirmação (deve vir no header)
        confirmation = request.headers.get('X-Confirm-Delete')
        if confirmation != 'true':
            return jsonify({
                'error': 'Confirmação de exclusão requerida no header X-Confirm-Delete',
                'success': False
            }), 400
        
        # Deletar configuração
        deleted = bank_manager.delete_config(bank_name, user_id)
        
        if deleted:
            # Invalidar sessões bancárias relacionadas
            session_key = f"bank_session:{user_id}:{bank_name}"
            security_manager.redis_client.delete(session_key)
            
            log_security_event('BANK_CONFIG_DELETED', True, user_id,
                             bankName=bank_name)
            
            return jsonify({
                'success': True,
                'message': f'Configuração do {bank_name} removida com segurança',
                'timestamp': datetime.now(UTC).isoformat()
            })
        else:
            return jsonify({
                'error': 'Falha ao remover configuração',
                'success': False
            }), 500
        
    except Exception as e:
        logger.error("bank_config_delete_error",
                    user_id=user_id,
                    bankName=bank_name,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 📊 GET /api/bank-config/status - STATUS PÚBLICO COM RATE LIMIT
@bank_bp.route('/bank-config/status', methods=['GET'])
@check_suspicious_activity
def get_system_status():
    """Obter status público do sistema"""
    try:
        # Rate limiting para endpoints públicos
        ip = request.remote_addr
        if not security_detector.check_request_rate(f"public_status:{ip}"):
            return jsonify({
                'error': 'Muitas consultas de status. Tente novamente em alguns minutos.',
                'success': False
            }), 429
        
        # Status básico do sistema (sem dados sensíveis)
        status = {
            'systemHealth': 'OK',
            'timestamp': datetime.now(UTC).isoformat(),
            'environment': os.getenv('NODE_ENV', 'development'),
            'version': '2.0.0-secure',
            'supportedBanks': ['BRADESCO', 'ITAU', 'BANCO_BRASIL'],
            'apiVersion': 'v2',
            'securityLevel': 'HIGH',
            'encryptionEnabled': True,
            'rateLimitingEnabled': True,
            'monitoringEnabled': True,
            'authenticationEnabled': True  # ✅ NOVO STATUS
        }
        
        # Verificar saúde dos serviços
        try:
            security_manager.redis_client.ping()
            status['redisHealth'] = 'OK'
        except:
            status['redisHealth'] = 'ERROR'
            status['systemHealth'] = 'DEGRADED'
        
        log_security_event('SYSTEM_STATUS_QUERIED', True,
                          ip_address=ip)
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        logger.error("system_status_error", error=str(e))
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False,
            'status': {
                'systemHealth': 'ERROR',
                'timestamp': datetime.now(UTC).isoformat()
            }
        }), 500

# 🔧 POST /api/admin/clear-cache - OPERAÇÃO ADMINISTRATIVA SEGURA
@bank_bp.route('/admin/clear-cache', methods=['POST'])
@admin_required  # ✅ USAR DECORATOR ESPECÍFICO PARA ADMIN
@critical_bank_operation(admin_only=True)
def clear_system_cache():
    """Limpar cache do sistema (apenas admins)"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        # Verificar confirmação dupla para operação crítica
        confirmation_code = request.json.get('confirmationCode') if request.is_json else None
        expected_code = f"CLEAR_CACHE_{datetime.now(UTC).strftime('%Y%m%d')}"
        
        if confirmation_code != expected_code:
            log_security_event('INVALID_ADMIN_CONFIRMATION', False, user_id,
                             provided_code=confirmation_code[:10] if confirmation_code else None)
            return jsonify({
                'error': f'Código de confirmação inválido. Use: {expected_code}',
                'success': False
            }), 400
        
        # Limpar caches específicos
        cleared_items = 0
        
        # Limpar configurações bancárias em cache
        pattern = "bank_config:*"
        for key in security_manager.redis_client.scan_iter(match=pattern):
            security_manager.redis_client.delete(key)
            cleared_items += 1
        
        # Limpar sessões bancárias expiradas
        pattern = "bank_session:*"
        for key in security_manager.redis_client.scan_iter(match=pattern):
            security_manager.redis_client.delete(key)
            cleared_items += 1
        
        # Limpar rate limiting antigo
        pattern = "rate_check:*"
        for key in security_manager.redis_client.scan_iter(match=pattern):
            ttl = security_manager.redis_client.ttl(key)
            if ttl < 60:  # Menos de 1 minuto para expirar
                security_manager.redis_client.delete(key)
                cleared_items += 1
        
        log_security_event('ADMIN_CACHE_CLEARED', True, user_id,
                          cleared_items=cleared_items)
        
        return jsonify({
            'success': True,
            'message': f'Cache limpo com sucesso. {cleared_items} itens removidos.',
            'clearedItems': cleared_items,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("admin_cache_clear_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 📈 GET /api/admin/security-stats - ESTATÍSTICAS DE SEGURANÇA
@bank_bp.route('/admin/security-stats', methods=['GET'])
@admin_required  # ✅ USAR DECORATOR ESPECÍFICO PARA ADMIN
def get_security_statistics():
    """Obter estatísticas de segurança (apenas admins)"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        # Obter estatísticas de segurança
        stats = security_monitor.get_security_stats()
        alerts = security_monitor.check_security_alerts()
        
        # Estatísticas do Redis
        redis_info = security_manager.redis_client.info()
        redis_stats = {
            'connected_clients': redis_info.get('connected_clients', 0),
            'used_memory_human': redis_info.get('used_memory_human', '0B'),
            'total_commands_processed': redis_info.get('total_commands_processed', 0),
            'uptime_in_seconds': redis_info.get('uptime_in_seconds', 0)
        }
        
        log_security_event('ADMIN_SECURITY_STATS_VIEWED', True, user_id,
                          alerts_count=len(alerts))
        
        return jsonify({
            'success': True,
            'statistics': stats,
            'alerts': alerts,
            'redisStats': redis_stats,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("security_stats_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🔓 POST /api/admin/revoke-user-sessions - REVOGAR SESSÕES DE USUÁRIO
@bank_bp.route('/admin/revoke-user-sessions', methods=['POST'])
@admin_required  # ✅ USAR DECORATOR ESPECÍFICO PARA ADMIN
@critical_bank_operation(admin_only=True)
def revoke_user_sessions():
    """Revogar todas as sessões de um usuário (apenas admins)"""
    admin_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        data = request.get_json()
        
        if not data or 'userId' not in data:
            return jsonify({
                'error': 'userId é obrigatório',
                'success': False
            }), 400
        
        target_user_id = data['userId']
        reason = data.get('reason', 'Revogação administrativa')
        
        # Revogar todos os tokens JWT do usuário
        revoked_tokens = security_manager.revoke_all_user_tokens(target_user_id)
        
        # Remover sessões bancárias do usuário
        pattern = f"bank_session:{target_user_id}:*"
        revoked_sessions = 0
        for key in security_manager.redis_client.scan_iter(match=pattern):
            security_manager.redis_client.delete(key)
            revoked_sessions += 1
        
        log_security_event('ADMIN_USER_SESSIONS_REVOKED', True, admin_id,
                          target_user_id=target_user_id,
                          reason=reason,
                          revoked_tokens=revoked_tokens,
                          revoked_sessions=revoked_sessions)
        
        return jsonify({
            'success': True,
            'message': f'Todas as sessões do usuário {target_user_id} foram revogadas',
            'revokedTokens': revoked_tokens,
            'revokedSessions': revoked_sessions,
            'reason': reason,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("revoke_user_sessions_error",
                    admin_id=admin_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro interno do servidor',
            'success': False
        }), 500

# 🔐 Função auxiliar para gerar boletos mock seguros
def generate_secure_mock_boletos(bank_name: str, user_id: str) -> list:
    """Gerar dados mock seguros para desenvolvimento"""
    
    # Usar hash do user_id para gerar dados consistentes mas não previsíveis
    import hashlib
    seed = hashlib.md5(f"{user_id}_{bank_name}".encode()).hexdigest()
    
    mock_boletos = []
    
    # Gerar 1-3 boletos baseado no hash
    num_boletos = (int(seed[:2], 16) % 3) + 1
    
    for i in range(num_boletos):
        # Usar partes do hash para gerar dados mock
        value_seed = int(seed[i*4:(i+1)*4], 16)
        
        boleto = {
            'id': f"{bank_name.lower()}_demo_{i+1}_{seed[:8]}",
            'banco': bank_name,
            'valor': round((value_seed % 5000) + 100, 2),  # Entre R$ 100 e R$ 5100
            'dataVencimento': (datetime.now() + timedelta(days=(value_seed % 30) + 1)).isoformat(),
            'beneficiario': f'Fornecedor Demo {i+1} LTDA',
            'codigoBarras': f"{'0' * 44}{value_seed % 1000:03d}{i+1:03d}",
            'urgente': (value_seed % 10) < 2,  # 20% chance de ser urgente
            'status': 'Pendente',
            'conta': f"AG: {(value_seed % 9000) + 1000:04d} CC: {(value_seed % 90000) + 10000:05d}-{value_seed % 10}",
            'origem': f'API {bank_name}',
            'dataDeteccao': datetime.now(UTC).isoformat(),
            'mockData': True  # Identificar como dados mock
        }
        
        mock_boletos.append(boleto)
    
    return sorted(mock_boletos, key=lambda x: x['dataVencimento'])

# 🛡️ Middleware de validação de sessão bancária - ATUALIZADO
@bank_bp.before_request
def validate_bank_session():
    """Validar sessão bancária antes de endpoints que requerem"""
    
    # Aplicar apenas em endpoints de consulta bancária
    protected_endpoints = [
        'bank.get_bank_boletos',
        'bank.get_bank_transactions',
        'bank.get_bank_accounts'
    ]
    
    if request.endpoint in protected_endpoints:
        user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
        bank_name = request.args.get('bankName', '').upper()
        
        if user_id and bank_name:
            session_key = f"bank_session:{user_id}:{bank_name}"
            
            if not security_manager.redis_client.exists(session_key):
                log_security_event('EXPIRED_BANK_SESSION_ACCESS', False, user_id,
                                 bankName=bank_name,
                                 endpoint=request.endpoint)
                
                return jsonify({
                    'error': 'Sessão bancária expirada. Autentique novamente.',
                    'success': False,
                    'requiresAuth': True
                }), 401

# 🚨 Error handlers específicos para operações bancárias
@bank_bp.errorhandler(429)
def handle_rate_limit(e):
    """Handler para rate limiting"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER SEGURA
    
    log_security_event('BANK_RATE_LIMIT_HIT', False, user_id,
                      endpoint=request.endpoint,
                      method=request.method)
    
    return jsonify({
        'error': 'Muitas requisições. Tente novamente em alguns minutos.',
        'success': False,
        'retryAfter': 60
    }), 429

@bank_bp.errorhandler(413)
def handle_payload_too_large(e):
    """Handler para payload muito grande"""
    user_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER SEGURA
    
    log_security_event('LARGE_PAYLOAD_REJECTED', False, user_id,
                      content_length=request.content_length)
    
    return jsonify({
        'error': 'Payload muito grande',
        'success': False,
        'maxSize': '1MB'
    }), 413

# 🔍 Endpoint para validar integridade do sistema
@bank_bp.route('/admin/system-integrity', methods=['GET'])
@admin_required  # ✅ USAR DECORATOR ESPECÍFICO PARA ADMIN
def check_system_integrity():
    """Verificar integridade do sistema de segurança"""
    admin_id = get_current_user_id()  # ✅ USAR FUNÇÃO HELPER
    
    try:
        integrity_checks = {
            'redis_connection': False,
            'encryption_working': False,
            'jwt_working': False,
            'rate_limiting_working': False,
            'logging_working': False,
            'auth_system_working': False  # ✅ NOVO CHECK
        }
        
        # Testar Redis
        try:
            security_manager.redis_client.ping()
            integrity_checks['redis_connection'] = True
        except:
            pass
        
        # Testar criptografia
        try:
            test_data = {'test': 'data'}
            encrypted = security_manager.encrypt_data(test_data)
            decrypted = security_manager.decrypt_data(encrypted)
            integrity_checks['encryption_working'] = (decrypted == test_data)
        except:
            pass
        
        # Testar JWT
        try:
            test_payload = {'test': 'payload', 'user_id': 'test'}
            token = security_manager.generate_jwt_token(test_payload, expires_hours=0.1)
            verified = security_manager.verify_jwt_token(token)
            integrity_checks['jwt_working'] = bool(verified)
        except:
            pass
        
        # Testar rate limiting
        try:
            rate_key = f"integrity_test:{admin_id}"
            integrity_checks['rate_limiting_working'] = security_detector.check_request_rate(rate_key)
        except:
            pass
        
        # Testar logging
        try:
            log_security_event('SYSTEM_INTEGRITY_CHECK', True, admin_id)
            integrity_checks['logging_working'] = True
        except:
            pass
        
        # ✅ TESTAR SISTEMA DE AUTENTICAÇÃO
        try:
            # Verificar se o usuário admin existe no contexto
            current_user = getattr(g, 'current_user', None)
            integrity_checks['auth_system_working'] = (
                current_user is not None and 
                hasattr(current_user, 'role') and 
                current_user.role == 'admin'
            )
        except:
            pass
        
        all_checks_passed = all(integrity_checks.values())
        
        return jsonify({
            'success': True,
            'systemIntegrity': 'OK' if all_checks_passed else 'ISSUES_DETECTED',
            'checks': integrity_checks,
            'timestamp': datetime.now(UTC).isoformat(),
            'authenticatedUser': admin_id  # ✅ INCLUIR ID DO ADMIN
        })
        
    except Exception as e:
        logger.error("system_integrity_check_error",
                    admin_id=admin_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro na verificação de integridade',
            'success': False
        }), 500

# ✅ NOVO ENDPOINT - Informações do usuário autenticado
@bank_bp.route('/user/bank-profile', methods=['GET'])
@auth_required()
def get_user_bank_profile():
    """Obter perfil bancário do usuário autenticado"""
    user_id = get_current_user_id()
    current_user = getattr(g, 'current_user', None)
    
    try:
        # Obter configurações bancárias do usuário
        user_configs = bank_manager.get_all_public_configs(user_id)
        
        # Obter sessões bancárias ativas
        active_sessions = []
        for bank in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            session_key = f"bank_session:{user_id}:{bank}"
            if security_manager.redis_client.exists(session_key):
                session_data = json.loads(security_manager.redis_client.get(session_key))
                active_sessions.append({
                    'bank': bank,
                    'created_at': session_data.get('created_at'),
                    'expires_at': session_data.get('expires_at'),
                    'last_activity': session_data.get('last_activity')
                })
        
        profile = {
            'user_id': user_id,
            'username': current_user.username if current_user else None,
            'role': current_user.role if current_user else None,
            'configured_banks': list(user_configs.keys()),
            'active_sessions': active_sessions,
            'total_configurations': len(user_configs),
            'profile_updated_at': datetime.now(UTC).isoformat()
        }
        
        log_security_event('USER_BANK_PROFILE_VIEWED', True, user_id)
        
        return jsonify({
            'success': True,
            'profile': profile,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("user_bank_profile_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro ao obter perfil bancário',
            'success': False
        }), 500

# ✅ NOVO ENDPOINT - Logout bancário específico
@bank_bp.route('/user/logout-bank', methods=['POST'])
@auth_required()
def logout_bank_session():
    """Fazer logout de uma sessão bancária específica"""
    user_id = get_current_user_id()
    
    try:
        data = request.get_json()
        bank_name = data.get('bankName', '').strip().upper() if data else None
        
        if not bank_name or bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
            return jsonify({
                'error': 'Nome do banco inválido',
                'success': False
            }), 400
        
        # Remover sessão bancária específica
        session_key = f"bank_session:{user_id}:{bank_name}"
        deleted = security_manager.redis_client.delete(session_key)
        
        if deleted:
            log_security_event('BANK_SESSION_LOGOUT', True, user_id,
                             bankName=bank_name)
            
            return jsonify({
                'success': True,
                'message': f'Logout da sessão {bank_name} realizado com sucesso',
                'timestamp': datetime.now(UTC).isoformat()
            })
        else:
            return jsonify({
                'success': True,
                'message': f'Nenhuma sessão ativa encontrada para {bank_name}',
                'timestamp': datetime.now(UTC).isoformat()
            })
        
    except Exception as e:
        logger.error("bank_logout_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro no logout bancário',
            'success': False
        }), 500

# ✅ NOVO ENDPOINT - Logout de todas as sessões bancárias
@bank_bp.route('/user/logout-all-banks', methods=['POST'])
@auth_required()
def logout_all_bank_sessions():
    """Fazer logout de todas as sessões bancárias do usuário"""
    user_id = get_current_user_id()
    
    try:
        # Remover todas as sessões bancárias do usuário
        pattern = f"bank_session:{user_id}:*"
        deleted_sessions = 0
        
        for key in security_manager.redis_client.scan_iter(match=pattern):
            security_manager.redis_client.delete(key)
            deleted_sessions += 1
        
        log_security_event('ALL_BANK_SESSIONS_LOGOUT', True, user_id,
                          deleted_sessions=deleted_sessions)
        
        return jsonify({
            'success': True,
            'message': f'{deleted_sessions} sessões bancárias encerradas',
            'deletedSessions': deleted_sessions,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        logger.error("all_bank_logout_error",
                    user_id=user_id,
                    error=str(e))
        
        return jsonify({
            'error': 'Erro no logout bancário',
            'success': False
        }), 500