# 🔧 fix_encoding_and_url.py - Corrigir encoding e DATABASE_URL
import os
import re
from pathlib import Path

def read_env_safely(env_file):
    """Ler arquivo .env com diferentes encodings"""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings:
        try:
            content = env_file.read_text(encoding=encoding)
            print(f"✅ Arquivo lido com encoding: {encoding}")
            return content, encoding
        except UnicodeDecodeError:
            continue
    
    raise Exception("❌ Não foi possível ler o arquivo .env com nenhum encoding")

def fix_database_url():
    """Corrigir DATABASE_URL no arquivo .env"""
    env_file = Path('.env')
    
    if not env_file.exists():
        print("❌ Arquivo .env não encontrado!")
        return None
    
    try:
        # Ler arquivo com encoding seguro
        content, original_encoding = read_env_safely(env_file)
        
        # Fazer backup
        backup_file = Path('.env.backup2')
        backup_file.write_text(content, encoding='utf-8')
        print(f"📁 Backup criado: {backup_file}")
        
        # Procurar DATABASE_URL
        lines = content.splitlines()
        new_lines = []
        url_found = False
        
        for line in lines:
            if line.startswith('DATABASE_URL=') and 'postgresql+psycopg://' in line:
                old_line = line
                new_line = line.replace('postgresql+psycopg://', 'postgresql://')
                
                print("🔄 CORREÇÃO:")
                print(f"   ANTES: {old_line[:80]}...")
                print(f"   DEPOIS: {new_line[:80]}...")
                
                new_lines.append(new_line)
                url_found = True
            else:
                new_lines.append(line)
        
        if url_found:
            # Salvar arquivo corrigido em UTF-8
            new_content = '\n'.join(new_lines)
            env_file.write_text(new_content, encoding='utf-8')
            print("✅ DATABASE_URL corrigida e arquivo salvo em UTF-8!")
            return True
        else:
            print("❌ DATABASE_URL não encontrada ou já está correta")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao processar arquivo: {e}")
        return False

def load_env_variables():
    """Carregar variáveis do .env de forma segura"""
    env_file = Path('.env')
    env_vars = {}
    
    if not env_file.exists():
        return env_vars
    
    try:
        content, _ = read_env_safely(env_file)
        
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
                os.environ[key.strip()] = value.strip()
        
        print(f"📋 {len(env_vars)} variáveis carregadas do .env")
        return env_vars
        
    except Exception as e:
        print(f"❌ Erro ao carregar variáveis: {e}")
        return env_vars

def test_connection_simple():
    """Teste simples de conexão"""
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Carregar variáveis
        env_vars = load_env_variables()
        database_url = env_vars.get('DATABASE_URL')
        
        if not database_url:
            print("❌ DATABASE_URL não encontrada")
            return False
        
        print(f"🔗 Testando conexão...")
        print(f"   URL: {database_url[:50]}...")
        
        # Parse da URL
        parsed = urlparse(database_url)
        
        print(f"🏢 Host: {parsed.hostname}")
        print(f"🔌 Port: {parsed.port or 5432}")
        print(f"📋 Database: {parsed.path[1:] if parsed.path else 'N/A'}")
        print(f"👤 User: {parsed.username}")
        
        # Tentar conectar
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:] if parsed.path else 'postgres',
            user=parsed.username,
            password=parsed.password,
            sslmode='require',
            connect_timeout=10
        )
        
        # Teste simples
        cur = conn.cursor()
        cur.execute('SELECT 1 as test;')
        result = cur.fetchone()
        
        if result and result[0] == 1:
            print("✅ CONEXÃO ESTABELECIDA COM SUCESSO!")
            
            # Verificar versão
            cur.execute('SELECT version();')
            version = cur.fetchone()[0]
            print(f"🗄️  PostgreSQL: {version.split(',')[0]}")
            
            # Verificar banco atual
            cur.execute('SELECT current_database();')
            current_db = cur.fetchone()[0]
            print(f"📋 Banco atual: {current_db}")
            
            cur.close()
            conn.close()
            
            print("\n🎉 PROBLEMA RESOLVIDO!")
            print("✅ Sua aplicação já pode conectar ao RDS!")
            return True
            
    except psycopg2.OperationalError as e:
        error_msg = str(e)
        print(f"❌ Erro de conexão: {error_msg}")
        
        if "timeout expired" in error_msg:
            print("🔧 SOLUÇÃO: Verificar Security Group do RDS")
            print("   - Adicionar seu IP: 190.83.5.151/32")
            print("   - Porta: 5432")
            
        elif "authentication failed" in error_msg:
            print("🔧 SOLUÇÃO: Verificar credenciais")
            print("   - Usuário e senha corretos?")
            print("   - Usuário tem permissões?")
            
        elif "database" in error_msg and "does not exist" in error_msg:
            print("🔧 SOLUÇÃO: Verificar nome do banco")
            print("   - Banco 'arconset_db' existe no RDS?")
            
        return False
        
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

if __name__ == "__main__":
    print("🔧 CORRIGINDO ENCODING E DATABASE_URL...")
    print("=" * 60)
    
    # Corrigir URL
    if fix_database_url():
        print("\n💾 TESTANDO CONEXÃO...")
        print("=" * 60)
        test_connection_simple()
    else:
        print("❌ Não foi possível corrigir o arquivo")