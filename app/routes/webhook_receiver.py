# 📁 routes/webhook_receiver.py - SISTEMA SIMPLES DE WEBHOOKS PARA BOLETOS (100 linhas)
from flask import Blueprint, request, jsonify
from datetime import datetime, UTC, timedelta
import hashlib
import hmac
import json
import structlog
from typing import Dict, Any, Optional
from database import SessionLocal
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from database import Base

# Logger
logger = structlog.get_logger()

# Criar blueprint
webhook_bp = Blueprint('webhooks', __name__, url_prefix='/api/webhooks')

# 📋 Modelo para boletos recebidos
class BoletoRecebido(Base):
    __tablename__ = 'boletos_recebidos'
    
    id = Column(Integer, primary_key=True, index=True)
    banco_origem = Column(String(50), nullable=False)  # BRADESCO, ITAU, BANCO_BRASIL
    codigo_barras = Column(String(100), unique=True, nullable=False)
    valor = Column(Float, nullable=False)
    data_vencimento = Column(DateTime, nullable=False)
    beneficiario = Column(String(200), nullable=False)
    conta_origem = Column(String(50), nullable=True)
    status = Column(String(30), default='pendente', nullable=False)
    urgente = Column(Boolean, default=False, nullable=False)
    dados_webhook = Column(Text, nullable=True)  # JSON original do webhook
    data_recebimento = Column(DateTime, default=datetime.now(UTC), nullable=False)
    processado = Column(Boolean, default=False, nullable=False)
    
    def to_dict(self):
        return {
            'id': f"webhook_{self.id}_{self.banco_origem.lower()}",
            'banco': self.banco_origem,
            'codigo_barras': self.codigo_barras,
            'valor': self.valor,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'beneficiario': self.beneficiario,
            'conta': self.conta_origem,
            'status': self.status,
            'urgente': self.urgente,
            'data_deteccao': self.data_recebimento.isoformat() if self.data_recebimento else None,
            'origem': f'Webhook {self.banco_origem}',
            'processado': self.processado
        }

# 🔐 Validador de assinaturas dos bancos
class WebhookValidator:
    
    # Chaves públicas dos bancos (em produção, obter das APIs oficiais)
    BANK_SECRETS = {
        'BRADESCO': 'bradesco_webhook_secret_2024',
        'ITAU': 'itau_webhook_secret_2024', 
        'BANCO_BRASIL': 'bb_webhook_secret_2024'
    }
    
    @staticmethod
    def validate_signature(bank_name: str, payload: str, signature: str) -> bool:
        """Validar assinatura do webhook"""
        try:
            secret = WebhookValidator.BANK_SECRETS.get(bank_name)
            if not secret:
                return False
            
            expected_signature = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error("signature_validation_failed", error=str(e))
            return False
    
    @staticmethod
    def extract_boleto_data(bank_name: str, webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extrair dados do boleto do webhook (adaptado para cada banco)"""
        try:
            if bank_name == 'BRADESCO':
                return {
                    'codigo_barras': webhook_data.get('codigoBarras'),
                    'valor': float(webhook_data.get('valor', 0)),
                    'data_vencimento': webhook_data.get('dataVencimento'),
                    'beneficiario': webhook_data.get('beneficiario'),
                    'conta_origem': webhook_data.get('conta')
                }
            
            elif bank_name == 'ITAU':
                return {
                    'codigo_barras': webhook_data.get('barCode'),
                    'valor': float(webhook_data.get('amount', 0)),
                    'data_vencimento': webhook_data.get('dueDate'),
                    'beneficiario': webhook_data.get('payeeName'),
                    'conta_origem': webhook_data.get('accountNumber')
                }
            
            elif bank_name == 'BANCO_BRASIL':
                return {
                    'codigo_barras': webhook_data.get('codigo_barras'),
                    'valor': float(webhook_data.get('valor_titulo', 0)),
                    'data_vencimento': webhook_data.get('data_vencimento'),
                    'beneficiario': webhook_data.get('nome_beneficiario'),
                    'conta_origem': webhook_data.get('numero_conta')
                }
            
            return None
            
        except Exception as e:
            logger.error("boleto_data_extraction_failed", bank_name=bank_name, error=str(e))
            return None

# 📨 Endpoint principal para receber webhooks
@webhook_bp.route('/boletos/<bank_name>', methods=['POST'])
def receive_boleto_webhook(bank_name):
    """Receber webhook de boleto de qualquer banco"""
    
    bank_name = bank_name.upper()
    
    # Validar banco suportado
    if bank_name not in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
        logger.warning("unsupported_bank_webhook", bank_name=bank_name)
        return jsonify({
            'success': False,
            'error': 'Banco não suportado'
        }), 400
    
    try:
        # Obter dados do webhook
        webhook_data = request.get_json()
        if not webhook_data:
            return jsonify({
                'success': False,
                'error': 'Dados JSON não fornecidos'
            }), 400
        
        # Obter assinatura do header
        signature = request.headers.get('X-Webhook-Signature') or request.headers.get('Signature')
        if not signature:
            logger.warning("webhook_missing_signature", bank_name=bank_name)
            # Em desenvolvimento, prosseguir sem assinatura
            # Em produção, return error
        
        # Validar assinatura (comentado para desenvolvimento)
        # payload_str = json.dumps(webhook_data, sort_keys=True)
        # if signature and not WebhookValidator.validate_signature(bank_name, payload_str, signature):
        #     logger.warning("webhook_invalid_signature", bank_name=bank_name)
        #     return jsonify({
        #         'success': False,
        #         'error': 'Assinatura inválida'
        #     }), 401
        
        # Extrair dados do boleto
        boleto_data = WebhookValidator.extract_boleto_data(bank_name, webhook_data)
        if not boleto_data:
            return jsonify({
                'success': False,
                'error': 'Erro ao extrair dados do boleto'
            }), 400
        
        # Salvar no banco de dados
        db = SessionLocal()
        try:
            # Verificar se boleto já existe
            existing_boleto = db.query(BoletoRecebido).filter(
                BoletoRecebido.codigo_barras == boleto_data['codigo_barras']
            ).first()
            
            if existing_boleto:
                logger.info("boleto_already_exists", codigo_barras=boleto_data['codigo_barras'])
                return jsonify({
                    'success': True,
                    'message': 'Boleto já processado',
                    'boleto_id': existing_boleto.id
                })
            
            # Processar data de vencimento
            data_vencimento = None
            if boleto_data['data_vencimento']:
                try:
                    data_vencimento = datetime.fromisoformat(boleto_data['data_vencimento'].replace('Z', '+00:00'))
                except:
                    data_vencimento = datetime.now(UTC)
            
            # Verificar se é urgente (vence em menos de 3 dias)
            urgente = False
            if data_vencimento:
                dias_para_vencimento = (data_vencimento - datetime.now(UTC)).days
                urgente = dias_para_vencimento <= 3
            
            # Criar novo boleto
            novo_boleto = BoletoRecebido(
                banco_origem=bank_name,
                codigo_barras=boleto_data['codigo_barras'],
                valor=boleto_data['valor'],
                data_vencimento=data_vencimento,
                beneficiario=boleto_data['beneficiario'],
                conta_origem=boleto_data.get('conta_origem'),
                urgente=urgente,
                dados_webhook=json.dumps(webhook_data),
                status='pendente'
            )
            
            db.add(novo_boleto)
            db.commit()
            
            logger.info("boleto_received_successfully",
                       bank_name=bank_name,
                       boleto_id=novo_boleto.id,
                       valor=boleto_data['valor'],
                       urgente=urgente)
            
            return jsonify({
                'success': True,
                'message': 'Boleto recebido e processado',
                'boleto_id': novo_boleto.id,
                'urgente': urgente
            })
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error("webhook_processing_error",
                    bank_name=bank_name,
                    error=str(e))
        
        return jsonify({
            'success': False,
            'error': 'Erro interno no processamento'
        }), 500

# 📋 Endpoint para listar boletos recebidos
@webhook_bp.route('/boletos', methods=['GET'])
def list_received_boletos():
    """Listar todos os boletos recebidos via webhook"""
    try:
        db = SessionLocal()
        try:
            # Parâmetros opcionais
            banco = request.args.get('banco')
            status = request.args.get('status')
            limit = int(request.args.get('limit', 50))
            
            # Query base
            query = db.query(BoletoRecebido)
            
            # Filtros
            if banco:
                query = query.filter(BoletoRecebido.banco_origem == banco.upper())
            
            if status:
                query = query.filter(BoletoRecebido.status == status)
            
            # Ordenar por data de recebimento (mais recentes primeiro)
            boletos = query.order_by(
                BoletoRecebido.data_recebimento.desc()
            ).limit(limit).all()
            
            return jsonify({
                'success': True,
                'boletos': [boleto.to_dict() for boleto in boletos],
                'total': len(boletos)
            })
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error("list_boletos_error", error=str(e))
        return jsonify({
            'success': False,
            'error': 'Erro ao listar boletos'
        }), 500

# 🧪 Endpoint para testar webhook (desenvolvimento)
@webhook_bp.route('/test/<bank_name>', methods=['POST'])
def test_webhook(bank_name):
    """Testar webhook com dados mock"""
    
    bank_name = bank_name.upper()
    
    # Dados mock para teste
    mock_data = {
        'BRADESCO': {
            'codigoBarras': f'12345678901234567890123456789012345678901234{datetime.now().microsecond}',
            'valor': 456.78,
            'dataVencimento': (datetime.now(UTC) + timedelta(days=5)).isoformat(),
            'beneficiario': 'Fornecedor Teste Bradesco LTDA',
            'conta': '1234-5'
        },
        'ITAU': {
            'barCode': f'98765432109876543210987654321098765432109876{datetime.now().microsecond}',
            'amount': 234.56,
            'dueDate': (datetime.now(UTC) + timedelta(days=7)).isoformat(),
            'payeeName': 'Fornecedor Teste Itaú S.A.',
            'accountNumber': '9876-5'
        },
        'BANCO_BRASIL': {
            'codigo_barras': f'11111111111111111111111111111111111111111111{datetime.now().microsecond}',
            'valor_titulo': 789.12,
            'data_vencimento': (datetime.now(UTC) + timedelta(days=3)).isoformat(),
            'nome_beneficiario': 'Fornecedor Teste BB LTDA',
            'numero_conta': '11111-1'
        }
    }
    
    test_data = mock_data.get(bank_name)
    if not test_data:
        return jsonify({
            'success': False,
            'error': 'Banco não suportado para teste'
        }), 400
    
    # Simular webhook request
    with webhook_bp.test_request_context(
        f'/api/webhooks/boletos/{bank_name}',
        method='POST',
        json=test_data,
        headers={'Content-Type': 'application/json'}
    ):
        return receive_boleto_webhook(bank_name)

# 📊 Endpoint para estatísticas
@webhook_bp.route('/stats', methods=['GET'])
def get_webhook_stats():
    """Obter estatísticas dos webhooks"""
    try:
        db = SessionLocal()
        try:
            stats = {}
            
            # Total por banco
            for banco in ['BRADESCO', 'ITAU', 'BANCO_BRASIL']:
                total = db.query(BoletoRecebido).filter(
                    BoletoRecebido.banco_origem == banco
                ).count()
                
                urgentes = db.query(BoletoRecebido).filter(
                    BoletoRecebido.banco_origem == banco,
                    BoletoRecebido.urgente == True
                ).count()
                
                stats[banco] = {
                    'total': total,
                    'urgentes': urgentes
                }
            
            # Estatísticas gerais
            total_geral = db.query(BoletoRecebido).count()
            total_urgentes = db.query(BoletoRecebido).filter(
                BoletoRecebido.urgente == True
            ).count()
            
            return jsonify({
                'success': True,
                'stats': {
                    'por_banco': stats,
                    'total_geral': total_geral,
                    'total_urgentes': total_urgentes,
                    'ultima_atualizacao': datetime.now(UTC).isoformat()
                }
            })
            
        finally:
            db.close()
    
    except Exception as e:
        logger.error("webhook_stats_error", error=str(e))
        return jsonify({
            'success': False,
            'error': 'Erro ao obter estatísticas'
        }), 500