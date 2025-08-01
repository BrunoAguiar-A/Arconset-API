# debug_specific_routes.py - TESTAR ROTAS ESPECÍFICAS
import requests
import json

def test_multiple_routes():
    """Testar múltiplas rotas para encontrar qual funciona"""
    
    routes_to_test = [
        # Rota raiz
        ('GET', '/', 'Rota raiz'),
        
        # Health checks
        ('GET', '/api/health', 'Health principal'),
        ('GET', '/health', 'Health alternativo'),
        
        # Arquivos (com FIX garantido)
        ('GET', '/api/arquivos/test', 'Teste arquivos FIX'),
        ('GET', '/api/arquivos/health', 'Health arquivos'),
        
        # Sistema
        ('GET', '/api/system/status', 'Status sistema'),
        
        # Dashboard
        ('GET', '/api/dashboard/health', 'Health dashboard'),
        
        # Auth (sem token)
        ('POST', '/api/auth/login', 'Login (teste)', {
            "username": "admin", 
            "password": "ArconSet2024#Admin!"
        })
    ]
    
    print("🧪 TESTANDO MÚLTIPLAS ROTAS...")
    print("=" * 60)
    
    working_routes = []
    broken_routes = []
    
    for method, route, description, data in routes_to_test:
        try:
            url = f'http://localhost:5000{route}'
            
            if method == 'GET':
                response = requests.get(url, timeout=5)
            elif method == 'POST':
                response = requests.post(url, json=data, timeout=5)
            
            status = response.status_code
            
            if status == 200:
                print(f"✅ {description}: {status}")
                working_routes.append((route, status))
                
                # Se for login bem-sucedido, extrair token
                if 'login' in route.lower() and status == 200:
                    try:
                        login_data = response.json()
                        if login_data.get('success'):
                            token = login_data.get('token', '')
                            print(f"   🔑 Token obtido: {token[:20]}...")
                            return token
                    except:
                        pass
                        
            elif status == 401:
                print(f"🔐 {description}: {status} (Auth required - normal)")
                working_routes.append((route, status))
            elif status == 404:
                print(f"❌ {description}: {status} (Not Found)")
                broken_routes.append((route, status))
            elif status == 503:
                print(f"🚨 {description}: {status} (Service Unavailable)")
                broken_routes.append((route, status))
            else:
                print(f"⚠️  {description}: {status}")
                
        except requests.exceptions.ConnectionError:
            print(f"💥 {description}: CONNECTION REFUSED")
        except Exception as e:
            print(f"❌ {description}: ERRO - {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 RESULTADO:")
    print(f"   ✅ Funcionando: {len(working_routes)}")
    print(f"   ❌ Quebradas: {len(broken_routes)}")
    
    if working_routes:
        print(f"\n🎯 ROTAS QUE FUNCIONAM:")
        for route, status in working_routes:
            print(f"   ✅ {route} - {status}")
    
    if broken_routes:
        print(f"\n🚨 ROTAS QUEBRADAS:")
        for route, status in broken_routes:
            print(f"   ❌ {route} - {status}")
    
    return None

def test_with_browser_headers():
    """Testar com headers de browser"""
    print("\n🌐 TESTANDO COM HEADERS DE BROWSER...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    }
    
    test_routes = ['/api/health', '/api/arquivos/test', '/']
    
    for route in test_routes:
        try:
            response = requests.get(f'http://localhost:5000{route}', headers=headers, timeout=5)
            print(f"🌐 {route}: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   ✅ JSON válido: {len(str(data))} chars")
                except:
                    print(f"   📄 HTML/Text: {len(response.text)} chars")
            
        except Exception as e:
            print(f"❌ {route}: {e}")

def test_cors_directly():
    """Testar CORS diretamente"""
    print("\n🔗 TESTANDO CORS...")
    
    # Simular requisição do frontend
    headers = {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get('http://localhost:5000/api/arquivos/test', headers=headers, timeout=5)
        print(f"CORS Test: {response.status_code}")
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
        }
        
        for header, value in cors_headers.items():
            print(f"   {header}: {value}")
            
    except Exception as e:
        print(f"❌ CORS Test: {e}")

if __name__ == "__main__":
    print("🚀 DIAGNÓSTICO DETALHADO - ROTAS ESPECÍFICAS")
    print("=" * 60)
    
    # Testar múltiplas rotas
    token = test_multiple_routes()
    
    # Testar com headers de browser
    test_with_browser_headers()
    
    # Testar CORS
    test_cors_directly()
    
    print("\n🎯 CONCLUSÕES:")
    print("1. Se NENHUMA rota funciona → Problema de rede/firewall")
    print("2. Se apenas /api/health falha → Problema na rota health")
    print("3. Se rotas FIX funcionam → Use as rotas FIX")
    print("4. Se login funciona → Problema só em rotas específicas")
    print("\n🔧 PRÓXIMO PASSO:")
    print("   Use as rotas que funcionam e ignore as quebradas!")