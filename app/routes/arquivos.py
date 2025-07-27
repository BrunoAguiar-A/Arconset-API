# routes/arquivos.py
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from database import get_db, Arquivo, Projeto
from datetime import datetime
import os
import uuid
from config.aws_s3 import s3_manager

arquivos_bp = Blueprint('arquivos', __name__)

# Configurações
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
    '.dwg', '.dxf', '.skp', '.rvt',
    '.zip', '.rar', '.7z', '.txt', '.csv'
}

def allowed_file(filename):
    """Verificar se extensão é permitida"""
    return '.' in filename and \
           os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def save_file_local(file, projeto_id=None):
    """Salvar arquivo localmente (método original)"""
    if file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        return None
    
    # Criar pasta se não existir
    upload_dir = UPLOAD_FOLDER
    if projeto_id:
        upload_dir = os.path.join(UPLOAD_FOLDER, f'projeto_{projeto_id}')
    
    os.makedirs(upload_dir, exist_ok=True)
    
    # Nome único para o arquivo
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Salvar arquivo
    file.save(file_path)
    
    return {
        'caminho': file_path,
        'nome_arquivo': unique_filename,
        'tamanho': os.path.getsize(file_path)
    }

@arquivos_bp.route('/api/arquivos/upload-url', methods=['POST'])
def get_upload_url():
    """
    Obter URL para upload (S3 ou local)
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('fileName'):
            return jsonify({
                'success': False,
                'error': 'Nome do arquivo é obrigatório'
            }), 400
        
        filename = data['fileName']
        content_type = data.get('contentType', 'application/octet-stream')
        projeto_id = data.get('projetoId')
        file_size = data.get('fileSize', 0)
        
        # Validações
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        if not allowed_file(filename):
            return jsonify({
                'success': False,
                'error': 'Tipo de arquivo não permitido'
            }), 400
        
        # Verificar se projeto existe
        if projeto_id:
            db = next(get_db())
            try:
                projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
                if not projeto:
                    return jsonify({
                        'success': False,
                        'error': 'Projeto não encontrado'
                    }), 404
            finally:
                db.close()
        
        # Tentar S3 primeiro
        if s3_manager.is_enabled():
            s3_data = s3_manager.create_presigned_upload_url(
                filename, content_type, projeto_id
            )
            
            if s3_data:
                return jsonify({
                    'success': True,
                    'method': 's3',
                    'data': {
                        'uploadUrl': s3_data['upload_url'],
                        'fileUrl': s3_data['file_url'],
                        'key': s3_data['key'],
                        'contentType': s3_data['content_type']
                    }
                })
        
        # Fallback para upload local via API
        return jsonify({
            'success': True,
            'method': 'local',
            'data': {
                'uploadUrl': '/api/arquivos/upload',
                'message': 'Use upload tradicional'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos/upload', methods=['POST'])
def upload_arquivo():
    """
    Upload tradicional (local) - mantém compatibilidade
    """
    try:
        # Verificar se há arquivo
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo selecionado'
            }), 400
        
        # Dados do formulário
        projeto_id = request.form.get('projeto_id', type=int)
        descricao = request.form.get('descricao', '')
        tipo_documento = request.form.get('tipo_documento', 'Geral')
        
        # Verificar tamanho
        file.seek(0, 2)  # Ir para o final
        file_size = file.tell()
        file.seek(0)  # Voltar ao início
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Tentar S3 primeiro
        cloud_data = None
        if s3_manager.is_enabled():
            file_data = file.read()
            file.seek(0)  # Reset para uso local se necessário
            
            cloud_data = s3_manager.upload_file(file_data, file.filename, projeto_id)
        
        # Se S3 falhou, usar armazenamento local
        local_data = None
        if not cloud_data:
            local_data = save_file_local(file, projeto_id)
            if not local_data:
                return jsonify({
                    'success': False,
                    'error': 'Falha ao salvar arquivo'
                }), 500
        
        # Salvar no banco de dados
        db = next(get_db())
        try:
            novo_arquivo = Arquivo(
                nome_original=file.filename,
                nome_arquivo=cloud_data['key'] if cloud_data else local_data['nome_arquivo'],
                caminho=cloud_data['key'] if cloud_data else local_data['caminho'],
                tamanho=cloud_data['size'] if cloud_data else local_data['tamanho'],
                tipo_mime=file.content_type or 'application/octet-stream',
                tipo_documento=tipo_documento,
                projeto_id=projeto_id if projeto_id else None,
                descricao=descricao,
                cloud_url=cloud_data['url'] if cloud_data else None,
                cloud_id=cloud_data['key'] if cloud_data else None,
                created_at=datetime.utcnow()
            )
            
            db.add(novo_arquivo)
            db.commit()
            db.refresh(novo_arquivo)
            
            return jsonify({
                'success': True,
                'message': 'Arquivo enviado com sucesso',
                'storage': 's3' if cloud_data else 'local',
                'data': novo_arquivo.to_dict()
            })
            
        except Exception as db_error:
            db.rollback()
            
            # Limpar arquivo em caso de erro no banco
            if cloud_data:
                s3_manager.delete_file(cloud_data['key'])
            elif local_data and os.path.exists(local_data['caminho']):
                os.remove(local_data['caminho'])
            
            raise db_error
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos/confirm-s3', methods=['POST'])
def confirm_s3_upload():
    """
    Confirmar upload S3 e salvar no banco
    """
    try:
        data = request.get_json()
        
        required_fields = ['key', 'fileName', 'fileUrl']
        if not data or not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': 'Dados incompletos'
            }), 400
        
        key = data['key']
        filename = data['fileName']
        file_url = data['fileUrl']
        projeto_id = data.get('projetoId')
        descricao = data.get('descricao', '')
        tipo_documento = data.get('tipoDocumento', 'Geral')
        
        # Verificar se arquivo existe no S3
        if not s3_manager.file_exists(key):
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado no S3'
            }), 404
        
        # Salvar no banco
        db = next(get_db())
        try:
            novo_arquivo = Arquivo(
                nome_original=filename,
                nome_arquivo=os.path.basename(key),
                caminho=key,
                tamanho=0,  # S3 não retorna tamanho facilmente
                tipo_mime=data.get('contentType', 'application/octet-stream'),
                tipo_documento=tipo_documento,
                projeto_id=projeto_id if projeto_id else None,
                descricao=descricao,
                cloud_url=file_url,
                cloud_id=key,
                created_at=datetime.utcnow()
            )
            
            db.add(novo_arquivo)
            db.commit()
            db.refresh(novo_arquivo)
            
            return jsonify({
                'success': True,
                'message': 'Arquivo confirmado com sucesso',
                'data': novo_arquivo.to_dict()
            })
            
        except Exception as db_error:
            db.rollback()
            raise db_error
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos', methods=['GET'])
def listar_arquivos():
    """
    Listar arquivos com filtros
    """
    try:
        projeto_id = request.args.get('projeto_id', type=int)
        tipo_documento = request.args.get('tipo_documento')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        db = next(get_db())
        try:
            query = db.query(Arquivo)
            
            # Filtros
            if projeto_id:
                query = query.filter(Arquivo.projeto_id == projeto_id)
            
            if tipo_documento:
                query = query.filter(Arquivo.tipo_documento == tipo_documento)
            
            # Paginação
            total = query.count()
            arquivos = query.order_by(Arquivo.created_at.desc()).offset(
                (page - 1) * per_page
            ).limit(per_page).all()
            
            return jsonify({
                'success': True,
                'data': [arquivo.to_dict() for arquivo in arquivos],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                },
                's3_enabled': s3_manager.is_enabled()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['DELETE'])
def deletar_arquivo(arquivo_id):
    """
    Deletar arquivo (S3 + local + banco)
    """
    try:
        db = next(get_db())
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False,
                    'error': 'Arquivo não encontrado'
                }), 404
            
            # Deletar do S3 se existir
            if arquivo.cloud_id:
                s3_manager.delete_file(arquivo.cloud_id)
            
            # Deletar arquivo local se existir
            if arquivo.caminho and not arquivo.cloud_id:
                local_path = arquivo.caminho
                if os.path.exists(local_path):
                    os.remove(local_path)
            
            # Deletar do banco
            db.delete(arquivo)
            db.commit()
            
            return jsonify({
                'success': True,
                'message': 'Arquivo deletado com sucesso'
            })
            
        except Exception as db_error:
            db.rollback()
            raise db_error
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/download', methods=['GET'])
def download_arquivo(arquivo_id):
    """
    Download de arquivo (S3 ou local)
    """
    try:
        db = next(get_db())
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False,
                    'error': 'Arquivo não encontrado'
                }), 404
            
            # Se é arquivo S3, gerar URL temporária
            if arquivo.cloud_id:
                download_url = s3_manager.get_download_url(arquivo.cloud_id)
                if download_url:
                    return jsonify({
                        'success': True,
                        'download_url': download_url,
                        'filename': arquivo.nome_original
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Arquivo não disponível no S3'
                    }), 404
            
            # Arquivo local
            elif arquivo.caminho and os.path.exists(arquivo.caminho):
                return send_file(
                    arquivo.caminho,
                    as_attachment=True,
                    download_name=arquivo.nome_original
                )
            
            else:
                return jsonify({
                    'success': False,
                    'error': 'Arquivo não encontrado'
                }), 404
                
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500

@arquivos_bp.route('/api/arquivos/stats', methods=['GET'])
def estatisticas_arquivos():
    """
    Estatísticas de arquivos
    """
    try:
        db = next(get_db())
        try:
            # Total de arquivos
            total = db.query(Arquivo).count()
            
            # Por tipo
            tipos = db.query(
                Arquivo.tipo_documento, 
                db.func.count(Arquivo.id)
            ).group_by(Arquivo.tipo_documento).all()
            
            # Arquivos no S3 vs Local
            s3_count = db.query(Arquivo).filter(Arquivo.cloud_id.isnot(None)).count()
            local_count = total - s3_count
            
            return jsonify({
                'success': True,
                'data': {
                    'total': total,
                    'storage': {
                        's3': s3_count,
                        'local': local_count
                    },
                    'tipos': [{'tipo': tipo, 'count': count} for tipo, count in tipos],
                    's3_enabled': s3_manager.is_enabled()
                }
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Erro interno: {str(e)}'
        }), 500