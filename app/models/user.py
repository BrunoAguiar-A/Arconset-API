# 📁 models/user.py - NOVO ARQUIVO
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base
import bcrypt
import secrets
from datetime import datetime, timedelta, UTC

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default='user', nullable=False)  # admin, manager, user
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Campos para recuperação de senha
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Campos para verificação de email
    verification_token = Column(String(255), nullable=True)
    
    # Configurações de segurança
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    def set_password(self, password: str):
        """Hash da senha usando bcrypt"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """Verificar senha"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def generate_reset_token(self) -> str:
        """Gerar token para reset de senha"""
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires = datetime.now(UTC) + timedelta(hours=2)
        return self.reset_token
    
    def generate_verification_token(self) -> str:
        """Gerar token para verificação de email"""
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token
    
    def is_token_valid(self, token: str) -> bool:
        """Verificar se token de reset é válido"""
        return (self.reset_token == token and 
                self.reset_token_expires and 
                self.reset_token_expires > datetime.now(UTC))
    
    def clear_reset_token(self):
        """Limpar token de reset"""
        self.reset_token = None
        self.reset_token_expires = None
    
    def to_dict(self):
        """Converter para dicionário (sem senha)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }