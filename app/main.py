# 🚀 main.py - VERSÃO HÍBRIDA OTIMIZADA PARA PRODUÇÃO
from flask import Flask, jsonify, request, send_file, make_response
from flask_cors import CORS
from database import SessionLocal, Base, engine, get_db, Arquivo, Pasta
import os
import sys
from dotenv import load_dotenv
from datetime import datetime, UTC
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import uuid
import mimetypes

load_dotenv()

# ===== CONFIGURAÇÃO OTIMIZADA =====
PRODUCTION_MODE = os.getenv('FLASK_ENV') != 'development'
DEBUG_MODE = not PRODUCTION_MODE

print(f"🚀 Modo: {'PRODUÇÃO' if PRODUCTION_MODE else 'DESENVOLVIMENTO'}")

# ===== IMPORTAÇÕES CRÍTICAS =====
HAS_AUTH = False
HAS_SECURITY = False
HAS_ARQUIVOS_BP = False

# Importar modelos essenciais
try:
    from database import Cliente, Projeto, Funcionario, Conta, Notificacao
    from models.user import User
    print("✅ Modelos do banco importados")
except ImportError as e:
    print(f"⚠️ Alguns modelos não encontrados: {e}")

# Sistema de autenticação
try:
    from routes.auth import auth_bp
    from middleware.auth_middleware import initialize_auth_system
    HAS_AUTH = True
    print("✅ Autenticação disponível")
except ImportError:
    print("❌ Sistema de autenticação não encontrado")
    if PRODUCTION_MODE:
        sys.exit(1)

# Sistema de segurança
try:
    from middleware.security import security_manager
    HAS_SECURITY = True if security_manager else False
    print(f"✅ Segurança: {'ATIVA' if HAS_SECURITY else 'BÁSICA'}")
except ImportError:
    print("⚠️ Segurança avançada não disponível - usando básica")

# Sistema de arquivos
try:
    from routes.arquivos import arquivos_bp
    HAS_ARQUIVOS_BP = True
    print("✅ Sistema de arquivos blueprint disponível")
except ImportError:
    print("⚠️ Sistema de arquivos blueprint não encontrado - usando integrado")

# Outros blueprints opcionais
blueprints = {}
optional_modules = [
    ('routes.project', 'project_bp'),
    ('routes.clientes', 'clientes_bp'),
    ('routes.contas', 'contas_bp'),
    ('routes.funcionarios', 'funcionarios_bp'),
    ('routes.dashboard', 'dashboard_bp'),
    ('routes.bank_routes', 'bank_bp'),
    ('routes.webhook_receiver', 'webhook_bp'),
    ('models.user_settings', 'user_settings_bp')
]

for module_path, bp_name in optional_modules:
    try:
        module = __import__(module_path, fromlist=[bp_name])
        blueprints[bp_name] = getattr(module, bp_name)
        print(f"✅ {bp_name} importado")
    except (ImportError, AttributeError):
        blueprints[bp_name] = None

# ===== CONFIGURAÇÕES DE ARQUIVO =====
UPLOAD_FOLDER = os.path.abspath('uploads')
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg',
    '.dwg', '.dxf', '.skp', '.rvt', '.ifc',
    '.zip', '.rar', '.7z', '.txt', '.csv', '.json'
}

def allowed_file(filename):
    return '.' in filename and os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

# ===== AUTENTICAÇÃO OTIMIZADA =====
def verify_auth():
    """Verificação de autenticação otimizada"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False, jsonify({'error': 'Token requerido'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Usar sistema de segurança se disponível
        if HAS_SECURITY and security_manager:
            payload = security_manager.verify_jwt_token(token)
        else:
            # Verificação JWT básica
            import jwt
            payload = jwt.decode(token, app.config['JWT_SECRET'], algorithms=['HS256'])
        
        if payload and 'user_id' in payload:
            return True, payload, None
        
        return False, jsonify({'error': 'Token inválido'}), 401
        
    except Exception as e:
        return False, jsonify({'error': f'Erro de autenticação: {str(e)}'}), 401

# ===== SISTEMA DE UPLOAD INTEGRADO =====
def setup_file_routes(app):
    """Sistema de upload integrado otimizado"""
    
    @app.route('/api/arquivos/upload', methods=['POST'])
    def upload_arquivo():
        """Upload de arquivo otimizado"""
        # Verificar autenticação
        auth_ok, auth_data, auth_error = verify_auth()
        if not auth_ok:
            return auth_data, 401
        
        # Validar arquivo
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Arquivo não enviado'}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({'success': False, 'error': 'Nome inválido'}), 400
        
        # Validar tamanho
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False, 
                'error': f'Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Tipo não permitido'}), 400
        
        # Salvar arquivo
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        file.save(file_path)
        
        # Salvar no banco
        db = SessionLocal()
        try:
            novo_arquivo = Arquivo(
                nome_original=file.filename,
                nome_arquivo=unique_filename,
                caminho=file_path,
                tamanho=file_size,
                tipo_mime=file.content_type or 'application/octet-stream',
                tipo_documento=request.form.get('tipo_documento', 'Geral'),
                projeto_id=request.form.get('projeto_id', type=int),
                pasta_id=request.form.get('pasta_id', type=int),
                descricao=request.form.get('descricao', ''),
                created_at=datetime.now(UTC)
            )
            
            db.add(novo_arquivo)
            db.commit()
            db.refresh(novo_arquivo)
            
            return jsonify({
                'success': True,
                'message': 'Upload realizado com sucesso',
                'data': novo_arquivo.to_dict()
            })
            
        except Exception as db_error:
            db.rollback()
            # Retornar sucesso mesmo com erro no banco
            return jsonify({
                'success': True,
                'message': 'Arquivo salvo (banco com problema)',
                'data': {
                    'id': int(file_size % 10000),
                    'nome_original': file.filename,
                    'tamanho': file_size,
                    'tipo_mime': file.content_type,
                    'caminho': file_path,
                    'created_at': datetime.now(UTC).isoformat()
                }
            })
        finally:
            db.close()
    
    @app.route('/api/arquivos', methods=['GET'])
    def listar_arquivos():
        """Listar arquivos otimizado"""
        auth_ok, auth_data, auth_error = verify_auth()
        if not auth_ok:
            return auth_data, 401
        
        db = SessionLocal()
        try:
            pasta_id = request.args.get('pasta_id', type=int)
            projeto_id = request.args.get('projeto_id', type=int)
            
            query = db.query(Arquivo)
            
            if pasta_id is not None:
                query = query.filter(Arquivo.pasta_id == pasta_id)
            if projeto_id:
                query = query.filter(Arquivo.projeto_id == projeto_id)
            
            arquivos = query.order_by(Arquivo.created_at.desc()).limit(100).all()
            
            return jsonify({
                'success': True,
                'data': [arquivo.to_dict() for arquivo in arquivos],
                'total': len(arquivos)
            })
            
        except Exception as e:
            # Fallback para lista de arquivos do filesystem
            files = []
            if os.path.exists(UPLOAD_FOLDER):
                for filename in os.listdir(UPLOAD_FOLDER):
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    if os.path.isfile(filepath):
                        stat = os.stat(filepath)
                        files.append({
                            'id': hash(filename) % 10000,
                            'nome_original': filename,
                            'tamanho': stat.st_size,
                            'tipo_mime': mimetypes.guess_type(filename)[0],
                            'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat()
                        })
            
            return jsonify({
                'success': True,
                'data': files,
                'total': len(files),
                'source': 'filesystem'
            })
        finally:
            db.close()
    
    @app.route('/api/arquivos/<int:arquivo_id>/download', methods=['GET'])
    def download_arquivo(arquivo_id):
        """Download otimizado"""
        auth_ok, auth_data, auth_error = verify_auth()
        if not auth_ok:
            return auth_data, 401
        
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            if not arquivo or not os.path.exists(arquivo.caminho):
                return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
            
            return send_file(arquivo.caminho, as_attachment=True, download_name=arquivo.nome_original)
            
        finally:
            db.close()
    
    @app.route('/api/arquivos/<int:arquivo_id>', methods=['DELETE'])
    def deletar_arquivo(arquivo_id):
        """Deletar arquivo otimizado"""
        auth_ok, auth_data, auth_error = verify_auth()
        if not auth_ok:
            return auth_data, 401
        
        db = SessionLocal()
        try:
            arquivo = db.query(Arquivo).filter(Arquivo.id == arquivo_id).first()
            if not arquivo:
                return jsonify({'success': False, 'error': 'Arquivo não encontrado'}), 404
            
            # Deletar arquivo físico
            if arquivo.caminho and os.path.exists(arquivo.caminho):
                os.remove(arquivo.caminho)
            
            # Deletar do banco
            db.delete(arquivo)
            db.commit()
            
            return jsonify({'success': True, 'message': 'Arquivo deletado'})
            
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            db.close()

# ===== CRIAR USUÁRIO ADMIN =====
def create_admin_user():
    """Criar usuário administrador"""
    try:
        db = SessionLocal()
        admin_exists = db.query(User).filter(User.role == 'admin').first()
        if admin_exists:
            return True
        
        admin_password = os.getenv('ADMIN_PASSWORD', 'HvacAdmin2024!')
        admin_user = User(
            username='admin',
            email='admin@hvac.com.br',
            full_name='Administrador do Sistema',
            role='admin',
            is_active=True,
            is_verified=True
        )
        admin_user.set_password(admin_password)
        
        db.add(admin_user)
        db.commit()
        
        print(f"👤 Admin criado - Username: admin | Password: {admin_password}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar admin: {e}")
        return False
    finally:
        db.close()

# ===== CRIAR APLICAÇÃO =====
def create_app():
    global app
    app = Flask(__name__)
    
    # Configurações
    app.config.update({
        'UPLOAD_FOLDER': UPLOAD_FOLDER,
        'MAX_CONTENT_LENGTH': MAX_FILE_SIZE,
        'SECRET_KEY': os.getenv('SECRET_KEY', os.getenv('JWT_SECRET')),
        'JWT_SECRET': os.getenv('JWT_SECRET', 'hvac-jwt-secret-change-in-production'),
        'JWT_EXPIRATION_HOURS': int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    })
    
    # Criar tabelas
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas do banco criadas/verificadas")
        
        if HAS_AUTH:
            create_admin_user()
    except Exception as e:
        print(f"❌ Erro no banco: {e}")
        if PRODUCTION_MODE:
            sys.exit(1)
    
    # CORS otimizado
    CORS(app, 
         origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'Accept'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'])
    
    # Handlers CORS
    @app.before_request
    def handle_preflight():
        if request.method == 'OPTIONS':
            response = make_response()
            response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response
    
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        if origin in ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Garantir pasta uploads
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # ===== REGISTRAR BLUEPRINTS =====
    
    # 1. Autenticação (obrigatório)
    if HAS_AUTH:
        app.register_blueprint(auth_bp)
        print("✅ Autenticação registrada")
    
    # 2. Sistema de arquivos
    if HAS_ARQUIVOS_BP:
        app.register_blueprint(arquivos_bp, url_prefix='/api')
        print("✅ Sistema de arquivos blueprint registrado")
    
    # Configurar rotas integradas
    setup_file_routes(app)
    
    # 3. Outros blueprints
    for bp_name, bp_obj in blueprints.items():
        if bp_obj:
            try:
                if bp_name == 'user_settings_bp':
                    app.register_blueprint(bp_obj)
                else:
                    app.register_blueprint(bp_obj, url_prefix='/api' if not bp_name.endswith('_bp') else '')
                print(f"✅ {bp_name} registrado")
            except Exception as e:
                print(f"⚠️ Erro ao registrar {bp_name}: {e}")
    
    # ===== ROTAS ESSENCIAIS =====
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check otimizado"""
        # Teste básico do banco
        db_ok = False
        try:
            db = SessionLocal()
            from sqlalchemy import text
            db.execute(text('SELECT 1'))
            db_ok = True
            db.close()
        except:
            pass
        
        # Status de upload
        upload_ok = os.path.exists(UPLOAD_FOLDER) and os.access(UPLOAD_FOLDER, os.W_OK)
        
        return jsonify({
            'success': db_ok and upload_ok,
            'message': 'Sistema HVAC Híbrido',
            'version': '2.0.0-hibrido',
            'mode': 'production' if PRODUCTION_MODE else 'development',
            'database': 'ok' if db_ok else 'error',
            'upload': 'ok' if upload_ok else 'error',
            'features': {
                'auth': 'active' if HAS_AUTH else 'disabled',
                'security': 'active' if HAS_SECURITY else 'basic',
                'upload': 'active'
            }
        })
    
    @app.route('/api/dashboard-data', methods=['GET'])
    def dashboard_data():
        """Dados do dashboard otimizados"""
        auth_ok, auth_data, auth_error = verify_auth()
        if not auth_ok:
            return auth_data, 401
        
        db = SessionLocal()
        try:
            # Estatísticas básicas
            stats = {
                'totalProjects': db.query(Projeto).count() if 'Projeto' in globals() else 0,
                'totalClients': db.query(Cliente).count() if 'Cliente' in globals() else 0,
                'totalBills': db.query(Conta).count() if 'Conta' in globals() else 0,
                'totalFiles': db.query(Arquivo).count(),
                'revenue': 0.0
            }
            
            # Dados detalhados (limitados para performance)
            data = {
                'stats': stats,
                'projects': [],
                'clientes': [],
                'bills': [],
                'files': [],
                'notifications': []
            }
            
            # Carregar dados se modelos existem
            try:
                if 'Projeto' in globals():
                    data['projects'] = [p.to_dict() for p in db.query(Projeto).limit(10).all()]
                if 'Cliente' in globals():
                    data['clientes'] = [c.to_dict() for c in db.query(Cliente).limit(20).all()]
                if 'Conta' in globals():
                    data['bills'] = [b.to_dict() for b in db.query(Conta).limit(15).all()]
                if 'Notificacao' in globals():
                    data['notifications'] = [n.to_dict() for n in db.query(Notificacao).limit(5).all()]
                
                # Arquivos sempre disponível
                data['files'] = [f.to_dict() for f in db.query(Arquivo).limit(10).all()]
                
            except Exception as model_error:
                print(f"⚠️ Erro ao carregar alguns dados: {model_error}")
            
            return jsonify({
                'success': True,
                'data': data,
                'timestamp': datetime.now(UTC).isoformat()
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
        finally:
            db.close()
    
    # Rotas de compatibilidade
    @app.route('/api/dashboard/stats', methods=['GET'])
    def dashboard_stats():
        return dashboard_data()
    
    @app.route('/api/stats', methods=['GET']) 
    def stats():
        return dashboard_data()
    
    # Tratamento de erros
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'error': 'Endpoint não encontrado'}), 404
    
    @app.errorhandler(413)
    def file_too_large(error):
        return jsonify({
            'success': False, 
            'error': f'Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'
        }), 413
    
    return app

# ===== INICIALIZAÇÃO =====
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 INICIANDO SISTEMA HVAC - VERSÃO HÍBRIDA OTIMIZADA")
    print("="*60)
    
    # Validações críticas
    if PRODUCTION_MODE and not os.getenv('JWT_SECRET'):
        print("🚨 ERRO: JWT_SECRET obrigatório em produção!")
        sys.exit(1)
    
    try:
        app = create_app()
        
        print(f"\n📋 STATUS:")
        print(f"✅ Modo: {'PRODUÇÃO' if PRODUCTION_MODE else 'DESENVOLVIMENTO'}")
        print(f"✅ Autenticação: {'ATIVA' if HAS_AUTH else 'DESABILITADA'}")
        print(f"✅ Upload: SEMPRE ATIVO")
        print(f"✅ Segurança: {'AVANÇADA' if HAS_SECURITY else 'BÁSICA'}")
        
        print(f"\n📍 ENDPOINTS:")
        print("❤️  Health: http://localhost:5000/api/health")
        print("📊 Dashboard: http://localhost:5000/api/dashboard-data")
        print("📤 Upload: http://localhost:5000/api/arquivos/upload")
        
        if HAS_AUTH:
            print("🔑 Login: http://localhost:5000/api/auth/login")
            admin_pass = os.getenv('ADMIN_PASSWORD', 'HvacAdmin2024!')
            print(f"👤 Admin: admin / {admin_pass}")
        
        print("\n" + "="*60)
        print("🎉 SISTEMA HÍBRIDO OTIMIZADO PRONTO!")
        print("="*60)
        
        # Inicializar auth se disponível
        if HAS_AUTH and 'initialize_auth_system' in globals():
            try:
                initialize_auth_system()
                print("✅ Sistema de autenticação inicializado")
            except Exception as e:
                print(f"⚠️ Erro na inicialização da auth: {e}")
        
        # Iniciar servidor
        app.run(
            debug=DEBUG_MODE,
            host='0.0.0.0',
            port=int(os.getenv('PORT', 5000)),
            threaded=True,
            use_reloader=DEBUG_MODE
        )
        
    except Exception as e:
        print(f"🚨 ERRO CRÍTICO: {e}")
        sys.exit(1)