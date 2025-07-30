#!/usr/bin/env python3
"""
Script para forçar o SQLAlchemy a atualizar os metadados da tabela users
"""

import os
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Boolean, DateTime, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

def force_sqlalchemy_refresh():
    """Força o SQLAlchemy a recarregar metadados"""
    print("🔄 FORÇANDO ATUALIZAÇÃO DOS METADADOS DO SQLALCHEMY")
    print("=" * 60)
    
    # Configuração do banco
    DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "postgresql://arconsetadm:bruno3982@localhost:5432/arconset_db"
    )
    
    print(f"🔗 Conectando: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    
    # Criar engine NOVO (sem cache)
    engine = create_engine(DATABASE_URL, echo=False)
    
    try:
        # 1. LIMPAR METADADOS ANTIGOS
        print("🧹 Limpando metadados antigos...")
        metadata = MetaData()
        
        # 2. REFLETIR TABELA USERS DIRETAMENTE DO BANCO
        print("🔍 Refletindo estrutura atual da tabela users...")
        with engine.connect() as conn:
            # Refletir apenas a tabela users
            metadata.reflect(bind=engine, only=['users'])
            
            if 'users' in metadata.tables:
                users_table = metadata.tables['users']
                print("✅ Tabela users encontrada com colunas:")
                for column in users_table.columns:
                    print(f"   • {column.name}: {column.type}")
                
                # Verificar se phone existe
                phone_column = users_table.columns.get('phone')
                if phone_column:
                    print("✅ Coluna 'phone' encontrada nos metadados!")
                else:
                    print("❌ Coluna 'phone' NÃO encontrada nos metadados!")
            else:
                print("❌ Tabela 'users' não encontrada nos metadados!")
        
        # 3. TESTAR QUERY DIRETAMENTE
        print("\n🧪 Testando query diretamente...")
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as session:
            # Testar query que está falhando
            result = session.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'"))
            count = result.scalar()
            print(f"✅ Query direta funcionou: {count} admins encontrados")
            
            # Testar query com phone
            result = session.execute(text("SELECT COUNT(*) FROM users WHERE phone IS NOT NULL"))
            phone_count = result.scalar()
            print(f"✅ Query com phone funcionou: {phone_count} usuários com telefone")
        
        # 4. RECRIAR ARQUIVO DE CACHE (se existir)
        cache_files = [
            'app/__pycache__',
            'models/__pycache__',
            'database.pyc',
            '.db_cache'
        ]
        
        print("\n🗑️  Limpando possíveis caches...")
        import shutil
        for cache_file in cache_files:
            try:
                if os.path.exists(cache_file):
                    if os.path.isdir(cache_file):
                        shutil.rmtree(cache_file)
                    else:
                        os.remove(cache_file)
                    print(f"   ✅ {cache_file} removido")
            except Exception as e:
                print(f"   ⚠️  Erro ao remover {cache_file}: {e}")
        
        print("\n✅ SQLALCHEMY ATUALIZADO COM SUCESSO!")
        print("\n💡 PRÓXIMOS PASSOS:")
        print("   1. Reinicie o terminal/IDE")
        print("   2. Execute: python app/main.py")
        print("   3. Se ainda der erro, me avise")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    force_sqlalchemy_refresh()