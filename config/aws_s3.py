# config/aws_s3.py
import boto3
import os
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime
import uuid
import mimetypes
from config.env_loader import load_dotenv


class S3FileManager:
    """
    Gerenciador S3 integrado com sistema existente
    """
    
    def __init__(self):
        self.enabled = os.getenv('USE_S3', 'False').lower() == 'true'
        
        if not self.enabled:
            print("📁 S3 desabilitado - usando armazenamento local")
            return
        
        # Configurações AWS
        self.bucket_name = os.getenv('AWS_S3_BUCKET')
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        if not all([self.bucket_name, self.access_key, self.secret_key]):
            print("⚠️ Configurações AWS incompletas - usando armazenamento local")
            self.enabled = False
            return
        
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
            print(f"✅ S3 conectado: {self.bucket_name}")
            
        except Exception as e:
            print(f"❌ Erro S3: {e}")
            print("📁 Voltando para armazenamento local")
            self.enabled = False
    
    def is_enabled(self):
        return self.enabled
    
    def generate_key(self, filename, projeto_id=None):
        """
        Gerar chave única para o arquivo
        """
        timestamp = datetime.now().strftime('%Y/%m/%d')
        unique_id = str(uuid.uuid4())[:8]
        
        if projeto_id:
            return f"projetos/{projeto_id}/{timestamp}/{unique_id}_{filename}"
        else:
            return f"uploads/{timestamp}/{unique_id}_{filename}"
    
    def create_presigned_upload_url(self, filename, content_type, projeto_id=None):
        """
        Criar URL assinada para upload direto
        """
        if not self.enabled:
            return None
        
        try:
            key = self.generate_key(filename, projeto_id)
            
            # URL assinada para PUT
            presigned_url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # 1 hora
            )
            
            # URL pública do arquivo
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
            
            return {
                'upload_url': presigned_url,
                'file_url': file_url,
                'key': key,
                'content_type': content_type
            }
            
        except Exception as e:
            print(f"❌ Erro ao gerar URL: {e}")
            return None
    
    def upload_file(self, file_data, filename, projeto_id=None):
        """
        Upload direto de arquivo (backup method)
        """
        if not self.enabled:
            return None
        
        try:
            key = self.generate_key(filename, projeto_id)
            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_data,
                ContentType=content_type,
                Metadata={
                    'original_name': filename,
                    'projeto_id': str(projeto_id) if projeto_id else 'null'
                }
            )
            
            file_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
            
            return {
                'key': key,
                'url': file_url,
                'size': len(file_data) if hasattr(file_data, '__len__') else 0
            }
            
        except Exception as e:
            print(f"❌ Erro no upload S3: {e}")
            return None
    
    def delete_file(self, key):
        """
        Deletar arquivo do S3
        """
        if not self.enabled or not key:
            return True
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            print(f"❌ Erro ao deletar S3: {e}")
            return False
    
    def file_exists(self, key):
        """
        Verificar se arquivo existe no S3
        """
        if not self.enabled or not key:
            return False
        
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except:
            return False
    
    def get_download_url(self, key, expires_in=3600):
        """
        Gerar URL de download temporária
        """
        if not self.enabled or not key:
            return None
        
        try:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
        except Exception as e:
            print(f"❌ Erro URL download: {e}")
            return None

# Instância global
s3_manager = S3FileManager()