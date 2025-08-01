# models/arquivo.py - MODELO DO BANCO DE DADOS
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Arquivo(Base):
    __tablename__ = 'arquivos'
    
    # Campos principais
    id = Column(Integer, primary_key=True, index=True)
    nome_original = Column(String(500), nullable=False, comment='Nome original do arquivo')
    nome_arquivo = Column(String(500), nullable=False, comment='Nome do arquivo salvo')
    caminho = Column(String(1000), nullable=False, comment='Caminho do arquivo (local ou S3 key)')
    tamanho = Column(BigInteger, nullable=False, default=0, comment='Tamanho em bytes')
    tipo_mime = Column(String(200), nullable=True, comment='Tipo MIME do arquivo')
    tipo_documento = Column(String(100), nullable=False, default='Geral', comment='Categoria do documento')
    descricao = Column(Text, nullable=True, comment='Descrição opcional')
    
    # Relacionamentos
    projeto_id = Column(Integer, ForeignKey('projetos.id'), nullable=True, comment='ID do projeto relacionado')
    projeto = relationship("Projeto", back_populates="arquivos")
    
    # Campos de cloud storage (S3)
    cloud_url = Column(String(1000), nullable=True, comment='URL pública no S3')
    cloud_id = Column(String(500), nullable=True, comment='Chave/ID no S3')
    
    # Metadados
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Converter para dicionário para JSON"""
        return {
            'id': self.id,
            'name': self.nome_original,
            'fileName': self.nome_original,
            'nome_original': self.nome_original,
            'nome_arquivo': self.nome_arquivo,
            'caminho': self.caminho,
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
            'projeto_id': self.projeto_id,
            'projectId': self.projeto_id,
            'projeto_nome': self.projeto.nome if self.projeto else None,
            'cloud_url': self.cloud_url,
            'url': self.cloud_url or f'/api/arquivos/{self.id}/download',
            'cloud_id': self.cloud_id,
            'is_cloud': bool(self.cloud_id),
            'storage_type': 's3' if self.cloud_id else 'local',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'uploadDate': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<Arquivo(id={self.id}, nome='{self.nome_original}', tamanho={self.tamanho})>"