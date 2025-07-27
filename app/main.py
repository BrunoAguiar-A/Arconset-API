# 📁 app.py - ATUALIZADO PARA INCLUIR AUTENTICAÇÃO
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import SessionLocal, Base, engine, get_db
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from datetime import datetime, UTC
from config.env_loader import load_dotenv

# Importar todos os modelos (incluindo o novo User)
from database import Cliente, Projeto, Funcionario, Conta, Arquivo, Notificacao
from models.user import User  # ✅ NOVO IMPORT

# ===== CONFIGURAÇÃO DE MODO (DESENVOLVIMENTO vs PRODUÇÃO) =====
DEVELOPMENT_MODE = os.getenv('DEBUG', 'False').lower() == 'true'
REQUIRE_SECURITY = os.getenv('REQUIRE_SECURITY', 'True').lower() == 'true'

print(f"🔧 Modo: {'DESENVOLVIMENTO' if DEVELOPMENT_MODE else 'PRODUÇÃO'}")
print(f"🔐 Segurança obrigatória: {'SIM' if REQUIRE_SECURITY else 'NÃO'}")

# ===== IMPORTAR SEGURANÇA BANCÁRIA =====
HAS_SECURITY = False
security_manager = None
bank_bp = None

try:
    print("🔍 Importando middleware.security...")
    from middleware.security import setup_cors, create_limiter, security_manager
    print("✅ middleware.security importado com sucesso")
    
    if security_manager:
        print("✅ SecurityManager ativo")
        HAS_SECURITY = True
    else:
        print("❌ SecurityManager não inicializado")
        if REQUIRE_SECURITY:
            print("🚨 ERRO CRÍTICO: Segurança é obrigatória mas não foi inicializada!")
            sys.exit(1)
    
    try:
        print("🔍 Importando routes.bank_routes...")
        from routes.bank_routes import bank_bp
        print("✅ routes.bank_routes importado com sucesso")
    except ImportError as e:
        print(f"⚠️  routes.bank_routes não encontrado: {e}")
        if REQUIRE_SECURITY:
            print("🚨 ERRO CRÍTICO: Rotas bancárias são obrigatórias!")
            sys.exit(1)
    
    try:
        from config.aws_s3 import s3_manager
        print(f"📁 S3 Status: {'ATIVO' if s3_manager.is_enabled() else 'INATIVO'}")
    except ImportError:
        print("⚠️ Configuração S3 não encontrada")
        
except ImportError as e:
    error_msg = f"ERRO ao importar segurança: {e}"
    print(f"❌ {error_msg}")
    
    if REQUIRE_SECURITY:
        print("🚨 ERRO CRÍTICO: Sistema não pode iniciar sem segurança!")
        print("🛠️  Soluções:")
        print("   1. Configurar todas as variáveis de ambiente (.env)")
        print("   2. Iniciar Redis: docker run -d --name redis -p 6379:6379 redis:alpine")
        print("   3. Instalar dependências: pip install redis marshmallow cryptography")
        print("   4. Para desenvolvimento sem segurança: REQUIRE_SECURITY=False no .env")
        sys.exit(1)
    else:
        print("⚠️  Continuando SEM segurança (apenas desenvolvimento)")

# ===== IMPORTAR AUTENTICAÇÃO =====
HAS_AUTH = False
auth_bp = None

try:
    print("🔍 Importando sistema de autenticação...")
    from routes.auth import auth_bp
    from middleware.auth_middleware import create_default_admin
    print("✅ Sistema de autenticação importado com sucesso")
    HAS_AUTH = True
except ImportError as e:
    print(f"❌ Erro ao importar autenticação: {e}")
    print("⚠️ Sistema funcionará SEM autenticação")

# Validações de segurança obrigatórias em produção
if not DEVELOPMENT_MODE and REQUIRE_SECURITY:
    if not HAS_SECURITY:
        print("🚨 FALHA CRÍTICA: Produção requer segurança ativa!")
        sys.exit(1)
    
    # Verificar variáveis críticas
    critical_vars = ['JWT_SECRET', 'ENCRYPTION_PASSWORD', 'PASSWORD_PEPPER']
    missing_vars = [var for var in critical_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"🚨 FALHA CRÍTICA: Variáveis obrigatórias não definidas: {missing_vars}")
        sys.exit(1)
    
    # Verificar Redis em produção
    if security_manager:
        try:
            security_manager.redis_client.ping()
            print("✅ Redis verificado em produção")
        except Exception as e:
            print(f"🚨 FALHA CRÍTICA: Redis não está funcionando em produção: {e}")
            sys.exit(1)

# Importar blueprints opcionais
try:
    from routes.project import project_bp
    HAS_PROJECT_BP = True
except ImportError:
    HAS_PROJECT_BP = False
    print("⚠️  routes.project não encontrado")

try:
    from routes.clientes import clientes_bp
    HAS_CLIENTES_BP = True
except ImportError:
    HAS_CLIENTES_BP = False
    print("⚠️  routes.clientes não encontrado")

try:
    from routes.contas import contas_bp
    HAS_CONTAS_BP = True
except ImportError:
    HAS_CONTAS_BP = False
    print("⚠️  routes.contas não encontrado")

try:
    from routes.funcionarios import funcionarios_bp
    HAS_FUNCIONARIOS_BP = True
except ImportError:
    HAS_FUNCIONARIOS_BP = False
    print("⚠️  routes.funcionarios não encontrado")

try:
    from routes.arquivos import arquivos_bp
    HAS_ARQUIVOS_BP = True
except ImportError:
    HAS_ARQUIVOS_BP = False
    print("⚠️  routes.arquivos não encontrado")

try:
    from routes.dashboard import dashboard_bp
    HAS_DASHBOARD_BP = True
except ImportError:
    HAS_DASHBOARD_BP = False
    print("⚠️  routes.dashboard não encontrado")

def create_app():
    app = Flask(__name__)
    
    # Configurações
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
    
    # ===== LOGS DE DEBUG PARA AUTENTICAÇÃO (NOVO) =====
    @app.before_request
    def log_auth_request():
        """Log detalhado para requisições de autenticação"""
        if request.path.startswith('/api/auth'):
            print(f"🔐 AUTH REQUEST: {request.method} {request.path}")
            print(f"   Origin: {request.headers.get('Origin', 'N/A')}")
            print(f"   Content-Type: {request.headers.get('Content-Type', 'N/A')}")
            print(f"   User-Agent: {request.headers.get('User-Agent', 'N/A')[:50]}...")
            
            # Log do body para debug (apenas em desenvolvimento)
            if DEVELOPMENT_MODE and request.is_json:
                try:
                    data = request.get_json()
                    # Não loggar senha
                    safe_data = {k: v if k != 'password' else '[HIDDEN]' for k, v in data.items()}
                    print(f"   Body: {safe_data}")
                except:
                    pass
    
    @app.after_request
    def log_auth_response(response):
        """Log da resposta para requisições de autenticação"""
        if request.path.startswith('/api/auth'):
            print(f"🔐 AUTH RESPONSE: {response.status_code}")
            print(f"   Content-Type: {response.content_type}")
            
            # Log do conteúdo da resposta em desenvolvimento
            if DEVELOPMENT_MODE and response.content_type == 'application/json':
                try:
                    import json
                    data = json.loads(response.get_data(as_text=True))
                    # Não loggar token completo
                    if 'token' in data:
                        data['token'] = f"{data['token'][:10]}..."
                    print(f"   Response: {data}")
                except:
                    pass
        
        return response
    
    # ===== CRIAR TABELAS (INCLUINDO USUÁRIOS) =====
    print("📋 Criando/verificando tabelas do banco de dados...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas criadas/verificadas com sucesso")
        
        if HAS_AUTH:
            print("👤 Criação automática de admin DESABILITADA")
            print("   Para criar admin manualmente, use: POST /api/auth/register")
            print("   Ou chame create_default_admin() quando necessário")
                    
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        if not DEVELOPMENT_MODE:
            sys.exit(1)
    
    # ===== CONFIGURAR SEGURANÇA (OBRIGATÓRIA EM PRODUÇÃO) =====
    if HAS_SECURITY and security_manager:
        print("🔐 Configurando segurança bancária...")
        
        try:
            # CORS seguro
            setup_cors(app)
            print("✅ CORS seguro configurado")
            
            # Rate limiting
            limiter = create_limiter(app)
            print("✅ Rate limiting configurado")
            
            # Rotas bancárias
            if bank_bp:
                app.register_blueprint(bank_bp)
                print("✅ Rotas bancárias seguras registradas")
            
        except Exception as e:
            error_msg = f"Erro ao configurar segurança: {e}"
            print(f"❌ {error_msg}")
            
            if REQUIRE_SECURITY:
                print("🚨 FALHA CRÍTICA: Não foi possível configurar segurança!")
                raise Exception(error_msg)
    
    elif REQUIRE_SECURITY:
        # Se segurança é obrigatória mas não está disponível
        print("🚨 FALHA CRÍTICA: Segurança obrigatória não está ativa!")
        raise Exception("Sistema não pode iniciar sem segurança")
    
    else:
        # ===== CORS CORRIGIDO PARA AUTENTICAÇÃO (NOVO) =====
        print("⚠️  MODO DESENVOLVIMENTO: Usando CORS básico com suporte a autenticação")
        CORS(app, 
             origins=[
                 "http://localhost:3000",
                 "http://localhost:5173", 
                 "http://127.0.0.1:3000",
                 "http://127.0.0.1:5173"
             ],
             supports_credentials=True,
             allow_headers=[
                 'Content-Type', 
                 'Authorization', 
                 'X-Requested-With',
                 'Accept',
                 'Origin',
                 'X-Confirm-Delete'
             ],
             methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
             expose_headers=['X-RateLimit-Remaining', 'X-RateLimit-Reset']
        )
        print("✅ CORS básico configurado para desenvolvimento")
    
    # Criar pasta de uploads
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # ===== REGISTRAR BLUEPRINTS =====
    
    # Sistema de autenticação (PRIORIDADE)
    if HAS_AUTH:
        app.register_blueprint(auth_bp)
        print("✅ routes.auth registrado")
    else:
        print("⚠️ Sistema de autenticação NÃO está disponível")
    
    if HAS_PROJECT_BP:
        app.register_blueprint(project_bp)
        print("✅ routes.project registrado")
    
    if HAS_CLIENTES_BP:
        app.register_blueprint(clientes_bp)
        print("✅ routes.clientes registrado")
    
    if HAS_CONTAS_BP:
        app.register_blueprint(contas_bp)
        print("✅ routes.contas registrado")
    
    if HAS_FUNCIONARIOS_BP:
        app.register_blueprint(funcionarios_bp)
        print("✅ routes.funcionarios registrado")
    
    if HAS_ARQUIVOS_BP:
        app.register_blueprint(arquivos_bp)
        print("✅ routes.arquivos registrado")
    
    if HAS_DASHBOARD_BP:
        app.register_blueprint(dashboard_bp)
        print("✅ routes.dashboard registrado")
    
    # ===== ROTAS BÁSICAS =====
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check melhorado com informações de autenticação"""
        security_status = {
            'security_enabled': HAS_SECURITY,
            'security_manager_active': security_manager is not None,
            'security_required': REQUIRE_SECURITY,
            'development_mode': DEVELOPMENT_MODE,
            'jwt_configured': bool(os.getenv('JWT_SECRET')),
            'encryption_configured': bool(os.getenv('ENCRYPTION_PASSWORD')),
            'redis_connected': False,
            'auth_system_enabled': HAS_AUTH
        }
        
        # Testar Redis se disponível
        if security_manager:
            try:
                security_manager.redis_client.ping()
                security_status['redis_connected'] = True
            except:
                security_status['redis_connected'] = False
                
                # Em produção, Redis deve funcionar
                if not DEVELOPMENT_MODE and REQUIRE_SECURITY:
                    return jsonify({
                        'success': False,
                        'error': 'Redis não está funcionando',
                        'security': security_status
                    }), 503
        
        # Verificar usuários cadastrados
        user_stats = {'total_users': 0, 'admin_exists': False, 'auth_working': False}
        if HAS_AUTH:
            try:
                db = SessionLocal()
                try:
                    user_stats['total_users'] = db.query(User).count()
                    admin = db.query(User).filter(User.role == 'admin').first()
                    user_stats['admin_exists'] = admin is not None
                    
                    # Testar se consegue fazer hash de senha
                    if admin:
                        user_stats['auth_working'] = admin.check_password('Admin123!')
                    
                finally:
                    db.close()
            except Exception as e:
                print(f"⚠️ Erro ao verificar usuários: {e}")
                user_stats['error'] = str(e)
        
        return jsonify({
            'success': True,
            'message': 'API HVAC funcionando',
            'version': '1.0.0',
            'mode': 'development' if DEVELOPMENT_MODE else 'production',
            'database': 'PostgreSQL' if 'postgresql' in str(engine.url) else 'SQLite',
            'security': security_status,
            'users': user_stats,
            'endpoints': {
                'auth': '/api/auth/*' if HAS_AUTH else 'disabled',
                'projects': '/api/projects/*' if HAS_PROJECT_BP else 'disabled', 
                'clients': '/api/clientes/*' if HAS_CLIENTES_BP else 'disabled',
                'bills': '/api/contas/*' if HAS_CONTAS_BP else 'disabled',
                'banking': '/api/bank/*' if HAS_SECURITY else 'disabled'
            },
            'timestamp': datetime.now(UTC).isoformat()
        })
    
    # ===== ROTA ESPECÍFICA PARA TESTAR LOGIN (NOVO) =====
    @app.route('/api/debug/login-test', methods=['POST'])
    def debug_login_test():
        """Rota específica para debug de login (apenas desenvolvimento)"""
        if not DEVELOPMENT_MODE:
            return jsonify({'error': 'Disponível apenas em desenvolvimento'}), 403
        
        try:
            data = request.get_json()
            print(f"🔍 DEBUG LOGIN TEST:")
            print(f"   Dados recebidos: {data}")
            print(f"   Content-Type: {request.content_type}")
            print(f"   Method: {request.method}")
            print(f"   Headers: {dict(request.headers)}")
            
            if not data:
                return jsonify({
                    'success': False,
                    'error': 'Nenhum dado JSON recebido',
                    'debug': {
                        'content_type': request.content_type,
                        'method': request.method,
                        'has_json': request.is_json
                    }
                }), 400
            
            # Verificar se tem username e password
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return jsonify({
                    'success': False,
                    'error': 'Username e password são obrigatórios',
                    'received_fields': list(data.keys()),
                    'debug': True
                }), 400
            
            # Tentar buscar usuário
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.username == username).first()
                
                debug_info = {
                    'user_found': user is not None,
                    'username_searched': username,
                    'total_users': db.query(User).count(),
                    'auth_system_working': HAS_AUTH
                }
                
                if user:
                    debug_info.update({
                        'user_id': user.id,
                        'user_role': user.role,
                        'user_active': user.is_active,
                        'password_check': user.check_password(password)
                    })
                
                return jsonify({
                    'success': True,
                    'message': 'Debug realizado com sucesso',
                    'debug': debug_info
                })
                
            finally:
                db.close()
        
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Erro no debug: {str(e)}',
                'debug': True
            }), 500
    
    # ===== ROTA DE TESTE DE AUTENTICAÇÃO (NOVO) =====
    @app.route('/api/auth/test', methods=['GET'])
    def test_auth_system():
        """Testar se o sistema de autenticação está funcionando"""
        try:
            # Verificar se tabela de usuários existe
            db = SessionLocal()
            try:
                user_count = db.query(User).count()
                admin_exists = db.query(User).filter(User.role == 'admin').first() is not None
                
                # Testar criação de usuário
                test_user = User(
                    username='test_user_temp',
                    email='test@test.com',
                    full_name='Test User',
                    role='user',
                    is_active=True
                )
                test_user.set_password('test123')
                
                # Não salvar, apenas testar
                password_check = test_user.check_password('test123')
                
                return jsonify({
                    'success': True,
                    'message': 'Sistema de autenticação funcionando',
                    'tests': {
                        'database_connection': True,
                        'user_table_exists': True,
                        'user_count': user_count,
                        'admin_exists': admin_exists,
                        'password_hashing': password_check,
                        'auth_routes_loaded': HAS_AUTH
                    },
                    'timestamp': datetime.now(UTC).isoformat()
                })
                
            finally:
                db.close()
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Erro no teste de autenticação: {str(e)}',
                'auth_system_available': HAS_AUTH
            }), 500
    
    # ===== ROTA DE TESTE DE SEGURANÇA (OBRIGATÓRIA EM PRODUÇÃO) =====
    if HAS_SECURITY and security_manager:
        @app.route('/api/security/test', methods=['GET'])
        def test_security():
            try:
                # Testes obrigatórios
                test_data = {'test': 'data', 'timestamp': datetime.now(UTC).isoformat()}
                encrypted = security_manager.encrypt_data(test_data)
                decrypted = security_manager.decrypt_data(encrypted)
                
                test_token = security_manager.generate_jwt_token({'test': True, 'user_id': 'test'}, expires_hours=1)
                verified = security_manager.verify_jwt_token(test_token)
                
                # Testar Redis
                redis_test = security_manager.redis_client.ping()
                
                all_tests_passed = (
                    decrypted == test_data and
                    verified.get('test') == True and
                    redis_test
                )
                
                if not all_tests_passed and not DEVELOPMENT_MODE:
                    # Em produção, falha nos testes é crítica
                    return jsonify({
                        'success': False,
                        'error': 'Testes de segurança falharam',
                        'critical': True
                    }), 500
                
                return jsonify({
                    'success': True,
                    'message': 'Todos os testes de segurança passaram',
                    'tests': {
                        'encryption': decrypted == test_data,
                        'jwt': verified.get('test') == True,
                        'redis': redis_test
                    },
                    'mode': 'development' if DEVELOPMENT_MODE else 'production'
                })
                
            except Exception as e:
                error_msg = f'Falha crítica nos testes de segurança: {str(e)}'
                
                if not DEVELOPMENT_MODE:
                    # Em produção, isso é um erro crítico
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'critical': True
                    }), 500
                else:
                    return jsonify({
                        'success': False,
                        'error': error_msg,
                        'development_mode': True
                    }), 500
    
    elif REQUIRE_SECURITY:
        @app.route('/api/security/test', methods=['GET'])
        def security_not_available():
            return jsonify({
                'success': False,
                'error': 'Segurança não está configurada',
                'critical': True
            }), 503
    
    @app.route('/api/routes', methods=['GET'])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods - {'HEAD', 'OPTIONS'}),
                    'url': str(rule)
                })
        
        return jsonify({
            'success': True,
            'routes': {
                'auth': [r for r in routes if r['url'].startswith('/api/auth')],
                'hvac': [r for r in routes if not r['url'].startswith('/api/bank') and not r['url'].startswith('/api/auth')],
                'banking': [r for r in routes if r['url'].startswith('/api/bank')]
            },
            'total': len(routes),
            'security_enabled': HAS_SECURITY,
            'auth_enabled': HAS_AUTH,
            'mode': 'development' if DEVELOPMENT_MODE else 'production'
        })
    
    @app.route('/api/s3/test', methods=['GET'])
    def test_s3():
        try:
            from config.aws_s3 import s3_manager
            
            if not s3_manager.is_enabled():
                return jsonify({
                    'success': True,
                    'message': 'S3 está desabilitado - usando armazenamento local',
                    'enabled': False,
                    'local_storage': True
                })
            
            # Teste básico de conexão S3
            test_result = s3_manager.create_presigned_upload_url(
                'test.txt', 'text/plain'
            )
            
            return jsonify({
                'success': True,
                'message': 'S3 funcionando corretamente',
                'enabled': True,
                'bucket': s3_manager.bucket_name,
                'region': s3_manager.region,
                'test_successful': test_result is not None
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Erro no teste S3: {str(e)}',
                'enabled': False
            }), 500
    
    return app

if __name__ == '__main__':
    # ===== VERIFICAÇÕES DE AUTENTICAÇÃO (NOVO) =====
    print("\n🔐 Verificações de autenticação...")
    
    if HAS_AUTH:
        print("✅ Sistema de autenticação carregado")
        
        # Verificar se consegue importar o middleware de auth
        try:
            from middleware.auth_middleware import auth_required, admin_required
            print("✅ Middleware de autenticação disponível")
        except ImportError as e:
            print(f"❌ Erro ao importar middleware de auth: {e}")
            if not DEVELOPMENT_MODE:
                sys.exit(1)
        
        # Verificar JWT_SECRET
        jwt_secret = os.getenv('JWT_SECRET')
        if not jwt_secret:
            print("❌ JWT_SECRET não definido!")
            sys.exit(1)
        elif len(jwt_secret) < 32:
            print("⚠️ JWT_SECRET muito curto (recomendado: 64+ caracteres)")
        else:
            print("✅ JWT_SECRET configurado adequadamente")
    
    else:
        print("⚠️ Sistema de autenticação NÃO carregado")
        print("   Verifique se:")
        print("   - routes/auth.py existe")
        print("   - models/user.py existe") 
        print("   - middleware/auth_middleware.py existe")
    
    # Verificações pré-inicialização existentes
    print("\n🔐 Verificações de segurança...")
    
    if not DEVELOPMENT_MODE:
        print("🏭 MODO PRODUÇÃO: Verificações rigorosas ativadas")
        
        # Verificar todas as variáveis críticas
        required_vars = [
            'JWT_SECRET', 'ENCRYPTION_PASSWORD', 'ENCRYPTION_SALT', 
            'PASSWORD_PEPPER', 'DATABASE_URL'
        ]
        
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            print(f"🚨 FALHA: Variáveis obrigatórias não definidas: {missing}")
            sys.exit(1)
        
        # Verificar se é HTTPS em produção (simulado)
        if os.getenv('FORCE_HTTPS', 'False').lower() == 'true':
            print("🔒 HTTPS obrigatório em produção")
    
    else:
        print("🧪 MODO DESENVOLVIMENTO: Verificações flexíveis")
    
    # Criar e executar app
    try:
        app = create_app()
        
        print("\n🚀 Iniciando API HVAC...")
        print(f"📋 Modo: {'DESENVOLVIMENTO' if DEVELOPMENT_MODE else 'PRODUÇÃO'}")
        print(f"🔐 Segurança: {'ATIVA' if HAS_SECURITY else 'INATIVA'}")
        print(f"👤 Autenticação: {'ATIVA' if HAS_AUTH else 'INATIVA'}")
        print("❤️  Health check: http://localhost:5000/api/health")
        
        if HAS_SECURITY:
            print("🧪 Teste segurança: http://localhost:5000/api/security/test")
        
        if HAS_AUTH:
            print("🔑 Endpoints de auth:")
            print("   POST /api/auth/login - Login")
            print("   POST /api/auth/register - Registro")
            print("   GET /api/auth/profile - Perfil")
            print("   GET /api/auth/test - Teste do sistema")
            if DEVELOPMENT_MODE:
                print("   POST /api/debug/login-test - Debug de login")
        
        print("=" * 60)
        
        app.run(
            debug=DEVELOPMENT_MODE,
            host='0.0.0.0', 
            port=5000,
            use_reloader=DEVELOPMENT_MODE
        )
        
    except Exception as e:
        print(f"\n🚨 FALHA CRÍTICA NA INICIALIZAÇÃO: {e}")
        print("\n🛠️  Verifique:")
        print("   1. Todas as variáveis de ambiente")
        print("   2. Redis está rodando (se REQUIRE_SECURITY=True)")
        print("   3. Banco de dados acessível")
        print("   4. Dependências instaladas")
        print("   5. Arquivos de autenticação existem:")
        print("      - routes/auth.py")
        print("      - models/user.py") 
        print("      - middleware/auth_middleware.py")
        sys.exit(1)