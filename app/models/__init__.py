# models/__init__.py
"""
Módulo de modelos da aplicação HVAC
Importa todos os modelos para facilitar o uso em outros módulos
"""

# Importar o Base do database
from database import Base

# Importar o modelo User
from .user import User

# Importar todos os modelos do database.py
from database import (
    Cliente,
    Projeto, 
    Funcionario,
    EquipeProjeto,
    Conta,
    Arquivo,
    Notificacao
)

# Lista de todos os modelos disponíveis
__all__ = [
    'User',           # Modelo de usuário (autenticação)
    'Cliente',        # Clientes
    'Projeto',        # Projetos HVAC
    'Funcionario',    # Funcionários
    'EquipeProjeto',  # Relacionamento projeto-funcionário
    'Conta',          # Contas a pagar/receber
    'Arquivo',        # Arquivos dos projetos
    'Notificacao',    # Notificações do sistema
    'Base'            # Base do SQLAlchemy
]