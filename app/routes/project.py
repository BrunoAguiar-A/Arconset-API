from flask import Blueprint, request, jsonify
from database import SessionLocal, Projeto, Cliente
from datetime import datetime

project_bp = Blueprint('projects', __name__)

@project_bp.route('/api/projects', methods=['GET'])
def list_projects():
    """Listar todos os projetos"""
    db = SessionLocal()
    try:
        projects = db.query(Projeto).all()
        return jsonify({
            'success': True,
            'data': [project.to_dict() for project in projects],
            'total': len(projects)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@project_bp.route('/api/projects', methods=['POST'])
def create_project():
    """Criar novo projeto"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validações básicas
        if not data.get('nome'):
            return jsonify({
                'success': False,
                'error': 'Nome é obrigatório'
            }), 400
            
        if not data.get('cliente_id'):
            return jsonify({
                'success': False,
                'error': 'Cliente é obrigatório'
            }), 400
        
        # Verificar se cliente existe
        cliente = db.query(Cliente).filter(Cliente.id == data['cliente_id']).first()
        if not cliente:
            return jsonify({
                'success': False,
                'error': 'Cliente não encontrado'
            }), 400
        
        # Converter datas se fornecidas
        data_inicio = None
        data_prazo = None
        data_conclusao = None
        
        if data.get('data_inicio'):
            try:
                data_inicio = datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_inicio inválido. Use YYYY-MM-DD'
                }), 400
        
        if data.get('data_prazo'):
            try:
                data_prazo = datetime.strptime(data['data_prazo'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_prazo inválido. Use YYYY-MM-DD'
                }), 400
        
        if data.get('data_conclusao'):
            try:
                data_conclusao = datetime.strptime(data['data_conclusao'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_conclusao inválido. Use YYYY-MM-DD'
                }), 400
        
        # Processar equipamentos
        equipamentos = data.get('equipamentos', [])
        if isinstance(equipamentos, list):
            import json
            equipamentos = json.dumps(equipamentos)
        
        project = Projeto(
            nome=data['nome'],
            descricao=data.get('descricao'),
            cliente_id=data['cliente_id'],
            valor_total=data.get('valor_total'),
            valor_pago=data.get('valor_pago', 0),
            progresso=data.get('progresso', 0),
            status=data.get('status', 'Orçamento'),
            data_inicio=data_inicio,
            data_prazo=data_prazo,
            data_conclusao=data_conclusao,
            endereco_obra=data.get('endereco_obra'),
            tipo_servico=data.get('tipo_servico'),
            equipamentos=equipamentos,
            observacoes=data.get('observacoes')
        )
        
        db.add(project)
        db.commit()
        
        return jsonify({
            'success': True,
            'data': project.to_dict(),
            'message': 'Projeto criado com sucesso'
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@project_bp.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Obter projeto por ID"""
    db = SessionLocal()
    try:
        project = db.query(Projeto).filter(Projeto.id == project_id).first()
        
        if not project:
            return jsonify({
                'success': False,
                'error': 'Projeto não encontrado'
            }), 404
        
        return jsonify({
            'success': True,
            'data': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@project_bp.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """Atualizar projeto"""
    db = SessionLocal()
    try:
        project = db.query(Projeto).filter(Projeto.id == project_id).first()
        
        if not project:
            return jsonify({
                'success': False,
                'error': 'Projeto não encontrado'
            }), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'nome' in data:
            project.nome = data['nome']
        if 'descricao' in data:
            project.descricao = data['descricao']
        if 'cliente_id' in data:
            # Verificar se cliente existe
            cliente = db.query(Cliente).filter(Cliente.id == data['cliente_id']).first()
            if not cliente:
                return jsonify({
                    'success': False,
                    'error': 'Cliente não encontrado'
                }), 400
            project.cliente_id = data['cliente_id']
        if 'valor_total' in data:
            project.valor_total = data['valor_total']
        if 'valor_pago' in data:
            project.valor_pago = data['valor_pago']
        if 'progresso' in data:
            project.progresso = data['progresso']
        if 'status' in data:
            project.status = data['status']
        if 'endereco_obra' in data:
            project.endereco_obra = data['endereco_obra']
        if 'tipo_servico' in data:
            project.tipo_servico = data['tipo_servico']
        if 'observacoes' in data:
            project.observacoes = data['observacoes']
        
        # Atualizar datas
        if 'data_inicio' in data and data['data_inicio']:
            try:
                project.data_inicio = datetime.strptime(data['data_inicio'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_inicio inválido. Use YYYY-MM-DD'
                }), 400
        
        if 'data_prazo' in data and data['data_prazo']:
            try:
                project.data_prazo = datetime.strptime(data['data_prazo'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_prazo inválido. Use YYYY-MM-DD'
                }), 400
        
        if 'data_conclusao' in data and data['data_conclusao']:
            try:
                project.data_conclusao = datetime.strptime(data['data_conclusao'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data_conclusao inválido. Use YYYY-MM-DD'
                }), 400
        
        # Atualizar equipamentos
        if 'equipamentos' in data:
            equipamentos = data['equipamentos']
            if isinstance(equipamentos, list):
                import json
                project.equipamentos = json.dumps(equipamentos)
            else:
                project.equipamentos = equipamentos
        
        # Atualizar timestamp
        project.updated_at = datetime.utcnow()
        
        db.commit()
        
        return jsonify({
            'success': True,
            'data': project.to_dict(),
            'message': 'Projeto atualizado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@project_bp.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Deletar projeto"""
    db = SessionLocal()
    try:
        project = db.query(Projeto).filter(Projeto.id == project_id).first()
        
        if not project:
            return jsonify({
                'success': False,
                'error': 'Projeto não encontrado'
            }), 404
        
        db.delete(project)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Projeto deletado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@project_bp.route('/api/projects/<int:project_id>/progress', methods=['PATCH'])
def update_progress(project_id):
    """Atualizar progresso do projeto"""
    db = SessionLocal()
    try:
        project = db.query(Projeto).filter(Projeto.id == project_id).first()
        
        if not project:
            return jsonify({
                'success': False,
                'error': 'Projeto não encontrado'
            }), 404
        
        data = request.get_json()
        
        if 'progress' not in data:
            return jsonify({
                'success': False,
                'error': 'Campo progress é obrigatório'
            }), 400
        
        progress = data['progress']
        
        if not isinstance(progress, (int, float)) or progress < 0 or progress > 100:
            return jsonify({
                'success': False,
                'error': 'Progress deve ser um número entre 0 e 100'
            }), 400
        
        project.progresso = progress
        project.updated_at = datetime.utcnow()
        
        # Atualizar status automaticamente baseado no progresso
        if progress == 100:
            project.status = 'Finalizado'
            if not project.data_conclusao:
                project.data_conclusao = datetime.now().date()
        elif progress > 0:
            if project.status == 'Orçamento':
                project.status = 'Em Andamento'
        
        db.commit()
        
        return jsonify({
            'success': True,
            'data': project.to_dict(),
            'message': 'Progresso atualizado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()