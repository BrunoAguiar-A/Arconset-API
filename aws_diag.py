# 📁 aws_rds_diagnostic_fixed.py - CORRIGIDO para carregar .env
import os
import sys
import urllib.parse
from pathlib import Path

# 🔧 CARREGAR ARQUIVO .env
def load_env_file():
    """Carregar arquivo .env manualmente"""
    env_file = Path('.env')
    
    if not env_file.exists():
        print("❌ Arquivo .env não encontrado!")
        return False
    
    print("📁 Carregando arquivo .env...")
    
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        loaded_vars = 0
        for line in lines:
            line = line.strip()
            
            # Pular comentários e linhas vazias
            if not line or line.startswith('#'):
                continue
            
            # Verificar se a linha contém =
            if '=' not in line:
                continue
            
            # Dividir em chave e valor
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            
            # Remover aspas se existirem
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Definir variável de ambiente
            os.environ[key] = value
            loaded_vars += 1
            
            # Log apenas de variáveis importantes (sem senhas)
            if key in ['ENVIRONMENT', 'AWS_RDS', 'DB_HOST', 'DB_NAME', 'DEBUG']:
                print(f"✅ {key} = {value}")
            elif 'PASSWORD' in key or 'SECRET' in key or 'KEY' in key:
                print(f"✅ {key} = ***")
            elif key == 'DATABASE_URL':
                print(f"✅ {key} = {value[:50]}...")
        
        print(f"📋 {loaded_vars} variáveis carregadas do .env")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao carregar .env: {e}")
        return False

def check_environment_setup():
    """Verificar configuração do ambiente"""
    print("\n🔍 Verificando configuração do ambiente...")
    print("=" * 60)
    
    # Carregar .env primeiro
    if not load_env_file():
        return False
    
    # Verificar variáveis críticas
    database_url = os.getenv('DATABASE_URL')
    environment = os.getenv('ENVIRONMENT', 'development')
    aws_rds = os.getenv('AWS_RDS', 'False').lower() == 'true'
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    print(f"📋 ENVIRONMENT: {environment}")
    print(f"🔧 AWS_RDS: {aws_rds}")
    print(f"🔧 DEBUG: {debug}")
    
    if database_url:
        print(f"🌐 DATABASE_URL: {database_url[:50]}...")
    else:
        print("❌ DATABASE_URL não definida")
        return False
    
    # Parse da URL do banco
    try:
        parsed = urllib.parse.urlparse(database_url)
        print(f"🏢 Host: {parsed.hostname}")
        print(f"🔌 Port: {parsed.port}")
        print(f"📋 Database: {parsed.path[1:]}")  # Remove a barra inicial
        print(f"👤 Username: {parsed.username}")
        print(f"🔐 Password: {'***' if parsed.password else 'NÃO DEFINIDA'}")
        
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path[1:],
            'username': parsed.username,
            'password': parsed.password,
            'url': database_url
        }
    except Exception as e:
        print(f"❌ Erro ao parsear DATABASE_URL: {e}")
        return False

def test_basic_connectivity(config):
    """Testar conectividade básica"""
    print(f"\n🌐 Testando conectividade básica...")
    print("=" * 60)
    
    import socket
    
    host = config['host']
    port = config['port']
    
    # 1. Verificar resolução DNS
    try:
        print(f"🔍 Resolvendo DNS para {host}...")
        ip_address = socket.gethostbyname(host)
        print(f"✅ DNS resolvido: {ip_address}")
    except Exception as e:
        print(f"❌ Falha na resolução DNS: {e}")
        return False
    
    # 2. Verificar conectividade TCP
    try:
        print(f"🔌 Testando conexão TCP {host}:{port}...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Conexão TCP bem-sucedida")
            return True
        else:
            print(f"❌ Conexão TCP falhou (código: {result})")
            print(f"💡 Possíveis causas:")
            print(f"   - Security Group do RDS não permite seu IP")
            print(f"   - Firewall local bloqueando conexão")
            print(f"   - RDS pode estar parado ou inacessível")
            return False
    except Exception as e:
        print(f"❌ Erro na conexão TCP: {e}")
        return False

def test_database_connection_simple(config):
    """Testar conexão com o banco usando psycopg simples"""
    print(f"\n💾 Testando conexão com banco de dados...")
    print("=" * 60)
    
    try:
        import psycopg
        
        connection_string = config['url']
        print(f"🔗 Usando connection string...")
        print(f"🔍 Host: {config['host']}")
        print(f"🔍 Database: {config['database']}")
        print(f"🔍 User: {config['username']}")
        
        print(f"🔌 Estabelecendo conexão...")
        
        # Tentar conectar com timeout
        conn = psycopg.connect(
            connection_string,
            connect_timeout=30
        )
        
        print(f"✅ Conexão estabelecida com sucesso!")
        
        # Testar query básica
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user, now();")
        result = cursor.fetchone()
        
        print(f"📋 Informações do banco:")
        print(f"   PostgreSQL: {result[0].split(' ')[0]} {result[0].split(' ')[1]}")
        print(f"   Database: {result[1]}")
        print(f"   User: {result[2]}")
        print(f"   Timestamp: {result[3]}")
        
        # Testar se consegue criar tabela (testar permissões)
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_connection (
                    id SERIAL PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT NOW(),
                    message TEXT
                );
            """)
            
            cursor.execute("""
                INSERT INTO test_connection (message) 
                VALUES ('Teste de produção bem-sucedido - ' || NOW());
            """)
            
            cursor.execute("SELECT COUNT(*) FROM test_connection;")
            count = cursor.fetchone()[0]
            
            conn.commit()
            print(f"✅ Teste de escrita bem-sucedido ({count} registros)")
            
            # Cleanup
            cursor.execute("DROP TABLE IF EXISTS test_connection;")
            conn.commit()
            print(f"✅ Cleanup concluído")
            
        except Exception as e:
            print(f"⚠️ Erro no teste de escrita: {e}")
            print(f"💡 Pode ser problema de permissões")
        
        cursor.close()
        conn.close()
        return True
        
    except ImportError:
        print(f"❌ Biblioteca psycopg não está instalada!")
        print(f"💡 Execute: pip install psycopg[binary]")
        return False
        
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        
        # Diagnosticar erro específico
        error_str = str(e).lower()
        if "connection refused" in error_str:
            print(f"💡 DIAGNÓSTICO: Conexão recusada")
            print(f"   - Verificar Security Groups do RDS")
            print(f"   - Verificar se RDS está rodando")
        elif "timeout" in error_str:
            print(f"💡 DIAGNÓSTICO: Timeout de conexão")
            print(f"   - Verificar conectividade de rede")
            print(f"   - Verificar firewall")
        elif "authentication failed" in error_str or "password" in error_str:
            print(f"💡 DIAGNÓSTICO: Falha na autenticação")
            print(f"   - Verificar username/password no .env")
            print(f"   - Verificar se usuário existe no RDS")
        elif "ssl" in error_str:
            print(f"💡 DIAGNÓSTICO: Problema SSL")
            print(f"   - RDS requer SSL (sslmode=require)")
            print(f"   - Verificar certificados SSL")
        elif "database" in error_str and "does not exist" in error_str:
            print(f"💡 DIAGNÓSTICO: Banco de dados não existe")
            print(f"   - Criar banco 'arconset_db' no RDS")
            print(f"   - Verificar nome do banco no .env")
        
        return False

def check_current_ip():
    """Verificar IP atual para adicionar ao Security Group"""
    print(f"\n🌍 Verificando seu IP atual...")
    print("=" * 60)
    
    try:
        import urllib.request
        
        # Obter IP público
        with urllib.request.urlopen('https://api.ipify.org', timeout=10) as response:
            public_ip = response.read().decode('utf-8')
        
        print(f"🌐 Seu IP público atual: {public_ip}")
        print(f"💡 Adicione este IP ao Security Group do RDS:")
        print(f"   - Tipo: PostgreSQL")
        print(f"   - Porta: 5432")
        print(f"   - Origem: {public_ip}/32")
        
        return public_ip
        
    except Exception as e:
        print(f"⚠️ Não foi possível obter IP público: {e}")
        return None

def create_production_env_template():
    """Criar template de .env para produção"""
    print(f"\n📝 Criando template de produção...")
    print("=" * 60)
    
    current_database_url = os.getenv('DATABASE_URL', '')
    
    template = f"""# 🚀 CONFIGURAÇÃO DE PRODUÇÃO - AWS RDS
# Este arquivo foi gerado automaticamente

# ===== BANCO DE DADOS AWS RDS =====
DATABASE_URL={current_database_url}
DB_HOST=arconset-db.cdaoqsa6uqtv.sa-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=arconset_db
DB_USER=arconsetadm
DB_PASSWORD=ArconSet2024#Hvac!789

# ===== CONFIGURAÇÕES DE PRODUÇÃO =====
ENVIRONMENT=production
AWS_RDS=true
DEBUG=false
REQUIRE_SECURITY=true

# ===== CONFIGURAÇÕES DE CONEXÃO OTIMIZADAS =====
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_RECYCLE=3600
DB_POOL_PRE_PING=true
DB_CONNECT_TIMEOUT=30
DB_SSL_MODE=require

# ===== AWS S3 =====
AWS_ACCESS_KEY_ID={os.getenv('AWS_ACCESS_KEY_ID', 'YOUR_ACCESS_KEY')}
AWS_SECRET_ACCESS_KEY={os.getenv('AWS_SECRET_ACCESS_KEY', 'YOUR_SECRET_KEY')}
AWS_REGION=sa-east-1
AWS_S3_BUCKET=arconset-uploads-prod
USE_S3=true

# ===== SEGURANÇA =====
JWT_SECRET={os.getenv('JWT_SECRET', 'GENERATE_NEW_64_CHAR_SECRET')}
ENCRYPTION_KEY={os.getenv('ENCRYPTION_KEY', 'GENERATE_NEW_32_CHAR_KEY')}
ENCRYPTION_PASSWORD={os.getenv('ENCRYPTION_PASSWORD', 'GENERATE_NEW_PASSWORD')}

# ===== CORS E DOMÍNIOS =====
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,app.yourdomain.com

# ===== LOGS =====
LOG_LEVEL=info
LOG_FORMAT=json

# ===== PERFORMANCE =====
REQUEST_TIMEOUT=30000
MAX_CONCURRENT_CONNECTIONS=100
"""
    
    try:
        with open('.env.production', 'w', encoding='utf-8') as f:
            f.write(template)
        
        print("✅ Template .env.production criado")
        print("💡 Revise e ajuste as configurações antes de usar")
        
    except Exception as e:
        print(f"❌ Erro ao criar template: {e}")

def main():
    """Função principal"""
    print("🚀 DIAGNÓSTICO AWS RDS - MIGRAÇÃO PARA PRODUÇÃO")
    print("=" * 80)
    
    # 1. Verificar configuração do ambiente
    config = check_environment_setup()
    if not config:
        print("\n❌ FALHA: Não foi possível carregar configuração do .env")
        print("\n🔧 SOLUÇÕES:")
        print("1. Verificar se arquivo .env existe")
        print("2. Verificar se DATABASE_URL está definida no .env")
        print("3. Verificar formato da DATABASE_URL")
        return
    
    # 2. Verificar IP atual
    current_ip = check_current_ip()
    
    # 3. Testar conectividade básica
    network_ok = test_basic_connectivity(config)
    if not network_ok:
        print(f"\n❌ FALHA: Problemas de conectividade")
        print(f"\n🔧 SOLUÇÕES URGENTES:")
        print(f"1. 🛡️ Verificar Security Group do RDS:")
        print(f"   - AWS Console → RDS → arconset-db → Connectivity & security")
        print(f"   - Adicionar regra: PostgreSQL (5432) → Seu IP ({current_ip})")
        print(f"2. 🔌 Verificar se RDS está rodando")
        print(f"3. 🌐 Verificar conectividade de rede")
        return
    
    # 4. Testar conexão com banco
    db_ok = test_database_connection_simple(config)
    
    # 5. Criar template de produção
    create_production_env_template()
    
    # 6. Resumo final
    print(f"\n" + "=" * 80)
    print("📋 RESUMO DO DIAGNÓSTICO")
    print("=" * 80)
    
    print(f"📁 Arquivo .env: ✅ Carregado")
    print(f"🌐 Conectividade TCP: {'✅ OK' if network_ok else '❌ FALHA'}")
    print(f"💾 Conexão com banco: {'✅ OK' if db_ok else '❌ FALHA'}")
    
    if network_ok and db_ok:
        print(f"\n🎉 PARABÉNS! AWS RDS está funcionando perfeitamente!")
        print(f"✅ PRÓXIMOS PASSOS:")
        print(f"   1. Reiniciar sua aplicação Python")
        print(f"   2. Testar login no sistema")
        print(f"   3. Criar usuário admin se necessário")
        print(f"   4. Fazer deploy em produção")
        
    elif network_ok and not db_ok:
        print(f"\n⚠️ REDE OK, mas problema no banco de dados")
        print(f"🔧 VERIFICAR:")
        print(f"   1. Credenciais no .env")
        print(f"   2. Nome do banco de dados")
        print(f"   3. Permissões do usuário no RDS")
        
    else:
        print(f"\n❌ PROBLEMAS DE CONECTIVIDADE")
        print(f"🚨 AÇÃO URGENTE: Configurar Security Group do RDS!")

if __name__ == "__main__":
    main()