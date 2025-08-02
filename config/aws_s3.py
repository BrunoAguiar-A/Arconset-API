# config/aws_s3.py - SISTEMA HÍBRIDO DE ARMAZENAMENTO
import boto3
import os
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime, timedelta
import uuid
import mimetypes
import logging

logger = logging.getLogger(__name__)

class HybridFileManager:
    """
    Gerenciador híbrido: Banco de dados + AWS S3
    - Arquivos pequenos (<10MB): Banco de dados
    - Arquivos grandes (>10MB): AWS S3
    """
    
    def __init__(self):
        # Configurações
        self.max_db_size = int(os.getenv('MAX_DB_FILE_SIZE', 10 * 1024 * 1024))  # 10MB
        self.use_s3 = os.getenv('USE_S3', 'true').lower() == 'true'
        
        # Configurações AWS
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        self.region = os.getenv('AWS_REGION', 'sa-east-1')
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        # Status
        self.s3_enabled = False
        self.s3_client = None
        
        if self.use_s3 and all([self.bucket_name, self.access_key, self.secret_key]):
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
                
            except Exception as e:
                logger.error(f"❌ Erro ao conectar AWS S3: {e}")
                logger.info("📁 Usando apenas banco de dados")
                self.s3_enabled = False
        else:
            logger.info("📁 AWS S3 desabilitado - usando apenas banco de dados")
    
    def determine_storage(self, file_size):
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
        Gerar chave única para o arquivo no S3
        """
        timestamp = datetime.now().strftime('%Y/%m/%d')
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = filename.replace(' ', '_').replace('(', '').replace(')', '')
        
        if pasta_id:
            return f"pastas/{pasta_id}/{timestamp}/{unique_id}_{safe_filename}"
        elif projeto_id:
            return f"projetos/{projeto_id}/{timestamp}/{unique_id}_{safe_filename}"
        else:
            return f"uploads/{timestamp}/{unique_id}_{safe_filename}"
    
    def upload_to_s3(self, file_content, filename, pasta_id=None, projeto_id=None):
        """
        Upload direto para S3
        """
        if not self.s3_enabled:
            return None
        
        try:
            s3_key = self.generate_s3_key(filename, pasta_id, projeto_id)
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
                    'upload_date': datetime.now().isoformat()
                }
            )
            
            # URL pública
            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            logger.info(f"✅ Arquivo enviado para S3: {s3_key}")
            
            return {
                'key': s3_key,
                'url': s3_url,
                'bucket': self.bucket_name,
                'size': len(file_content) if hasattr(file_content, '__len__') else 0
            }
            
        except ClientError as e:
            logger.error(f"❌ Erro no upload S3: {e}")
            return None
    
    def get_s3_download_url(self, s3_key, expires_in=3600):
        """
        Gerar URL assinada para download do S3
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
    
    def get_s3_preview_url(self, s3_key, expires_in=1800):
        """
        Gerar URL assinada para preview do S3 (30 minutos)
        """
        return self.get_s3_download_url(s3_key, expires_in)
    
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
    
    def get_s3_metadata(self, s3_key):
        """
        Obter metadados do arquivo no S3
        """
        if not self.s3_enabled or not s3_key:
            return None
        
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return {
                'size': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', ''),
                'last_modified': response.get('LastModified'),
                'metadata': response.get('Metadata', {})
            }
        except ClientError as e:
            logger.error(f"❌ Erro ao obter metadados S3: {e}")
            return None
    
    def create_presigned_upload_url(self, filename, content_type, pasta_id=None, projeto_id=None):
        """
        Criar URL assinada para upload direto do frontend
        """
        if not self.s3_enabled:
            return None
        
        try:
            s3_key = self.generate_s3_key(filename, pasta_id, projeto_id)
            
            # URL assinada para PUT
            presigned_url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # 1 hora
            )
            
            # URL pública final
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            
            return {
                'upload_url': presigned_url,
                'file_url': file_url,
                'key': s3_key,
                'content_type': content_type,
                'expires_in': 3600
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar URL de upload: {e}")
            return None
    
    def get_bucket_stats(self):
        """
        Estatísticas do bucket S3
        """
        if not self.s3_enabled:
            return None
        
        try:
            # Listar objetos para estatísticas básicas
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                MaxKeys=1000  # Limitar para performance
            )
            
            objects = response.get('Contents', [])
            total_size = sum(obj.get('Size', 0) for obj in objects)
            total_files = len(objects)
            
            return {
                'bucket': self.bucket_name,
                'region': self.region,
                'total_files': total_files,
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'total_size_gb': round(total_size / (1024 * 1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter estatísticas do bucket: {e}")
            return None
    
    def cleanup_old_files(self, days=30):
        """
        Limpar arquivos antigos do S3 (opcional)
        """
        if not self.s3_enabled:
            return 0
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            response = self.s3_client.list_objects_v2(Bucket=self.bucket_name)
            objects_to_delete = []
            
            for obj in response.get('Contents', []):
                if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                    objects_to_delete.append({'Key': obj['Key']})
            
            if objects_to_delete:
                self.s3_client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
                
                logger.info(f"✅ {len(objects_to_delete)} arquivos antigos removidos do S3")
            
            return len(objects_to_delete)
            
        except Exception as e:
            logger.error(f"❌ Erro na limpeza do S3: {e}")
            return 0
    
    def test_connection(self):
        """
        Testar conectividade com AWS S3
        """
        if not self.s3_enabled:
            return {
                'status': 'disabled',
                'message': 'AWS S3 está desabilitado',
                'database_max_size_mb': self.max_db_size / (1024 * 1024)
            }
        
        try:
            # Testar acesso ao bucket
            response = self.s3_client.head_bucket(Bucket=self.bucket_name)
            
            # Testar upload de arquivo de teste
            test_key = f"test/{datetime.now().strftime('%Y%m%d_%H%M%S')}_connection_test.txt"
            test_content = b"AWS S3 connection test - HVAC System"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=test_key,
                Body=test_content,
                ContentType='text/plain'
            )
            
            # Deletar arquivo de teste
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=test_key)
            
            return {
                'status': 'connected',
                'message': 'AWS S3 funcionando perfeitamente',
                'bucket': self.bucket_name,
                'region': self.region,
                'database_max_size_mb': self.max_db_size / (1024 * 1024)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no teste S3: {e}")
            return {
                'status': 'error',
                'message': f'Erro na conexão S3: {str(e)}',
                'bucket': self.bucket_name,
                'region': self.region
            }

# Instância global
hybrid_storage = HybridFileManager()

# Funções de conveniência
def is_s3_enabled():
    """Verificar se S3 está habilitado"""
    return hybrid_storage.s3_enabled

def determine_storage_type(file_size):
    """Determinar tipo de armazenamento baseado no tamanho"""
    return hybrid_storage.determine_storage(file_size)

def upload_file(file_content, filename, pasta_id=None, projeto_id=None):
    """Upload inteligente baseado no tamanho"""
    file_size = len(file_content) if hasattr(file_content, '__len__') else 0
    storage_type = determine_storage_type(file_size)
    
    if storage_type == 's3':
        result = hybrid_storage.upload_to_s3(file_content, filename, pasta_id, projeto_id)
        return result, 's3'
    else:
        # Retornar dados para salvar no banco
        return file_content, 'database'

def get_download_url(arquivo):
    """Obter URL de download baseado no tipo de armazenamento"""
    if arquivo.storage_type == 's3' and arquivo.aws_s3_key:
        return hybrid_storage.get_s3_download_url(arquivo.aws_s3_key)
    else:
        # Download do banco de dados
        return f'/api/arquivos/{arquivo.id}/download'

def delete_file(arquivo):
    """Deletar arquivo baseado no tipo de armazenamento"""
    if arquivo.storage_type == 's3' and arquivo.aws_s3_key:
        return hybrid_storage.delete_from_s3(arquivo.aws_s3_key)
    else:
        # Arquivo no banco - apenas deletar registro
        return True

# Logs de inicialização
if hybrid_storage.s3_enabled:
    logger.info(f"🌩️ Sistema híbrido inicializado:")
    logger.info(f"   📁 Banco: Arquivos < {hybrid_storage.max_db_size / (1024*1024):.1f}MB")
    logger.info(f"   ☁️ S3: Arquivos > {hybrid_storage.max_db_size / (1024*1024):.1f}MB")
    logger.info(f"   🪣 Bucket: {hybrid_storage.bucket_name}")
else:
    logger.info(f"📁 Sistema de banco de dados:")
    logger.info(f"   💾 Todos os arquivos salvos no banco AWS RDS")
    logger.info(f"   📏 Sem limite de tamanho (configurável)")