from flask import Blueprint, request, jsonify
from database import SessionLocal, Cliente, Projeto
from sqlalchemy import or_

clientes_bp = Blueprint('clientes', __name__)

@clientes_bp.route('/api/clientes', methods=['GET'])
def listar_clientes():
    """Listar todos os clientes"""
    db = SessionLocal()
    try:
        clientes = db.query(Cliente).all()
        return jsonify({
            'success': True,
            'data': [cliente.to_dict() for cliente in clientes],
            'total': len(clientes)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@clientes_bp.route('/api/clientes', methods=['POST'])
def criar_cliente():
    """Criar novo cliente"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validações básicas
        if not data.get('nome'):
            return jsonify({
                'success': False,
                'error': 'Nome é obrigatório'
            }), 400
            
        if not data.get('email'):
            return jsonify({
                'success': False,
                'error': 'Email é obrigatório'
            }), 400
        
        # Verificar se email já existe
        cliente_existente = db.query(Cliente).filter(Cliente.email == data['email']).first()
        if cliente_existente:
            return jsonify({
                'success': False,
                'error': 'Email já cadastrado'
            }), 400
        
        cliente = Cliente(
            nome=data['nome'],
            email=data['email'],
            telefone=data.get('telefone'),
            cpf_cnpj=data.get('cpf_cnpj'),
            endereco=data.get('endereco'),
            cidade=data.get('cidade'),
            estado=data.get('estado'),
            cep=data.get('cep')
        )
        
        db.add(cliente)
        db.commit()
        
        return jsonify({
            'success': True,
            'data': cliente.to_dict(),
            'message': 'Cliente criado com sucesso'
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@clientes_bp.route('/api/clientes/<int:cliente_id>', methods=['GET'])
def obter_cliente(cliente_id):
    """Obter cliente por ID"""
    db = SessionLocal()
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            return jsonify({
                'success': False,
                'error': 'Cliente não encontrado'
            }), 404
        
        # Incluir projetos do cliente
        cliente_data = cliente.to_dict()
        projetos = db.query(Projeto).filter(Projeto.cliente_id == cliente_id).all()
        cliente_data['projetos'] = [projeto.to_dict() for projeto in projetos]
        
        return jsonify({
            'success': True,
            'data': cliente_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@clientes_bp.route('/api/clientes/<int:cliente_id>', methods=['PUT'])
def atualizar_cliente(cliente_id):
    """Atualizar cliente"""
    db = SessionLocal()
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            return jsonify({
                'success': False,
                'error': 'Cliente não encontrado'
            }), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'nome' in data:
            cliente.nome = data['nome']
        if 'email' in data:
            # Verificar se email não está sendo usado por outro cliente
            cliente_existente = db.query(Cliente).filter(
                Cliente.email == data['email'],
                Cliente.id != cliente_id
            ).first()
            if cliente_existente:
                return jsonify({
                    'success': False,
                    'error': 'Email já está sendo usado por outro cliente'
                }), 400
            cliente.email = data['email']
        if 'telefone' in data:
            cliente.telefone = data['telefone']
        if 'cpf_cnpj' in data:
            cliente.cpf_cnpj = data['cpf_cnpj']
        if 'endereco' in data:
            cliente.endereco = data['endereco']
        if 'cidade' in data:
            cliente.cidade = data['cidade']
        if 'estado' in data:
            cliente.estado = data['estado']
        if 'cep' in data:
            cliente.cep = data['cep']
        
        db.commit()
        
        return jsonify({
            'success': True,
            'data': cliente.to_dict(),
            'message': 'Cliente atualizado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@clientes_bp.route('/api/clientes/<int:cliente_id>', methods=['DELETE'])
def deletar_cliente(cliente_id):
    """Deletar cliente"""
    db = SessionLocal()
    try:
        cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
        
        if not cliente:
            return jsonify({
                'success': False,
                'error': 'Cliente não encontrado'
            }), 404
        
        # Verificar se tem projetos associados
        projetos_count = db.query(Projeto).filter(Projeto.cliente_id == cliente_id).count()
        if projetos_count > 0:
            return jsonify({
                'success': False,
                'error': 'Não é possível deletar cliente com projetos associados'
            }), 400
        
        db.delete(cliente)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente deletado com sucesso'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@clientes_bp.route('/api/clientes/search', methods=['GET'])
def buscar_clientes():
    """Buscar clientes por nome, email ou CPF/CNPJ"""
    db = SessionLocal()
    try:
        query_param = request.args.get('q', '').strip()
        if not query_param:
            return jsonify({
                'success': False,
                'error': 'Parâmetro de busca é obrigatório'
            }), 400
        
        clientes = db.query(Cliente).filter(
            or_(
                Cliente.nome.ilike(f'%{query_param}%'),
                Cliente.email.ilike(f'%{query_param}%'),
                Cliente.cpf_cnpj.ilike(f'%{query_param}%')
            )
        ).all()
        
        return jsonify({
            'success': True,
            'data': [cliente.to_dict() for cliente in clientes],
            'total': len(clientes)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()