# database.py - EVOLUÇÃO com Sistema de Pastas (mantém tudo que funciona)
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, Date, Numeric, ForeignKey, BigInteger, text, LargeBinary
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime, UTC, timezone
import json
from urllib.parse import quote_plus

# ===== CONFIGURAÇÃO AWS RDS (mantida) =====
def get_database_url():
    """Obter URL do banco configurada para AWS RDS"""
    
    # Verificar se DATABASE_URL está definida diretamente
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        print(f"✅ Usando DATABASE_URL configurada para AWS RDS")
        print(f"🔗 Host: {os.getenv('DB_HOST', 'extraído da URL')}")
        print(f"🔗 Banco: {os.getenv('DB_NAME', 'extraído da URL')}")
        return database_url
    
    # Construir URL a partir de componentes separados (backup)
    db_host = os.getenv('DB_HOST')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_name = os.getenv('DB_NAME')
    
    if all([db_host, db_user, db_password, db_name]):
        # Escapar caracteres especiais na senha
        password_escaped = quote_plus(db_password)
        
        constructed_url = f"postgresql://{db_user}:{password_escaped}@{db_host}:{db_port}/{db_name}?sslmode=require"
        print(f"✅ URL construída para PostgreSQL RDS")
        return constructed_url
    
    # Erro - não encontrou configurações
    print("❌ ERRO: Configurações AWS RDS não encontradas!")
    print("🔧 Verificar se .env contém:")
    print("   - DATABASE_URL=postgresql://...")
    print("   OU")
    print("   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME")
    raise ValueError("DATABASE_URL ou componentes do banco não configurados")

# Configurar URL do banco
try:
    DATABASE_URL = get_database_url()
    print("✅ Configuração do banco carregada")
except Exception as e:
    print(f"❌ Erro na configuração: {e}")
    sys.exit(1)

# Verificar driver
try:
    import psycopg2
    print("✅ Driver psycopg2 disponível")
except ImportError:
    print("❌ Driver psycopg2 não encontrado!")
    print("💡 Execute: pip install psycopg2-binary")
    sys.exit(1)

# Configurar engine para AWS RDS
print("🔧 Configurando engine para AWS RDS...")

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Desabilitado para produção
    pool_size=5,  # Pool menor para começar
    max_overflow=10,
    pool_recycle=3600,  # Reconectar a cada hora
    pool_pre_ping=True,  # Verificar conexão antes de usar
    connect_args={
        'sslmode': 'require',  # SSL obrigatório para AWS RDS
        'connect_timeout': 30,
        'application_name': 'arconset_hvac_app'
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Gerador de sessão do banco - AWS RDS"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ===== 🆕 NOVO MODELO: PASTAS VIRTUAIS =====
class Pasta(Base):
    """📁 Modelo para pastas virtuais no banco"""
    __tablename__ = 'pastas'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, comment='Nome da pasta')
    descricao = Column(Text, nullable=True, comment='Descrição da pasta')
    cor = Column(String(20), default='blue', comment='Cor da pasta na interface')
    icone = Column(String(50), default='folder', comment='Ícone da pasta')
    
    # Hierarquia de pastas (pasta pai)
    pasta_pai_id = Column(Integer, ForeignKey('pastas.id'), nullable=True)
    pasta_pai = relationship("Pasta", remote_side=[id], back_populates="subpastas")
    subpastas = relationship("Pasta", back_populates="pasta_pai")
    
    # Relacionamentos
    arquivos = relationship("Arquivo", back_populates="pasta")
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=True)
    projeto = relationship("Projeto")
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    criado_por = Column(String(100), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'cor': self.cor,
            'icone': self.icone,
            'pasta_pai_id': self.pasta_pai_id,
            'pasta_pai_nome': self.pasta_pai.nome if self.pasta_pai else None,
            'projeto_id': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            'total_arquivos': len(self.arquivos) if self.arquivos else 0,
            'total_subpastas': len(self.subpastas) if self.subpastas else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'criado_por': self.criado_por
        }

# ===== MODELOS EXISTENTES (MANTIDOS) =====
class Cliente(Base):
    __tablename__ = 'clientes'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    telefone = Column(String(20))
    cpf_cnpj = Column(String(20), unique=True)
    endereco = Column(Text)
    cidade = Column(String(100))
    estado = Column(String(2))
    cep = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    projetos = relationship('Projeto', back_populates='cliente')
    
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
    status = Column(String(50), default='Orçamento')
    data_inicio = Column(Date)
    data_prazo = Column(Date)
    data_conclusao = Column(Date)
    endereco_obra = Column(Text)
    tipo_servico = Column(String(100))
    equipamentos = Column(Text)
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    cliente = relationship('Cliente', back_populates='projetos')
    arquivos = relationship('Arquivo', back_populates='projeto', cascade='all, delete-orphan')
    contas = relationship('Conta', back_populates='projeto')
    equipe_projeto = relationship('EquipeProjeto', back_populates='projeto', cascade='all, delete-orphan')
    
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
            'equipe': [ep.funcionario.nome for ep in self.equipe_projeto if ep.ativo] if hasattr(self, 'equipe_projeto') else []
        }

class Funcionario(Base):
    __tablename__ = 'funcionarios'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    cpf = Column(String(14), unique=True, nullable=False)
    telefone = Column(String(20))
    email = Column(String(120))
    cargo = Column(String(100))
    salario = Column(Numeric(10, 2))
    data_admissao = Column(Date)
    status = Column(String(20), default='Ativo')
    especialidades = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    equipe_projeto = relationship('EquipeProjeto', back_populates='funcionario')
    
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
            'projetos_ativos': len([ep for ep in self.equipe_projeto if ep.projeto.status == 'Em Andamento' and ep.ativo]) if hasattr(self, 'equipe_projeto') else 0
        }

class EquipeProjeto(Base):
    __tablename__ = 'equipe_projeto'
    
    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=False)
    funcionario_id = Column(Integer, ForeignKey('funcionarios.id'), nullable=False)
    funcao = Column(String(100))
    data_entrada = Column(Date, default=lambda: datetime.now(timezone.utc).date())
    data_saida = Column(Date)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    projeto = relationship('Projeto', back_populates='equipe_projeto')
    funcionario = relationship('Funcionario', back_populates='equipe_projeto')
    
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
    tipo = Column(String(50), nullable=False)
    categoria = Column(String(100))
    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date)
    status = Column(String(20), default='Pendente')
    prioridade = Column(String(20), default='Média')
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    fornecedor = Column(String(200))
    numero_documento = Column(String(50))
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    projeto = relationship('Projeto', back_populates='contas')
    
    def to_dict(self):
        dias_vencimento = None
        if self.data_vencimento:
            dias_vencimento = (self.data_vencimento - datetime.now(UTC).date()).days
        
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

# ===== 🆕 MODELO ARQUIVO ATUALIZADO PARA AWS + PASTAS =====
class Arquivo(Base):
    __tablename__ = 'arquivos'
    
    id = Column(Integer, primary_key=True, index=True)
    nome_original = Column(String(500), nullable=False)
    nome_arquivo = Column(String(500), nullable=False)
    tamanho = Column(BigInteger, nullable=False, default=0)
    tipo_mime = Column(String(200), nullable=True)
    tipo_documento = Column(String(100), nullable=False, default='Geral')
    descricao = Column(Text, nullable=True)
    
    # 🆕 SISTEMA DE PASTAS VIRTUAIS
    pasta_id = Column(Integer, ForeignKey('pastas.id'), nullable=True)
    pasta = relationship("Pasta", back_populates="arquivos")
    
    # 🆕 ARMAZENAMENTO AWS HÍBRIDO
    arquivo_blob = Column(LargeBinary, nullable=True, comment='Arquivo pequeno em binário')
    aws_s3_key = Column(String(1000), nullable=True, comment='Chave do arquivo no S3')
    aws_s3_bucket = Column(String(100), nullable=True, comment='Bucket do S3')
    aws_s3_url = Column(String(2000), nullable=True, comment='URL pública do S3')
    storage_type = Column(String(20), default='database', comment='database, s3, hybrid')
    
    # Relacionamentos existentes (compatibilidade)
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=True)
    projeto = relationship('Projeto', back_populates='arquivos')
    
    # Campos antigos (manter compatibilidade)
    caminho = Column(String(1000), nullable=True, comment='Caminho legado (compatibilidade)')
    cloud_url = Column(String(1000), nullable=True, comment='URL legada')
    cloud_id = Column(String(500), nullable=True, comment='ID legado')
    tags = Column(Text, nullable=True, comment='Tags para busca')
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    uploaded_by = Column(String(100), nullable=True)
    is_public = Column(Boolean, default=False, comment='Arquivo público')
    
    def to_dict(self):
        """Converter para dicionário compatível com frontend"""
        return {
            'id': self.id,
            'name': self.nome_original,
            'fileName': self.nome_original,
            'nome_original': self.nome_original,
            'nome_arquivo': self.nome_arquivo,
            'size': self.tamanho,
            'fileSize': self.tamanho,
            'tamanho': self.tamanho,
            'tipo_mime': self.tipo_mime,
            'type': self.tipo_mime,
            'mimeType': self.tipo_mime,
            'tipo_documento': self.tipo_documento,
            'category': self.tipo_documento,
            'descricao': self.descricao,
            'description': self.descricao,
            
            # 🆕 DADOS DAS PASTAS
            'pasta_id': self.pasta_id,
            'pasta_nome': self.pasta.nome if self.pasta else None,
            
            # Dados do projeto
            'projeto_id': self.projeto_id,
            'projectId': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            
            # 🆕 DADOS AWS
            'storage_type': self.storage_type,
            'aws_s3_url': self.aws_s3_url,
            'aws_s3_key': self.aws_s3_key,
            'is_cloud': self.storage_type in ['s3', 'hybrid'],
            'is_database': self.storage_type == 'database',
            'is_public': self.is_public,
            
            # URLs e compatibilidade
            'url': self.aws_s3_url or self.cloud_url or f'/api/arquivos/{self.id}/download',
            'download_url': f'/api/arquivos/{self.id}/download',
            'preview_url': f'/api/arquivos/{self.id}/preview',
            
            # Campos legados (compatibilidade)
            'caminho': self.caminho,
            'cloud_url': self.cloud_url,
            'cloud_id': self.cloud_id,
            'tags': json.loads(self.tags) if self.tags else [],
            
            # Metadados
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'uploadDate': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'uploaded_by': self.uploaded_by
        }
    
    def __repr__(self):
        return f"<Arquivo(id={self.id}, nome='{self.nome_original}', storage='{self.storage_type}')>"

class Notificacao(Base):
    __tablename__ = 'notificacoes'
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(50), default='info')
    lida = Column(Boolean, default=False)
    projeto_id = Column(Integer, ForeignKey('projetos.id'))
    conta_id = Column(Integer, ForeignKey('contas.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
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

# ===== FUNÇÕES DE TESTE E INICIALIZAÇÃO =====
def init_db():
    """Inicializar banco de dados AWS RDS com novas tabelas"""
    try:
        print("🔧 Criando/atualizando tabelas no AWS RDS...")
        
        # 🆕 CRIAR NOVAS TABELAS (PASTAS)
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas criadas/atualizadas no AWS RDS com sucesso")
        
        # Listar tabelas criadas
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"📋 Tabelas no banco: {tables}")
        
        # 🆕 VERIFICAR SE COLUNAS NOVAS FORAM ADICIONADAS
        print("🔍 Verificando estrutura da tabela 'arquivos'...")
        columns = [col['name'] for col in inspector.get_columns('arquivos')]
        
        required_columns = ['pasta_id', 'arquivo_blob', 'aws_s3_key', 'storage_type']
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            print(f"⚠️ Colunas faltando na tabela 'arquivos': {missing_columns}")
            print("💡 Execute as migrações SQL manualmente:")
            print("   ALTER TABLE arquivos ADD COLUMN pasta_id INTEGER REFERENCES pastas(id);")
            print("   ALTER TABLE arquivos ADD COLUMN arquivo_blob BYTEA;")
            print("   ALTER TABLE arquivos ADD COLUMN aws_s3_key VARCHAR(1000);")
            print("   ALTER TABLE arquivos ADD COLUMN aws_s3_bucket VARCHAR(100);")
            print("   ALTER TABLE arquivos ADD COLUMN aws_s3_url VARCHAR(2000);")
            print("   ALTER TABLE arquivos ADD COLUMN storage_type VARCHAR(20) DEFAULT 'database';")
            print("   ALTER TABLE arquivos ADD COLUMN is_public BOOLEAN DEFAULT FALSE;")
            print("   ALTER TABLE arquivos ADD COLUMN uploaded_by VARCHAR(100);")
        else:
            print("✅ Estrutura da tabela 'arquivos' está atualizada")
        
        return True
    except Exception as e:
        print(f"❌ Erro ao criar/atualizar tabelas no AWS RDS: {e}")
        return False

def test_aws_connection():
    """Testar conexão com AWS RDS"""
    try:
        print("🔍 Testando conexão com AWS RDS...")
        db = SessionLocal()
        try:
            # Usar text() para resolver o warning do SQLAlchemy 2.0
            result = db.execute(text('SELECT 1')).fetchone()
            print("✅ Conexão com AWS RDS funcionando!")
            
            # Testar acesso ao esquema
            result = db.execute(text('SELECT current_database(), current_user, version()')).fetchone()
            print(f"✅ Conectado ao banco: {result[0]}")
            print(f"✅ Usuário: {result[1]}")
            print(f"✅ Versão PostgreSQL: {result[2][:50]}...")
            
            return True
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Erro na conexão com AWS RDS: {e}")
        print("🔧 Verificações:")
        print("   - RDS está rodando?")
        print("   - Security Groups permitem conexão na porta 5432?")
        print("   - Credenciais estão corretas?")
        print("   - SSL está configurado corretamente?")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("🚀 TESTE DE CONFIGURAÇÃO AWS RDS + PASTAS VIRTUAIS")
    print("=" * 70)
    
    if test_aws_connection():
        print("✅ Conexão OK")
        
        if init_db():
            print("✅ Inicialização OK")
            print("\n🎉 AWS RDS + SISTEMA DE PASTAS CONFIGURADO COM SUCESSO!")
            print("📁 Pastas virtuais: Habilitadas")
            print("☁️ Armazenamento AWS: Habilitado")
            print("💾 Banco de dados: Metadados + Arquivos pequenos")
            print("📦 S3: Arquivos grandes")
        else:
            print("❌ Falha na inicialização")
    else:
        print("❌ Falha na conexão com AWS RDS")
        
    print("=" * 70)