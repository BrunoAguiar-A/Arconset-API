from flask import Blueprint, request, jsonify
from datetime import datetime
from database import SessionLocal, Funcionario, EquipeProjeto, Projeto
import json

funcionarios_bp = Blueprint('funcionarios', __name__)

@funcionarios_bp.route('/api/funcionarios', methods=['GET'])
def listar_funcionarios():
    """Listar todos os funcionários"""
    db = SessionLocal()
    try:
        status_filter = request.args.get('status')
        
        query = db.query(Funcionario)
        if status_filter:
            query = query.filter(Funcionario.status == status_filter)
        
        funcionarios = query.all()
        
        return jsonify({
            'success': True,
            'data': [funcionario.to_dict() for funcionario in funcionarios],
            'total': len(funcionarios)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios', methods=['POST'])
def criar_funcionario():
    """Criar novo funcionário"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('nome'):
            return jsonify({
                'success': False,
                'error': 'Nome é obrigatório'
            }), 400
            
        if not data.get('cpf'):
            return jsonify({
                'success': False,
                'error': 'CPF é obrigatório'
            }), 400
        
        # Verificar se CPF já existe
        funcionario_existente = db.query(Funcionario).filter(Funcionario.cpf == data['cpf']).first()
        if funcionario_existente:
            return jsonify({
                'success': False,
                'error': 'CPF já cadastrado'
            }), 400
        
        # Converter data de admissão
        data_admissao = None
        if data.get('data_admissao'):
            try:
                data_admissao = datetime.strptime(data['data_admissao'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido. Use YYYY-MM-DD'
                }), 400
        
        # Processar especialidades
        especialidades = data.get('especialidades', [])
        if isinstance(especialidades, list):
            especialidades = json.dumps(especialidades)
        
        funcionario = Funcionario(
            nome=data['nome'],
            cpf=data['cpf'],
            telefone=data.get('telefone'),
            email=data.get('email'),
            cargo=data.get('cargo'),
            salario=data.get('salario'),
            data_admissao=data_admissao,
            status=data.get('status', 'Ativo'),
            especialidades=especialidades
        )
        
        db.add(funcionario)
        db.commit()
        
        return jsonify({
            'success': True,
            'data': funcionario.to_dict(),
            'message': 'Funcionário criado com sucesso'
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/<int:funcionario_id>', methods=['GET'])
def obter_funcionario(funcionario_id):
    """Obter funcionário por ID"""
    db = SessionLocal()
    try:
        funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id).first()
        
        if not funcionario:
            return jsonify({
                'success': False,
                'error': 'Funcionário não encontrado'
            }), 404
        
        # Incluir projetos do funcionário
        funcionario_data = funcionario.to_dict()
        
        # Buscar projetos do funcionário através da tabela de equipe
        equipe_projetos = db.query(EquipeProjeto).filter(
            EquipeProjeto.funcionario_id == funcionario_id
        ).all()
        
        funcionario_data['projetos'] = []
        for ep in equipe_projetos:
            projeto = db.query(Projeto).filter(Projeto.id == ep.projeto_id).first()
            if projeto:
                funcionario_data['projetos'].append({
                    'projeto_id': ep.projeto_id,
                    'projeto_nome': projeto.nome,
                    'funcao': ep.funcao,
                    'data_entrada': ep.data_entrada.isoformat() if ep.data_entrada else None,
                    'ativo': ep.ativo
                })
        
        return jsonify({
            'success': True,
            'data': funcionario_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/<int:funcionario_id>', methods=['PUT'])
def atualizar_funcionario(funcionario_id):
    """Atualizar funcionário"""
    db = SessionLocal()
    try:
        funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id).first()
        
        if not funcionario:
            return jsonify({
                'success': False,
                'error': 'Funcionário não encontrado'
            }), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'nome' in data:
            funcionario.nome = data['nome']
        if 'cpf' in data:
            # Verificar se CPF não está sendo usado por outro funcionário
            funcionario_existente = db.query(Funcionario).filter(
                Funcionario.cpf == data['cpf'],
                Funcionario.id != funcionario_id
            ).first()
            if funcionario_existente:
                return jsonify({
                    'success': False,
                    'error': 'CPF já está sendo usado por outro funcionário'
                }), 400
            funcionario.cpf = data['cpf']
        if 'telefone' in data:
            funcionario.telefone = data['telefone']
        if 'email' in data:
            funcionario.email = data['email']
        if 'cargo' in data:
            funcionario.cargo = data['cargo']
        if 'salario' in data:
            funcionario.salario = data['salario']
        if 'data_admissao' in data:
            try:
                funcionario.data_admissao = datetime.strptime(data['data_admissao'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de data inválido. Use YYYY-MM-DD'
                }), 400
        if 'status' in data:
            funcionario.status = data['status']
        if 'especialidades' in data:
            especialidades = data['especialidades']
            if isinstance(especialidades, list):
                funcionario.especialidades = json.dumps(especialidades)
            else:
                funcionario.especialidades = especialidades
        
        db.commit()
        
        return jsonify({
            'success': True,
            'data': funcionario.to_dict(),
            'message': 'Funcionário atualizado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/<int:funcionario_id>', methods=['DELETE'])
def deletar_funcionario(funcionario_id):
    """Deletar funcionário"""
    db = SessionLocal()
    try:
        funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id).first()
        
        if not funcionario:
            return jsonify({
                'success': False,
                'error': 'Funcionário não encontrado'
            }), 404
        
        # Verificar se tem projetos ativos
        projetos_ativos = db.query(EquipeProjeto).filter(
            EquipeProjeto.funcionario_id == funcionario_id,
            EquipeProjeto.ativo == True
        ).count()
        
        if projetos_ativos > 0:
            return jsonify({
                'success': False,
                'error': 'Não é possível deletar funcionário com projetos ativos'
            }), 400
        
        db.delete(funcionario)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Funcionário deletado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/<int:funcionario_id>/projetos', methods=['POST'])
def adicionar_funcionario_projeto(funcionario_id):
    """Adicionar funcionário a um projeto"""
    db = SessionLocal()
    try:
        funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id).first()
        
        if not funcionario:
            return jsonify({
                'success': False,
                'error': 'Funcionário não encontrado'
            }), 404
        
        data = request.get_json()
        
        if not data.get('projeto_id'):
            return jsonify({
                'success': False,
                'error': 'ID do projeto é obrigatório'
            }), 400
        
        # Verificar se já está no projeto
        equipe_existente = db.query(EquipeProjeto).filter(
            EquipeProjeto.funcionario_id == funcionario_id,
            EquipeProjeto.projeto_id == data['projeto_id'],
            EquipeProjeto.ativo == True
        ).first()
        
        if equipe_existente:
            return jsonify({
                'success': False,
                'error': 'Funcionário já está neste projeto'
            }), 400
        
        equipe_projeto = EquipeProjeto(
            funcionario_id=funcionario_id,
            projeto_id=data['projeto_id'],
            funcao=data.get('funcao'),
            data_entrada=datetime.now().date()
        )
        
        db.add(equipe_projeto)
        db.commit()
        
        return jsonify({
            'success': True,
            'data': equipe_projeto.to_dict(),
            'message': 'Funcionário adicionado ao projeto com sucesso'
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/<int:funcionario_id>/projetos/<int:projeto_id>', methods=['DELETE'])
def remover_funcionario_projeto(funcionario_id, projeto_id):
    """Remover funcionário de um projeto"""
    db = SessionLocal()
    try:
        equipe_projeto = db.query(EquipeProjeto).filter(
            EquipeProjeto.funcionario_id == funcionario_id,
            EquipeProjeto.projeto_id == projeto_id,
            EquipeProjeto.ativo == True
        ).first()
        
        if not equipe_projeto:
            return jsonify({
                'success': False,
                'error': 'Funcionário não encontrado neste projeto'
            }), 404
        
        equipe_projeto.ativo = False
        equipe_projeto.data_saida = datetime.now().date()
        
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Funcionário removido do projeto com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@funcionarios_bp.route('/api/funcionarios/disponiveis', methods=['GET'])
def funcionarios_disponiveis():
    """Listar funcionários disponíveis (sem projetos ativos)"""
    db = SessionLocal()
    try:
        # Subconsulta para funcionários com projetos ativos
        funcionarios_ocupados_subq = db.query(EquipeProjeto.funcionario_id).filter(
            EquipeProjeto.ativo == True
        ).distinct().subquery()
        
        # Funcionários disponíveis
        funcionarios_disponiveis = db.query(Funcionario).filter(
            ~Funcionario.id.in_(db.query(funcionarios_ocupados_subq.c.funcionario_id)),
            Funcionario.status == 'Ativo'
        ).all()
        
        return jsonify({
            'success': True,
            'data': [funcionario.to_dict() for funcionario in funcionarios_disponiveis],
            'total': len(funcionarios_disponiveis)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()