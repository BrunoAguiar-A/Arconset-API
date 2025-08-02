# 🚀 routes/arquivos.py - VERSÃO COMPLETA COM SISTEMA DE PASTAS + AWS
from flask import Blueprint, request, jsonify, send_file, send_from_directory, Response
from werkzeug.utils import secure_filename
from database import SessionLocal, Arquivo, Projeto, Pasta
from sqlalchemy import func, desc, or_
from datetime import datetime, timedelta
import os
import mimetypes
import uuid
import logging
import io

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

arquivos_bp = Blueprint('arquivos', __name__)

# ================================
# CONFIGURAÇÕES PROFISSIONAIS
# ================================
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_DB_FILE_SIZE = 10 * 1024 * 1024  # 10MB para banco (arquivos pequenos)
ALLOWED_EXTENSIONS = {
    # Documentos
    'pdf', 'doc', 'docx', 'odt',
    # Planilhas
    'xls', 'xlsx', 'ods', 'csv',
    # Apresentações
    'ppt', 'pptx', 'odp',
    # Imagens
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'tiff',
    # CAD/Técnicos
    'dwg', 'dxf', 'skp', 'rvt', 'ifc',
    # Compactados
    'zip', 'rar', '7z', 'tar', 'gz',
    # Outros
    'txt', 'rtf', 'json', 'xml'
}

# Categorias profissionais HVAC
CATEGORIAS_HVAC = {
    'pdf': 'Contratos',
    'doc': 'Projetos', 'docx': 'Projetos', 'odt': 'Projetos',
    'xls': 'Financeiro', 'xlsx': 'Financeiro', 'ods': 'Financeiro', 'csv': 'Financeiro',
    'ppt': 'Apresentação', 'pptx': 'Apresentação', 'odp': 'Apresentação',
    'jpg': 'Imagens', 'jpeg': 'Imagens', 'png': 'Imagens', 'gif': 'Imagens', 'bmp': 'Imagens', 'tiff': 'Imagens',
    'dwg': 'CAD', 'dxf': 'CAD', 'skp': 'CAD', 'rvt': 'CAD', 'ifc': 'CAD',
    'zip': 'Outros', 'rar': 'Outros', '7z': 'Outros',
    'txt': 'Técnicos', 'rtf': 'Técnicos', 'json': 'Técnicos', 'xml': 'Técnicos'
}

# Criar pasta de uploads se não existir
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ================================
# FUNÇÕES UTILITÁRIAS
# ================================

def allowed_file(filename):
    """Verificar se o arquivo é permitido"""
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS

def get_file_category(filename):
    """Determinar categoria do arquivo baseado na extensão"""
    if not filename or '.' not in filename:
        return 'Geral'
    ext = filename.rsplit('.', 1)[1].lower()
    return CATEGORIAS_HVAC.get(ext, 'Geral')

def generate_unique_filename(original_filename):
    """Gerar nome único para evitar conflitos"""
    filename = secure_filename(original_filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    return f"{timestamp}_{unique_id}_{filename}"

def validate_file_size(file_path):
    """Validar tamanho do arquivo"""
    if not os.path.exists(file_path):
        return False
    return os.path.getsize(file_path) <= MAX_FILE_SIZE

def get_breadcrumb(pasta_id, db):
    """🍞 Gerar breadcrumb de navegação"""
    breadcrumb = []
    current_pasta_id = pasta_id
    
    while current_pasta_id:
        pasta = db.query(Pasta).filter(Pasta.id == current_pasta_id).first()
        if not pasta:
            break
            
        breadcrumb.insert(0, {
            'id': pasta.id,
            'nome': pasta.nome,
            'url': f'/api/pastas/{pasta.id}/conteudo'
        })
        
        current_pasta_id = pasta.pasta_pai_id
    
    # Adicionar raiz no início
    breadcrumb.insert(0, {'id': None, 'nome': 'Raiz', 'url': '/api/pastas/raiz'})
    
    return breadcrumb

# ===============================================
# ROTAS DE PASTAS
# ===============================================

@arquivos_bp.route('/api/pastas', methods=['GET'])
def listar_pastas():
    """📁 Listar todas as pastas"""
    db = SessionLocal()
    try:
        pasta_pai_id = request.args.get('pasta_pai_id', type=int)
        projeto_id = request.args.get('projeto_id', type=int)
        
        query = db.query(Pasta)
        
        if pasta_pai_id:
            query = query.filter(Pasta.pasta_pai_id == pasta_pai_id)
        elif 'pasta_pai_id' not in request.args:
            # Se não especificado, mostrar apenas pastas raiz
            query = query.filter(Pasta.pasta_pai_id.is_(None))
        
        if projeto_id:
            query = query.filter(Pasta.projeto_id == projeto_id)
        
        pastas = query.order_by(Pasta.nome).all()
        
        return jsonify({
            'success': True,
            'data': [pasta.to_dict() for pasta in pastas],
            'total': len(pastas)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas', methods=['POST'])
def criar_pasta():
    """📁 Criar nova pasta"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        if not data.get('nome'):
            return jsonify({'success': False, 'error': 'Nome da pasta é obrigatório'}), 400
        
        # Verificar se já existe pasta com mesmo nome no mesmo local
        query = db.query(Pasta).filter(Pasta.nome == data['nome'])
        
        if data.get('pasta_pai_id'):
            query = query.filter(Pasta.pasta_pai_id == data['pasta_pai_id'])
        else:
            query = query.filter(Pasta.pasta_pai_id.is_(None))
        
        if query.first():
            return jsonify({'success': False, 'error': 'Já existe uma pasta com este nome'}), 400
        
        nova_pasta = Pasta(
            nome=data['nome'],
            descricao=data.get('descricao', ''),
            cor=data.get('cor', 'blue'),
            icone=data.get('icone', 'folder'),
            pasta_pai_id=data.get('pasta_pai_id'),
            projeto_id=data.get('projeto_id'),
            criado_por=data.get('criado_por', 'sistema')
        )
        
        db.add(nova_pasta)
        db.commit()
        db.refresh(nova_pasta)
        
        return jsonify({
            'success': True,
            'message': 'Pasta criada com sucesso',
            'data': nova_pasta.to_dict()
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas/<int:pasta_id>', methods=['PUT'])
def atualizar_pasta(pasta_id):
    """✏️ Atualizar pasta (renomear, mover, etc.)"""
    db = SessionLocal()
    try:
        pasta = db.query(Pasta).filter(Pasta.id == pasta_id).first()
        if not pasta:
            return jsonify({'success': False, 'error': 'Pasta não encontrada'}), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'nome' in data:
            pasta.nome = data['nome']
        if 'descricao' in data:
            pasta.descricao = data['descricao']
        if 'cor' in data:
            pasta.cor = data['cor']
        if 'icone' in data:
            pasta.icone = data['icone']
        if 'pasta_pai_id' in data:
            pasta.pasta_pai_id = data['pasta_pai_id']
        
        pasta.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(pasta)
        
        return jsonify({
            'success': True,
            'message': 'Pasta atualizada com sucesso',
            'data': pasta.to_dict()
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas/<int:pasta_id>', methods=['DELETE'])
def deletar_pasta(pasta_id):
    """🗑️ Deletar pasta (move arquivos para pasta pai ou raiz)"""
    db = SessionLocal()
    try:
        pasta = db.query(Pasta).filter(Pasta.id == pasta_id).first()
        if not pasta:
            return jsonify({'success': False, 'error': 'Pasta não encontrada'}), 404
        
        # Verificar se tem subpastas
        subpastas = db.query(Pasta).filter(Pasta.pasta_pai_id == pasta_id).count()
        if subpastas > 0:
            return jsonify({
                'success': False, 
                'error': 'Não é possível deletar pasta que contém subpastas'
            }), 400
        
        # Mover arquivos para pasta pai ou raiz
        arquivos = db.query(Arquivo).filter(Arquivo.pasta_id == pasta_id).all()
        for arquivo in arquivos:
            arquivo.pasta_id = pasta.pasta_pai_id  # None se for pasta raiz
        
        db.delete(pasta)
        db.commit()
        
        return jsonify({
            'success': True,
            'message': f'Pasta deletada. {len(arquivos)} arquivo(s) movido(s)'
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas/<int:pasta_id>/conteudo', methods=['GET'])
def conteudo_pasta(pasta_id):
    """📂 Listar conteúdo completo de uma pasta (subpastas + arquivos)"""
    db = SessionLocal()
    try:
        pasta = db.query(Pasta).filter(Pasta.id == pasta_id).first()
        if not pasta:
            return jsonify({'success': False, 'error': 'Pasta não encontrada'}), 404
        
        # Subpastas
        subpastas = db.query(Pasta).filter(Pasta.pasta_pai_id == pasta_id).order_by(Pasta.nome).all()
        
        # Arquivos
        arquivos = db.query(Arquivo).filter(Arquivo.pasta_id == pasta_id).order_by(Arquivo.nome_original).all()
        
        return jsonify({
            'success': True,
            'data': {
                'pasta': pasta.to_dict(),
                'subpastas': [p.to_dict() for p in subpastas],
                'arquivos': [a.to_dict() for a in arquivos],
                'breadcrumb': get_breadcrumb(pasta_id, db)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas/raiz', methods=['GET'])
def conteudo_raiz():
    """🏠 Listar conteúdo da pasta raiz"""
    db = SessionLocal()
    try:
        # Pastas raiz
        pastas_raiz = db.query(Pasta).filter(Pasta.pasta_pai_id.is_(None)).order_by(Pasta.nome).all()
        
        # Arquivos na raiz
        arquivos_raiz = db.query(Arquivo).filter(Arquivo.pasta_id.is_(None)).order_by(Arquivo.nome_original).all()
        
        return jsonify({
            'success': True,
            'data': {
                'pastas': [p.to_dict() for p in pastas_raiz],
                'arquivos': [a.to_dict() for a in arquivos_raiz],
                'breadcrumb': [{'id': None, 'nome': 'Raiz', 'url': '/api/pastas/raiz'}]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/pastas/arvore', methods=['GET'])
def arvore_pastas():
    """🌳 Estrutura completa em árvore"""
    db = SessionLocal()
    try:
        def build_tree(pasta_pai_id=None):
            pastas = db.query(Pasta).filter(Pasta.pasta_pai_id == pasta_pai_id).order_by(Pasta.nome).all()
            tree = []
            
            for pasta in pastas:
                pasta_dict = pasta.to_dict()
                pasta_dict['children'] = build_tree(pasta.id)
                tree.append(pasta_dict)
            
            return tree
        
        arvore = build_tree()
        
        return jsonify({
            'success': True,
            'data': arvore
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

# ================================
# ROTAS PRINCIPAIS DE ARQUIVOS
# ================================

@arquivos_bp.route('/api/arquivos', methods=['GET'])
def listar_arquivos():
    """📋 Listar arquivos com filtros avançados, paginação e suporte a pastas"""
    db = SessionLocal()
    try:
        logger.info("🔄 Listando arquivos com filtros...")
        
        # Parâmetros de filtro e paginação
        projeto_id = request.args.get('projeto_id', type=int)
        pasta_id = request.args.get('pasta_id', type=int)
        tipo_documento = request.args.get('tipo_documento')
        search = request.args.get('search', '').strip()
        date_filter = request.args.get('date_filter')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Query base com joins
        query = db.query(Arquivo).outerjoin(Projeto, Arquivo.projeto_id == Projeto.id)\
                                  .outerjoin(Pasta, Arquivo.pasta_id == Pasta.id)
        
        # Aplicar filtros
        if projeto_id:
            query = query.filter(Arquivo.projeto_id == projeto_id)
            logger.info(f"🔍 Filtro por projeto: {projeto_id}")
        
        # Filtrar por pasta
        if pasta_id:
            query = query.filter(Arquivo.pasta_id == pasta_id)
        elif 'pasta_id' not in request.args:
            # Se não especificado, mostrar arquivos sem pasta (raiz)
            query = query.filter(Arquivo.pasta_id.is_(None))
        
        if tipo_documento:
            query = query.filter(Arquivo.tipo_documento == tipo_documento)
            logger.info(f"🔍 Filtro por tipo: {tipo_documento}")
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Arquivo.nome_original.ilike(search_term),
                    Arquivo.descricao.ilike(search_term)
                )
            )
            logger.info(f"🔍 Busca por: {search}")
        
        # Filtro por data
        if date_filter:
            now = datetime.now()
            if date_filter == 'today':
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(Arquivo.created_at >= start_date)
            elif date_filter == 'week':
                start_date = now - timedelta(days=7)
                query = query.filter(Arquivo.created_at >= start_date)
            elif date_filter == 'month':
                start_date = now - timedelta(days=30)
                query = query.filter(Arquivo.created_at >= start_date)
            elif date_filter == 'year':
                start_date = now - timedelta(days=365)
                query = query.filter(Arquivo.created_at >= start_date)
        
        # Contar total antes da paginação
        total = query.count()
        
        # Ordenação
        if hasattr(Arquivo, sort_by):
            order_column = getattr(Arquivo, sort_by)
            if sort_order == 'desc':
                query = query.order_by(desc(order_column))
            else:
                query = query.order_by(order_column)
        else:
            query = query.order_by(desc(Arquivo.created_at))
        
        # Aplicar paginação
        arquivos = query.offset(offset).limit(limit).all()
        
        logger.info(f"📄 Encontrados {len(arquivos)} de {total} arquivo(s)")
        
        # Converter para dict com informações extras
        arquivos_data = []
        for arquivo in arquivos:
            try:
                arquivo_dict = arquivo.to_dict()
                
                # Adicionar informações do projeto se existir
                if arquivo.projeto:
                    arquivo_dict['projeto_nome'] = arquivo.projeto.nome
                    arquivo_dict['projeto_status'] = getattr(arquivo.projeto, 'status', None)
                
                # Adicionar informações da pasta se existir
                if arquivo.pasta:
                    arquivo_dict['pasta_nome'] = arquivo.pasta.nome
                    arquivo_dict['pasta_cor'] = arquivo.pasta.cor
                
                # URLs para download e preview
                arquivo_dict['download_url'] = f'/api/arquivos/{arquivo.id}/download'
                arquivo_dict['preview_url'] = f'/api/arquivos/{arquivo.id}/preview'
                
                # Verificar se arquivo físico existe
                if hasattr(arquivo, 'caminho') and arquivo.caminho:
                    arquivo_dict['file_exists'] = os.path.exists(arquivo.caminho)
                else:
                    arquivo_dict['file_exists'] = True  # Para arquivos em banco/S3
                
                arquivos_data.append(arquivo_dict)
                
            except Exception as e:
                logger.warning(f"⚠️ Erro ao processar arquivo {arquivo.id}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'data': arquivos_data,
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': offset + len(arquivos_data) < total,
            'message': f'{len(arquivos_data)} arquivo(s) carregado(s)',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao listar arquivos: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'data': [],
            'total': 0,
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/upload', methods=['POST'])
def upload_arquivo():
    """📤 Upload de arquivo para banco/local com suporte a pastas"""
    db = SessionLocal()
    file_path_abs = None
    
    try:
        logger.info("📤 Iniciando upload de arquivo...")
        
        # Verificações básicas
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['file']
        
        if not file.filename:
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo selecionado'
            }), 400
        
        logger.info(f"📁 Arquivo recebido: {file.filename}")
        
        # Validações de segurança
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'Tipo de arquivo não permitido. Permitidos: {", ".join(sorted(ALLOWED_EXTENSIONS))}'
            }), 400
        
        # Verificar tamanho do arquivo
        file.seek(0, 2)  # Ir para o final
        file_size = file.tell()
        file.seek(0)  # Voltar ao início
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Dados do formulário
        projeto_id = request.form.get('projeto_id') or request.form.get('projectId')
        pasta_id = request.form.get('pasta_id', type=int)
        tipo_documento = (request.form.get('tipo_documento') or 
                         request.form.get('fileType') or 
                         get_file_category(file.filename))
        descricao = (request.form.get('descricao') or 
                    request.form.get('description') or 
                    f'Upload via interface - {file.filename}')
        is_public = request.form.get('is_public', 'false').lower() == 'true'
        
        logger.info(f"📋 Dados: projeto_id={projeto_id}, pasta_id={pasta_id}, tipo={tipo_documento}")
        
        # Validar projeto se informado
        if projeto_id:
            try:
                projeto_id = int(projeto_id)
                projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
                if not projeto:
                    return jsonify({
                        'success': False,
                        'error': 'Projeto não encontrado'
                    }), 404
                logger.info(f"✅ Projeto encontrado: {projeto.nome}")
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'ID do projeto inválido'
                }), 400
        
        # Validar pasta se informada
        if pasta_id:
            pasta = db.query(Pasta).filter(Pasta.id == pasta_id).first()
            if not pasta:
                return jsonify({'success': False, 'error': 'Pasta não encontrada'}), 404
        
        # Gerar nome único e seguro
        nome_original = secure_filename(file.filename)
        nome_arquivo = generate_unique_filename(file.filename)
        mime_type = mimetypes.guess_type(nome_original)[0] or file.content_type or 'application/octet-stream'
        
        # Ler conteúdo do arquivo
        file_content = file.read()
        
        # Decidir onde armazenar baseado no tamanho
        storage_type = 'database'
        arquivo_blob = None
        caminho_arquivo = None
        
        if file_size <= MAX_DB_FILE_SIZE:
            # Arquivo pequeno - salvar no banco
            arquivo_blob = file_content
            storage_type = 'database'
            logger.info(f"💾 Salvando no banco (arquivo pequeno): {file_size} bytes")
        else:
            # Arquivo grande - salvar localmente
            file_path = os.path.join(UPLOAD_FOLDER, nome_arquivo)
            file_path_abs = os.path.abspath(file_path)
            
            with open(file_path_abs, 'wb') as f:
                f.write(file_content)
            
            # Validar arquivo salvo
            if not validate_file_size(file_path_abs):
                os.remove(file_path_abs)
                return jsonify({
                    'success': False,
                    'error': 'Erro na validação do arquivo salvo'
                }), 500
            
            caminho_arquivo = file_path_abs
            storage_type = 'local_file'
            logger.info(f"📁 Salvando localmente (arquivo grande): {file_path_abs}")
        
        # 🚨 TRANSAÇÃO ATÔMICA DO BANCO DE DADOS
        try:
            novo_arquivo = Arquivo(
                nome_original=nome_original,
                nome_arquivo=nome_arquivo,
                caminho=caminho_arquivo,
                tamanho=file_size,
                tipo_mime=mime_type,
                tipo_documento=tipo_documento,
                descricao=descricao,
                projeto_id=projeto_id,
                pasta_id=pasta_id,
                arquivo_blob=arquivo_blob,
                storage_type=storage_type,
                is_public=is_public,
                uploaded_by=request.form.get('uploaded_by', 'sistema'),
                created_at=datetime.utcnow()
            )
            
            db.add(novo_arquivo)
            db.commit()
            db.refresh(novo_arquivo)
            
            logger.info(f"✅ Arquivo salvo no banco: ID {novo_arquivo.id}")
            
            return jsonify({
                'success': True,
                'message': 'Arquivo enviado e salvo com sucesso',
                'data': novo_arquivo.to_dict(),
                'storage_info': {
                    'type': storage_type,
                    'size_mb': round(file_size / (1024 * 1024), 2),
                    'location': 'Banco de Dados' if storage_type == 'database' else 'Arquivo Local'
                },
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as db_error:
            db.rollback()
            logger.error(f"❌ Erro no banco de dados: {db_error}")
            
            # Remover arquivo físico se erro no banco
            if file_path_abs and os.path.exists(file_path_abs):
                try:
                    os.remove(file_path_abs)
                    logger.info("🗑️ Arquivo físico removido após erro no banco")
                except Exception as cleanup_error:
                    logger.error(f"❌ Erro ao limpar arquivo: {cleanup_error}")
            
            return jsonify({
                'success': False,
                'error': f'Erro ao salvar no banco de dados: {str(db_error)}',
                'timestamp': datetime.now().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"❌ Erro geral no upload: {e}")
        
        # Cleanup em caso de erro geral
        if file_path_abs and os.path.exists(file_path_abs):
            try:
                os.remove(file_path_abs)
                logger.info("🗑️ Arquivo físico removido após erro geral")
            except:
                pass
        
        return jsonify({
            'success': False,
            'error': f'Erro no upload: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/download', methods=['GET'])
def download_arquivo(arquivo_id):
    """⬇️ Download de arquivo - Versão universal (local/banco)"""
    db = SessionLocal()
    try:
        logger.info(f"⬇️ Download do arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            logger.error(f"❌ Arquivo {arquivo_id} não encontrado no banco")
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Download baseado no tipo de armazenamento
        if hasattr(arquivo, 'storage_type') and arquivo.storage_type == 'database' and arquivo.arquivo_blob:
            # Download direto do banco
            file_data = io.BytesIO(arquivo.arquivo_blob)
            
            return send_file(
                file_data,
                mimetype=arquivo.tipo_mime,
                as_attachment=True,
                download_name=arquivo.nome_original
            )
        
        elif hasattr(arquivo, 'caminho') and arquivo.caminho and os.path.exists(arquivo.caminho):
            # Download do arquivo físico
            logger.info(f"✅ Enviando arquivo: {arquivo.nome_original}")
            
            try:
                diretorio = os.path.dirname(arquivo.caminho)
                nome_arquivo = os.path.basename(arquivo.caminho)
                
                return send_from_directory(
                    directory=diretorio,
                    path=nome_arquivo,
                    as_attachment=True,
                    download_name=arquivo.nome_original,
                    mimetype=arquivo.tipo_mime or 'application/octet-stream'
                )
                
            except Exception as send_error:
                logger.error(f"❌ Erro no send_from_directory: {send_error}")
                
                # Fallback para send_file
                return send_file(
                    arquivo.caminho,
                    as_attachment=True,
                    download_name=arquivo.nome_original,
                    mimetype=arquivo.tipo_mime or 'application/octet-stream'
                )
        
        else:
            logger.error(f"❌ Arquivo não disponível: {getattr(arquivo, 'caminho', 'N/A')}")
            return jsonify({
                'success': False,
                'error': 'Arquivo não disponível'
            }), 404
        
    except Exception as e:
        logger.error(f"❌ Erro no download: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/preview', methods=['GET'])
def preview_arquivo(arquivo_id):
    """🖼️ Preview de arquivos (imagens, PDFs) - Versão universal"""
    db = SessionLocal()
    try:
        logger.info(f"🖼️ Preview do arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            return jsonify({
                'success': False, 
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Tipos que suportam preview
        preview_types = [
            'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 
            'image/bmp', 'image/tiff', 'application/pdf'
        ]
        
        if arquivo.tipo_mime not in preview_types:
            return jsonify({
                'success': False, 
                'error': 'Preview não disponível para este tipo de arquivo'
            }), 400
        
        logger.info(f"✅ Enviando preview: {arquivo.nome_original}")
        
        # Preview baseado no tipo de armazenamento
        if hasattr(arquivo, 'storage_type') and arquivo.storage_type == 'database' and arquivo.arquivo_blob:
            # Preview direto do banco
            return Response(
                arquivo.arquivo_blob,
                mimetype=arquivo.tipo_mime,
                headers={'Content-Disposition': f'inline; filename="{arquivo.nome_original}"'}
            )
        
        elif hasattr(arquivo, 'caminho') and arquivo.caminho and os.path.exists(arquivo.caminho):
            # Preview do arquivo físico
            return send_file(
                arquivo.caminho,
                mimetype=arquivo.tipo_mime,
                as_attachment=False  # 🚨 IMPORTANTE: False para preview
            )
        
        else:
            return jsonify({
                'success': False, 
                'error': 'Arquivo não disponível para preview'
            }), 404
        
    except Exception as e:
        logger.error(f"❌ Erro no preview: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/move', methods=['PUT'])
def mover_arquivo(arquivo_id):
    """📁 Mover arquivo para outra pasta"""
    db = SessionLocal()
    try:
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        if not arquivo:
            return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
        
        data = request.get_json()
        nova_pasta_id = data.get('pasta_id')
        
        # Validar nova pasta se informada
        if nova_pasta_id:
            pasta = db.query(Pasta).filter(Pasta.id == nova_pasta_id).first()
            if not pasta:
                return jsonify({'success': False, 'error': 'Pasta destino não encontrada'}), 404
        
        pasta_antiga = arquivo.pasta.nome if arquivo.pasta else 'Raiz'
        pasta_nova = pasta.nome if nova_pasta_id and pasta else 'Raiz'
        
        arquivo.pasta_id = nova_pasta_id
        arquivo.updated_at = datetime.utcnow()
        
        db.commit()
        
        return jsonify({
            'success': True,
            'message': f'Arquivo movido de "{pasta_antiga}" para "{pasta_nova}"',
            'data': arquivo.to_dict()
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/rename', methods=['PUT'])
def renomear_arquivo(arquivo_id):
    """✏️ Renomear arquivo"""
    db = SessionLocal()
    try:
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        if not arquivo:
            return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
        
        data = request.get_json()
        novo_nome = data.get('nome')
        
        if not novo_nome:
            return jsonify({'success': False, 'error': 'Novo nome é obrigatório'}), 400
        
        nome_antigo = arquivo.nome_original
        arquivo.nome_original = secure_filename(novo_nome)
        arquivo.updated_at = datetime.utcnow()
        
        db.commit()
        
        return jsonify({
            'success': True,
            'message': f'Arquivo renomeado de "{nome_antigo}" para "{novo_nome}"',
            'data': arquivo.to_dict()
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['GET'])
def obter_arquivo(arquivo_id):
    """📄 Obter detalhes de um arquivo específico"""
    db = SessionLocal()
    try:
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        arquivo_dict = arquivo.to_dict()
        
        # Adicionar informações extras
        if arquivo.projeto:
            arquivo_dict['projeto_nome'] = arquivo.projeto.nome
        
        if arquivo.pasta:
            arquivo_dict['pasta_nome'] = arquivo.pasta.nome
            arquivo_dict['pasta_cor'] = arquivo.pasta.cor
        
        # Verificar se arquivo existe baseado no tipo de storage
        if hasattr(arquivo, 'storage_type'):
            if arquivo.storage_type == 'database':
                arquivo_dict['file_exists'] = arquivo.arquivo_blob is not None
            else:
                arquivo_dict['file_exists'] = os.path.exists(arquivo.caminho) if arquivo.caminho else False
        else:
            arquivo_dict['file_exists'] = os.path.exists(arquivo.caminho) if hasattr(arquivo, 'caminho') and arquivo.caminho else True
        
        arquivo_dict['download_url'] = f'/api/arquivos/{arquivo.id}/download'
        arquivo_dict['preview_url'] = f'/api/arquivos/{arquivo.id}/preview'
        
        return jsonify({
            'success': True,
            'data': arquivo_dict,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter arquivo: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['PUT'])
def atualizar_arquivo(arquivo_id):
    """✏️ Atualizar informações do arquivo (descrição, projeto, pasta, etc.)"""
    db = SessionLocal()
    try:
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        data = request.get_json()
        
        # Campos que podem ser atualizados
        if 'descricao' in data:
            arquivo.descricao = data['descricao']
        
        if 'tipo_documento' in data:
            arquivo.tipo_documento = data['tipo_documento']
        
        if 'projeto_id' in data:
            projeto_id = data['projeto_id']
            if projeto_id:
                projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
                if not projeto:
                    return jsonify({
                        'success': False,
                        'error': 'Projeto não encontrado'
                    }), 404
            arquivo.projeto_id = projeto_id
        
        if 'pasta_id' in data:
            pasta_id = data['pasta_id']
            if pasta_id:
                pasta = db.query(Pasta).filter(Pasta.id == pasta_id).first()
                if not pasta:
                    return jsonify({
                        'success': False,
                        'error': 'Pasta não encontrada'
                    }), 404
            arquivo.pasta_id = pasta_id
        
        if 'is_public' in data:
            arquivo.is_public = data['is_public']
        
        arquivo.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(arquivo)
        
        logger.info(f"✅ Arquivo atualizado: {arquivo.nome_original}")
        
        return jsonify({
            'success': True,
            'message': 'Arquivo atualizado com sucesso',
            'data': arquivo.to_dict()
        })
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao atualizar arquivo: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['DELETE'])
def deletar_arquivo(arquivo_id):
    """🗑️ Deletar arquivo do banco e sistema de arquivos"""
    db = SessionLocal()
    try:
        logger.info(f"🗑️ Deletando arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        nome_original = arquivo.nome_original
        
        # Deletar arquivo físico se existir
        if hasattr(arquivo, 'caminho') and arquivo.caminho:
            try:
                if os.path.exists(arquivo.caminho):
                    os.remove(arquivo.caminho)
                    logger.info(f"✅ Arquivo físico deletado: {arquivo.caminho}")
                else:
                    logger.warning(f"⚠️ Arquivo físico já não existia: {arquivo.caminho}")
            except Exception as e:
                logger.error(f"❌ Erro ao deletar arquivo físico: {e}")
                # Continuar mesmo com erro no arquivo físico
        
        # Deletar registro do banco
        db.delete(arquivo)
        db.commit()
        
        logger.info(f"✅ Registro deletado do banco: {nome_original}")
        
        return jsonify({
            'success': True,
            'message': f'Arquivo "{nome_original}" deletado com sucesso',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ao deletar arquivo: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

# ===============================================
# ROTAS DE BUSCA AVANÇADA
# ===============================================

@arquivos_bp.route('/api/busca', methods=['POST'])
def busca_global():
    """🔍 Busca global em pastas e arquivos"""
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        termo = data.get('termo', '').strip()
        
        if not termo:
            return jsonify({'success': False, 'error': 'Termo de busca é obrigatório'}), 400
        
        # Buscar pastas
        pastas = db.query(Pasta).filter(
            or_(
                Pasta.nome.ilike(f'%{termo}%'),
                Pasta.descricao.ilike(f'%{termo}%')
            )
        ).limit(20).all()
        
        # Buscar arquivos
        arquivos = db.query(Arquivo).filter(
            or_(
                Arquivo.nome_original.ilike(f'%{termo}%'),
                Arquivo.descricao.ilike(f'%{termo}%')
            )
        ).limit(50).all()
        
        return jsonify({
            'success': True,
            'data': {
                'termo': termo,
                'pastas': [p.to_dict() for p in pastas],
                'arquivos': [a.to_dict() for a in arquivos],
                'total_pastas': len(pastas),
                'total_arquivos': len(arquivos)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/search', methods=['POST'])
def busca_avancada():
    """🔍 Busca avançada com múltiplos filtros"""
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        
        query = db.query(Arquivo).outerjoin(Projeto, Arquivo.projeto_id == Projeto.id)\
                                  .outerjoin(Pasta, Arquivo.pasta_id == Pasta.id)
        
        # Aplicar filtros
        if data.get('nome'):
            query = query.filter(Arquivo.nome_original.ilike(f"%{data['nome']}%"))
        
        if data.get('tipo_documento'):
            query = query.filter(Arquivo.tipo_documento == data['tipo_documento'])
        
        if data.get('projeto_id'):
            query = query.filter(Arquivo.projeto_id == data['projeto_id'])
        
        if data.get('pasta_id'):
            query = query.filter(Arquivo.pasta_id == data['pasta_id'])
        
        if data.get('tamanho_min'):
            query = query.filter(Arquivo.tamanho >= data['tamanho_min'])
        
        if data.get('tamanho_max'):
            query = query.filter(Arquivo.tamanho <= data['tamanho_max'])
        
        if data.get('data_inicio'):
            try:
                data_inicio = datetime.fromisoformat(data['data_inicio'].replace('Z', '+00:00'))
                query = query.filter(Arquivo.created_at >= data_inicio)
            except ValueError:
                pass
        
        if data.get('data_fim'):
            try:
                data_fim = datetime.fromisoformat(data['data_fim'].replace('Z', '+00:00'))
                query = query.filter(Arquivo.created_at <= data_fim)
            except ValueError:
                pass
        
        # Ordenação
        order_by = data.get('order_by', 'created_at')
        order_dir = data.get('order_dir', 'desc')
        
        if hasattr(Arquivo, order_by):
            if order_dir == 'asc':
                query = query.order_by(getattr(Arquivo, order_by).asc())
            else:
                query = query.order_by(getattr(Arquivo, order_by).desc())
        else:
            query = query.order_by(desc(Arquivo.created_at))
        
        # Paginação
        limit = data.get('limit', 50)
        offset = data.get('offset', 0)
        
        total = query.count()
        arquivos = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [arquivo.to_dict() for arquivo in arquivos],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        logger.error(f"❌ Erro na busca avançada: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

# ===============================================
# ROTAS DE ESTATÍSTICAS E RELATÓRIOS
# ===============================================

@arquivos_bp.route('/api/dashboard/storage', methods=['GET'])
def dashboard_storage():
    """📊 Dashboard de armazenamento"""
    db = SessionLocal()
    try:
        # Estatísticas gerais
        total_arquivos = db.query(Arquivo).count()
        total_pastas = db.query(Pasta).count()
        
        # Por tipo de armazenamento
        arquivos_db = 0
        arquivos_local = 0
        tamanho_db = 0
        tamanho_local = 0
        
        arquivos = db.query(Arquivo).all()
        for arquivo in arquivos:
            if hasattr(arquivo, 'storage_type') and arquivo.storage_type == 'database':
                arquivos_db += 1
                tamanho_db += arquivo.tamanho
            else:
                arquivos_local += 1
                tamanho_local += arquivo.tamanho
        
        # Tamanhos
        tamanho_total = db.query(func.sum(Arquivo.tamanho)).scalar() or 0
        
        # Por tipo de documento
        por_tipo = db.query(
            Arquivo.tipo_documento,
            func.count(Arquivo.id).label('quantidade'),
            func.sum(Arquivo.tamanho).label('tamanho')
        ).group_by(Arquivo.tipo_documento).all()
        
        # Maiores pastas
        maiores_pastas = db.query(
            Pasta.nome,
            func.count(Arquivo.id).label('total_arquivos'),
            func.sum(Arquivo.tamanho).label('tamanho_total')
        ).outerjoin(Arquivo).group_by(Pasta.id, Pasta.nome).order_by(func.sum(Arquivo.tamanho).desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'data': {
                'resumo': {
                    'total_arquivos': total_arquivos,
                    'total_pastas': total_pastas,
                    'tamanho_total_mb': round(tamanho_total / (1024 * 1024), 2),
                    'tamanho_total_gb': round(tamanho_total / (1024 * 1024 * 1024), 2)
                },
                'por_storage': {
                    'database': {
                        'arquivos': arquivos_db,
                        'tamanho_mb': round(tamanho_db / (1024 * 1024), 2)
                    },
                    'local': {
                        'arquivos': arquivos_local,
                        'tamanho_mb': round(tamanho_local / (1024 * 1024), 2)
                    }
                },
                'por_tipo': [
                    {
                        'tipo': item.tipo_documento,
                        'quantidade': item.quantidade,
                        'tamanho_mb': round((item.tamanho or 0) / (1024 * 1024), 2)
                    }
                    for item in por_tipo
                ],
                'maiores_pastas': [
                    {
                        'nome': item.nome or 'Raiz',
                        'total_arquivos': item.total_arquivos,
                        'tamanho_mb': round((item.tamanho_total or 0) / (1024 * 1024), 2)
                    }
                    for item in maiores_pastas
                ]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/stats', methods=['GET'])
def estatisticas_arquivos():
    """📊 Estatísticas detalhadas dos arquivos"""
    db = SessionLocal()
    try:
        logger.info("📊 Calculando estatísticas de arquivos...")
        
        # Estatísticas básicas
        total_arquivos = db.query(Arquivo).count()
        tamanho_total = db.query(func.sum(Arquivo.tamanho)).scalar() or 0
        
        # Por tipo de documento
        por_tipo = db.query(
            Arquivo.tipo_documento,
            func.count(Arquivo.id).label('quantidade'),
            func.sum(Arquivo.tamanho).label('tamanho_total')
        ).group_by(Arquivo.tipo_documento).all()
        
        # Por projeto
        por_projeto = db.query(
            Projeto.nome,
            func.count(Arquivo.id).label('quantidade'),
            func.sum(Arquivo.tamanho).label('tamanho_total')
        ).outerjoin(Arquivo, Projeto.id == Arquivo.projeto_id).group_by(Projeto.nome).all()
        
        # Por pasta
        por_pasta = db.query(
            Pasta.nome,
            func.count(Arquivo.id).label('quantidade'),
            func.sum(Arquivo.tamanho).label('tamanho_total')
        ).outerjoin(Arquivo, Pasta.id == Arquivo.pasta_id).group_by(Pasta.nome).all()
        
        # Arquivos recentes (última semana)
        uma_semana_atras = datetime.utcnow() - timedelta(days=7)
        arquivos_recentes = db.query(Arquivo).filter(Arquivo.created_at >= uma_semana_atras).count()
        
        # Verificar arquivos órfãos
        arquivos = db.query(Arquivo).all()
        orfaos = 0
        for arquivo in arquivos:
            if hasattr(arquivo, 'caminho') and arquivo.caminho:
                if not os.path.exists(arquivo.caminho):
                    orfaos += 1
        
        logger.info(f"📊 Stats: {total_arquivos} arquivos, {tamanho_total} bytes, {orfaos} órfãos")
        
        return jsonify({
            'success': True,
            'data': {
                'total_arquivos': total_arquivos,
                'tamanho_total_bytes': int(tamanho_total),
                'tamanho_total_mb': round(tamanho_total / (1024 * 1024), 2),
                'arquivos_recentes': arquivos_recentes,
                'arquivos_orfaos': orfaos,
                'por_tipo': [
                    {
                        'tipo': item.tipo_documento or 'Sem tipo',
                        'quantidade': item.quantidade,
                        'tamanho_total': int(item.tamanho_total or 0),
                        'tamanho_mb': round((item.tamanho_total or 0) / (1024 * 1024), 2)
                    }
                    for item in por_tipo
                ],
                'por_projeto': [
                    {
                        'projeto': item.nome or 'Sem projeto',
                        'quantidade': item.quantidade,
                        'tamanho_total': int(item.tamanho_total or 0),
                        'tamanho_mb': round((item.tamanho_total or 0) / (1024 * 1024), 2)
                    }
                    for item in por_projeto
                ],
                'por_pasta': [
                    {
                        'pasta': item.nome or 'Raiz',
                        'quantidade': item.quantidade,
                        'tamanho_total': int(item.tamanho_total or 0),
                        'tamanho_mb': round((item.tamanho_total or 0) / (1024 * 1024), 2)
                    }
                    for item in por_pasta
                ]
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao calcular estatísticas: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/tipos', methods=['GET'])
def listar_tipos_documento():
    """📋 Listar tipos de documento disponíveis"""
    db = SessionLocal()
    try:
        # Tipos baseados nos arquivos existentes
        tipos_existentes = db.query(Arquivo.tipo_documento).distinct().all()
        tipos_existentes = [t[0] for t in tipos_existentes if t[0]]
        
        # Tipos padrão HVAC
        tipos_padrao = list(set(CATEGORIAS_HVAC.values()))
        
        # Combinar e remover duplicatas
        todos_tipos = list(set(tipos_padrao + tipos_existentes))
        todos_tipos.sort()
        
        return jsonify({
            'success': True,
            'data': todos_tipos,
            'total': len(todos_tipos)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

# ================================
# ROTAS ADMINISTRATIVAS
# ================================

@arquivos_bp.route('/api/arquivos/cleanup', methods=['POST'])
def cleanup_arquivos():
    """🧹 Limpeza de arquivos órfãos (apenas registros sem arquivo físico)"""
    db = SessionLocal()
    try:
        logger.info("🧹 Iniciando limpeza de registros órfãos...")
        
        arquivos = db.query(Arquivo).all()
        removidos = 0
        
        for arquivo in arquivos:
            # Verificar apenas arquivos que deveriam ter arquivo físico
            if hasattr(arquivo, 'caminho') and arquivo.caminho:
                if not os.path.exists(arquivo.caminho):
                    logger.info(f"🗑️ Removendo registro órfão: {arquivo.nome_original} (ID: {arquivo.id})")
                    db.delete(arquivo)
                    removidos += 1
        
        if removidos > 0:
            db.commit()
            logger.info(f"✅ {removidos} registro(s) órfão(s) removido(s)")
        
        return jsonify({
            'success': True,
            'message': f'{removidos} registro(s) órfão(s) removido(s)',
            'removidos': removidos,
            'total_verificados': len(arquivos)
        })
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro na limpeza: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/health', methods=['GET'])
def health_check():
    """❤️ Verificação de saúde do sistema de arquivos"""
    db = SessionLocal()
    try:
        # Verificar conexão com banco
        total_arquivos = db.query(Arquivo).count()
        total_pastas = db.query(Pasta).count()
        
        # Verificar pasta de uploads
        uploads_exists = os.path.exists(UPLOAD_FOLDER)
        uploads_writable = os.access(UPLOAD_FOLDER, os.W_OK) if uploads_exists else False
        
        # Verificar espaço em disco
        import shutil
        if uploads_exists:
            total, used, free = shutil.disk_usage(UPLOAD_FOLDER)
            disk_usage = {
                'total_gb': round(total / (1024**3), 2),
                'used_gb': round(used / (1024**3), 2),
                'free_gb': round(free / (1024**3), 2),
                'usage_percent': round((used / total) * 100, 2)
            }
        else:
            disk_usage = None
        
        # Verificar arquivos órfãos
        arquivos = db.query(Arquivo).limit(100).all()  # Limitar para performance
        orfaos = 0
        for arquivo in arquivos:
            if hasattr(arquivo, 'caminho') and arquivo.caminho:
                if not os.path.exists(arquivo.caminho):
                    orfaos += 1
        
        status = 'healthy' if uploads_exists and uploads_writable and orfaos == 0 else 'warning'
        
        return jsonify({
            'success': True,
            'status': status,
            'data': {
                'total_arquivos': total_arquivos,
                'total_pastas': total_pastas,
                'pasta_uploads': {
                    'existe': uploads_exists,
                    'gravavel': uploads_writable,
                    'caminho': os.path.abspath(UPLOAD_FOLDER)
                },
                'disk_usage': disk_usage,
                'registros_orfaos': orfaos,
                'configuracoes': {
                    'max_file_size_mb': MAX_FILE_SIZE // (1024 * 1024),
                    'max_db_file_size_mb': MAX_DB_FILE_SIZE // (1024 * 1024),
                    'tipos_permitidos': sorted(ALLOWED_EXTENSIONS),
                    'categorias_hvac': sorted(set(CATEGORIAS_HVAC.values()))
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro no health check: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

# ================================
# TRATAMENTO DE ERROS
# ================================

@arquivos_bp.errorhandler(413)
def arquivo_muito_grande(error):
    """Tratamento para arquivo muito grande"""
    return jsonify({
        'success': False,
        'error': f'Arquivo muito grande. Tamanho máximo permitido: {MAX_FILE_SIZE // (1024*1024)}MB',
        'code': 'FILE_TOO_LARGE'
    }), 413

@arquivos_bp.errorhandler(404)
def arquivo_nao_encontrado(error):
    """Tratamento para arquivo não encontrado"""
    return jsonify({
        'success': False,
        'error': 'Arquivo não encontrado',
        'code': 'FILE_NOT_FOUND'
    }), 404

@arquivos_bp.errorhandler(500)
def erro_interno(error):
    """Tratamento para erro interno"""
    logger.error(f"Erro interno: {error}")
    return jsonify({
        'success': False,
        'error': 'Erro interno do servidor',
        'code': 'INTERNAL_ERROR'
    }), 500

# ================================
# INICIALIZAÇÃO E LOGS
# ================================

logger.info("📁 Sistema de arquivos HVAC com pastas inicializado")
logger.info(f"📂 Pasta de uploads: {os.path.abspath(UPLOAD_FOLDER)}")
logger.info(f"📏 Tamanho máximo: {MAX_FILE_SIZE // (1024*1024)}MB")
logger.info(f"📊 Tamanho máximo para banco: {MAX_DB_FILE_SIZE // (1024*1024)}MB")
logger.info(f"📋 Tipos permitidos: {len(ALLOWED_EXTENSIONS)} extensões")
logger.info(f"🏷️ Categorias HVAC: {len(set(CATEGORIAS_HVAC.values()))} categorias")
logger.info("🗂️ Sistema de pastas: ATIVO")
logger.info("🔍 Busca global: ATIVO")
logger.info("📊 Dashboard integrado: ATIVO")