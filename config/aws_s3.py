# config/aws_s3.py - CONFIGURAÇÃO AWS S3 PARA PRODUÇÃO
import boto3
import os
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime, timedelta
import uuid
import mimetypes
import logging
from urllib.parse import quote

logger = logging.getLogger(__name__)

class S3FileManager:
    
    def __init__(self):
        # Suas configurações AWS (do .env)
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region = os.getenv('AWS_REGION')
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        self.use_s3 = os.getenv('USE_S3', 'true').lower() == 'true'
        
        # Tamanhos (arquivos > 10MB vão para S3)
        self.max_db_size = int(os.getenv('MAX_DB_FILE_SIZE', 10 * 1024 * 1024))  # 10MB
        
        # Status
        self.s3_enabled = False
        self.s3_client = None
        
        if self.use_s3:
            try:
                # Inicializar cliente S3
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
                
                # Testar conexão
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                self.s3_enabled = True
                
                logger.info(f"✅ AWS S3 conectado: {self.bucket_name} ({self.region})")
                
                # Configurar CORS se necessário
                self._ensure_cors_configured()
                
            except Exception as e:
                logger.error(f"❌ Erro ao conectar AWS S3: {e}")
                logger.info("📁 Usando apenas banco de dados local")
                self.s3_enabled = False
        else:
            logger.info("📁 AWS S3 desabilitado nas configurações")
    
    def _ensure_cors_configured(self):
        """Garantir que CORS está configurado corretamente"""
        try:
            cors_config = {
                'CORSRules': [
                    {
                        'AllowedHeaders': ['*'],
                        'AllowedMethods': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
                        'AllowedOrigins': [
                            'http://localhost:3000',
                            'http://localhost:5173',
                            'http://127.0.0.1:3000',
                            'http://127.0.0.1:5173',
                            'https://yourdomain.com'  # Substitua pelo seu domínio
                        ],
                        'ExposeHeaders': ['ETag', 'Content-Length'],
                        'MaxAgeSeconds': 3000
                    }
                ]
            }
            
            self.s3_client.put_bucket_cors(
                Bucket=self.bucket_name,
                CORSConfiguration=cors_config
            )
            
            logger.info("✅ CORS configurado no bucket S3")
            
        except Exception as e:
            logger.warning(f"⚠️ Não foi possível configurar CORS: {e}")
    
    def determine_storage_type(self, file_size):
        """
        Determinar onde armazenar baseado no tamanho
        """
        if file_size <= self.max_db_size:
            return 'database'
        elif self.s3_enabled:
            return 's3'
        else:
            return 'database'  # Forçar banco se S3 não disponível
    
    def generate_s3_key(self, filename, pasta_id=None, projeto_id=None):
        """
        Gerar chave única para S3
        """
        timestamp = datetime.now().strftime('%Y/%m/%d')
        unique_id = str(uuid.uuid4())[:12]
        safe_filename = filename.replace(' ', '_').replace('(', '').replace(')', '').replace('#', '')
        
        # Estrutura hierárquica
        if pasta_id:
            return f"pastas/{pasta_id}/{timestamp}/{unique_id}_{safe_filename}"
        elif projeto_id:
            return f"projetos/{projeto_id}/{timestamp}/{unique_id}_{safe_filename}"
        else:
            return f"uploads/{timestamp}/{unique_id}_{safe_filename}"
    
    def upload_to_s3(self, file_content, filename, pasta_id=None, projeto_id=None, content_type=None):
        """
        Upload direto para S3
        """
        if not self.s3_enabled:
            raise Exception("AWS S3 não está habilitado")
        
        try:
            s3_key = self.generate_s3_key(filename, pasta_id, projeto_id)
            
            if not content_type:
                content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            # Upload com metadados
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption='AES256',
                Metadata={
                    'original_name': filename,
                    'pasta_id': str(pasta_id) if pasta_id else '',
                    'projeto_id': str(projeto_id) if projeto_id else '',
                    'upload_date': datetime.now().isoformat(),
                    'system': 'arconset-hvac'
                }
            )
            
            # URL pública
            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{quote(s3_key)}"
            
            logger.info(f"✅ Arquivo enviado para S3: {s3_key}")
            
            return {
                'key': s3_key,
                'url': s3_url,
                'bucket': self.bucket_name,
                'size': len(file_content) if hasattr(file_content, '__len__') else 0,
                'content_type': content_type
            }
            
        except ClientError as e:
            logger.error(f"❌ Erro no upload S3: {e}")
            raise Exception(f"Falha no upload S3: {str(e)}")
    
    def get_download_url(self, s3_key, expires_in=3600):
        """
        Gerar URL assinada para download
        """
        if not self.s3_enabled or not s3_key:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"❌ Erro ao gerar URL assinada: {e}")
            return None
    
    def download_from_s3(self, s3_key):
        """
        Download direto do S3
        """
        if not self.s3_enabled or not s3_key:
            return None
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"❌ Erro no download S3: {e}")
            return None
    
    def delete_from_s3(self, s3_key):
        """
        Deletar arquivo do S3
        """
        if not self.s3_enabled or not s3_key:
            return True
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"✅ Arquivo deletado do S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"❌ Erro ao deletar S3: {e}")
            return False
    
    def file_exists_in_s3(self, s3_key):
        """
        Verificar se arquivo existe no S3
        """
        if not self.s3_enabled or not s3_key:
            return False
        
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError:
            return False
    
    def get_presigned_upload_url(self, filename, content_type, pasta_id=None, projeto_id=None):
        """
        Criar URL assinada para upload direto do frontend
        """
        if not self.s3_enabled:
            return None
        
        try:
            s3_key = self.generate_s3_key(filename, pasta_id, projeto_id)
            
            # Condições para upload
            conditions = [
                {"bucket": self.bucket_name},
                {"key": s3_key},
                {"Content-Type": content_type},
                ["content-length-range", 1, 100 * 1024 * 1024]  # 1 byte a 100MB
            ]
            
            # Gerar POST presigned
            presigned_post = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={"Content-Type": content_type},
                Conditions=conditions,
                ExpiresIn=3600  # 1 hora
            )
            
            # URL pública final
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{quote(s3_key)}"
            
            return {
                'upload_url': presigned_post['url'],
                'fields': presigned_post['fields'],
                'file_url': file_url,
                'key': s3_key,
                'expires_in': 3600
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar URL de upload: {e}")
            return None
    
    def test_connection(self):
        """
        Testar conectividade completa com S3
        """
        if not self.s3_enabled:
            return {
                'status': 'disabled',
                'message': 'AWS S3 está desabilitado',
                'config': {
                    'use_s3': self.use_s3,
                    'bucket': self.bucket_name,
                    'region': self.region
                }
            }
        
        try:
            # 1. Testar acesso ao bucket
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            
            # 2. Testar upload/download/delete
            test_key = f"test/connection_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            test_content = b"Teste de conectividade AWS S3 - Sistema HVAC ArconSet"
            
            # Upload
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=test_key,
                Body=test_content,
                ContentType='text/plain'
            )
            
            # Download
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=test_key)
            downloaded_content = response['Body'].read()
            
            # Verificar integridade
            if downloaded_content != test_content:
                raise Exception("Falha na verificação de integridade")
            
            # Cleanup
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=test_key)
            
            return {
                'status': 'connected',
                'message': 'AWS S3 funcionando perfeitamente',
                'config': {
                    'bucket': self.bucket_name,
                    'region': self.region,
                    'max_db_size_mb': self.max_db_size / (1024 * 1024),
                    'cors_configured': True
                },
                'test_results': {
                    'upload': True,
                    'download': True,
                    'delete': True,
                    'integrity': True
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no teste S3: {e}")
            return {
                'status': 'error',
                'message': f'Erro na conexão S3: {str(e)}',
                'config': {
                    'bucket': self.bucket_name,
                    'region': self.region
                }
            }
    
    def get_bucket_info(self):
        """
        Informações do bucket
        """
        if not self.s3_enabled:
            return None
        
        try:
            # Informações básicas do bucket
            bucket_location = self.s3_client.get_bucket_location(Bucket=self.bucket_name)
            
            # Contar objetos (limitado para performance)
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                MaxKeys=1000
            )
            
            objects = response.get('Contents', [])
            total_size = sum(obj.get('Size', 0) for obj in objects)
            
            return {
                'name': self.bucket_name,
                'region': bucket_location.get('LocationConstraint') or 'us-east-1',
                'total_objects': len(objects),
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'total_size_gb': round(total_size / (1024 * 1024 * 1024), 3),
                'last_modified': max([obj.get('LastModified') for obj in objects]) if objects else None
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter info do bucket: {e}")
            return None


# Instância global para usar em toda aplicação
s3_manager = S3FileManager()

# Funções de conveniência
def is_s3_enabled():
    """Verificar se S3 está habilitado e funcionando"""
    return s3_manager.s3_enabled

def determine_storage_type(file_size):
    """Determinar tipo de armazenamento baseado no tamanho"""
    return s3_manager.determine_storage_type(file_size)

def upload_file(file_content, filename, **kwargs):
    """Upload inteligente baseado no tamanho e configuração"""
    file_size = len(file_content) if hasattr(file_content, '__len__') else 0
    storage_type = determine_storage_type(file_size)
    
    if storage_type == 's3' and s3_manager.s3_enabled:
        result = s3_manager.upload_to_s3(file_content, filename, **kwargs)
        return result, 's3'
    else:
        # Retornar dados para salvar no banco
        return file_content, 'database'

def get_download_url(arquivo):
    """Obter URL de download baseado no tipo de armazenamento"""
    if arquivo.storage_type == 's3' and arquivo.aws_s3_key:
        return s3_manager.get_download_url(arquivo.aws_s3_key)
    else:
        return f'/api/arquivos/{arquivo.id}/download'

def delete_file(arquivo):
    """Deletar arquivo baseado no tipo de armazenamento"""
    if arquivo.storage_type == 's3' and arquivo.aws_s3_key:
        return s3_manager.delete_from_s3(arquivo.aws_s3_key)
    return True

# Log de inicialização
if s3_manager.s3_enabled:
    logger.info(f"🌩️ Sistema híbrido AWS S3 inicializado:")
    logger.info(f"   📁 Banco: Arquivos ≤ {s3_manager.max_db_size / (1024*1024):.1f}MB")
    logger.info(f"   ☁️ S3: Arquivos > {s3_manager.max_db_size / (1024*1024):.1f}MB")
    logger.info(f"   🪣 Bucket: {s3_manager.bucket_name}")
    logger.info(f"   🌍 Região: {s3_manager.region}")
else:
    logger.info(f"📁 Sistema local (banco de dados):")
    logger.info(f"   💾 Todos os arquivos no banco PostgreSQL")
    logger.info(f"   ⚠️ S3 indisponível ou desabilitado")