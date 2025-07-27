from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from database import SessionLocal, Conta, Notificacao
from sqlalchemy import func
import json

contas_bp = Blueprint('contas', __name__)

def criar_notificacao(db, titulo, mensagem, tipo='info', projeto_id=None, conta_id=None):
    """Criar uma nova notificação"""
    notificacao = Notificacao(
        titulo=titulo,
        mensagem=mensagem,
        tipo=tipo,
        projeto_id=projeto_id,
        conta_id=conta_id
    )
    db.add(notificacao)

@contas_bp.route('/api/contas', methods=['GET'])
def listar_contas():
    """Listar todas as contas"""
    db = SessionLocal()
    try:
        status_filter = request.args.get('status')
        projeto_id = request.args.get('projeto_id')
        
        query = db.query(Conta)
        
        if status_filter:
            query = query.filter(Conta.status == status_filter)
        if projeto_id:
            query = query.filter(Conta.projeto_id == projeto_id)
        
        contas = query.order_by(Conta.data_vencimento.asc()).all()
        
        return jsonify({
            'success': True,
            'data': [conta.to_dict() for conta in contas],
            'total': len(contas)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas', methods=['POST'])
def criar_conta():
    """Criar nova conta"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('descricao'):
            return jsonify({
                'success': False,
                'error': 'Descrição é obrigatória'
            }), 400
            
        if not data.get('valor'):
            return jsonify({
                'success': False,
                'error': 'Valor é obrigatório'
            }), 400
            
        if not data.get('data_vencimento'):
            return jsonify({
                'success': False,
                'error': 'Data de vencimento é obrigatória'
            }), 400
        
        # Converter data
        try:
            data_vencimento = datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Formato de data inválido. Use YYYY-MM-DD'
            }), 400
        
        conta = Conta(
            descricao=data['descricao'],
            valor=data['valor'],
            tipo=data.get('tipo', 'Fornecedor'),
            categoria=data.get('categoria'),
            data_vencimento=data_vencimento,
            prioridade=data.get('prioridade', 'Média'),
            projeto_id=data.get('projeto_id'),
            fornecedor=data.get('fornecedor'),
            numero_documento=data.get('numero_documento'),
            observacoes=data.get('observacoes')
        )
        
        db.add(conta)
        db.commit()
        
        # Criar notificação se próximo do vencimento
        dias_para_vencimento = (data_vencimento - datetime.now().date()).days
        if dias_para_vencimento <= 7:
            criar_notificacao(
                db,
                f"Nova conta próxima do vencimento",
                f"A conta '{conta.descricao}' vence em {dias_para_vencimento} dias.",
                'warning',
                conta_id=conta.id
            )
            db.commit()
        
        return jsonify({
            'success': True,
            'data': conta.to_dict(),
            'message': 'Conta criada com sucesso'
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/<int:conta_id>', methods=['GET'])
def obter_conta(conta_id):
    """Obter conta por ID"""
    db = SessionLocal()
    try:
        conta = db.query(Conta).filter(Conta.id == conta_id).first()
        
        if not conta:
            return jsonify({
                'success': False,
                'error': 'Conta não encontrada'
            }), 404
        
        return jsonify({
            'success': True,
            'data': conta.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/<int:conta_id>', methods=['PUT'])
def atualizar_conta(conta_id):
    """Atualizar conta"""
    db = SessionLocal()
    try:
        conta = db.query(Conta).filter(Conta.id == conta_id).first()
        
        if not conta:
            return jsonify({
                'success': False,
                'error': 'Conta não encontrada'
            }), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'descricao' in data:
            conta.descricao = data['descricao']
        if 'valor' in data:
            conta.valor = data['valor']
        if 'tipo' in data:
            conta.tipo = data['tipo']
        if 'categoria' in data:
            conta.categoria = data['categoria']
        if 'data_vencimento' in data:
            try:
                conta.data_vencimento = datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido. Use YYYY-MM-DD'
                }), 400
        if 'prioridade' in data:
            conta.prioridade = data['prioridade']
        if 'projeto_id' in data:
            conta.projeto_id = data['projeto_id']
        if 'fornecedor' in data:
            conta.fornecedor = data['fornecedor']
        if 'numero_documento' in data:
            conta.numero_documento = data['numero_documento']
        if 'observacoes' in data:
            conta.observacoes = data['observacoes']
        
        db.commit()
        
        return jsonify({
            'success': True,
            'data': conta.to_dict(),
            'message': 'Conta atualizada com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/<int:conta_id>/pagar', methods=['PATCH'])
def marcar_como_paga(conta_id):
    """Marcar conta como paga"""
    db = SessionLocal()
    try:
        conta = db.query(Conta).filter(Conta.id == conta_id).first()
        
        if not conta:
            return jsonify({
                'success': False,
                'error': 'Conta não encontrada'
            }), 404
        
        data = request.get_json() or {}
        
        conta.status = 'Paga'
        conta.data_pagamento = datetime.now().date()
        
        if 'data_pagamento' in data:
            try:
                conta.data_pagamento = datetime.strptime(data['data_pagamento'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido. Use YYYY-MM-DD'
                }), 400
        
        db.commit()
        
        # Criar notificação
        criar_notificacao(
            db,
            f"Conta paga: {conta.descricao}",
            f"A conta de R$ {conta.valor} foi marcada como paga.",
            'success',
            conta_id=conta.id
        )
        db.commit()
        
        return jsonify({
            'success': True,
            'data': conta.to_dict(),
            'message': 'Conta marcada como paga'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/<int:conta_id>', methods=['DELETE'])
def deletar_conta(conta_id):
    """Deletar conta"""
    db = SessionLocal()
    try:
        conta = db.query(Conta).filter(Conta.id == conta_id).first()
        
        if not conta:
            return jsonify({
                'success': False,
                'error': 'Conta não encontrada'
            }), 404
        
        db.delete(conta)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Conta deletada com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/vencimento', methods=['GET'])
def contas_por_vencimento():
    """Buscar contas por período de vencimento"""
    db = SessionLocal()
    try:
        hoje = datetime.now().date()
        periodo = request.args.get('periodo', 'proximos_7_dias')
        
        if periodo == 'em_atraso':
            contas = db.query(Conta).filter(
                Conta.data_vencimento < hoje,
                Conta.status == 'Pendente'
            ).all()
        elif periodo == 'hoje':
            contas = db.query(Conta).filter(
                Conta.data_vencimento == hoje,
                Conta.status == 'Pendente'
            ).all()
        elif periodo == 'proximos_7_dias':
            data_limite = hoje + timedelta(days=7)
            contas = db.query(Conta).filter(
                Conta.data_vencimento.between(hoje, data_limite),
                Conta.status == 'Pendente'
            ).all()
        elif periodo == 'proximos_30_dias':
            data_limite = hoje + timedelta(days=30)
            contas = db.query(Conta).filter(
                Conta.data_vencimento.between(hoje, data_limite),
                Conta.status == 'Pendente'
            ).all()
        else:
            return jsonify({
                'success': False,
                'error': 'Período inválido. Use: em_atraso, hoje, proximos_7_dias, proximos_30_dias'
            }), 400
        
        return jsonify({
            'success': True,
            'data': [conta.to_dict() for conta in contas],
            'total': len(contas),
            'periodo': periodo
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@contas_bp.route('/api/contas/relatorio', methods=['GET'])
def relatorio_financeiro():
    """Relatório financeiro das contas"""
    db = SessionLocal()
    try:
        hoje = datetime.now().date()
        
        # Estatísticas gerais
        total_contas = db.query(Conta).count()
        contas_pagas = db.query(Conta).filter(Conta.status == 'Paga').count()
        contas_pendentes = db.query(Conta).filter(Conta.status == 'Pendente').count()
        contas_atrasadas = db.query(Conta).filter(
            Conta.data_vencimento < hoje,
            Conta.status == 'Pendente'
        ).count()
        
        # Valores
        valor_total_pendente = db.query(func.sum(Conta.valor)).filter(
            Conta.status == 'Pendente'
        ).scalar() or 0
        
        valor_total_pago = db.query(func.sum(Conta.valor)).filter(
            Conta.status == 'Paga'
        ).scalar() or 0
        
        valor_em_atraso = db.query(func.sum(Conta.valor)).filter(
            Conta.data_vencimento < hoje,
            Conta.status == 'Pendente'
        ).scalar() or 0
        
        # Contas por categoria
        contas_por_categoria = db.query(
            Conta.categoria,
            func.count(Conta.id).label('quantidade'),
            func.sum(Conta.valor).label('valor_total')
        ).group_by(Conta.categoria).all()
        
        return jsonify({
            'success': True,
            'data': {
                'estatisticas': {
                    'total_contas': total_contas,
                    'contas_pagas': contas_pagas,
                    'contas_pendentes': contas_pendentes,
                    'contas_atrasadas': contas_atrasadas
                },
                'valores': {
                    'total_pendente': float(valor_total_pendente),
                    'total_pago': float(valor_total_pago),
                    'valor_em_atraso': float(valor_em_atraso)
                },
                'por_categoria': [
                    {
                        'categoria': cat.categoria or 'Sem categoria',
                        'quantidade': cat.quantidade,
                        'valor_total': float(cat.valor_total or 0)
                    }
                    for cat in contas_por_categoria
                ]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()