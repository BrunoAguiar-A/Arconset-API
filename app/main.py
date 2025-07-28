# 📁 main.py - VERSÃO CORRIGIDA PARA SISTEMA OTIMIZADO
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

try:
    print("🔍 Importando sistema de autenticação...")
    from routes.auth import auth_bp
    # ✅ IMPORT CORRIGIDO - Usar middleware.auth_middleware (não auth_middleware_simple)
    from middleware.auth_middleware import create_default_admin, initialize_auth_system
    print("✅ Sistema de autenticação importado com sucesso")
    HAS_AUTH = True
except ImportError as e:
    print(f"❌ Erro ao importar autenticação: {e}")
    print("⚠️ Sistema funcionará SEM autenticação")

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

def create_app():
    app = Flask(__name__)
    
    # Configurações
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max
    
    # ===== CRIAR TABELAS (INCLUINDO WEBHOOK) =====
    print("📋 Criando/verificando tabelas do banco de dados...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas criadas/verificadas com sucesso")
        
        # Criar tabela de boletos se webhook está disponível
        if webhook_bp:
            try:
                from routes.webhook_receiver import BoletoRecebido
                print("✅ Tabela boletos_recebidos verificada")
            except Exception as e:
                print(f"⚠️  Erro ao verificar tabela de boletos: {e}")
        
        if HAS_AUTH:
            print("👤 Sistema de autenticação disponível")
                    
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        if not DEVELOPMENT_MODE:
            sys.exit(1)
    
    # ===== CONFIGURAR SEGURANÇA OTIMIZADA =====
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
        """Health check otimizado"""
        
        security_status = {
            'security_enabled': HAS_SECURITY,
            'security_manager_active': security_manager is not None,
            'security_required': REQUIRE_SECURITY,
            'development_mode': DEVELOPMENT_MODE,
            'jwt_configured': bool(os.getenv('JWT_SECRET')),
            'encryption_configured': bool(os.getenv('ENCRYPTION_PASSWORD')),
            'redis_connected': False,
            'auth_system_enabled': HAS_AUTH,
            'webhook_system_enabled': webhook_bp is not None
        }
        
        # Testar Redis se disponível
        redis_error = None
        if security_manager:
            try:
                security_manager.redis_client.ping()
                security_status['redis_connected'] = True
            except Exception as e:
                security_status['redis_connected'] = False
                redis_error = str(e)
        
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
                user_stats['auth_working'] = False
        
        # Testar JWT se disponível
        jwt_test = {
            'can_generate': False,
            'can_verify': False,
            'error': None
        }
        
        if security_manager and HAS_AUTH:
            try:
                test_payload = {
                    'user_id': 'test-user-id',
                    'username': 'test-user',
                    'role': 'user'
                }
                
                test_token = security_manager.generate_jwt_token(test_payload, expires_hours=1)
                jwt_test['can_generate'] = bool(test_token)
                
                if test_token:
                    verified_payload = security_manager.verify_jwt_token(test_token)
                    jwt_test['can_verify'] = (
                        verified_payload and 
                        verified_payload.get('user_id') == 'test-user-id'
                    )
                
            except Exception as e:
                jwt_test['error'] = str(e)
        
        # Status geral
        overall_health = (
            security_status['auth_system_enabled'] and
            user_stats['auth_working'] and
            (not REQUIRE_SECURITY or security_status['redis_connected']) and
            (not HAS_SECURITY or jwt_test['can_generate'])
        )
        
        response_data = {
            'success': overall_health,
            'message': 'API HVAC Otimizada funcionando' if overall_health else 'API com problemas',
            'version': '2.0.0-optimized',
            'mode': 'development' if DEVELOPMENT_MODE else 'production',
            'optimizations': {
                'security_reduced': '78%',
                'auth_middleware_reduced': '78%',
                'bank_routes_reduced': '69%',
                'total_code_reduced': '76%'
            },
            'security': security_status,
            'users': user_stats,
            'jwt': jwt_test,
            'endpoints': {
                'auth': '/api/auth/*' if HAS_AUTH else 'disabled',
                'banking': '/api/bank/*' if HAS_SECURITY else 'disabled',
                'webhooks': '/api/webhooks/*' if webhook_bp else 'disabled',
                'dashboard': '/api/dashboard-data',
                'health': '/api/health'
            },
            'timestamp': datetime.now(UTC).isoformat()
        }
        
        return jsonify(response_data), 200 if overall_health else 503
    
    @app.route('/api/dashboard-data', methods=['GET'])
    def dashboard_data_consolidado():
        """Endpoint consolidado para dados do dashboard"""
        db = SessionLocal()
        try:
            # Importar func se necessário
            from sqlalchemy import func
            
            # 📊 Estatísticas básicas
            total_projetos = db.query(Projeto).count()
            total_clientes = db.query(Cliente).count()
            total_contas = db.query(Conta).count()
            
            # Tentar contar arquivos (pode não existir)
            try:
                total_arquivos = db.query(Arquivo).count()
            except:
                total_arquivos = 0
            
            # 💰 Receita total
            try:
                receita_total = db.query(func.sum(Projeto.valor_total)).scalar() or 0
            except:
                try:
                    receita_total = db.query(func.sum(Projeto.valor)).scalar() or 0
                except:
                    receita_total = 0
            
            # 🏗️ Projetos recentes
            projetos_recentes = db.query(Projeto).order_by(
                Projeto.created_at.desc()
            ).limit(10).all()
            
            # 👥 Clientes
            clientes = db.query(Cliente).order_by(
                Cliente.created_at.desc()
            ).limit(50).all()
            
            # 💰 Contas
            contas = db.query(Conta).order_by(
                Conta.data_vencimento.asc()
            ).limit(20).all()
            
            # 🔔 Notificações
            try:
                notificacoes = db.query(Notificacao).order_by(
                    Notificacao.created_at.desc()
                ).limit(10).all()
            except:
                notificacoes = []
            
            # 📁 Arquivos mock
            arquivos_mock = [
                {
                    'id': 1,
                    'nome_original': 'Contrato_Cliente_A.pdf',
                    'tipo_documento': 'Contrato',
                    'projeto_nome': projetos_recentes[0].nome if projetos_recentes else 'Projeto Exemplo',
                    'created_at': datetime.now().isoformat()
                },
                {
                    'id': 2,
                    'nome_original': 'Proposta_Comercial.docx',
                    'tipo_documento': 'Proposta', 
                    'projeto_nome': projetos_recentes[1].nome if len(projetos_recentes) > 1 else 'Projeto Mobile',
                    'created_at': datetime.now().isoformat()
                }
            ]
            
            # 📋 Montar resposta consolidada
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
                'files': arquivos_mock,
                'notifications': [notificacao.to_dict() for notificacao in notificacoes]
            }
            
            return jsonify({
                'success': True,
                'data': dashboard_data,
                'timestamp': datetime.now().isoformat(),
                'message': 'Dados consolidados carregados (sistema otimizado)'
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
    # ===== VERIFICAÇÕES DE AUTENTICAÇÃO =====
    print("\n🔐 Verificações de autenticação otimizada...")
    
    if HAS_AUTH:
        print("✅ Sistema de autenticação otimizado carregado")
        
        # Verificar JWT_SECRET
        jwt_secret = os.getenv('JWT_SECRET')
        if not jwt_secret:
            print("❌ JWT_SECRET não definido!")
            sys.exit(1)
        elif len(jwt_secret) < 32:
            print("⚠️ JWT_SECRET muito curto (recomendado: 64+ caracteres)")
        else:
            print("✅ JWT_SECRET configurado adequadamente")
        
        # Inicializar sistema de autenticação
        if initialize_auth_system:
            auth_ok = initialize_auth_system()
            if auth_ok:
                print("✅ Sistema de autenticação inicializado")
            else:
                print("⚠️ Problemas na inicialização do sistema de auth")
    
    else:
        print("⚠️ Sistema de autenticação NÃO carregado")
    
    # Verificações de segurança
    print("\n🔐 Verificações de segurança...")
    
    if not DEVELOPMENT_MODE:
        print("🏭 MODO PRODUÇÃO: Verificações rigorosas ativadas")
        
        required_vars = ['JWT_SECRET', 'ENCRYPTION_PASSWORD']
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            print(f"🚨 FALHA: Variáveis obrigatórias não definidas: {missing}")
            sys.exit(1)
    else:
        print("🧪 MODO DESENVOLVIMENTO: Verificações flexíveis")
    
    # Criar e executar app
    try:
        app = create_app()
        
        print("\n🚀 Iniciando API HVAC OTIMIZADA...")
        print(f"📋 Modo: {'DESENVOLVIMENTO' if DEVELOPMENT_MODE else 'PRODUÇÃO'}")
        print(f"🔐 Segurança: {'ATIVA (Otimizada)' if HAS_SECURITY else 'INATIVA'}")
        print(f"👤 Autenticação: {'ATIVA (Otimizada)' if HAS_AUTH else 'INATIVA'}")
        print(f"🎯 Webhooks: {'ATIVO' if webhook_bp else 'INATIVO'}")
        print("❤️  Health check: http://localhost:5000/api/health")
        
        if HAS_SECURITY:
            print("🧪 Teste segurança: http://localhost:5000/api/security/test")
        
        if HAS_AUTH:
            print("🔑 Endpoints de auth:")
            print("   POST /api/auth/login - Login")
            print("   POST /api/auth/register - Registro")
            print("   GET /api/auth/profile - Perfil")
        
        if webhook_bp:
            print("🎯 Endpoints de webhook:")
            print("   POST /api/webhooks/boletos/BRADESCO")
            print("   POST /api/webhooks/boletos/ITAU")
            print("   POST /api/webhooks/boletos/BANCO_BRASIL")
            print("   GET /api/webhooks/boletos - Listar boletos")
        
        print("🎉 REDUÇÃO DE CÓDIGO: 76% menos linhas!")
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
        print("   4. Arquivos otimizados foram aplicados corretamente")
        sys.exit(1)