from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Cliente(db.Model):
    __tablename__ = 'clientes'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    telefone = db.Column(db.String(20))
    cpf_cnpj = db.Column(db.String(20), unique=True)
    endereco = db.Column(db.Text)
    cidade = db.Column(db.String(100))
    estado = db.Column(db.String(2))
    cep = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    projetos = db.relationship('Projeto', backref='cliente', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'telefone': self.telefone,
            'cpf_cnpj': self.cpf_cnpj,
            'endereco': self.endereco,
            'cidade': self.cidade,
            'estado': self.estado,
            'cep': self.cep,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_projetos': len(self.projetos)
        }

class Projeto(db.Model):
    __tablename__ = 'projetos'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    valor_total = db.Column(db.Numeric(10, 2))
    valor_pago = db.Column(db.Numeric(10, 2), default=0)
    progresso = db.Column(db.Integer, default=0)  # 0-100%
    status = db.Column(db.String(50), default='Orçamento')  # Orçamento, Em Andamento, Finalizado, Cancelado
    data_inicio = db.Column(db.Date)
    data_prazo = db.Column(db.Date)
    data_conclusao = db.Column(db.Date)
    endereco_obra = db.Column(db.Text)
    tipo_servico = db.Column(db.String(100))  # Instalação, Manutenção, Reparo
    equipamentos = db.Column(db.Text)  # JSON com lista de equipamentos
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    arquivos = db.relationship('Arquivo', backref='projeto', lazy=True, cascade='all, delete-orphan')
    contas = db.relationship('Conta', backref='projeto', lazy=True)
    equipe_projeto = db.relationship('EquipeProjeto', backref='projeto', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'cliente_id': self.cliente_id,
            'cliente_nome': self.cliente.nome if self.cliente else None,
            'valor_total': float(self.valor_total) if self.valor_total else 0,
            'valor_pago': float(self.valor_pago) if self.valor_pago else 0,
            'progresso': self.progresso,
            'status': self.status,
            'data_inicio': self.data_inicio.isoformat() if self.data_inicio else None,
            'data_prazo': self.data_prazo.isoformat() if self.data_prazo else None,
            'data_conclusao': self.data_conclusao.isoformat() if self.data_conclusao else None,
            'endereco_obra': self.endereco_obra,
            'tipo_servico': self.tipo_servico,
            'equipamentos': json.loads(self.equipamentos) if self.equipamentos else [],
            'observacoes': self.observacoes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'total_arquivos': len(self.arquivos),
            'equipe': [ep.funcionario.nome for ep in self.equipe_projeto if ep.ativo]
        }

class Funcionario(db.Model):
    __tablename__ = 'funcionarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    cpf = db.Column(db.String(14), unique=True, nullable=False)
    telefone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    cargo = db.Column(db.String(100))
    salario = db.Column(db.Numeric(10, 2))
    data_admissao = db.Column(db.Date)
    status = db.Column(db.String(20), default='Ativo')  # Ativo, Inativo, Férias
    especialidades = db.Column(db.Text)  # JSON com especialidades técnicas
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    equipe_projeto = db.relationship('EquipeProjeto', backref='funcionario', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cpf': self.cpf,
            'telefone': self.telefone,
            'email': self.email,
            'cargo': self.cargo,
            'salario': float(self.salario) if self.salario else 0,
            'data_admissao': self.data_admissao.isoformat() if self.data_admissao else None,
            'status': self.status,
            'especialidades': json.loads(self.especialidades) if self.especialidades else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'projetos_ativos': len([ep for ep in self.equipe_projeto if ep.projeto.status == 'Em Andamento' and ep.ativo])
        }

class EquipeProjeto(db.Model):
    __tablename__ = 'equipe_projeto'
    
    id = db.Column(db.Integer, primary_key=True)
    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'), nullable=False)
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id'), nullable=False)
    funcao = db.Column(db.String(100))  # Técnico Principal, Assistente, etc.
    data_entrada = db.Column(db.Date, default=datetime.utcnow().date())
    data_saida = db.Column(db.Date)
    ativo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'projeto_id': self.projeto_id,
            'funcionario_id': self.funcionario_id,
            'funcionario_nome': self.funcionario.nome,
            'funcao': self.funcao,
            'data_entrada': self.data_entrada.isoformat() if self.data_entrada else None,
            'data_saida': self.data_saida.isoformat() if self.data_saida else None,
            'ativo': self.ativo
        }

class Conta(db.Model):
    __tablename__ = 'contas'
    
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # Fornecedor, Funcionário, Imposto, etc.
    categoria = db.Column(db.String(100))  # Material, Mão de obra, Transporte, etc.
    data_vencimento = db.Column(db.Date, nullable=False)
    data_pagamento = db.Column(db.Date)
    status = db.Column(db.String(20), default='Pendente')  # Pendente, Paga, Atrasada
    prioridade = db.Column(db.String(20), default='Média')  # Baixa, Média, Alta, Crítica
    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'))
    fornecedor = db.Column(db.String(200))
    numero_documento = db.Column(db.String(50))
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        dias_vencimento = None
        if self.data_vencimento:
            dias_vencimento = (self.data_vencimento - datetime.now().date()).days
        
        return {
            'id': self.id,
            'descricao': self.descricao,
            'valor': float(self.valor),
            'tipo': self.tipo,
            'categoria': self.categoria,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'data_pagamento': self.data_pagamento.isoformat() if self.data_pagamento else None,
            'status': self.status,
            'prioridade': self.prioridade,
            'projeto_id': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            'fornecedor': self.fornecedor,
            'numero_documento': self.numero_documento,
            'observacoes': self.observacoes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'dias_vencimento': dias_vencimento
        }

class Arquivo(db.Model):
    __tablename__ = 'arquivos'
    
    id = db.Column(db.Integer, primary_key=True)
    nome_original = db.Column(db.String(200), nullable=False)
    nome_arquivo = db.Column(db.String(200), nullable=False)
    caminho = db.Column(db.String(500), nullable=False)
    tamanho = db.Column(db.Integer)
    tipo_mime = db.Column(db.String(100))
    tipo_documento = db.Column(db.String(50))  # Projeto, Contrato, Foto, CAD, etc.
    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'))
    descricao = db.Column(db.Text)
    tags = db.Column(db.Text)  # JSON com tags para busca
    cloud_url = db.Column(db.String(500))  # URL do arquivo na nuvem
    cloud_id = db.Column(db.String(200))  # ID do arquivo na nuvem
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome_original': self.nome_original,
            'nome_arquivo': self.nome_arquivo,
            'tamanho': self.tamanho,
            'tipo_mime': self.tipo_mime,
            'tipo_documento': self.tipo_documento,
            'projeto_id': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            'descricao': self.descricao,
            'tags': json.loads(self.tags) if self.tags else [],
            'cloud_url': self.cloud_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Notificacao(db.Model):
    __tablename__ = 'notificacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    mensagem = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(50), default='info')  # info, warning, error, success
    lida = db.Column(db.Boolean, default=False)
    projeto_id = db.Column(db.Integer, db.ForeignKey('projetos.id'))
    conta_id = db.Column(db.Integer, db.ForeignKey('contas.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'mensagem': self.mensagem,
            'tipo': self.tipo,
            'lida': self.lida,
            'projeto_id': self.projeto_id,
            'conta_id': self.conta_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }