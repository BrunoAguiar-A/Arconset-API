from sqlalchemy import create_engine, Column, Integer, String, Text, Date, DateTime, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://arconsetadm:bruno3982@localhost:5432/arconset_db"
)

# Manter compatibilidade com SQLite para desenvolvimento se necessário
# DATABASE_URL = "sqlite:///./projetos.db"

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Mudar para True se quiser ver as queries SQL
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency para obter sessão do banco
def get_db():
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
    progresso = Column(Integer, default=0)  # 0-100%
    status = Column(String(50), default='Orçamento', index=True)  # Orçamento, Em Andamento, Finalizado, Cancelado
    data_inicio = Column(Date)
    data_prazo = Column(Date)
    data_conclusao = Column(Date)
    endereco_obra = Column(Text)
    tipo_servico = Column(String(100))  # Instalação, Manutenção, Reparo
    equipamentos = Column(Text)  # JSON com lista de equipamentos
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
    status = Column(String(20), default='Ativo', index=True)  # Ativo, Inativo, Férias
    especialidades = Column(Text)  # JSON com especialidades técnicas
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
    funcao = Column(String(100))  # Técnico Principal, Assistente, etc.
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
    tipo = Column(String(50), nullable=False, index=True)  # Fornecedor, Funcionário, Imposto, etc.
    categoria = Column(String(100), index=True)  # Material, Mão de obra, Transporte, etc.
    data_vencimento = Column(Date, nullable=False, index=True)
    data_pagamento = Column(Date)
    status = Column(String(20), default='Pendente', index=True)  # Pendente, Paga, Atrasada
    prioridade = Column(String(20), default='Média', index=True)  # Baixa, Média, Alta, Crítica
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
    tipo_documento = Column(String(50), index=True)  # Projeto, Contrato, Foto, CAD, etc.
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    descricao = Column(Text)
    tags = Column(Text)  # JSON com tags para busca
    cloud_url = Column(String(500))  # URL do arquivo na nuvem
    cloud_id = Column(String(200))  # ID do arquivo na nuvem
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
    tipo = Column(String(50), default='info', index=True)  # info, warning, error, success
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

# ===== FUNÇÕES AUXILIARES =====

def create_tables():
    """Criar todas as tabelas no banco de dados"""
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas com sucesso!")

def insert_sample_data():
    """Inserir dados de exemplo no banco"""
    db = SessionLocal()
    try:
        # Verificar se já existem dados
        if db.query(Cliente).count() > 0:
            print("ℹ️  Dados já existem no banco")
            return
        
        print("📝 Inserindo dados de exemplo...")
        
        # Clientes de exemplo
        cliente1 = Cliente(
            nome='Shopping Center Norte',
            email='contato@shoppingnorte.com',
            telefone='(11) 99999-0001',
            cpf_cnpj='12.345.678/0001-90',
            endereco='Av. Paulista, 1000',
            cidade='São Paulo',
            estado='SP',
            cep='01310-100'
        )
        
        cliente2 = Cliente(
            nome='Edifício Comercial Central',
            email='admin@edificiocentral.com',
            telefone='(11) 99999-0002',
            cpf_cnpj='98.765.432/0001-10',
            endereco='Rua da Consolação, 500',
            cidade='São Paulo',
            estado='SP',
            cep='01302-000'
        )
        
        db.add_all([cliente1, cliente2])
        db.commit()
        
        # Projetos de exemplo
        from datetime import date, timedelta
        
        projeto1 = Projeto(
            nome='Instalação HVAC Shopping Norte',
            descricao='Sistema completo de climatização para shopping center',
            cliente_id=cliente1.id,
            valor_total=150000.00,
            valor_pago=75000.00,
            progresso=75,
            status='Em Andamento',
            data_inicio=date.today() - timedelta(days=30),
            data_prazo=date.today() + timedelta(days=15),
            endereco_obra='Av. Paulista, 1000 - São Paulo/SP',
            tipo_servico='Instalação',
            equipamentos='["Split 60.000 BTUs", "Dutos de ar", "Sistema de exaustão"]'
        )
        
        projeto2 = Projeto(
            nome='Manutenção Edifício Central',
            descricao='Manutenção preventiva sistema de ar condicionado',
            cliente_id=cliente2.id,
            valor_total=25000.00,
            valor_pago=0.00,
            progresso=40,
            status='Em Andamento',
            data_inicio=date.today() - timedelta(days=15),
            data_prazo=date.today() + timedelta(days=30),
            endereco_obra='Rua da Consolação, 500 - São Paulo/SP',
            tipo_servico='Manutenção',
            equipamentos='["Limpeza de filtros", "Verificação elétrica", "Recarga de gás"]'
        )
        
        db.add_all([projeto1, projeto2])
        db.commit()
        
        print("✅ Dados de exemplo inseridos com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro ao inserir dados: {e}")
        db.rollback()
    finally:
        db.close()