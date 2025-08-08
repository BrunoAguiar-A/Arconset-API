#!/usr/bin/env python3
# migrate_database.py - Script de migração segura para adicionar sistema de pastas
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def check_dependencies():
    """Verificar se todas as dependências estão instaladas"""
    print("🔍 Verificando dependências...")
    
    required_packages = ['sqlalchemy', 'psycopg2', 'alembic']
    missing = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            missing.append(package)
            print(f"❌ {package}")
    
    if missing:
        print(f"\n🚨 Pacotes faltando: {', '.join(missing)}")
        print("💡 Execute: pip install " + " ".join(missing))
        return False
    
    return True

def create_backup():
    """Criar backup do banco antes da migração"""
    print("\n📦 Criando backup do banco de dados...")
    
    # Extrair informações da DATABASE_URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL não encontrada!")
        return False
    
    try:
        # Parse da URL
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        db_name = parsed.path[1:]  # Remove a barra inicial
        db_user = parsed.username
        db_password = parsed.password
        db_host = parsed.hostname
        db_port = parsed.port or 5432
        
        backup_filename = f"backup_{db_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        print(f"📁 Arquivo de backup: {backup_filename}")
        print(f"🔗 Banco: {db_name} em {db_host}")
        
        # Comando pg_dump
        pg_dump_cmd = (
            f"PGPASSWORD='{db_password}' pg_dump "
            f"-h {db_host} -p {db_port} -U {db_user} "
            f"-d {db_name} --no-owner --no-privileges "
            f"> {backup_filename}"
        )
        
        print("🔄 Executando backup...")
        result = os.system(pg_dump_cmd)
        
        if result == 0:
            print(f"✅ Backup criado: {backup_filename}")
            return backup_filename
        else:
            print("❌ Erro ao criar backup!")
            print("💡 Certifique-se de que pg_dump está instalado e acessível")
            return False
            
    except Exception as e:
        print(f"❌ Erro no backup: {e}")
        print("⚠️  Continuando sem backup (PERIGOSO!)")
        return "no_backup"

def run_migration():
    """Executar migração SQL para adicionar tabela de pastas"""
    print("\n🔧 Executando migração...")
    
    # SQL para criar tabela de pastas
    migration_sql = """
    -- Criar tabela de pastas se não existir
    CREATE TABLE IF NOT EXISTS pastas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(20) DEFAULT 'blue',
        icone VARCHAR(50) DEFAULT 'folder',
        pasta_pai_id INTEGER REFERENCES pastas(id),
        projeto_id INTEGER REFERENCES projetos(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        criado_por VARCHAR(100)
    );
    
    -- Adicionar índices para performance
    CREATE INDEX IF NOT EXISTS idx_pastas_nome ON pastas(nome);
    CREATE INDEX IF NOT EXISTS idx_pastas_pai ON pastas(pasta_pai_id);
    CREATE INDEX IF NOT EXISTS idx_pastas_projeto ON pastas(projeto_id);
    
    -- Adicionar coluna pasta_id na tabela arquivos se não existir
    DO $$ 
    BEGIN 
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'pasta_id'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN pasta_id INTEGER REFERENCES pastas(id);
            CREATE INDEX idx_arquivos_pasta ON arquivos(pasta_id);
        END IF;
    END $$;
    
    -- Adicionar colunas AWS S3 se não existirem
    DO $$ 
    BEGIN 
        -- arquivo_blob para arquivos pequenos
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'arquivo_blob'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN arquivo_blob BYTEA;
        END IF;
        
        -- Colunas AWS S3
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'aws_s3_key'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN aws_s3_key VARCHAR(1000);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'aws_s3_bucket'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN aws_s3_bucket VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'aws_s3_url'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN aws_s3_url VARCHAR(2000);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'storage_type'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN storage_type VARCHAR(20) DEFAULT 'database';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'is_public'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'arquivos' AND column_name = 'uploaded_by'
        ) THEN
            ALTER TABLE arquivos ADD COLUMN uploaded_by VARCHAR(100);
        END IF;
    END $$;
    
    -- Atualizar storage_type para arquivos existentes baseado no tamanho
    UPDATE arquivos 
    SET storage_type = CASE 
        WHEN tamanho <= 10485760 THEN 'database'  -- 10MB
        ELSE 'local'
    END 
    WHERE storage_type IS NULL OR storage_type = '';
    
    -- Criar algumas pastas padrão se a tabela estiver vazia
    INSERT INTO pastas (nome, descricao, cor, icone, criado_por)
    SELECT 'Contratos', 'Documentos contratuais e legais', 'green', 'file-text', 'sistema'
    WHERE NOT EXISTS (SELECT 1 FROM pastas WHERE nome = 'Contratos');
    
    INSERT INTO pastas (nome, descricao, cor, icone, criado_por)
    SELECT 'Projetos', 'Arquivos técnicos de projetos', 'blue', 'folder', 'sistema'
    WHERE NOT EXISTS (SELECT 1 FROM pastas WHERE nome = 'Projetos');
    
    INSERT INTO pastas (nome, descricao, cor, icone, criado_por)
    SELECT 'Financeiro', 'Documentos financeiros e planilhas', 'yellow', 'dollar-sign', 'sistema'
    WHERE NOT EXISTS (SELECT 1 FROM pastas WHERE nome = 'Financeiro');
    
    INSERT INTO pastas (nome, descricao, cor, icone, criado_por)
    SELECT 'Imagens', 'Fotos e imagens dos projetos', 'purple', 'image', 'sistema'
    WHERE NOT EXISTS (SELECT 1 FROM pastas WHERE nome = 'Imagens');
    """
    
    try:
        from sqlalchemy import create_engine, text
        
        # Conectar ao banco
        database_url = os.getenv('DATABASE_URL')
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Executar migração em transação
            with conn.begin():
                conn.execute(text(migration_sql))
                print("✅ Migração SQL executada com sucesso!")
        
        # Verificar se as tabelas foram criadas
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('pastas', 'arquivos')
                ORDER BY table_name
            """)).fetchall()
            
            tables = [row[0] for row in result]
            print(f"📋 Tabelas verificadas: {tables}")
            
            if 'pastas' in tables:
                # Contar pastas criadas
                pasta_count = conn.execute(text("SELECT COUNT(*) FROM pastas")).scalar()
                print(f"📁 Pastas padrão criadas: {pasta_count}")
            
            if 'arquivos' in tables:
                # Verificar colunas novas
                columns_result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'arquivos' 
                    AND column_name IN ('pasta_id', 'arquivo_blob', 'aws_s3_key', 'storage_type')
                    ORDER BY column_name
                """)).fetchall()
                
                new_columns = [row[0] for row in columns_result]
                print(f"🆕 Novas colunas em 'arquivos': {new_columns}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        return False

def verify_migration():
    """Verificar se a migração foi bem-sucedida"""
    print("\n🔍 Verificando migração...")
    
    try:
        from sqlalchemy import create_engine, text
        
        database_url = os.getenv('DATABASE_URL')
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Verificar tabela pastas
            result = conn.execute(text("""
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN pasta_pai_id IS NULL THEN 1 END) as raiz,
                       COUNT(CASE WHEN pasta_pai_id IS NOT NULL THEN 1 END) as subpastas
                FROM pastas
            """)).fetchone()
            
            print(f"📁 Pastas: {result.total} total ({result.raiz} raiz, {result.subpastas} subpastas)")
            
            # Verificar arquivos com nova estrutura
            arquivo_result = conn.execute(text("""
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN pasta_id IS NOT NULL THEN 1 END) as com_pasta,
                       COUNT(CASE WHEN storage_type = 'database' THEN 1 END) as no_banco,
                       COUNT(CASE WHEN storage_type = 'local' THEN 1 END) as local,
                       COUNT(CASE WHEN aws_s3_key IS NOT NULL THEN 1 END) as s3
                FROM arquivos
            """)).fetchone()
            
            print(f"📄 Arquivos: {arquivo_result.total} total")
            print(f"   📁 Em pastas: {arquivo_result.com_pasta}")
            print(f"   💾 No banco: {arquivo_result.no_banco}")
            print(f"   📁 Locais: {arquivo_result.local}")
            print(f"   ☁️  No S3: {arquivo_result.s3}")
            
            # Testar relacionamentos
            relacionamento_result = conn.execute(text("""
                SELECT p.nome, COUNT(a.id) as total_arquivos
                FROM pastas p
                LEFT JOIN arquivos a ON p.id = a.pasta_id
                GROUP BY p.id, p.nome
                ORDER BY total_arquivos DESC
                LIMIT 5
            """)).fetchall()
            
            print("🔗 Pastas com mais arquivos:")
            for row in relacionamento_result:
                print(f"   📁 {row.nome}: {row.total_arquivos} arquivo(s)")
        
        print("✅ Verificação concluída com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro na verificação: {e}")
        return False

def main():
    """Função principal do script de migração"""
    print("=" * 70)
    print("🚀 MIGRAÇÃO: SISTEMA DE PASTAS VIRTUAIS + AWS")
    print("=" * 70)
    
    # Verificar argumentos
    if len(sys.argv) < 2:
        print("❌ Uso: python migrate_database.py [migrate|verify|rollback]")
        print("   migrate  - Executar migração")
        print("   verify   - Verificar migração")
        print("   rollback - Reverter migração (se backup disponível)")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "migrate":
        print("🔄 Iniciando migração completa...")
        
        # 1. Verificar dependências
        if not check_dependencies():
            sys.exit(1)
        
        # 2. Criar backup
        backup_file = create_backup()
        if backup_file is False:
            response = input("⚠️  Continuar sem backup? (s/N): ").lower()
            if response not in ['s', 'sim', 'yes', 'y']:
                print("❌ Migração cancelada pelo usuário")
                sys.exit(1)
        
        # 3. Executar migração
        if run_migration():
            print("\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
            
            # 4. Verificar migração
            if verify_migration():
                print("\n✅ SISTEMA DE PASTAS ATIVO!")
                print("📋 Próximos passos:")
                print("   1. Atualizar main.py com as rotas de pastas")
                print("   2. Atualizar database.py com o modelo Pasta")
                print("   3. Testar upload e organização de arquivos")
                print("   4. Configurar interface frontend")
                
                if backup_file and backup_file != "no_backup":
                    print(f"   5. Backup disponível: {backup_file}")
            else:
                print("⚠️  Migração executada mas verificação falhou")
        else:
            print("❌ FALHA NA MIGRAÇÃO!")
            
            if backup_file and backup_file != "no_backup":
                response = input("🔄 Restaurar backup? (s/N): ").lower()
                if response in ['s', 'sim', 'yes', 'y']:
                    print("🔄 Implementar restauração...")
                    # TODO: Implementar restauração do backup
            
            sys.exit(1)
    
    elif command == "verify":
        print("🔍 Verificando estado atual...")
        if verify_migration():
            print("✅ Sistema de pastas está funcionando!")
        else:
            print("❌ Sistema de pastas com problemas")
    
    elif command == "rollback":
        print("🔄 Rollback não implementado ainda")
        print("💡 Use o backup manual se necessário")
    
    else:
        print(f"❌ Comando desconhecido: {command}")
        sys.exit(1)
    
    print("=" * 70)

if __name__ == "__main__":
    main()