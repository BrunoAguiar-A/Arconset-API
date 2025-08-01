# 🔧 routes/arquivos.py - VERSÃO FINAL CORRIGIDA E COMPLETA
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from database import SessionLocal, Arquivo, Projeto
from sqlalchemy import func  # ✅ IMPORT CRÍTICO CORRIGIDO
from datetime import datetime
import os
import mimetypes
from pathlib import Path

arquivos_bp = Blueprint('arquivos', __name__)

# Configurações
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'
}

# Criar pasta de uploads se não existir
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Verificar se o arquivo é permitido"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    """Determinar tipo do documento baseado na extensão"""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    type_mapping = {
        'pdf': 'PDF',
        'doc': 'Documento', 'docx': 'Documento',
        'xls': 'Planilha', 'xlsx': 'Planilha',
        'ppt': 'Apresentação', 'pptx': 'Apresentação',
        'txt': 'Texto',
        'jpg': 'Imagem', 'jpeg': 'Imagem', 'png': 'Imagem', 'gif': 'Imagem',
        'zip': 'Arquivo', 'rar': 'Arquivo'
    }
    
    return type_mapping.get(ext, 'Geral')

@arquivos_bp.route('/api/arquivos', methods=['GET'])
def listar_arquivos():
    """Listar todos os arquivos - VERSÃO CORRIGIDA"""
    db = SessionLocal()
    try:
        print("🔄 Listando arquivos...")
        
        # Parâmetros de filtro
        projeto_id = request.args.get('projeto_id', type=int)
        tipo_documento = request.args.get('tipo_documento')
        limit = request.args.get('limit', 50, type=int)
        
        # Query base
        query = db.query(Arquivo)
        
        # Aplicar filtros
        if projeto_id:
            query = query.filter(Arquivo.projeto_id == projeto_id)
            print(f"🔍 Filtro por projeto: {projeto_id}")
        
        if tipo_documento:
            query = query.filter(Arquivo.tipo_documento == tipo_documento)
            print(f"🔍 Filtro por tipo: {tipo_documento}")
        
        # Ordenar e limitar
        arquivos = query.order_by(Arquivo.created_at.desc()).limit(limit).all()
        print(f"📄 Encontrados {len(arquivos)} arquivo(s)")
        
        # Converter para dict
        arquivos_data = []
        for arquivo in arquivos:
            try:
                arquivo_dict = arquivo.to_dict()
                arquivos_data.append(arquivo_dict)
                print(f"✅ Processado: {arquivo.nome_original}")
            except Exception as e:
                print(f"⚠️  Erro ao converter arquivo {arquivo.id}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'data': arquivos_data,
            'total': len(arquivos_data),
            'message': f'{len(arquivos_data)} arquivo(s) encontrado(s)',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Erro ao listar arquivos: {e}")
        import traceback
        traceback.print_exc()
        
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
    """Upload de arquivo - VERSÃO COMPLETA"""
    db = SessionLocal()
    try:
        print("📤 Iniciando upload de arquivo...")
        
        # Verificar se há arquivo na requisição
        if 'file' not in request.files:
            print("❌ Nenhum arquivo na requisição")
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo enviado'
            }), 400
        
        file = request.files['file']
        
        # Verificar se arquivo foi selecionado
        if file.filename == '':
            print("❌ Arquivo sem nome")
            return jsonify({
                'success': False,
                'error': 'Nenhum arquivo selecionado'
            }), 400
        
        print(f"📁 Arquivo recebido: {file.filename}")
        
        # Verificar se arquivo é permitido
        if not allowed_file(file.filename):
            print(f"❌ Tipo não permitido: {file.filename}")
            return jsonify({
                'success': False,
                'error': f'Tipo de arquivo não permitido. Permitidos: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Dados adicionais do formulário
        projeto_id = request.form.get('projeto_id', type=int)
        tipo_documento = request.form.get('tipo_documento', get_file_type(file.filename))
        descricao = request.form.get('descricao', '')
        
        print(f"📋 Dados: projeto_id={projeto_id}, tipo={tipo_documento}")
        
        # Verificar se projeto existe (se informado)
        if projeto_id:
            projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
            if not projeto:
                print(f"❌ Projeto {projeto_id} não encontrado")
                return jsonify({
                    'success': False,
                    'error': 'Projeto não encontrado'
                }), 404
            print(f"✅ Projeto encontrado: {projeto.nome}")
        
        # Gerar nome único para o arquivo
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Incluir milissegundos
        nome_arquivo = f"{timestamp}_{filename}"
        
        # Caminho completo
        file_path = os.path.join(UPLOAD_FOLDER, nome_arquivo)
        
        print(f"💾 Salvando em: {file_path}")
        
        # Salvar arquivo
        file.save(file_path)
        
        # Obter informações do arquivo
        file_size = os.path.getsize(file_path)
        mime_type = mimetypes.guess_type(file_path)[0]
        
        print(f"📊 Tamanho: {file_size} bytes, MIME: {mime_type}")
        
        # Criar registro no banco
        novo_arquivo = Arquivo(
            nome_original=filename,
            nome_arquivo=nome_arquivo,
            caminho=file_path,
            tamanho=file_size,
            tipo_mime=mime_type,
            tipo_documento=tipo_documento,
            descricao=descricao,
            projeto_id=projeto_id
        )
        
        db.add(novo_arquivo)
        db.commit()
        db.refresh(novo_arquivo)
        
        print(f"✅ Arquivo salvo: {filename} -> {nome_arquivo} (ID: {novo_arquivo.id})")
        
        return jsonify({
            'success': True,
            'message': 'Arquivo enviado com sucesso',
            'data': novo_arquivo.to_dict(),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro no upload: {e}")
        import traceback
        traceback.print_exc()
        
        # Limpar arquivo se foi salvo mas houve erro no banco
        try:
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️  Arquivo físico removido após erro: {file_path}")
        except:
            pass
        
        return jsonify({
            'success': False,
            'error': f'Erro no upload: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['GET'])
def obter_arquivo(arquivo_id):
    """Obter detalhes de um arquivo específico"""
    db = SessionLocal()
    try:
        print(f"🔍 Buscando arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            print(f"❌ Arquivo {arquivo_id} não encontrado")
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        print(f"✅ Arquivo encontrado: {arquivo.nome_original}")
        
        return jsonify({
            'success': True,
            'data': arquivo.to_dict(),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Erro ao obter arquivo: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>/download', methods=['GET'])
def download_arquivo(arquivo_id):
    """Download de arquivo"""
    db = SessionLocal()
    try:
        print(f"⬇️  Download do arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            print(f"❌ Arquivo {arquivo_id} não encontrado no banco")
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        # Verificar se arquivo existe no sistema
        if not os.path.exists(arquivo.caminho):
            print(f"❌ Arquivo físico não encontrado: {arquivo.caminho}")
            return jsonify({
                'success': False,
                'error': 'Arquivo físico não encontrado'
            }), 404
        
        print(f"✅ Enviando arquivo: {arquivo.nome_original}")
        
        return send_file(
            arquivo.caminho,
            as_attachment=True,
            download_name=arquivo.nome_original,
            mimetype=arquivo.tipo_mime
        )
        
    except Exception as e:
        print(f"❌ Erro no download: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/<int:arquivo_id>', methods=['DELETE'])
def deletar_arquivo(arquivo_id):
    """Deletar arquivo"""
    db = SessionLocal()
    try:
        print(f"🗑️  Deletando arquivo ID: {arquivo_id}")
        
        arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
        
        if not arquivo:
            print(f"❌ Arquivo {arquivo_id} não encontrado")
            return jsonify({
                'success': False,
                'error': 'Arquivo não encontrado'
            }), 404
        
        nome_original = arquivo.nome_original
        caminho_arquivo = arquivo.caminho
        
        # Deletar arquivo físico
        try:
            if os.path.exists(caminho_arquivo):
                os.remove(caminho_arquivo)
                print(f"✅ Arquivo físico deletado: {caminho_arquivo}")
            else:
                print(f"⚠️  Arquivo físico já não existia: {caminho_arquivo}")
        except Exception as e:
            print(f"⚠️  Erro ao deletar arquivo físico: {e}")
        
        # Deletar registro do banco
        db.delete(arquivo)
        db.commit()
        
        print(f"✅ Registro deletado do banco: {nome_original}")
        
        return jsonify({
            'success': True,
            'message': f'Arquivo "{nome_original}" deletado com sucesso',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao deletar arquivo: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/tipos', methods=['GET'])
def listar_tipos_documento():
    """Listar tipos de documento disponíveis"""
    db = SessionLocal()
    try:
        print("📋 Listando tipos de documento...")
        
        # Tipos baseados nos arquivos existentes
        tipos_existentes = db.query(Arquivo.tipo_documento).distinct().all()
        tipos_existentes = [t[0] for t in tipos_existentes if t[0]]
        
        # Tipos padrão
        tipos_padrao = [
            'Contrato', 'Proposta', 'Orçamento', 'Projeto', 
            'Documento', 'Planilha', 'Apresentação', 
            'PDF', 'Imagem', 'Geral'
        ]
        
        # Combinar e remover duplicatas
        todos_tipos = list(set(tipos_padrao + tipos_existentes))
        todos_tipos.sort()
        
        print(f"📝 {len(todos_tipos)} tipos disponíveis")
        
        return jsonify({
            'success': True,
            'data': todos_tipos,
            'total': len(todos_tipos),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Erro ao listar tipos: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

@arquivos_bp.route('/api/arquivos/stats', methods=['GET'])
def estatisticas_arquivos():
    """Estatísticas dos arquivos - VERSÃO CORRIGIDA"""
    db = SessionLocal()
    try:
        print("📊 Calculando estatísticas de arquivos...")
        
        # Total de arquivos
        total = db.query(Arquivo).count()
        print(f"📁 Total de arquivos: {total}")
        
        # Por tipo - ✅ CORREÇÃO APLICADA
        por_tipo = db.query(
            Arquivo.tipo_documento,
            func.count(Arquivo.id).label('quantidade')  # ✅ func importado corretamente
        ).group_by(Arquivo.tipo_documento).all()
        
        # Tamanho total - ✅ CORREÇÃO APLICADA  
        tamanho_total = db.query(func.sum(Arquivo.tamanho)).scalar() or 0  # ✅ func importado
        
        print(f"💾 Tamanho total: {tamanho_total} bytes")
        print(f"📊 Tipos únicos: {len(por_tipo)}")
        
        return jsonify({
            'success': True,
            'data': {
                'total_arquivos': total,
                'tamanho_total_bytes': int(tamanho_total),
                'tamanho_total_mb': round(tamanho_total / (1024 * 1024), 2),
                'por_tipo': [
                    {
                        'tipo': item.tipo_documento or 'Sem tipo',
                        'quantidade': item.quantidade
                    }
                    for item in por_tipo
                ]
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Erro ao calcular estatísticas: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

# 🔧 Endpoint para limpar registros órfãos
@arquivos_bp.route('/api/admin/arquivos/cleanup', methods=['POST'])
def cleanup_arquivos():
    """Limpar registros de arquivos órfãos (sem arquivo físico)"""
    db = SessionLocal()
    try:
        print("🧹 Iniciando limpeza de registros órfãos...")
        
        arquivos = db.query(Arquivo).all()
        removidos = 0
        
        print(f"🔍 Verificando {len(arquivos)} arquivo(s)...")
        
        for arquivo in arquivos:
            if not os.path.exists(arquivo.caminho):
                print(f"🗑️  Removendo registro órfão: {arquivo.nome_original} (ID: {arquivo.id})")
                db.delete(arquivo)
                removidos += 1
            else:
                print(f"✅ Arquivo OK: {arquivo.nome_original}")
        
        if removidos > 0:
            db.commit()
            print(f"✅ {removidos} registro(s) órfão(s) removido(s)")
        else:
            print("✅ Nenhum registro órfão encontrado")
        
        return jsonify({
            'success': True,
            'message': f'{removidos} registro(s) órfão(s) removido(s)',
            'removidos': removidos,
            'total_verificados': len(arquivos),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro na limpeza: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()

# 🔧 Endpoint de saúde para arquivos
@arquivos_bp.route('/api/arquivos/health', methods=['GET'])
def health_check_arquivos():
    """Health check específico para o sistema de arquivos"""
    db = SessionLocal()
    try:
        # Verificar conexão com banco
        total_arquivos = db.query(Arquivo).count()
        
        # Verificar pasta de uploads
        uploads_exists = os.path.exists(UPLOAD_FOLDER)
        uploads_writable = os.access(UPLOAD_FOLDER, os.W_OK) if uploads_exists else False
        
        # Verificar arquivos órfãos
        arquivos = db.query(Arquivo).all()
        orfaos = sum(1 for arquivo in arquivos if not os.path.exists(arquivo.caminho))
        
        return jsonify({
            'success': True,
            'status': 'healthy',
            'data': {
                'total_arquivos': total_arquivos,
                'pasta_uploads': {
                    'existe': uploads_exists,
                    'gravavel': uploads_writable,
                    'caminho': UPLOAD_FOLDER
                },
                'registros_orfaos': orfaos,
                'tipos_permitidos': list(ALLOWED_EXTENSIONS)
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        db.close()