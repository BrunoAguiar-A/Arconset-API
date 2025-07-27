#!/usr/bin/env python3
# 📁 backend/init_auth.py - SCRIPT DE INICIALIZAÇÃO DO SISTEMA DE AUTENTICAÇÃO

import os
import sys
from pathlib import Path

# Caminho absoluto da raiz do projeto
ROOT_DIR = Path(__file__).resolve().parent.parent

# Adiciona a raiz ao sys.path
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

ROOT_DIR = Path(__file__).resolve().parent.parent  # volta da pasta 'config' pra raiz
expected_files = [ROOT_DIR / 'app' / 'main.py', ROOT_DIR / 'app' / 'database.py']
def init_database():
    """Inicializar banco de dados"""
    try:
        print("🗄️  Criando/verificando tabelas do banco de dados...")
        
        from app.database import Base, engine, SessionLocal
        from app.models.user import User
        
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas criadas/verificadas com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        return False

def check_security_system():
    """Verificar sistema de segurança"""
    try:
        print("🔐 Verificando sistema de segurança...")
        
        # Verificar variáveis de ambiente obrigatórias
        required_vars = [
            'JWT_SECRET',
            'ENCRYPTION_PASSWORD', 
            'PASSWORD_PEPPER'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Variáveis de ambiente não definidas: {missing_vars}")
            print("📝 Adicione ao arquivo .env:")
            for var in missing_vars:
                if var == 'JWT_SECRET':
                    print(f"{var}=sua_chave_secreta_muito_forte_para_jwt")
                elif var == 'ENCRYPTION_PASSWORD':
                    print(f"{var}=sua_senha_de_criptografia_ultra_segura")
                elif var == 'PASSWORD_PEPPER':
                    print(f"{var}=seu_pepper_para_senhas_muito_seguro")
            return False
        
        # Importar security manager
        from app.middleware.security import security_manager
        
        # Verificar Redis
        try:
            if security_manager and security_manager.redis_client:
                security_manager.redis_client.ping()
                print("✅ Redis conectado e funcionando")
            else:
                print("⚠️  Redis não configurado - algumas funcionalidades podem não funcionar")
        except Exception as e:
            print(f"⚠️  Erro no Redis: {e}")
            print("   Execute: docker run -d --name redis -p 6379:6379 redis:alpine")
        
        # Testar criptografia
        try:
            test_data = {'test': 'data'}
            encrypted = security_manager.encrypt_data(test_data)
            decrypted = security_manager.decrypt_data(encrypted)
            
            if decrypted == test_data:
                print("✅ Sistema de criptografia funcionando")
            else:
                print("❌ Erro na criptografia")
                return False
        except Exception as e:
            print(f"❌ Erro no teste de criptografia: {e}")
            return False
        
        # Testar JWT
        try:
            test_payload = {'test': True, 'user_id': 'test'}
            token = security_manager.generate_jwt_token(test_payload, expires_hours=1)
            verified = security_manager.verify_jwt_token(token)
            
            if verified and verified.get('test'):
                print("✅ Sistema JWT funcionando")
            else:
                print("❌ Erro no JWT")
                return False
        except Exception as e:
            print(f"❌ Erro no teste JWT: {e}")
            return False
        
        print("✅ Sistema de segurança verificado com sucesso")
        return True
        
    except Exception as e:
        print(f"❌ Erro na verificação de segurança: {e}")
        return False

def check_users():
    """Verificar e criar usuários"""
    try:
        print("👤 Verificando usuários do sistema...")
        
        from app.database import SessionLocal
        from app.models.user import User
        from app.middleware.auth_middleware import create_default_admin
        
        db = SessionLocal()
        try:
            # Contar usuários
            total_users = db.query(User).count()
            admin_users = db.query(User).filter(User.role == 'admin').count()
            
            print(f"📊 Usuários encontrados: {total_users}")
            print(f"📊 Administradores: {admin_users}")
            
            # Criar admin padrão se necessário
            if admin_users == 0:
                print("🔧 Criando usuário administrador padrão...")
                success = create_default_admin()
                
                if success:
                    print("✅ Usuário admin criado com sucesso!")
                    print("🔑 Credenciais padrão:")
                    print("   Username: admin")
                    print("   Senha: Admin123!")
                    print("   ⚠️  ALTERE A SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN!")
                else:
                    print("❌ Falha ao criar usuário admin")
                    return False
            else:
                print("✅ Usuário administrador já existe")
            
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro na verificação de usuários: {e}")
        return False

def test_authentication_flow():
    """Testar fluxo completo de autenticação"""
    try:
        print("🧪 Testando fluxo de autenticação...")
        
        from app.database import SessionLocal
        from app.models.user import User
        from app.middleware.security import security_manager
        
        db = SessionLocal()
        try:
            # Buscar admin
            admin = db.query(User).filter(User.role == 'admin').first()
            
            if not admin:
                print("❌ Usuário admin não encontrado")
                return False
            
            # Testar verificação de senha
            if admin.check_password('Admin123!'):
                print("✅ Verificação de senha funcionando")
            else:
                print("❌ Erro na verificação de senha")
                return False
            
            # Testar geração de token para usuário real
            token_payload = {
                'user_id': admin.id,
                'username': admin.username,
                'role': admin.role,
                'test': True
            }
            
            token = security_manager.generate_jwt_token(token_payload, expires_hours=1)
            
            if not token:
                print("❌ Erro ao gerar token para usuário")
                return False
            
            # Verificar token
            verified_payload = security_manager.verify_jwt_token(token)
            
            if (verified_payload and 
                verified_payload.get('user_id') == admin.id and
                verified_payload.get('username') == admin.username):
                print("✅ Geração e verificação de token funcionando")
            else:
                print("❌ Erro na verificação de token")
                return False
            
            print("✅ Fluxo de autenticação testado com sucesso")
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro no teste de autenticação: {e}")
        return False

def print_system_info():
    """Imprimir informações do sistema"""
    try:
        print("\n" + "="*60)
        print("📋 INFORMAÇÕES DO SISTEMA")
        print("="*60)
        
        from app.database import engine, SessionLocal
        from app.models.user import User
        from app.middleware.security import security_manager
        
        # Informações do banco
        print(f"🗄️  Banco de dados: {engine.url}")
        
        # Informações de segurança
        print(f"🔐 JWT Secret configurado: {'✅' if os.getenv('JWT_SECRET') else '❌'}")
        print(f"🔐 Encryption configurado: {'✅' if os.getenv('ENCRYPTION_PASSWORD') else '❌'}")
        print(f"🔐 Password Pepper configurado: {'✅' if os.getenv('PASSWORD_PEPPER') else '❌'}")
        
        # Redis
        try:
            if security_manager and security_manager.redis_client:
                security_manager.redis_client.ping()
                print("🔴 Redis: ✅ Conectado")
            else:
                print("🔴 Redis: ❌ Não configurado")
        except:
            print("🔴 Redis: ❌ Não conectado")
        
        # Informações de usuários
        db = SessionLocal()
        try:
            total_users = db.query(User).count()
            admin_count = db.query(User).filter(User.role == 'admin').count()
            manager_count = db.query(User).filter(User.role == 'manager').count()
            user_count = db.query(User).filter(User.role == 'user').count()
            
            print(f"👥 Total de usuários: {total_users}")
            print(f"👑 Administradores: {admin_count}")
            print(f"👨‍💼 Gerentes: {manager_count}")
            print(f"👤 Usuários: {user_count}")
            
        finally:
            db.close()
        
        # URLs importantes
        print("\n🌐 ENDPOINTS IMPORTANTES:")
        print("   POST /api/auth/login - Login")
        print("   POST /api/auth/register - Registro")
        print("   GET /api/auth/profile - Perfil do usuário")
        print("   GET /api/health - Status da API")
        print("   GET /api/bank-config/status - Status do sistema bancário")
        
        print("\n🚀 PRÓXIMOS PASSOS:")
        print("   1. Execute: python main.py")
        print("   2. Acesse: http://localhost:5000/api/health")
        print("   3. Faça login com: admin / Admin123!")
        print("   4. ALTERE A SENHA PADRÃO IMEDIATAMENTE!")
        
        print("="*60)
        
    except Exception as e:
        print(f"❌ Erro ao exibir informações: {e}")

def main():
    """Função principal"""
    print("🚀 INICIALIZANDO SISTEMA DE AUTENTICAÇÃO")
    print("="*60)
    
    success_steps = 0
    total_steps = 4
    
    # Passo 1: Inicializar banco de dados
    print(f"\n📋 PASSO 1/{total_steps}: Inicializar Banco de Dados")
    if init_database():
        success_steps += 1
    else:
        print("❌ Falha crítica na inicialização do banco")
        return False
    
    # Passo 2: Verificar sistema de segurança
    print(f"\n📋 PASSO 2/{total_steps}: Verificar Sistema de Segurança")
    if check_security_system():
        success_steps += 1
    else:
        print("❌ Falha na verificação de segurança")
        print("💡 Configure as variáveis de ambiente e tente novamente")
        return False
    
    # Passo 3: Verificar/criar usuários
    print(f"\n📋 PASSO 3/{total_steps}: Verificar Usuários")
    if check_users():
        success_steps += 1
    else:
        print("❌ Falha na verificação de usuários")
        return False
    
    # Passo 4: Testar autenticação
    print(f"\n📋 PASSO 4/{total_steps}: Testar Autenticação")
    if test_authentication_flow():
        success_steps += 1
    else:
        print("❌ Falha no teste de autenticação")
        return False
    
    # Resultado final
    print(f"\n🎯 RESULTADO: {success_steps}/{total_steps} passos concluídos")
    
    if success_steps == total_steps:
        print("✅ INICIALIZAÇÃO CONCLUÍDA COM SUCESSO!")
        print_system_info()
        return True
    else:
        print("❌ INICIALIZAÇÃO FALHOU")
        print("🛠️  Verifique os erros acima e tente novamente")
        return False

def create_env_template():
    """Criar template do arquivo .env"""
    env_template = """# 📁 .env - CONFIGURAÇÕES DO SISTEMA HVAC

# 🔐 SEGURANÇA (OBRIGATÓRIO)
JWT_SECRET=sua_chave_secreta_muito_forte_para_jwt_aqui
ENCRYPTION_PASSWORD=sua_senha_de_criptografia_ultra_segura_aqui
ENCRYPTION_SALT=seu_salt_para_criptografia_aqui
PASSWORD_PEPPER=seu_pepper_para_senhas_muito_seguro_aqui

# 🗄️ BANCO DE DADOS
DATABASE_URL=sqlite:///./hvac_system.db
# Para PostgreSQL: DATABASE_URL=postgresql://user:password@localhost/hvac_db

# 🔴 REDIS (Para cache e sessões)
REDIS_URL=redis://localhost:6379/0

# 🔧 CONFIGURAÇÕES GERAIS
DEBUG=True
REQUIRE_SECURITY=True
NODE_ENV=development

# 📧 EMAIL (Opcional - para verificação de email)
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=seu@email.com
# SMTP_PASSWORD=sua_senha_de_app

# ☁️ AWS S3 (Opcional - para armazenamento de arquivos)
# AWS_ACCESS_KEY_ID=sua_access_key
# AWS_SECRET_ACCESS_KEY=sua_secret_key
# AWS_S3_BUCKET_NAME=seu-bucket
# AWS_REGION=us-east-1

# 🏦 CONFIGURAÇÕES BANCÁRIAS (Para demonstração)
# BANCO_BRADESCO_SANDBOX=true
# BANCO_ITAU_SANDBOX=true
# BANCO_BB_SANDBOX=true

# 🔒 HTTPS (Para produção)
# FORCE_HTTPS=True
"""
    
    env_file = Path('.env')
    if not env_file.exists():
        try:
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_template)
            print(f"📄 Arquivo .env criado: {env_file.absolute()}")
            print("⚠️  CONFIGURE AS VARIÁVEIS ANTES DE CONTINUAR!")
            return True
        except Exception as e:
            print(f"❌ Erro ao criar .env: {e}")
            return False
    else:
        print(f"📄 Arquivo .env já existe: {env_file.absolute()}")
        return True

def check_dependencies():
    """Verificar dependências Python"""
    try:
        print("📦 Verificando dependências Python...")
        
        required_packages = [
            'flask',
            'sqlalchemy', 
            'redis',
            'cryptography',
            'werkzeug',
            'marshmallow',
            'structlog',
            'python-dotenv'
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                __import__(package.replace('-', '_'))
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            print("❌ Pacotes não instalados:")
            for package in missing_packages:
                print(f"   - {package}")
            
            print("\n💡 Instale com:")
            print(f"   pip install {' '.join(missing_packages)}")
            return False
        else:
            print("✅ Todas as dependências estão instaladas")
            return True
            
    except Exception as e:
        print(f"❌ Erro na verificação de dependências: {e}")
        return False

def check_environment():
    """Verificar ambiente de desenvolvimento"""
    try:
        print("🔍 Verificando ambiente...")
        
        # Verificar Python
        python_version = sys.version_info
        if python_version.major >= 3 and python_version.minor >= 8:
            print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        else:
            print(f"⚠️  Python {python_version.major}.{python_version.minor} detectado")
            print("   Recomendado: Python 3.8+")
        
        # Verificar se está no diretório correto
        current_dir = Path.cwd()
        expected_files = ['./app/main.py', './app/database.py']
        
        missing_files = []
        for file in expected_files:
            if not (current_dir / file).exists():
                missing_files.append(file)
        
        if missing_files:
            print("⚠️  Arquivos não encontrados:")
            for file in missing_files:
                print(f"   - {file}")
            print("   Verifique se está no diretório correto do projeto")
        else:
            print("✅ Estrutura de arquivos correta")
        
        return len(missing_files) == 0
        
    except Exception as e:
        print(f"❌ Erro na verificação do ambiente: {e}")
        return False

def interactive_setup():
    """Setup interativo"""
    print("🎯 SETUP INTERATIVO DO SISTEMA")
    print("="*50)
    
    try:
        # Pergunta se quer criar .env
        create_env = input("📄 Criar arquivo .env template? (s/N): ").lower().strip()
        if create_env in ['s', 'sim', 'y', 'yes']:
            create_env_template()
            print("\n⚠️  Configure o arquivo .env antes de continuar!")
            return False
        
        # Pergunta se quer continuar
        continue_setup = input("🚀 Continuar com a inicialização? (S/n): ").lower().strip()
        if continue_setup in ['n', 'no', 'nao', 'não']:
            print("❌ Inicialização cancelada pelo usuário")
            return False
        
        return True
        
    except KeyboardInterrupt:
        print("\n❌ Inicialização interrompida pelo usuário")
        return False
    except Exception as e:
        print(f"❌ Erro no setup interativo: {e}")
        return False

if __name__ == "__main__":
    try:
        print("🔧 SCRIPT DE INICIALIZAÇÃO - SISTEMA HVAC COM AUTENTICAÇÃO")
        print("="*70)
        
        # Verificar argumentos
        if len(sys.argv) > 1:
            if sys.argv[1] == '--env':
                create_env_template()
                sys.exit(0)
            elif sys.argv[1] == '--check':
                # Apenas verificar sem criar nada
                check_environment()
                check_dependencies()
                sys.exit(0)
            elif sys.argv[1] == '--interactive':
                if not interactive_setup():
                    sys.exit(1)
            elif sys.argv[1] == '--help':
                print("Uso:")
                print("  python init_auth.py              - Inicialização completa")
                print("  python init_auth.py --env        - Criar apenas .env template")
                print("  python init_auth.py --check      - Verificar ambiente")
                print("  python init_auth.py --interactive - Setup interativo")
                print("  python init_auth.py --help       - Mostrar esta ajuda")
                sys.exit(0)
        
        # Verificações preliminares
        if not check_environment():
            print("❌ Problemas no ambiente detectados")
            sys.exit(1)
        
        if not check_dependencies():
            print("❌ Dependências não instaladas")
            sys.exit(1)
        
        # Verificar se .env existe
        if not Path('.env').exists():
            print("📄 Arquivo .env não encontrado!")
            create_env = input("Criar template agora? (S/n): ").lower().strip()
            if create_env not in ['n', 'no', 'nao', 'não']:
                create_env_template()
                print("⚠️  Configure o arquivo .env e execute novamente!")
                sys.exit(1)
        
        # Carregar variáveis de ambiente
        try:
            from config.env_loader import load_dotenv
            load_dotenv()
        except ImportError:
            print("⚠️  env_loader não encontrado, tentando python-dotenv...")
            try:
                from dotenv import load_dotenv
                load_dotenv()
            except ImportError:
                print("❌ Não foi possível carregar variáveis de ambiente")
                print("   Instale: pip install python-dotenv")
                sys.exit(1)
        
        # Executar inicialização principal
        success = main()
        
        if success:
            print("\n🎉 SISTEMA PRONTO PARA USO!")
            print("Execute: python main.py")
            sys.exit(0)
        else:
            print("\n❌ FALHA NA INICIALIZAÇÃO")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n❌ Processo interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
        print("🛠️  Verifique a configuração e tente novamente")
        sys.exit(1)