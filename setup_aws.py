#!/usr/bin/env python3
# setup_aws.py - Script para configurar AWS S3 - VERSÃO PRODUÇÃO

import os
import boto3
from botocore.exceptions import ClientError
import sys
import json

def print_banner():
    print("=" * 60)
    print("🚀 CONFIGURAÇÃO AWS S3 - ARCONSET HVAC - PRODUÇÃO")
    print("=" * 60)
    print()

def get_aws_credentials():
    """Obter credenciais AWS"""
    print("📝 Configure suas credenciais AWS:")
    print("   (Obtenha em: https://console.aws.amazon.com/iam/)")
    print()
    
    access_key = input("AWS Access Key ID: ").strip()
    secret_key = input("AWS Secret Access Key: ").strip()
    region = input("AWS Region [us-east-1]: ").strip() or "us-east-1"
    
    return access_key, secret_key, region

def check_existing_bucket(s3_client, bucket_name):
    """Verificar se bucket já existe"""
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"✅ Bucket '{bucket_name}' já existe e está acessível!")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            print(f"❌ Bucket '{bucket_name}' não encontrado!")
            return False
        elif error_code == '403':
            print(f"❌ Sem permissão para acessar bucket '{bucket_name}'!")
            return False
        else:
            print(f"❌ Erro ao verificar bucket: {e}")
            return False

def configure_cors(s3_client, bucket_name):
    """Configurar CORS para uploads diretos"""
    cors_config = {
        'CORSRules': [
            {
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                'AllowedOrigins': [
                    'http://localhost:3000',
                    'http://localhost:5173',
                    'http://localhost:5000',
                    'http://127.0.0.1:5000',
                    'https://seu-dominio.com'  # Substitua pelo seu domínio em produção
                ],
                'ExposeHeaders': ['ETag'],
                'MaxAgeSeconds': 3000
            }
        ]
    }
    
    try:
        s3_client.put_bucket_cors(
            Bucket=bucket_name,
            CORSConfiguration=cors_config
        )
        print("✅ CORS configurado!")
        return True
    except Exception as e:
        print(f"⚠️ Erro ao configurar CORS: {e}")
        return False

def configure_bucket_policy(s3_client, bucket_name):
    """Configurar política do bucket para leitura pública"""
    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            }
        ]
    }
    
    try:
        s3_client.put_bucket_policy(
            Bucket=bucket_name,
            Policy=json.dumps(bucket_policy)
        )
        print("✅ Política de bucket configurada (leitura pública)!")
        return True
    except Exception as e:
        print(f"⚠️ Erro ao configurar política: {e}")
        print("   💡 Configure manualmente no console AWS se necessário")
        return False

def test_connection(s3_client, bucket_name):
    """Testar conexão e operações do S3"""
    try:
        # Teste 1: Verificar acesso ao bucket
        s3_client.head_bucket(Bucket=bucket_name)
        print("✅ Conexão com bucket OK")
        
        # Teste 2: Upload de teste
        test_key = "test/connection_test.txt"
        test_content = f"Teste de conexão ARCONSET - {bucket_name}"
        
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=test_content.encode('utf-8'),
            ContentType='text/plain'
        )
        print("✅ Upload de teste OK")
        
        # Teste 3: Verificar URL pública
        public_url = f"https://{bucket_name}.s3.amazonaws.com/{test_key}"
        print(f"✅ URL pública: {public_url}")
        
        # Teste 4: URLs pré-assinadas
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': 'test/presigned_test.txt'},
            ExpiresIn=3600
        )
        print("✅ URLs pré-assinadas OK")
        
        # Teste 5: Listar objetos
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print("✅ Listagem de objetos OK")
        
        # Limpar arquivo de teste
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        print("✅ Limpeza de teste OK")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")
        return False

def update_env_file(access_key, secret_key, region, bucket_name):
    """Atualizar arquivo .env"""
    env_lines = []
    
    # Ler .env existente
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            env_lines = f.readlines()
    
    # Remover configurações AWS existentes
    env_lines = [line for line in env_lines if not any(
        line.startswith(prefix) for prefix in [
            'AWS_ACCESS_KEY_ID=',
            'AWS_SECRET_ACCESS_KEY=',
            'AWS_REGION=',
            'AWS_S3_BUCKET=',
            'USE_S3='
        ]
    )]
    
    # Adicionar novas configurações
    aws_config = [
        f"\n# ===== AWS S3 CONFIGURAÇÃO - PRODUÇÃO =====\n",
        f"AWS_ACCESS_KEY_ID={access_key}\n",
        f"AWS_SECRET_ACCESS_KEY={secret_key}\n",
        f"AWS_REGION={region}\n",
        f"AWS_S3_BUCKET={bucket_name}\n",
        f"USE_S3=True\n",
        f"\n# ===== URLS S3 =====\n",
        f"S3_BASE_URL=https://{bucket_name}.s3.amazonaws.com\n",
        f"S3_REGION_URL=https://{bucket_name}.s3.{region}.amazonaws.com\n",
        f"\n"
    ]
    
    env_lines.extend(aws_config)
    
    # Salvar .env
    with open('.env', 'w', encoding='utf-8') as f:
        f.writelines(env_lines)
    
    print("✅ Arquivo .env atualizado!")

def check_dependencies():
    """Verificar dependências necessárias"""
    try:
        import boto3
        print("✅ boto3 instalado")
    except ImportError:
        print("❌ boto3 não encontrado! Execute: pip install boto3")
        return False
    
    try:
        import dotenv
        print("✅ python-dotenv instalado")
    except ImportError:
        print("⚠️ python-dotenv não encontrado. Execute: pip install python-dotenv")
    
    return True

def main():
    print_banner()
    
    # Verificar dependências
    if not check_dependencies():
        sys.exit(1)
    
    # Passo 1: Credenciais
    access_key, secret_key, region = get_aws_credentials()
    
    if not access_key or not secret_key:
        print("❌ Credenciais AWS são obrigatórias!")
        sys.exit(1)
    
    # Passo 2: Nome do bucket (usar o que você já criou)
    print(f"\n📁 Configurar bucket S3:")
    bucket_name = input("Nome do bucket [arconset-uploads-arconsetADM]: ").strip() or "arconset-uploads-arconsetADM"
    
    # Passo 3: Conectar AWS
    print(f"\n🔗 Conectando à AWS...")
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        print("✅ Cliente S3 criado!")
    except Exception as e:
        print(f"❌ Erro ao conectar AWS: {e}")
        sys.exit(1)
    
    # Passo 4: Verificar bucket existente
    if not check_existing_bucket(s3_client, bucket_name):
        print("❌ Bucket não encontrado ou sem acesso!")
        print("💡 Verifique se o bucket existe e se as credenciais estão corretas")
        sys.exit(1)
    
    # Passo 5: Configurar CORS
    print(f"\n🔧 Configurando CORS...")
    configure_cors(s3_client, bucket_name)
    
    # Passo 6: Configurar política do bucket
    print(f"\n🔒 Configurando política do bucket...")
    configure_bucket_policy(s3_client, bucket_name)
    
    # Passo 7: Testar conexão
    print(f"\n🧪 Testando configuração...")
    if not test_connection(s3_client, bucket_name):
        print("❌ Alguns testes falharam!")
        print("💡 Verifique as permissões do usuário IAM")
    
    # Passo 8: Atualizar .env
    print(f"\n⚙️ Atualizando configurações...")
    update_env_file(access_key, secret_key, region, bucket_name)
    
    # Sucesso!
    print(f"\n🎉 CONFIGURAÇÃO CONCLUÍDA!")
    print(f"\n📋 Resumo:")
    print(f"   • Bucket: {bucket_name}")
    print(f"   • Região: {region}")
    print(f"   • CORS: Configurado")
    print(f"   • Política: Configurada")
    print(f"   • Arquivo .env: Atualizado")
    print(f"\n🌐 URLs do seu bucket:")
    print(f"   • Base: https://{bucket_name}.s3.amazonaws.com")
    print(f"   • Regional: https://{bucket_name}.s3.{region}.amazonaws.com")
    print(f"\n🚀 Próximos passos:")
    print(f"   1. Reinicie sua aplicação")
    print(f"   2. Teste uploads na sua aplicação")
    print(f"   3. Configure banco de dados RDS")
    print(f"\n⚠️ LEMBRETE DE SEGURANÇA:")
    print(f"   • Nunca commite o arquivo .env")
    print(f"   • Monitore gastos no AWS Console")
    print(f"   • Rotacione credenciais periodicamente")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n❌ Configuração cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Erro inesperado: {e}")
        sys.exit(1)