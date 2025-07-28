from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from database import SessionLocal, Projeto, Conta, Arquivo, Cliente, Funcionario, Notificacao, EquipeProjeto
from sqlalchemy import func, text, distinct

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard/stats', methods=['GET'])
def estatisticas_dashboard():
    """Estatísticas gerais do dashboard"""
    db = SessionLocal()
    try:
        hoje = datetime.now().date()
        
        # Projetos
        total_projetos = db.query(Projeto).count()
        projetos_ativos = db.query(Projeto).filter(Projeto.status == 'Em Andamento').count()
        projetos_finalizados = db.query(Projeto).filter(Projeto.status == 'Finalizado').count()
        
        # Progresso médio dos projetos ativos
        progresso_medio = db.query(func.avg(Projeto.progresso)).filter(
            Projeto.status == 'Em Andamento'
        ).scalar() or 0
        
        # Contas
        total_contas = db.query(Conta).count()
        contas_pendentes = db.query(Conta).filter(Conta.status == 'Pendente').count()
        contas_atrasadas = db.query(Conta).filter(
            Conta.data_vencimento < hoje,
            Conta.status == 'Pendente'
        ).count()
        
        # Valores financeiros
        valor_total_pendente = db.query(func.sum(Conta.valor)).filter(
            Conta.status == 'Pendente'
        ).scalar() or 0
        
        valor_projetos_ativos = db.query(func.sum(Projeto.valor_total)).filter(
            Projeto.status == 'Em Andamento'
        ).scalar() or 0
        
        # Arquivos
        total_arquivos = db.query(Arquivo).count()
        arquivos_hoje = db.query(Arquivo).filter(
            func.date(Arquivo.created_at) == hoje
        ).count()
        
        # Clientes e funcionários
        total_clientes = db.query(Cliente).count()
        funcionarios_ativos = db.query(Funcionario).filter(Funcionario.status == 'Ativo').count()
        
        # Projetos por status
        projetos_por_status = db.query(
            Projeto.status,
            func.count(Projeto.id).label('quantidade')
        ).group_by(Projeto.status).all()
        
        return jsonify({
            'success': True,
            'data': {
                'projetos': {
                    'total': total_projetos,
                    'ativos': projetos_ativos,
                    'finalizados': projetos_finalizados,
                    'progresso_medio': round(float(progresso_medio), 1)
                },
                'financeiro': {
                    'contas_pendentes': contas_pendentes,
                    'contas_atrasadas': contas_atrasadas,
                    'valor_pendente': float(valor_total_pendente),
                    'valor_projetos_ativos': float(valor_projetos_ativos)
                },
                'arquivos': {
                    'total': total_arquivos,
                    'hoje': arquivos_hoje
                },
                'geral': {
                    'clientes': total_clientes,
                    'funcionarios_ativos': funcionarios_ativos
                },
                'projetos_por_status': [
                    {
                        'status': item.status,
                        'quantidade': item.quantidade
                    }
                    for item in projetos_por_status
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

@dashboard_bp.route('/api/dashboard/projetos-recentes', methods=['GET'])
def projetos_recentes():
    """Projetos mais recentes"""
    db = SessionLocal()
    try:
        limit = request.args.get('limit', 5, type=int)
        
        projetos = db.query(Projeto).order_by(
            Projeto.created_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [projeto.to_dict() for projeto in projetos]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/dashboard/contas-vencimento', methods=['GET'])
def contas_proximo_vencimento():
    """Contas próximas do vencimento"""
    db = SessionLocal()
    try:
        dias = request.args.get('dias', 7, type=int)
        hoje = datetime.now().date()
        data_limite = hoje + timedelta(days=dias)
        
        contas = db.query(Conta).filter(
            Conta.data_vencimento.between(hoje, data_limite),
            Conta.status == 'Pendente'
        ).order_by(Conta.data_vencimento.asc()).all()
        
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

@dashboard_bp.route('/api/dashboard/atividade-mensal', methods=['GET'])
def atividade_mensal():
    """Atividade dos últimos meses"""
    db = SessionLocal()
    try:
        meses = request.args.get('meses', 6, type=int)
        
        # Calcular data de início
        hoje = datetime.now().date()
        data_inicio = hoje - timedelta(days=30 * meses)
        
        # Para PostgreSQL, usar to_char em vez de strftime
        if 'postgresql' in str(db.bind.url):
            # PostgreSQL
            projetos_por_mes = db.query(
                func.to_char(Projeto.created_at, 'YYYY-MM').label('mes'),
                func.count(Projeto.id).label('projetos')
            ).filter(
                Projeto.created_at >= data_inicio
            ).group_by(
                func.to_char(Projeto.created_at, 'YYYY-MM')
            ).all()
            
            contas_por_mes = db.query(
                func.to_char(Conta.created_at, 'YYYY-MM').label('mes'),
                func.count(Conta.id).label('contas'),
                func.sum(Conta.valor).label('valor_total')
            ).filter(
                Conta.created_at >= data_inicio
            ).group_by(
                func.to_char(Conta.created_at, 'YYYY-MM')
            ).all()
        else:
            # SQLite
            projetos_por_mes = db.query(
                func.strftime('%Y-%m', Projeto.created_at).label('mes'),
                func.count(Projeto.id).label('projetos')
            ).filter(
                Projeto.created_at >= data_inicio
            ).group_by(
                func.strftime('%Y-%m', Projeto.created_at)
            ).all()
            
            contas_por_mes = db.query(
                func.strftime('%Y-%m', Conta.created_at).label('mes'),
                func.count(Conta.id).label('contas'),
                func.sum(Conta.valor).label('valor_total')
            ).filter(
                Conta.created_at >= data_inicio
            ).group_by(
                func.strftime('%Y-%m', Conta.created_at)
            ).all()
        
        return jsonify({
            'success': True,
            'data': {
                'projetos_por_mes': [
                    {
                        'mes': item.mes,
                        'projetos': item.projetos
                    }
                    for item in projetos_por_mes
                ],
                'contas_por_mes': [
                    {
                        'mes': item.mes,
                        'contas': item.contas,
                        'valor_total': float(item.valor_total or 0)
                    }
                    for item in contas_por_mes
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

@dashboard_bp.route('/api/notificacoes', methods=['GET'])
def listar_notificacoes():
    """Listar notificações"""
    db = SessionLocal()
    try:
        limit = request.args.get('limit', 10, type=int)
        apenas_nao_lidas = request.args.get('nao_lidas', 'false').lower() == 'true'
        
        query = db.query(Notificacao)
        
        if apenas_nao_lidas:
            query = query.filter(Notificacao.lida == False)
        
        notificacoes = query.order_by(
            Notificacao.created_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [notificacao.to_dict() for notificacao in notificacoes],
            'total': len(notificacoes)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/notificacoes/<int:notificacao_id>/marcar-lida', methods=['PATCH'])
def marcar_notificacao_lida(notificacao_id):
    """Marcar notificação como lida"""
    db = SessionLocal()
    try:
        notificacao = db.query(Notificacao).filter(Notificacao.id == notificacao_id).first()
        
        if not notificacao:
            return jsonify({
                'success': False,
                'error': 'Notificação não encontrada'
            }), 404
        
        notificacao.lida = True
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notificação marcada como lida'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/notificacoes/marcar-todas-lidas', methods=['PATCH'])
def marcar_todas_lidas():
    """Marcar todas as notificações como lidas"""
    db = SessionLocal()
    try:
        db.query(Notificacao).filter(Notificacao.lida == False).update({'lida': True})
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Todas as notificações foram marcadas como lidas'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/dashboard/resumo-executivo', methods=['GET'])
def resumo_executivo():
    """Resumo executivo completo"""
    db = SessionLocal()
    try:
        hoje = datetime.now().date()
        mes_atual = hoje.replace(day=1)
        mes_anterior = (mes_atual - timedelta(days=1)).replace(day=1)
        
        # Receita total dos projetos
        receita_total = db.query(func.sum(Projeto.valor_total)).filter(
            Projeto.status == 'Finalizado'
        ).scalar() or 0
        
        # Receita do mês atual
        receita_mes_atual = db.query(func.sum(Projeto.valor_total)).filter(
            Projeto.status == 'Finalizado',
            Projeto.data_conclusao >= mes_atual
        ).scalar() or 0
        
        # Receita do mês anterior
        receita_mes_anterior = db.query(func.sum(Projeto.valor_total)).filter(
            Projeto.status == 'Finalizado',
            Projeto.data_conclusao >= mes_anterior,
            Projeto.data_conclusao < mes_atual
        ).scalar() or 0
        
        # Gastos do mês atual
        gastos_mes_atual = db.query(func.sum(Conta.valor)).filter(
            Conta.status == 'Paga',
            Conta.data_pagamento >= mes_atual
        ).scalar() or 0
        
        # Projetos em atraso (prazo vencido)
        projetos_em_atraso = db.query(Projeto).filter(
            Projeto.data_prazo < hoje,
            Projeto.status == 'Em Andamento'
        ).count()
        
        # Taxa de conclusão média dos projetos
        projetos_com_prazo = db.query(Projeto).filter(
            Projeto.data_prazo.isnot(None),
            Projeto.status == 'Finalizado'
        ).all()
        
        dias_medios_conclusao = 0
        if projetos_com_prazo:
            total_dias = sum([
                (p.data_conclusao - p.data_inicio).days 
                for p in projetos_com_prazo 
                if p.data_inicio and p.data_conclusao
            ])
            dias_medios_conclusao = total_dias / len(projetos_com_prazo) if projetos_com_prazo else 0
        
        # Calcular crescimento mensal
        crescimento_mensal = 0
        if receita_mes_anterior > 0:
            crescimento_mensal = ((receita_mes_atual - receita_mes_anterior) / receita_mes_anterior) * 100
        
        return jsonify({
            'success': True,
            'data': {
                'financeiro': {
                    'receita_total': float(receita_total),
                    'receita_mes_atual': float(receita_mes_atual),
                    'receita_mes_anterior': float(receita_mes_anterior),
                    'gastos_mes_atual': float(gastos_mes_atual),
                    'lucro_mes_atual': float(receita_mes_atual - gastos_mes_atual),
                    'crescimento_mensal': round(crescimento_mensal, 2)
                },
                'operacional': {
                    'projetos_em_atraso': projetos_em_atraso,
                    'dias_medios_conclusao': round(dias_medios_conclusao, 1),
                    'taxa_eficiencia': round(100 - (projetos_em_atraso * 10), 1)  # Métrica simples
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/dashboard/alertas', methods=['GET'])
def alertas_sistema():
    """Alertas importantes do sistema"""
    db = SessionLocal()
    try:
        hoje = datetime.now().date()
        alertas = []
        
        # Contas em atraso
        contas_atrasadas = db.query(Conta).filter(
            Conta.data_vencimento < hoje,
            Conta.status == 'Pendente'
        ).count()
        
        if contas_atrasadas > 0:
            alertas.append({
                'tipo': 'error',
                'titulo': 'Contas em atraso',
                'mensagem': f'Você tem {contas_atrasadas} conta(s) em atraso',
                'acao': 'Ver contas'
            })
        
        # Projetos com prazo próximo
        projetos_prazo_proximo = db.query(Projeto).filter(
            Projeto.data_prazo <= hoje + timedelta(days=7),
            Projeto.data_prazo >= hoje,
            Projeto.status == 'Em Andamento'
        ).count()
        
        if projetos_prazo_proximo > 0:
            alertas.append({
                'tipo': 'warning',
                'titulo': 'Projetos com prazo próximo',
                'mensagem': f'{projetos_prazo_proximo} projeto(s) com prazo em até 7 dias',
                'acao': 'Ver projetos'
            })
        
        # Funcionários sem projetos (simplificado)
        funcionarios_ativos = db.query(Funcionario).filter(Funcionario.status == 'Ativo').count()
        funcionarios_em_projetos = db.query(distinct(EquipeProjeto.funcionario_id)).filter(
            EquipeProjeto.ativo == True
        ).count()
        funcionarios_disponiveis = funcionarios_ativos - funcionarios_em_projetos
        
        if funcionarios_disponiveis > 0:
            alertas.append({
                'tipo': 'info',
                'titulo': 'Funcionários disponíveis',
                'mensagem': f'{funcionarios_disponiveis} funcionário(s) sem projetos ativos',
                'acao': 'Alocar funcionários'
            })
        
        return jsonify({
            'success': True,
            'data': alertas,
            'total': len(alertas)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@dashboard_bp.route('/api/dashboard-data', methods=['GET'])
def dashboard_data_consolidado():
    """Rota consolidada para dados do dashboard - NOVA ROTA"""
    db = SessionLocal()
    try:
        print("🔄 Iniciando carregamento consolidado de dados do dashboard...")
        
        hoje = datetime.now().date()
        
        # 📊 Estatísticas básicas
        total_projetos = db.query(Projeto).count()
        total_clientes = db.query(Cliente).count()
        total_contas = db.query(Conta).count()
        total_arquivos = db.query(Arquivo).count()
        
        # 💰 Receita total
        receita_total = db.query(func.sum(Projeto.valor_total)).filter(
            Projeto.status == 'Finalizado'
        ).scalar() or 0
        
        # 🏗️ Projetos recentes (últimos 10)
        projetos_recentes = db.query(Projeto).order_by(
            Projeto.created_at.desc()
        ).limit(10).all()
        
        # 👥 Clientes (todos)
        clientes = db.query(Cliente).order_by(
            Cliente.created_at.desc()
        ).all()
        
        # 💰 Contas (últimas 20)
        contas = db.query(Conta).order_by(
            Conta.data_vencimento.asc()
        ).limit(20).all()
        
        # 🔔 Notificações (últimas 10)
        notificacoes = db.query(Notificacao).order_by(
            Notificacao.created_at.desc()
        ).limit(10).all()
        
        # 📁 Arquivos mock (já que pode não ter endpoint ainda)
        arquivos_mock = [
            {
                'id': 1,
                'nome_original': 'Contrato_Cliente_A.pdf',
                'tipo_documento': 'Contrato',
                'projeto_nome': projetos_recentes[0].nome if projetos_recentes else 'Projeto Exemplo',
                'created_at': datetime.now().isoformat()
            },
            {
                'id': 2,
                'nome_original': 'Proposta_Comercial.docx',
                'tipo_documento': 'Proposta', 
                'projeto_nome': projetos_recentes[1].nome if len(projetos_recentes) > 1 else 'Projeto Mobile',
                'created_at': datetime.now().isoformat()
            }
        ]
        
        # 📋 Montar resposta consolidada
        dashboard_data = {
            'stats': {
                'totalProjects': total_projetos,
                'totalClients': total_clientes,
                'totalBills': total_contas,
                'totalFiles': total_arquivos,
                'revenue': float(receita_total)
            },
            'projects': [projeto.to_dict() for projeto in projetos_recentes],
            'clientes': [cliente.to_dict() for cliente in clientes],
            'bills': [conta.to_dict() for conta in contas],
            'files': arquivos_mock,
            'notifications': [notificacao.to_dict() for notificacao in notificacoes]
        }
        
        print(f"✅ Dados consolidados carregados: {total_projetos} projetos, {total_clientes} clientes, {total_contas} contas")
        
        return jsonify({
            'success': True,
            'data': dashboard_data,
            'timestamp': datetime.now().isoformat(),
            'message': 'Dados consolidados carregados com sucesso'
        })
        
    except Exception as e:
        print(f"❌ Erro ao carregar dados consolidados: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro ao carregar dados consolidados: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

# 🔧 Também adicione esta rota para debug/status do sistema
@dashboard_bp.route('/api/system/status', methods=['GET'])
def system_status():
    """Status do sistema e endpoints disponíveis"""
    db = SessionLocal()
    try:
        # Testar conexão com banco
        total_projetos = db.query(Projeto).count()
        
        return jsonify({
            'success': True,
            'status': 'online',
            'database': 'connected',
            'timestamp': datetime.now().isoformat(),
            'endpoints': {
                'dashboard_consolidado': '/api/dashboard-data',
                'dashboard_stats': '/api/dashboard/stats', 
                'projetos_recentes': '/api/dashboard/projetos-recentes',
                'contas_vencimento': '/api/dashboard/contas-vencimento',
                'notificacoes': '/api/notificacoes',
                'system_status': '/api/system/status'
            },
            'data_counts': {
                'projetos': total_projetos,
                'message': 'Sistema funcionando normalmente'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

# 🔧 Rota para testar CORS
@dashboard_bp.route('/api/test/cors', methods=['GET', 'POST', 'OPTIONS'])
def test_cors():
    """Testar configuração CORS"""
    if request.method == 'OPTIONS':
        return '', 200
    
    return jsonify({
        'success': True,
        'message': 'CORS está funcionando',
        'method': request.method,
        'origin': request.headers.get('Origin', 'N/A'),
        'timestamp': datetime.now().isoformat()
    })

# 🔧 Rota para health check específico do dashboard
@dashboard_bp.route('/api/dashboard/health', methods=['GET'])  
def dashboard_health():
    """Health check específico do dashboard"""
    db = SessionLocal()
    try:
        # Testar algumas queries básicas
        projetos_count = db.query(Projeto).count()
        clientes_count = db.query(Cliente).count()
        
        return jsonify({
            'success': True,
            'message': 'Dashboard funcionando normalmente',
            'database_status': 'connected',
            'endpoints_status': {
                'dashboard_stats': 'available',
                'projetos_recentes': 'available', 
                'contas_vencimento': 'available',
                'notificacoes': 'available',
                'dashboard_consolidado': 'available'
            },
            'data_summary': {
                'projetos': projetos_count,
                'clientes': clientes_count
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Erro no dashboard',
            'error': str(e),
            'database_status': 'error',
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()