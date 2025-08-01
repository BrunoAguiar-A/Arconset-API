# debug_aws.py - TESTAR CONEXÃO AWS
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

def test_aws_connection():
    """Testar conexão com AWS S3"""
    
    print("🔍 TESTANDO CONEXÃO AWS S3...")
    print("=" * 50)
    
    # 1. Verificar variáveis de ambiente
    aws_vars = {
        'AWS_ACCESS_KEY_ID': os.getenv('AWS_ACCESS_KEY_ID'),
        'AWS_SECRET_ACCESS_KEY': os.getenv('AWS_SECRET_ACCESS_KEY'),
        'AWS_BUCKET_NAME': os.getenv('AWS_BUCKET_NAME'),
        'AWS_REGION': os.getenv('AWS_REGION', 'us-east-1')
    }
    
    print("📋 VARIÁVEIS DE AMBIENTE:")
    for key, value in aws_vars.items():
        if 'SECRET' in key:
            print(f"   {key}: {'*' * len(value) if value else 'NÃO DEFINIDA'}")
        else:
            print(f"   {key}: {value or 'NÃO DEFINIDA'}")
    
    # Verificar se todas estão definidas
    missing_vars = [k for k, v in aws_vars.items() if not v]
    if missing_vars:
        print(f"\n❌ VARIÁVEIS FALTANDO: {', '.join(missing_vars)}")
        print("\n🔧 SOLUÇÃO:")
        print("   1. Configure no arquivo .env:")
        print("      AWS_ACCESS_KEY_ID=sua_access_key")
        print("      AWS_SECRET_ACCESS_KEY=sua_secret_key")
        print("      AWS_BUCKET_NAME=seu_bucket")
        print("      AWS_REGION=us-east-1")
        return False
    
    print("\n✅ Todas as variáveis definidas!")
    
    # 2. Testar autenticação
    try:
        print("\n🔐 TESTANDO AUTENTICAÇÃO...")
        
        session = boto3.Session(
            aws_access_key_id=aws_vars['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=aws_vars['AWS_SECRET_ACCESS_KEY'],
            region_name=aws_vars['AWS_REGION']
        )
        
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        
        print(f"✅ Autenticado como: {identity.get('Arn', 'N/A')}")
        print(f"✅ Account ID: {identity.get('Account', 'N/A')}")
        
    except NoCredentialsError:
        print("❌ CREDENCIAIS INVÁLIDAS")
        print("🔧 Verifique se AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY estão corretos")
        return False
    except ClientError as e:
        print(f"❌ ERRO DE AUTENTICAÇÃO: {e}")
        return False
    
    # 3. Testar acesso ao bucket
    try:
        print(f"\n🪣 TESTANDO BUCKET: {aws_vars['AWS_BUCKET_NAME']}")
        
        s3 = session.client('s3')
        
        # Verificar se bucket existe
        s3.head_bucket(Bucket=aws_vars['AWS_BUCKET_NAME'])
        print("✅ Bucket existe e é acessível!")
        
        # Testar permissões de escrita
        test_key = 'hvac-test-file.txt'
        test_content = b'Teste de upload HVAC'
        
        s3.put_object(
            Bucket=aws_vars['AWS_BUCKET_NAME'],
            Key=test_key,
            Body=test_content,
            ContentType='text/plain'
        )
        print("✅ Permissão de escrita OK!")
        
        # Limpar arquivo de teste
        s3.delete_object(Bucket=aws_vars['AWS_BUCKET_NAME'], Key=test_key)
        print("✅ Permissão de exclusão OK!")
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"❌ BUCKET '{aws_vars['AWS_BUCKET_NAME']}' NÃO EXISTE")
            print("🔧 Crie o bucket no AWS Console ou verifique o nome")
        elif error_code == 'AccessDenied':
            print("❌ SEM PERMISSÃO NO BUCKET")
            print("🔧 Verifique as políticas IAM do usuário")
        else:
            print(f"❌ ERRO NO BUCKET: {e}")
        return False
    
    # 4. Teste completo
    print("\n🎉 CONEXÃO AWS FUNCIONANDO PERFEITAMENTE!")
    print("✅ Autenticação: OK")
    print("✅ Bucket: OK") 
    print("✅ Permissões: OK")
    
    return True

def test_local_fallback():
    """Testar sistema local como fallback"""
    print("\n🏠 TESTANDO SISTEMA LOCAL...")
    
    upload_folder = 'uploads'
    
    # Criar pasta se não existir
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        print(f"✅ Pasta '{upload_folder}' criada")
    
    # Testar escrita
    try:
        test_file = os.path.join(upload_folder, 'test.txt')
        with open(test_file, 'w') as f:
            f.write('teste')
        os.remove(test_file)
        print("✅ Sistema local funcionando!")
        return True
    except Exception as e:
        print(f"❌ Erro no sistema local: {e}")
        return False

if __name__ == "__main__":
    print("🚀 DIAGNÓSTICO COMPLETO - SISTEMA HVAC")
    print("=" * 60)
    
    # Carregar .env se existir
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("✅ Arquivo .env carregado")
    except ImportError:
        print("⚠️  python-dotenv não instalado - usando variáveis do sistema")
    except Exception:
        print("⚠️  Arquivo .env não encontrado")
    
    # Testar AWS
    aws_ok = test_aws_connection()
    
    # Testar local
    local_ok = test_local_fallback()
    
    print("\n" + "=" * 60)
    print("📊 RESULTADO FINAL:")
    print(f"   AWS S3: {'✅ FUNCIONANDO' if aws_ok else '❌ COM PROBLEMAS'}")
    print(f"   Local: {'✅ FUNCIONANDO' if local_ok else '❌ COM PROBLEMAS'}")
    
    if aws_ok:
        print("\n🎯 RECOMENDAÇÃO: Use AWS S3 (já configurado)")
    elif local_ok:
        print("\n🎯 RECOMENDAÇÃO: Use sistema local (AWS com problemas)")
        print("   Corrija AWS depois, sistema funcionará localmente")
    else:
        print("\n🚨 PROBLEMA CRÍTICO: Nem AWS nem local funcionando!")
        print("   Verifique permissões de pasta e configurações")

# Executar teste
test_aws_connection()