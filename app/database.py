# database_production.py - VERSÃO 100% PRODUÇÃO
# ⚠️ SUBSTITUA o arquivo database.py atual por este

from sqlalchemy import create_engine, text, Column, Integer, String, Text, Date, DateTime, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# ===== CONFIGURAÇÃO PRODUÇÃO - APENAS AWS RDS =====
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("❌ DATABASE_URL não configurada! Configure no .env")

if "localhost" in DATABASE_URL or "sqlite" in DATABASE_URL:
    raise Exception("❌ ERRO: Configuração de desenvolvimento detectada em produção!")

print(f"🔗 Conectando ao AWS RDS: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'RDS'}")

# ===== ENGINE OTIMIZADO PARA PRODUÇÃO =====
engine = create_engine(
    DATABASE_URL,
    echo=False,  # NUNCA True em produção
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 30,
        "sslmode": "require"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency para obter sessão do banco"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ===== MODELOS DO BANCO DE DADOS =====

class Cliente(Base):
    __tablename__ = 'clientes'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    telefone = Column(String(20))
    cpf_cnpj = Column(String(20), unique=True, index=True)
    endereco = Column(Text)
    cidade = Column(String(100))
    estado = Column(String(2))
    cep = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    projetos = relationship("Projeto", back_populates="cliente")
    
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
            'total_projetos': len(self.projetos) if self.projetos else 0
        }

class Projeto(Base):
    __tablename__ = 'projetos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text)
    cliente_id = Column(Integer, ForeignKey('clientes.id'), nullable=False)
    valor_total = Column(Numeric(10, 2))
    valor_pago = Column(Numeric(10, 2), default=0)
    progresso = Column(Integer, default=0)
    status = Column(String(50), default='Orçamento', index=True)
    data_inicio = Column(Date)
    data_prazo = Column(Date)
    data_conclusao = Column(Date)
    endereco_obra = Column(Text)
    tipo_servico = Column(String(100))
    equipamentos = Column(Text)
    observacoes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    cliente = relationship("Cliente", back_populates="projetos")
    arquivos = relationship("Arquivo", back_populates="projeto", cascade="all, delete-orphan")
    contas = relationship("Conta", back_populates="projeto")
    equipe_projeto = relationship("EquipeProjeto", back_populates="projeto", cascade="all, delete-orphan")
    
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
            'total_arquivos': len(self.arquivos) if self.arquivos else 0,
            'equipe': [ep.funcionario.nome for ep in self.equipe_projeto if ep.ativo] if self.equipe_projeto else []
        }

class Funcionario(Base):
    __tablename__ = 'funcionarios'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False, index=True)
    telefone = Column(String(20))
    email = Column(String(120), index=True)
    cargo = Column(String(100))
    salario = Column(Numeric(10, 2))
    data_admissao = Column(Date)
    status = Column(String(20), default='Ativo', index=True)
    especialidades = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    equipe_projeto = relationship("EquipeProjeto", back_populates="funcionario")
    
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
            'projetos_ativos': len([ep for ep in self.equipe_projeto if ep.projeto.status == 'Em Andamento' and ep.ativo]) if self.equipe_projeto else 0
        }

class EquipeProjeto(Base):
    __tablename__ = 'equipe_projeto'
    
    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=False)
    funcionario_id = Column(Integer, ForeignKey('funcionarios.id'), nullable=False)
    funcao = Column(String(100))
    data_entrada = Column(Date, default=datetime.now().date())
    data_saida = Column(Date)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    projeto = relationship("Projeto", back_populates="equipe_projeto")
    funcionario = relationship("Funcionario", back_populates="equipe_projeto")
    
    def to_dict(self):
        return {
            'id': self.id,
            'projeto_id': self.projeto_id,
            'funcionario_id': self.funcionario_id,
            'funcionario_nome': self.funcionario.nome if self.funcionario else None,
            'funcao': self.funcao,
            'data_entrada': self.data_entrada.isoformat() if self.data_entrada else None,
            'data_saida': self.data_saida.isoformat() if self.data_saida else None,
            'ativo': self.ativo
        }

class Conta(Base):
    __tablename__ = 'contas'
    
    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String(200), nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    tipo = Column(String(50), nullable=False, index=True)
    categoria = Column(String(100), index=True)
    data_vencimento = Column(Date, nullable=False, index=True)
    data_pagamento = Column(Date)
    status = Column(String(20), default='Pendente', index=True)
    prioridade = Column(String(20), default='Média', index=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    fornecedor = Column(String(200))
    numero_documento = Column(String(50))
    observacoes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    projeto = relationship("Projeto", back_populates="contas")
    
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

class Arquivo(Base):
    __tablename__ = 'arquivos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome_original = Column(String(200), nullable=False)
    nome_arquivo = Column(String(200), nullable=False)
    caminho = Column(String(500), nullable=False)
    tamanho = Column(Integer)
    tipo_mime = Column(String(100))
    tipo_documento = Column(String(50), index=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    descricao = Column(Text)
    tags = Column(Text)
    cloud_url = Column(String(500))
    cloud_id = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    projeto = relationship("Projeto", back_populates="arquivos")
    
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

class Notificacao(Base):
    __tablename__ = 'notificacoes'
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(50), default='info', index=True)
    lida = Column(Boolean, default=False, index=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    conta_id = Column(Integer, ForeignKey('contas.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
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

# ===== FUNÇÃO PARA CRIAR TABELAS =====
def create_tables():
    """Criar todas as tabelas no banco de dados"""
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas com sucesso!")

# ===== VERIFICAÇÃO DE PRODUÇÃO =====
def verify_production_config():
    """Verificar se a configuração está correta para produção"""
    print("🔍 Verificando configuração de produção...")
    
    # Verificar DATABASE_URL
    if not DATABASE_URL:
        raise Exception("❌ DATABASE_URL não configurada!")
    
    if "localhost" in DATABASE_URL or "sqlite" in DATABASE_URL:
        raise Exception("❌ Configuração de desenvolvimento detectada!")
    
    # Verificar conexão
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Conexão com AWS RDS verificada!")
    except Exception as e:
        raise Exception(f"❌ Falha na conexão com AWS RDS: {e}")
    
    print("✅ Configuração de produção verificada!")

# Executar verificação na importação
verify_production_config()