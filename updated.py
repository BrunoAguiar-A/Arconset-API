# add_pasta_routes.py - SCRIPT PARA ADICIONAR ROTAS DE PASTAS
import requests
import json

def test_routes():
    """Testar se as rotas estão funcionando"""
    base_url = "http://localhost:5000"
    
    # Fazer login primeiro para obter token
    print("🔑 Fazendo login...")
    login_data = {
        "username": "waulin",
        "password": "@Brunoa3982"  # ou a senha que você configurou
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        if response.status_code == 200:
            result = response.json()
            token = result.get('access_token')
            print(f"✅ Login realizado com sucesso")
            
            # Testar rota de pastas
            headers = {"Authorization": f"Bearer {token}"}
            
            print("\n🧪 Testando /api/pastas...")
            pastas_response = requests.get(f"{base_url}/api/pastas", headers=headers)
            print(f"Status: {pastas_response.status_code}")
            
            if pastas_response.status_code == 200:
                print("✅ Rota /api/pastas funcionando!")
                result = pastas_response.json()
                print(f"📁 Pastas encontradas: {result.get('total', 0)}")
            elif pastas_response.status_code == 404:
                print("❌ Rota /api/pastas não encontrada (404)")
                print("💡 Precisa adicionar as rotas no main.py")
            else:
                print(f"⚠️ Rota retornou: {pastas_response.status_code}")
                try:
                    print(f"Resposta: {pastas_response.json()}")
                except:
                    print(f"Resposta: {pastas_response.text}")
            
            # Testar criação de pasta
            if pastas_response.status_code == 200:
                print("\n🧪 Testando criação de pasta...")
                nova_pasta = {
                    "nome": "Teste Pasta",
                    "cor": "blue",
                    "criado_por": "teste"
                }
                
                create_response = requests.post(f"{base_url}/api/pastas", 
                                              json=nova_pasta, 
                                              headers=headers)
                print(f"Status criação: {create_response.status_code}")
                
                if create_response.status_code == 200:
                    print("✅ Criação de pasta funcionando!")
                else:
                    try:
                        error = create_response.json()
                        print(f"❌ Erro: {error}")
                    except:
                        print(f"❌ Erro: {create_response.text}")
            
        else:
            print(f"❌ Erro no login: {response.status_code}")
            try:
                print(f"Erro: {response.json()}")
            except:
                print(f"Erro: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar ao servidor")
        print("💡 Certifique-se que a API está rodando em http://localhost:5000")
    except Exception as e:
        print(f"❌ Erro: {e}")

def check_routes():
    """Verificar quais rotas estão disponíveis"""
    base_url = "http://localhost:5000"
    
    print("🔍 Verificando rotas disponíveis...")
    try:
        # Tentar acessar rota de debug se existir
        response = requests.get(f"{base_url}/api/debug/routes")
        if response.status_code == 200:
            print("📋 Rotas encontradas via /api/debug/routes")
        else:
            print("⚠️ Rota de debug não disponível")
    except:
        pass
    
    # Testar rotas específicas
    routes_to_test = [
        "/api/health",
        "/api/pastas", 
        "/api/arquivos",
        "/api/dashboard-data"
    ]
    
    print("\n🧪 Testando rotas principais:")
    for route in routes_to_test:
        try:
            response = requests.get(f"{base_url}{route}", timeout=5)
            status = response.status_code
            
            if status == 200:
                print(f"✅ {route} - OK")
            elif status == 401:
                print(f"🔒 {route} - Requer autenticação")
            elif status == 404:
                print(f"❌ {route} - Não encontrada")
            else:
                print(f"⚠️ {route} - Status {status}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ {route} - Servidor não responde")
            break
        except Exception as e:
            print(f"❌ {route} - Erro: {e}")

if __name__ == "__main__":
    print("🔧 VERIFICADOR DE ROTAS DE PASTAS")
    print("=" * 40)
    
    # Verificar se servidor está rodando
    check_routes()
    
    print("\n" + "=" * 40)
    
    # Testar funcionalidade específica
    test_routes()
    
    print("\n📋 SOLUÇÕES SE NÃO FUNCIONAR:")
    print("1. Verifique se a API está rodando: python app/main.py")
    print("2. Execute a migração do banco: python migrate_automatic.py") 
    print("3. Adicione as rotas no main.py conforme instruções")
    print("4. Reinicie a API")