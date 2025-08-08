# 📁 routes/arquivos.py - BLUEPRINT DEDICADO PARA SISTEMA DE ARQUIVOS
from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
from datetime import datetime, UTC
import os
import uuid
import mimetypes
from database import SessionLocal, Arquivo, Pasta

# Criar blueprint
arquivos_bp = Blueprint('arquivos', __name__)

# ===== CONFIGURAÇÕES =====
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg',
    '.dwg', '.dxf', '.skp', '.rvt', '.ifc',
    '.zip', '.rar', '.7z', '.txt', '.csv', '.json'
}

def allowed_file(filename):
    """Verificar se extensão é permitida"""
    return '.' in filename and os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def get_upload_folder():
    """Obter pasta de upload da configuração"""
    return current_app.config.get('UPLOAD_FOLDER', os.path.abspath('uploads'))

def ensure_upload_folder():
    """Garantir que pasta de upload existe"""
    upload_folder = get_upload_folder()
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder

# ===== MIDDLEWARE DE AUTENTICAÇÃO =====
def verify_auth():
    """Verificação básica de autenticação (opcional)"""
    # Por enquanto, sempre permitir
    # Você pode adicionar verificação de token aqui
    return True, None

def auth_required(f):
    """Decorator para verificar autenticação"""
    from functools import wraps
    
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_ok, error = verify_auth()
        if not auth_ok:
            return jsonify({'success': False, 'error': 'Autenticação requerida'}), 401
        return f(*args, **kwargs)
    return decorated

# ===== ROTAS DE UPLOAD =====

@arquivos_bp.route('/upload', methods=['POST'])
@auth_required
def upload_arquivo():
    """Upload de arquivo"""
    try:
        # Verificar se arquivo foi enviado
        if 'file' not in request.files:
            return jsonify({
                'success': False, 
                'error': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['file']
        
        if not file.filename:
            return jsonify({
                'success': False, 
                'error': 'Nome do arquivo inválido'
            }), 400
        
        # Verificar tamanho do arquivo
        file.seek(0, 2)  # Ir para o final
        file_size = file.tell()
        file.seek(0)     # Voltar para o início
        
        max_size = current_app.config.get('MAX_CONTENT_LENGTH', 100 * 1024 * 1024)
        if file_size > max_size:
            max_mb = max_size // (1024 * 1024)
            return jsonify({
                'success': False, 
                'error': f'Arquivo muito grande. Máximo: {max_mb}MB'
            }), 400
        
        # Verificar extensão
        if not allowed_file(file.filename):
            return jsonify({
                'success': False, 
                'error': 'Tipo de arquivo não permitido'
            }), 400
        
        # Preparar salvamento
        upload_folder = ensure_upload_folder()
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(upload_folder, unique_filename)
        
        # Salvar arquivo físico
        file.save(file_path)
        
        # Dados do formulário
        tipo_documento = request.form.get('tipo_documento', 'Geral')
        projeto_id = request.form.get('projeto_id', type=int)
        pasta_id = request.form.get('pasta_id', type=int)
        descricao = request.form.get('descricao', '')
        
        # Salvar no banco de dados
        db = SessionLocal()
        try:
            novo_arquivo = Arquivo(
                nome_original=file.filename,
                nome_arquivo=unique_filename,
                caminho=file_path,
                tamanho=file_size,
                tipo_mime=file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream',
                tipo_documento=tipo_documento,
                projeto_id=projeto_id,
                pasta_id=pasta_id,
                descricao=descricao,
                created_at=datetime.now(UTC)
            )
            
            db.add(novo_arquivo)
            db.commit()
            db.refresh(novo_arquivo)
            
            return jsonify({
                'success': True,
                'message': 'Upload realizado com sucesso',
                'data': {
                    'id': novo_arquivo.id,
                    'nome_original': novo_arquivo.nome_original,
                    'nome_arquivo': novo_arquivo.nome_arquivo,
                    'tamanho': novo_arquivo.tamanho,
                    'tipo_mime': novo_arquivo.tipo_mime,
                    'tipo_documento': novo_arquivo.tipo_documento,
                    'projeto_id': novo_arquivo.projeto_id,
                    'pasta_id': novo_arquivo.pasta_id,
                    'descricao': novo_arquivo.descricao,
                    'created_at': novo_arquivo.created_at.isoformat() if novo_arquivo.created_at else None
                }
            })
            
        except Exception as db_error:
            db.rollback()
            print(f"❌ Erro no banco durante upload: {db_error}")
            
            # Mesmo com erro no banco, arquivo foi salvo
            return jsonify({
                'success': True,
                'message': 'Arquivo salvo (problema no banco de dados)',
                'warning': 'Arquivo salvo fisicamente, mas não foi registrado no banco',
                'data': {
                    'id': None,
                    'nome_original': file.filename,
                    'nome_arquivo': unique_filename,
                    'tamanho': file_size,
                    'tipo_mime': file.content_type,
                    'caminho': file_path,
                    'created_at': datetime.now(UTC).isoformat()
                }
            })
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro no upload: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro interno: {str(e)}'
        }), 500

# ===== ROTAS DE LISTAGEM =====

@arquivos_bp.route('/', methods=['GET'])
@arquivos_bp.route('/list', methods=['GET'])
@auth_required
def listar_arquivos():
    """Listar arquivos"""
    try:
        # Parâmetros de filtro
        pasta_id = request.args.get('pasta_id', type=int)
        projeto_id = request.args.get('projeto_id', type=int)
        tipo_documento = request.args.get('tipo_documento')
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        db = SessionLocal()
        try:
            # Construir query
            query = db.query(Arquivo)
            
            # Aplicar filtros
            if pasta_id is not None:
                query = query.filter(Arquivo.pasta_id == pasta_id)
            
            if projeto_id is not None:
                query = query.filter(Arquivo.projeto_id == projeto_id)
            
            if tipo_documento:
                query = query.filter(Arquivo.tipo_documento == tipo_documento)
            
            # Ordenar e paginar
            query = query.order_by(Arquivo.created_at.desc())
            total = query.count()
            arquivos = query.offset(offset).limit(limit).all()
            
            # Converter para dicionários
            arquivos_data = []
            for arquivo in arquivos:
                arquivo_dict = {
                    'id': arquivo.id,
                    'nome_original': arquivo.nome_original,
                    'nome_arquivo': arquivo.nome_arquivo,
                    'tamanho': arquivo.tamanho,
                    'tipo_mime': arquivo.tipo_mime,
                    'tipo_documento': arquivo.tipo_documento,
                    'projeto_id': arquivo.projeto_id,
                    'pasta_id': arquivo.pasta_id,
                    'descricao': arquivo.descricao,
                    'created_at': arquivo.created_at.isoformat() if arquivo.created_at else None,
                    'exists': os.path.exists(arquivo.caminho) if arquivo.caminho else False
                }
                arquivos_data.append(arquivo_dict)
            
            return jsonify({
                'success': True,
                'data': arquivos_data,
                'pagination': {
                    'total': total,
                    'limit': limit,
                    'offset': offset,
                    'has_more': (offset + limit) < total
                },
                'filters': {
                    'pasta_id': pasta_id,
                    'projeto_id': projeto_id,
                    'tipo_documento': tipo_documento
                }
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao listar arquivos: {e}")
        
        # Fallback: listar arquivos do sistema de arquivos
        try:
            upload_folder = get_upload_folder()
            files_data = []
            
            if os.path.exists(upload_folder):
                for filename in os.listdir(upload_folder):
                    filepath = os.path.join(upload_folder, filename)
                    if os.path.isfile(filepath):
                        stat = os.stat(filepath)
                        files_data.append({
                            'id': hash(filename) % 100000,
                            'nome_original': filename,
                            'nome_arquivo': filename,
                            'tamanho': stat.st_size,
                            'tipo_mime': mimetypes.guess_type(filename)[0],
                            'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            'source': 'filesystem'
                        })
            
            return jsonify({
                'success': True,
                'data': files_data,
                'total': len(files_data),
                'source': 'filesystem_fallback',
                'warning': 'Dados obtidos do sistema de arquivos (banco indisponível)'
            })
            
        except Exception as fallback_error:
            return jsonify({
                'success': False, 
                'error': f'Erro ao listar arquivos: {str(e)}'
            }), 500

# ===== ROTAS DE DOWNLOAD =====

@arquivos_bp.route('/<int:arquivo_id>/download', methods=['GET'])
@auth_required
def download_arquivo(arquivo_id):
    """Download de arquivo específico"""
    try:
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo não encontrado'
                }), 404
            
            if not arquivo.caminho or not os.path.exists(arquivo.caminho):
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo físico não encontrado'
                }), 404
            
            return send_file(
                arquivo.caminho,
                as_attachment=True,
                download_name=arquivo.nome_original,
                mimetype=arquivo.tipo_mime
            )
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro no download: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro no download: {str(e)}'
        }), 500

@arquivos_bp.route('/<int:arquivo_id>/view', methods=['GET'])
@auth_required
def view_arquivo(arquivo_id):
    """Visualizar arquivo (sem download)"""
    try:
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo não encontrado'
                }), 404
            
            if not arquivo.caminho or not os.path.exists(arquivo.caminho):
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo físico não encontrado'
                }), 404
            
            return send_file(
                arquivo.caminho,
                as_attachment=False,
                mimetype=arquivo.tipo_mime
            )
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro na visualização: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro na visualização: {str(e)}'
        }), 500

# ===== ROTAS DE INFORMAÇÕES =====

@arquivos_bp.route('/<int:arquivo_id>', methods=['GET'])
@auth_required
def get_arquivo_info(arquivo_id):
    """Obter informações de um arquivo específico"""
    try:
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo não encontrado'
                }), 404
            
            arquivo_data = {
                'id': arquivo.id,
                'nome_original': arquivo.nome_original,
                'nome_arquivo': arquivo.nome_arquivo,
                'tamanho': arquivo.tamanho,
                'tipo_mime': arquivo.tipo_mime,
                'tipo_documento': arquivo.tipo_documento,
                'projeto_id': arquivo.projeto_id,
                'pasta_id': arquivo.pasta_id,
                'descricao': arquivo.descricao,
                'created_at': arquivo.created_at.isoformat() if arquivo.created_at else None,
                'exists': os.path.exists(arquivo.caminho) if arquivo.caminho else False,
                'url_download': f'/api/arquivos/{arquivo.id}/download',
                'url_view': f'/api/arquivos/{arquivo.id}/view'
            }
            
            return jsonify({
                'success': True,
                'data': arquivo_data
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao obter info do arquivo: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro interno: {str(e)}'
        }), 500

# ===== ROTAS DE EXCLUSÃO =====

@arquivos_bp.route('/<int:arquivo_id>', methods=['DELETE'])
@auth_required
def deletar_arquivo(arquivo_id):
    """Deletar arquivo específico"""
    try:
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo não encontrado'
                }), 404
            
            # Deletar arquivo físico
            file_deleted = False
            if arquivo.caminho and os.path.exists(arquivo.caminho):
                try:
                    os.remove(arquivo.caminho)
                    file_deleted = True
                except Exception as file_error:
                    print(f"⚠️ Erro ao deletar arquivo físico: {file_error}")
            
            # Deletar registro do banco
            nome_original = arquivo.nome_original
            db.delete(arquivo)
            db.commit()
            
            return jsonify({
                'success': True,
                'message': f'Arquivo "{nome_original}" deletado com sucesso',
                'file_deleted': file_deleted
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao deletar arquivo: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro ao deletar: {str(e)}'
        }), 500

# ===== ROTAS DE ATUALIZAÇÃO =====

@arquivos_bp.route('/<int:arquivo_id>', methods=['PUT'])
@auth_required
def atualizar_arquivo(arquivo_id):
    """Atualizar metadados do arquivo"""
    try:
        if not request.is_json:
            return jsonify({
                'success': False, 
                'error': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False, 
                'error': 'Dados não fornecidos'
            }), 400
        
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            
            if not arquivo:
                return jsonify({
                    'success': False, 
                    'error': 'Arquivo não encontrado'
                }), 404
            
            # Campos que podem ser atualizados
            updated_fields = []
            
            if 'descricao' in data:
                arquivo.descricao = data['descricao']
                updated_fields.append('descricao')
            
            if 'tipo_documento' in data:
                arquivo.tipo_documento = data['tipo_documento']
                updated_fields.append('tipo_documento')
            
            if 'projeto_id' in data:
                arquivo.projeto_id = data['projeto_id']
                updated_fields.append('projeto_id')
            
            if 'pasta_id' in data:
                arquivo.pasta_id = data['pasta_id']
                updated_fields.append('pasta_id')
            
            if updated_fields:
                db.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Arquivo atualizado com sucesso',
                    'updated_fields': updated_fields,
                    'data': {
                        'id': arquivo.id,
                        'nome_original': arquivo.nome_original,
                        'descricao': arquivo.descricao,
                        'tipo_documento': arquivo.tipo_documento,
                        'projeto_id': arquivo.projeto_id,
                        'pasta_id': arquivo.pasta_id
                    }
                })
            else:
                return jsonify({
                    'success': True,
                    'message': 'Nenhuma alteração detectada'
                })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao atualizar arquivo: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro ao atualizar: {str(e)}'
        }), 500

# ===== ROTAS DE PASTAS =====

@arquivos_bp.route('/pastas', methods=['GET'])
@auth_required
def listar_pastas():
    """Listar todas as pastas"""
    try:
        db = SessionLocal()
        try:
            pastas = db.query(Pasta).order_by(Pasta.nome).all()
            
            pastas_data = []
            for pasta in pastas:
                # Contar arquivos na pasta
                count_arquivos = db.query(Arquivo).filter(Arquivo.pasta_id == pasta.id).count()
                
                pastas_data.append({
                    'id': pasta.id,
                    'nome': pasta.nome,
                    'descricao': pasta.descricao,
                    'projeto_id': pasta.projeto_id,
                    'created_at': pasta.created_at.isoformat() if pasta.created_at else None,
                    'arquivos_count': count_arquivos
                })
            
            return jsonify({
                'success': True,
                'data': pastas_data,
                'total': len(pastas_data)
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao listar pastas: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro ao listar pastas: {str(e)}'
        }), 500

@arquivos_bp.route('/pastas', methods=['POST'])
@auth_required
def criar_pasta():
    """Criar nova pasta"""
    try:
        if not request.is_json:
            return jsonify({
                'success': False, 
                'error': 'Content-Type deve ser application/json'
            }), 400
        
        data = request.get_json()
        if not data or not data.get('nome'):
            return jsonify({
                'success': False, 
                'error': 'Nome da pasta é obrigatório'
            }), 400
        
        db = SessionLocal()
        try:
            # Verificar se pasta já existe
            existing = db.query(Pasta).filter(Pasta.nome == data['nome']).first()
            if existing:
                return jsonify({
                    'success': False, 
                    'error': 'Pasta com este nome já existe'
                }), 409
            
            nova_pasta = Pasta(
                nome=data['nome'],
                descricao=data.get('descricao', ''),
                projeto_id=data.get('projeto_id'),
                created_at=datetime.now(UTC)
            )
            
            db.add(nova_pasta)
            db.commit()
            db.refresh(nova_pasta)
            
            return jsonify({
                'success': True,
                'message': 'Pasta criada com sucesso',
                'data': {
                    'id': nova_pasta.id,
                    'nome': nova_pasta.nome,
                    'descricao': nova_pasta.descricao,
                    'projeto_id': nova_pasta.projeto_id,
                    'created_at': nova_pasta.created_at.isoformat()
                }
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao criar pasta: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro ao criar pasta: {str(e)}'
        }), 500

# ===== ROTAS DE ESTATÍSTICAS =====

@arquivos_bp.route('/stats', methods=['GET'])
@auth_required
def estatisticas_arquivos():
    """Obter estatísticas dos arquivos"""
    try:
        db = SessionLocal()
        try:
            # Estatísticas básicas
            total_arquivos = db.query(Arquivo).count()
            total_pastas = db.query(Pasta).count()
            
            # Tamanho total
            from sqlalchemy import func
            total_size_result = db.query(func.sum(Arquivo.tamanho)).scalar()
            total_size = total_size_result or 0
            
            # Arquivos por tipo
            tipos_result = db.query(
                Arquivo.tipo_documento,
                func.count(Arquivo.id).label('count')
            ).group_by(Arquivo.tipo_documento).all()
            
            tipos_stats = {tipo: count for tipo, count in tipos_result}
            
            # Arquivos por extensão
            from sqlalchemy import func
            extensoes_result = db.query(
                func.lower(func.substr(Arquivo.nome_original, func.position('.' in Arquivo.nome_original))).label('extensao'),
                func.count(Arquivo.id).label('count')
            ).group_by('extensao').limit(10).all()
            
            extensoes_stats = {ext: count for ext, count in extensoes_result if ext}
            
            return jsonify({
                'success': True,
                'stats': {
                    'total_arquivos': total_arquivos,
                    'total_pastas': total_pastas,
                    'total_size_bytes': total_size,
                    'total_size_mb': round(total_size / (1024 * 1024), 2),
                    'tipos_documento': tipos_stats,
                    'extensoes_populares': extensoes_stats
                },
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao obter estatísticas: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro ao obter estatísticas: {str(e)}'
        }), 500

# ===== ROTAS DE BUSCA =====

@arquivos_bp.route('/search', methods=['GET'])
@auth_required
def buscar_arquivos():
    """Buscar arquivos por nome ou descrição"""
    try:
        query_param = request.args.get('q', '').strip()
        if not query_param:
            return jsonify({
                'success': False, 
                'error': 'Parâmetro de busca "q" é obrigatório'
            }), 400
        
        db = SessionLocal()
        try:
            # Buscar por nome ou descrição
            arquivos = db.query(Arquivo).filter(
                (Arquivo.nome_original.ilike(f'%{query_param}%')) |
                (Arquivo.descricao.ilike(f'%{query_param}%'))
            ).order_by(Arquivo.created_at.desc()).limit(50).all()
            
            resultados = []
            for arquivo in arquivos:
                resultados.append({
                    'id': arquivo.id,
                    'nome_original': arquivo.nome_original,
                    'descricao': arquivo.descricao,
                    'tipo_documento': arquivo.tipo_documento,
                    'tamanho': arquivo.tamanho,
                    'created_at': arquivo.created_at.isoformat() if arquivo.created_at else None,
                    'url_download': f'/api/arquivos/{arquivo.id}/download'
                })
            
            return jsonify({
                'success': True,
                'query': query_param,
                'results': resultados,
                'total': len(resultados)
            })
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro na busca: {e}")
        return jsonify({
            'success': False, 
            'error': f'Erro na busca: {str(e)}'
        }), 500

# ===== ROTA DE SAÚDE DO SISTEMA =====

@arquivos_bp.route('/health', methods=['GET'])
def health_check():
    """Health check do sistema de arquivos"""
    try:
        upload_folder = get_upload_folder()
        
        # Verificar pasta de upload
        folder_exists = os.path.exists(upload_folder)
        folder_writable = os.access(upload_folder, os.W_OK) if folder_exists else False
        
        # Verificar banco de dados
        db_ok = False
        try:
            db = SessionLocal()
            db.query(Arquivo).count()
            db_ok = True
            db.close()
        except:
            pass
        
        # Estatísticas rápidas
        stats = {}
        if db_ok:
            try:
                db = SessionLocal()
                stats = {
                    'total_files': db.query(Arquivo).count(),
                    'total_folders': db.query(Pasta).count()
                }
                db.close()
            except:
                pass
        
        return jsonify({
            'success': folder_exists and folder_writable and db_ok,
            'system': 'arquivos',
            'version': '1.0.0',
            'upload_folder': upload_folder,
            'status': {
                'folder_exists': folder_exists,
                'folder_writable': folder_writable,
                'database': 'ok' if db_ok else 'error'
            },
            'stats': stats,
            'timestamp': datetime.now(UTC).isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now(UTC).isoformat()
        }), 500