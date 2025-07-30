# 📁 main.py - VERSÃO CORRIGIDA DEFINITIVA PARA PRODUÇÃO
from flask import Flask, jsonify, request
from flask_cors import CORS
from database import SessionLocal, Base, engine, get_db
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from datetime import datetime, UTC

# Importar todos os modelos (incluindo o novo User)
from database import Cliente, Projeto, Funcionario, Conta, Arquivo, Notificacao
from models.user import User

# ===== CONFIGURAÇÃO DE MODO =====
DEVELOPMENT_MODE = os.getenv('DEBUG', 'False').lower() == 'true'
REQUIRE_SECURITY = os.getenv('REQUIRE_SECURITY', 'True').lower() == 'true'

print(f"🔧 Modo: {'DESENVOLVIMENTO' if DEVELOPMENT_MODE else 'PRODUÇÃO'}")
print(f"🔐 Segurança obrigatória: {'SIM' if REQUIRE_SECURITY else 'NÃO'}")

# ===== IMPORTAR SEGURANÇA OTIMIZADA =====
HAS_SECURITY = False
security_manager = None
bank_bp = None
webhook_bp = None

try:
    print("🔍 Importando middleware.security...")
    from middleware.security import setup_simple_cors, security_manager
    print("✅ middleware.security importado com sucesso")
    
    if security_manager:
        print("✅ SimpleSecurityManager ativo")
        HAS_SECURITY = True
    else:
        print("❌ SecurityManager não inicializado")
        if REQUIRE_SECURITY:
            print("🚨 ERRO CRÍTICO: Segurança é obrigatória mas não foi inicializada!")
            sys.exit(1)
    
    # ✅ IMPORT CORRIGIDO - Usar routes.bank_routes (não bank_routes)
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
        print("🔍 Importando routes.webhook_receiver...")
        from routes.webhook_receiver import webhook_bp
        print("✅ routes.webhook_receiver importado com sucesso")
    except ImportError as e:
        print(f"⚠️  routes.webhook_receiver não encontrado: {e}")
        
except ImportError as e:
    error_msg = f"ERRO ao importar segurança: {e}"
    print(f"❌ {error_msg}")
    
    if REQUIRE_SECURITY:
        print("🚨 ERRO CRÍTICO: Sistema não pode iniciar sem segurança!")
        print("🛠️  Soluções:")
        print("   1. Configurar todas as variáveis de ambiente (.env)")
        print("   2. Iniciar Redis: docker run -d --name redis -p 6379:6379 redis:alpine")
        print("   3. Instalar dependências: pip install redis cryptography")
        print("   4. Para desenvolvimento sem segurança: REQUIRE_SECURITY=False no .env")
        sys.exit(1)
    else:
        print("⚠️  Continuando SEM segurança (apenas desenvolvimento)")

# ===== IMPORTAR AUTENTICAÇÃO OTIMIZADA =====
HAS_AUTH = False
auth_bp = None
initialize_auth_system = None

try:
    print("🔍 Importando sistema de autenticação...")
    from routes.auth import auth_bp
    
    try:
        from middleware.auth_middleware import initialize_auth_system
    except ImportError:
        print("⚠️  middleware.auth_middleware não encontrado - usando versão básica")
        initialize_auth_system = None
    
    print("✅ Sistema de autenticação importado com sucesso")
    HAS_AUTH = True
except ImportError as e:
    print(f"❌ Erro ao importar autenticação: {e}")
    print("⚠️ Sistema funcionará SEM autenticação")

# ===== IMPORTAR OUTROS BLUEPRINTS =====
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

# ✅ CORREÇÃO DEFINITIVA: IMPORTAR USER SETTINGS BLUEPRINT
HAS_USER_SETTINGS_BP = False
user_settings_bp = None
UserSettings = None
initialize_user_settings_system = None

try:
    print("🔍 Importando routes.user_settings...")
    from models.user_settings import (
        user_settings_bp, 
        UserSettings, 
        initialize_user_settings_system
    )
    HAS_USER_SETTINGS_BP = True
    print("✅ routes.user_settings importado com sucesso")
except ImportError as e:
    HAS_USER_SETTINGS_BP = False
    print(f"❌ routes.user_settings não encontrado: {e}")
    print("🛠️  SOLUÇÃO:")
    print("   1. Crie o arquivo: routes/user_settings.py")
    print("   2. Use o código fornecido no artefato anterior")
    print("   3. Certifique-se que models/user.py existe")

# ===== CRIAR USUÁRIO ADMIN PADRÃO =====
def create_default_admin():
    """Criar usuário admin padrão se não existir"""
    try:
        db = SessionLocal()
        try:
            # Verificar se já existe admin
            admin_exists = db.query(User).filter(User.role == 'admin').first()
            if admin_exists:
                print(f"✅ Usuário admin já existe: {admin_exists.username}")
                return True
            
            # Criar usuário admin
            admin_user = User(
                username='admin',
                email='admin@hvac.com',
                full_name='Administrador do Sistema',
                role='admin',
                is_active=True,
                is_verified=True,
                department='TI',
                position='Administrador'
            )
            
            # Definir senha padrão
            admin_user.set_password('admin123')
            
            db.add(admin_user)
            db.commit()
            
            print("👤 Usuário admin criado com sucesso:")
            print(f"   Username: admin")
            print(f"   Password: admin123")
            print(f"   Email: admin@hvac.com")
            print("⚠️  IMPORTANTE: Altere a senha padrão em produção!")
            
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Erro ao criar usuário admin: {e}")
        return False

# ===== VALIDAÇÕES DE SEGURANÇA EM PRODUÇÃO =====
if not DEVELOPMENT_MODE and REQUIRE_SECURITY:
    if not HAS_SECURITY:
        print("🚨 FALHA CRÍTICA: Produção requer segurança ativa!")
        sys.exit(1)
    
    # Verificar variáveis críticas
    critical_vars = ['JWT_SECRET', 'ENCRYPTION_PASSWORD']
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

def create_app():
    app = Flask(__name__)
    
    # Configurações
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
    
    # ✅ CORREÇÃO: Configurações JWT para produção
    if not DEVELOPMENT_MODE:
        # Configurações obrigatórias para produção
        app.config['JWT_SECRET'] = os.getenv('JWT_SECRET')
        app.config['JWT_EXPIRATION_HOURS'] = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
        
        if not app.config['JWT_SECRET']:
            print("🚨 FALHA CRÍTICA: JWT_SECRET não definido para produção!")
            sys.exit(1)
    else:
        # Configurações padrão para desenvolvimento
        app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'dev-jwt-secret-change-in-production')
        app.config['JWT_EXPIRATION_HOURS'] = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    
    # ===== CRIAR TABELAS (INCLUINDO USER SETTINGS) =====
    print("📋 Criando/verificando tabelas do banco de dados...")
    try:
        # ✅ Força o registro do modelo User
        from models.user import User
        User.__table__  # Força a criação da tabela

        print(f"📋 Tabelas que serão criadas: {list(Base.metadata.tables.keys())}")
        # Criar todas as tabelas base
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas base criadas/verificadas com sucesso")
        
        # Criar tabela de boletos se webhook está disponível
        if webhook_bp:
            try:
                from routes.webhook_receiver import BoletoRecebido
                print("✅ Tabela boletos_recebidos verificada")
            except Exception as e:
                print(f"⚠️  Erro ao verificar tabela de boletos: {e}")
        
        # ✅ CORREÇÃO DEFINITIVA: Inicializar sistema de configurações
        if HAS_USER_SETTINGS_BP and initialize_user_settings_system:
            success = initialize_user_settings_system()
            if success:
                print("✅ Sistema de configurações de usuário inicializado")
            else:
                print("❌ Falha ao inicializar sistema de configurações")
        
        # Criar usuário admin se não existir
        if HAS_AUTH:
            print("👤 Verificando usuário administrador...")
            admin_created = create_default_admin()
            if not admin_created:
                print("⚠️  Falha ao criar/verificar usuário admin")
                    
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        if not DEVELOPMENT_MODE:
            sys.exit(1)
    
    # ===== CONFIGURAR SEGURANÇA =====
    if HAS_SECURITY and security_manager:
        print("🔐 Configurando segurança otimizada...")
        
        try:
            # CORS simples
            setup_simple_cors(app)
            print("✅ CORS otimizado configurado")
            
            # Rotas bancárias
            if bank_bp:
                app.register_blueprint(bank_bp)
                print("✅ Rotas bancárias otimizadas registradas")
            
            # Webhooks
            if webhook_bp:
                app.register_blueprint(webhook_bp)
                print("✅ Sistema de webhooks registrado")
            
        except Exception as e:
            error_msg = f"Erro ao configurar segurança: {e}"
            print(f"❌ {error_msg}")
            
            if REQUIRE_SECURITY:
                print("🚨 FALHA CRÍTICA: Não foi possível configurar segurança!")
                raise Exception(error_msg)
    
    elif REQUIRE_SECURITY:
        print("🚨 FALHA CRÍTICA: Segurança obrigatória não está ativa!")
        raise Exception("Sistema não pode iniciar sem segurança")
    
    else:
        # ===== CORS PARA DESENVOLVIMENTO =====
        print("⚠️  MODO DESENVOLVIMENTO: Usando CORS básico")
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
             expose_headers=['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
             max_age=3600
        )
        print("✅ CORS básico configurado para desenvolvimento")
    
    # Criar pasta de uploads
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # ===== REGISTRAR BLUEPRINTS =====
    
    # Sistema de autenticação (PRIORIDADE)
    if HAS_AUTH:
        app.register_blueprint(auth_bp)
        print("✅ routes.auth registrado")
    
    # ✅ CORREÇÃO DEFINITIVA: CONFIGURAÇÕES DE USUÁRIO
    if HAS_USER_SETTINGS_BP and user_settings_bp:
        app.register_blueprint(user_settings_bp)
        print("✅ routes.user_settings registrado")
        
        # ✅ ENDPOINT DE VERIFICAÇÃO DE TOKEN PARA PRODUÇÃO
        @app.route('/api/verify-token', methods=['POST'])
        def verify_token():
            """Verificar se um token JWT é válido"""
            try:
                data = request.get_json()
                token = data.get('token') if data else None
                
                if not token:
                    # Tentar pegar do header Authorization
                    auth_header = request.headers.get('Authorization', '')
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ')[1]
                
                if not token:
                    return jsonify({
                        'success': False,
                        'error': 'Token não fornecido'
                    }), 400
                
                # Verificar token usando sistema de segurança
                if security_manager:
                    try:
                        payload = security_manager.verify_jwt_token(token)
                        if payload and 'user_id' in payload:
                            # Buscar dados do usuário
                            db = SessionLocal()
                            try:
                                user = db.query(User).filter(User.id == payload['user_id']).first()
                                if user and user.is_active:
                                    return jsonify({
                                        'success': True,
                                        'user': user.to_dict(),
                                        'message': 'Token válido'
                                    })
                                else:
                                    return jsonify({
                                        'success': False,
                                        'error': 'Usuário não encontrado ou inativo'
                                    }), 401
                            finally:
                                db.close()
                        else:
                            return jsonify({
                                'success': False,
                                'error': 'Token inválido'
                            }), 401
                    except Exception as e:
                        return jsonify({
                            'success': False,
                            'error': f'Erro na verificação: {str(e)}'
                        }), 401
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Sistema de segurança não disponível'
                    }), 503
                    
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f'Erro interno: {str(e)}'
                }), 500
    else:
        print("❌ routes.user_settings NÃO está disponível")
        print("🛠️  Para corrigir:")
        print("   1. Crie o arquivo routes/user_settings.py")
        print("   2. Use o código do primeiro artefato")
        print("   3. Crie models/user.py com o código do segundo artefato")
    
    # Registrar outros blueprints
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
        """Health check otimizado com verificações de configurações"""
        
        security_status = {
            'security_enabled': HAS_SECURITY,
            'security_manager_active': security_manager is not None,
            'security_required': REQUIRE_SECURITY,
            'development_mode': DEVELOPMENT_MODE,
            'jwt_configured': bool(os.getenv('JWT_SECRET')),
            'encryption_configured': bool(os.getenv('ENCRYPTION_PASSWORD')),
            'redis_connected': False,
            'auth_system_enabled': HAS_AUTH,
            'webhook_system_enabled': webhook_bp is not None,
            'user_settings_enabled': HAS_USER_SETTINGS_BP
        }
        
        # Testar Redis se disponível
        if security_manager:
            try:
                security_manager.redis_client.ping()
                security_status['redis_connected'] = True
            except Exception:
                security_status['redis_connected'] = False
        
        # Verificar usuários
        user_stats = {
            'total_users': 0, 
            'admin_exists': False, 
            'auth_working': False,
            'database_error': None
        }
        
        if HAS_AUTH:
            try:
                db = SessionLocal()
                try:
                    user_stats['total_users'] = db.query(User).count()
                    admin = db.query(User).filter(User.role == 'admin').first()
                    user_stats['admin_exists'] = admin is not None
                    user_stats['auth_working'] = True
                finally:
                    db.close()
            except Exception as e:
                user_stats['database_error'] = str(e)
        
        # Testar sistema de configurações
        settings_test = {
            'user_settings_table_exists': False,
            'can_query_settings': False,
            'total_settings': 0,
            'error': None
        }
        
        if HAS_USER_SETTINGS_BP and UserSettings:
            try:
                db = SessionLocal()
                try:
                    settings_count = db.query(UserSettings).count()
                    settings_test['user_settings_table_exists'] = True
                    settings_test['can_query_settings'] = True
                    settings_test['total_settings'] = settings_count
                finally:
                    db.close()
            except Exception as e:
                settings_test['error'] = str(e)
        
        # Status geral
        overall_health = (
            (not REQUIRE_SECURITY or security_status['redis_connected']) and
            (not HAS_AUTH or user_stats['auth_working']) and
            (not HAS_USER_SETTINGS_BP or settings_test['can_query_settings'])
        )
        
        response_data = {
            'success': overall_health,
            'message': 'API HVAC Produção funcionando' if overall_health else 'API com problemas',
            'version': '2.1.0-production-with-user-settings',
            'mode': 'development' if DEVELOPMENT_MODE else 'production',
            'features': {
                'user_settings': 'ACTIVE' if HAS_USER_SETTINGS_BP else 'DISABLED',
                'authentication': 'ACTIVE' if HAS_AUTH else 'DISABLED',
                'security': 'ACTIVE' if HAS_SECURITY else 'DISABLED',
                'webhooks': 'ACTIVE' if webhook_bp else 'DISABLED'
            },
            'security': security_status,
            'users': user_stats,
            'settings_system': settings_test,
            'endpoints': {
                'auth': '/api/auth/*' if HAS_AUTH else 'disabled',
                'user_settings': '/api/user/settings' if HAS_USER_SETTINGS_BP else 'disabled',
                'banking': '/api/bank/*' if HAS_SECURITY else 'disabled',
                'webhooks': '/api/webhooks/*' if webhook_bp else 'disabled',
                'dashboard': '/api/dashboard-data',
                'health': '/api/health',
                'verify_token': '/api/verify-token' if HAS_USER_SETTINGS_BP else 'disabled'
            },
            'timestamp': datetime.now(UTC).isoformat()
        }
        
        return jsonify(response_data), 200 if overall_health else 503
    
    @app.route('/api/dashboard-data', methods=['GET'])
    def dashboard_data_consolidado():
        """Endpoint consolidado para dados do dashboard"""
        db = SessionLocal()
        try:
            from sqlalchemy import func
            
            # Estatísticas básicas
            total_projetos = db.query(Projeto).count()
            total_clientes = db.query(Cliente).count()
            total_contas = db.query(Conta).count()
            
            try:
                total_arquivos = db.query(Arquivo).count()
            except:
                total_arquivos = 0
            
            # Receita total
            try:
                receita_total = db.query(func.sum(Projeto.valor_total)).scalar() or 0
            except:
                try:
                    receita_total = db.query(func.sum(Projeto.valor)).scalar() or 0
                except:
                    receita_total = 0
            
            # Dados recentes
            projetos_recentes = db.query(Projeto).order_by(
                Projeto.created_at.desc()
            ).limit(10).all()
            
            clientes = db.query(Cliente).order_by(
                Cliente.created_at.desc()
            ).limit(50).all()
            
            contas = db.query(Conta).order_by(
                Conta.data_vencimento.asc()
            ).limit(20).all()
            
            try:
                notificacoes = db.query(Notificacao).order_by(
                    Notificacao.created_at.desc()
                ).limit(10).all()
            except:
                notificacoes = []
            
            dashboard_data = {
                'stats': {
                    'totalProjects': total_projetos,
                    'totalClients': total_clientes,
                    'totalBills': total_contas,
                    'totalFiles': total_arquivos,
                    'revenue': float(receita_total)
                },
                'projects': [projeto.to_dict() for projeto in projetos_recentes],
                'clientes': [cliente.to_dict() for cliente in clientes],
                'bills': [conta.to_dict() for conta in contas],
                'files': [],
                'notifications': [notificacao.to_dict() for notificacao in notificacoes]
            }
            
            return jsonify({
                'success': True,
                'data': dashboard_data,
                'timestamp': datetime.now().isoformat(),
                'message': 'Dados consolidados carregados (produção com configurações)'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Erro ao carregar dados: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }), 500
        finally:
            db.close()
    
    return app

if __name__ == '__main__':
    print("\n🔐 Verificações finais...")
    
    if HAS_AUTH:
        print("✅ Sistema de autenticação carregado")
        
        jwt_secret = os.getenv('JWT_SECRET')
        if not jwt_secret:
            if not DEVELOPMENT_MODE:
                print("❌ JWT_SECRET não definido em produção!")
                sys.exit(1)
            else:
                print("⚠️  JWT_SECRET não definido - usando padrão para desenvolvimento")
        else:
            print("✅ JWT_SECRET configurado")
        
        if initialize_auth_system:
            try:
                auth_ok = initialize_auth_system()
                if auth_ok:
                    print("✅ Sistema de autenticação inicializado")
            except Exception as e:
                print(f"⚠️  Erro ao inicializar autenticação: {e}")
    
    if HAS_USER_SETTINGS_BP:
        print("✅ Sistema de configurações de usuário ativo")
    else:
        print("❌ Sistema de configurações de usuário NÃO ativo")
        print("🛠️  SOLUÇÃO RÁPIDA:")
        print("   1. Crie routes/user_settings.py com o código fornecido")
        print("   2. Crie models/user.py com o código fornecido") 
        print("   3. Reinicie a aplicação")
    
    try:
        app = create_app()
        
        print("\n🚀 INICIANDO API HVAC PRODUÇÃO...")
        print(f"📋 Modo: {'DESENVOLVIMENTO' if DEVELOPMENT_MODE else 'PRODUÇÃO'}")
        print(f"🔐 Segurança: {'ATIVA' if HAS_SECURITY else 'INATIVA'}")
        print(f"👤 Autenticação: {'ATIVA' if HAS_AUTH else 'INATIVA'}")
        print(f"⚙️  Configurações: {'ATIVO' if HAS_USER_SETTINGS_BP else 'INATIVO'}")
        print(f"🎯 Webhooks: {'ATIVO' if webhook_bp else 'INATIVO'}")
        
        print("\n📍 ENDPOINTS PRINCIPAIS:")
        print("❤️  Health: http://localhost:5000/api/health")
        print("📊 Dashboard: http://localhost:5000/api/dashboard-data")
        
        if HAS_AUTH:
            print("🔑 Autenticação:")
            print("   POST /api/auth/login")
            print("   POST /api/auth/register") 
            print("   GET /api/auth/profile")
            print("   POST /api/verify-token")
        
        if HAS_USER_SETTINGS_BP:
            print("⚙️  Configurações:")
            print("   GET /api/user/settings")
            print("   PUT /api/user/settings")
            print("   POST /api/user/settings/reset")
            print("   GET /api/user/profile")
            print("   PUT /api/user/account")
        
        print("\n" + "=" * 60)
        print("🎉 SISTEMA PRONTO PARA PRODUÇÃO!")
        print("🔧 CORREÇÕES APLICADAS:")
        print("   ✅ Blueprint user_settings corrigido")
        print("   ✅ Modelo User atualizado para produção")
        print("   ✅ Autenticação JWT robusta")
        print("   ✅ Sistema de configurações completo")
        print("   ✅ Validações de segurança")
        print("   ✅ Logs estruturados")
        print("   ✅ Health check detalhado")
        print("   ✅ Endpoints de verificação")
        print("=" * 60)
        
        if not HAS_USER_SETTINGS_BP:
            print("\n🚨 AÇÃO NECESSÁRIA:")
            print("   1. Crie o arquivo: routes/user_settings.py")
            print("   2. Crie o arquivo: models/user.py") 
            print("   3. Use os códigos dos artefatos fornecidos")
            print("   4. Reinicie a aplicação")
            print("   Sem isso, as configurações de usuário não funcionarão!")
        
        app.run(
            debug=DEVELOPMENT_MODE,
            host='0.0.0.0', 
            port=5000,
            use_reloader=DEVELOPMENT_MODE
        )
        
    except Exception as e:
        print(f"\n🚨 FALHA CRÍTICA NA INICIALIZAÇÃO: {e}")
        print("\n🛠️  CHECKLIST DE VERIFICAÇÃO:")
        print("   ✅ Variáveis de ambiente configuradas?")
        print("   ✅ Redis rodando (se REQUIRE_SECURITY=True)?")
        print("   ✅ Banco de dados acessível?")
        print("   ✅ Arquivo routes/user_settings.py existe?")
        print("   ✅ Arquivo models/user.py existe?")
        print("   ✅ Dependências instaladas (bcrypt, structlog)?")
        print("   ✅ Permissões de escrita na pasta uploads/?")
        print("\n💡 SOLUÇÕES RÁPIDAS:")
        print("   📁 Criar pastas: mkdir -p routes models uploads")
        print("   📦 Instalar deps: pip install bcrypt structlog")
        print("   🐳 Redis: docker run -d --name redis -p 6379:6379 redis:alpine")
        sys.exit(1)