# 📁 create_admin.py - Script para criar usuário admin
import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, get_db
from app.models.user import User
from werkzeug.security import generate_password_hash
from datetime import datetime, UTC

def create_admin_user():
    """Cria um usuário administrador"""
    
    print("🔐 Criando usuário administrador...")
    
    # Dados do admin
    admin_data = {
        'username': 'admin',
        'email': 'admin@arconset.com.br',
        'full_name': 'Administrador do Sistema',
        'password': 'Admin123!',  # Senha padrão
        'role': 'admin',
        'is_active': True
    }
    
    # Conectar ao banco
    db = SessionLocal()
    
    try:
        # Verificar se admin já existe
        existing_admin = db.query(User).filter(
            (User.username == admin_data['username']) | 
            (User.email == admin_data['email'])
        ).first()
        
        if existing_admin:
            print(f"❌ Usuário admin já existe!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            print(f"   Role: {existing_admin.role}")
            return False
        
        # Criar hash da senha
        password_hash = generate_password_hash(admin_data['password'])
        
        # Criar usuário admin
        admin_user = User(
            username=admin_data['username'],
            email=admin_data['email'],
            full_name=admin_data['full_name'],
            password_hash=password_hash,
            role=admin_data['role'],
            is_active=admin_data['is_active'],
            created_at=datetime.now(UTC)
        )
        
        # Salvar no banco
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Usuário administrador criado com sucesso!")
        print(f"   👤 Username: {admin_data['username']}")
        print(f"   📧 Email: {admin_data['email']}")
        print(f"   🏷️ Nome: {admin_data['full_name']}")
        print(f"   🔐 Senha: {admin_data['password']}")
        print(f"   👑 Role: {admin_data['role']}")
        print(f"   ✅ Ativo: {admin_data['is_active']}")
        print(f"   🆔 ID: {admin_user.id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar admin: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def create_multiple_users():
    """Cria múltiplos usuários de teste"""
    
    users_data = [
        {
            'username': 'admin',
            'email': 'admin@arconset.com.br',
            'full_name': 'Administrador do Sistema',
            'password': 'Admin123!',
            'role': 'admin'
        },
        {
            'username': 'manager',
            'email': 'manager@arconset.com.br',
            'full_name': 'Gerente de Projetos',
            'password': 'Manager123!',
            'role': 'manager'
        },
        {
            'username': 'user1',
            'email': 'user1@arconset.com.br',
            'full_name': 'Usuário Comum 1',
            'password': 'User123!',
            'role': 'user'
        },
        {
            'username': 'user2',
            'email': 'user2@arconset.com.br',
            'full_name': 'Usuário Comum 2',
            'password': 'User123!',
            'role': 'user'
        }
    ]
    
    db = SessionLocal()
    created_count = 0
    
    try:
        for user_data in users_data:
            # Verificar se usuário já existe
            existing_user = db.query(User).filter(
                (User.username == user_data['username']) | 
                (User.email == user_data['email'])
            ).first()
            
            if existing_user:
                print(f"⚠️ Usuário {user_data['username']} já existe, pulando...")
                continue
            
            # Criar hash da senha
            password_hash = generate_password_hash(user_data['password'])
            
            # Criar usuário
            new_user = User(
                username=user_data['username'],
                email=user_data['email'],
                full_name=user_data['full_name'],
                password_hash=password_hash,
                role=user_data['role'],
                is_active=True,
                created_at=datetime.now(UTC)
            )
            
            db.add(new_user)
            created_count += 1
            
            print(f"✅ Criado: {user_data['username']} ({user_data['role']})")
        
        db.commit()
        print(f"\n🎉 {created_count} usuário(s) criado(s) com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro ao criar usuários: {e}")
        db.rollback()
        
    finally:
        db.close()

def list_users():
    """Lista todos os usuários"""
    
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("❌ Nenhum usuário encontrado no banco de dados")
            return
        
        print(f"\n👥 {len(users)} usuário(s) encontrado(s):")
        print("-" * 80)
        
        for user in users:
            status = "✅ Ativo" if user.is_active else "❌ Inativo"
            print(f"🆔 ID: {user.id}")
            print(f"👤 Username: {user.username}")
            print(f"📧 Email: {user.email}")
            print(f"🏷️ Nome: {user.full_name}")
            print(f"👑 Role: {user.role}")
            print(f"📅 Criado: {user.created_at}")
            print(f"🔘 Status: {status}")
            print("-" * 40)
            
    except Exception as e:
        print(f"❌ Erro ao listar usuários: {e}")
        
    finally:
        db.close()

def update_user_role(username, new_role):
    """Atualiza o role de um usuário"""
    
    valid_roles = ['admin', 'manager', 'user']
    
    if new_role not in valid_roles:
        print(f"❌ Role inválido! Opções: {valid_roles}")
        return False
    
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            print(f"❌ Usuário '{username}' não encontrado!")
            return False
        
        old_role = user.role
        user.role = new_role
        
        db.commit()
        
        print(f"✅ Role do usuário '{username}' alterado:")
        print(f"   De: {old_role} → Para: {new_role}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao atualizar role: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def main():
    """Função principal com menu interativo"""
    
    while True:
        print("\n" + "="*50)
        print("🔐 GERENCIADOR DE USUÁRIOS - SISTEMA HVAC")
        print("="*50)
        print("1. ➕ Criar usuário admin")
        print("2. 👥 Criar múltiplos usuários (admin, manager, users)")
        print("3. 📋 Listar todos os usuários")
        print("4. 🔄 Alterar role de usuário")
        print("5. 🚪 Sair")
        print("-"*50)
        
        choice = input("Escolha uma opção (1-5): ").strip()
        
        if choice == '1':
            create_admin_user()
            
        elif choice == '2':
            create_multiple_users()
            
        elif choice == '3':
            list_users()
            
        elif choice == '4':
            username = input("Digite o username: ").strip()
            print("Roles disponíveis: admin, manager, user")
            new_role = input("Digite o novo role: ").strip().lower()
            update_user_role(username, new_role)
            
        elif choice == '5':
            print("👋 Saindo...")
            break
            
        else:
            print("❌ Opção inválida!")
        
        input("\nPressione Enter para continuar...")

if __name__ == "__main__":
    main()