# models/arquivo.py - MODELO CORRIGIDO PARA AWS S3
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, BigInteger, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Arquivo(Base):
    __tablename__ = 'arquivos'
    
    # Campos principais
    id = Column(Integer, primary_key=True, index=True)
    nome_original = Column(String(500), nullable=False, comment='Nome original do arquivo')
    nome_arquivo = Column(String(500), nullable=False, comment='Nome único gerado')
    tamanho = Column(BigInteger, nullable=False, default=0, comment='Tamanho em bytes')
    tipo_mime = Column(String(200), nullable=True, comment='Tipo MIME')
    tipo_documento = Column(String(100), nullable=False, default='Geral', comment='Categoria')
    descricao = Column(Text, nullable=True, comment='Descrição')
    
    # Relacionamentos
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=True)
    pasta_id = Column(Integer, ForeignKey('pastas.id'), nullable=True)
    
    # ===== ARMAZENAMENTO HÍBRIDO =====
    storage_type = Column(String(20), nullable=False, default='database', comment='database|s3|local')
    
    # Para banco de dados (arquivos pequenos)
    arquivo_blob = Column(LargeBinary, nullable=True, comment='Dados binários no banco')
    
    # Para arquivos locais
    caminho = Column(String(1000), nullable=True, comment='Caminho local do arquivo')
    
    # Para AWS S3
    aws_s3_key = Column(String(500), nullable=True, comment='Chave do arquivo no S3')
    aws_s3_url = Column(String(1000), nullable=True, comment='URL pública do S3')
    aws_s3_bucket = Column(String(100), nullable=True, comment='Nome do bucket S3')
    
    # Metadados
    is_public = Column(Boolean, default=False, comment='Arquivo público')
    uploaded_by = Column(String(100), nullable=True, comment='Usuário que fez upload')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    projeto = relationship("Projeto", back_populates="arquivos")
    pasta = relationship("Pasta", back_populates="arquivos")
    
    def to_dict(self):
        """Converter para dicionário compatível com frontend"""
        return {
            'id': self.id,
            'nome_original': self.nome_original,
            'nome_arquivo': self.nome_arquivo,
            'tamanho': self.tamanho,
            'tipo_mime': self.tipo_mime,
            'tipo_documento': self.tipo_documento,
            'descricao': self.descricao,
            'projeto_id': self.projeto_id,
            'pasta_id': self.pasta_id,
            'storage_type': self.storage_type,
            'is_public': self.is_public,
            'uploaded_by': self.uploaded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            
            # URLs para download/preview
            'download_url': f'/api/arquivos/{self.id}/download',
            'preview_url': f'/api/arquivos/{self.id}/preview',
            
            # Informações do projeto
            'projeto_nome': self.projeto.nome if self.projeto else None,
            
            # Informações da pasta
            'pasta_nome': self.pasta.nome if self.pasta else None,
            
            # AWS S3 específico
            'aws_s3_key': self.aws_s3_key,
            'aws_s3_url': self.aws_s3_url,
            'aws_s3_bucket': self.aws_s3_bucket,
            
            # Verificar se arquivo existe
            'file_exists': self._check_file_exists(),
            
            # Compatibilidade com frontend existente
            'name': self.nome_original,
            'fileName': self.nome_original,
            'size': self.tamanho,
            'fileSize': self.tamanho,
            'type': self.tipo_mime,
            'mimeType': self.tipo_mime,
            'category': self.tipo_documento,
            'description': self.descricao,
            'projectId': self.projeto_id,
            'projectName': self.projeto.nome if self.projeto else None,
            'uploadDate': self.created_at.isoformat() if self.created_at else None,
            'url': self.aws_s3_url or f'/api/arquivos/{self.id}/download',
            'is_cloud': self.storage_type == 's3'
        }
    
    def _check_file_exists(self):
        """Verificar se arquivo existe baseado no tipo de storage"""
        if self.storage_type == 'database':
            return self.arquivo_blob is not None
        elif self.storage_type == 's3':
            return self.aws_s3_key is not None
        elif self.storage_type == 'local':
            import os
            return os.path.exists(self.caminho) if self.caminho else False
        return False
    
    def get_storage_info(self):
        """Informações sobre o tipo de armazenamento"""
        info = {
            'type': self.storage_type,
            'size_mb': round(self.tamanho / (1024 * 1024), 2) if self.tamanho else 0,
            'exists': self._check_file_exists()
        }
        
        if self.storage_type == 's3':
            info.update({
                'bucket': self.aws_s3_bucket,
                'key': self.aws_s3_key,
                'public_url': self.aws_s3_url
            })
        elif self.storage_type == 'local':
            info.update({
                'path': self.caminho
            })
        
        return info
    
    def __repr__(self):
        return f"<Arquivo(id={self.id}, nome='{self.nome_original}', storage='{self.storage_type}')>"


# Modelo para pastas (sistema de organização)
class Pasta(Base):
    __tablename__ = 'pastas'
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    cor = Column(String(20), default='blue')
    icone = Column(String(50), default='folder')
    
    # Hierarquia de pastas
    pasta_pai_id = Column(Integer, ForeignKey('pastas.id'), nullable=True)
    pasta_pai = relationship("Pasta", remote_side=[id], back_populates="subpastas")
    subpastas = relationship("Pasta", back_populates="pasta_pai")
    
    # Relacionamentos
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=True)
    projeto = relationship("Projeto")
    arquivos = relationship("Arquivo", back_populates="pasta")
    
    # Metadados
    criado_por = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'cor': self.cor,
            'icone': self.icone,
            'pasta_pai_id': self.pasta_pai_id,
            'projeto_id': self.projeto_id,
            'criado_por': self.criado_por,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'total_arquivos': len(self.arquivos) if self.arquivos else 0,
            'total_subpastas': len(self.subpastas) if self.subpastas else 0
        }
    
    def __repr__(self):
        return f"<Pasta(id={self.id}, nome='{self.nome}')>"