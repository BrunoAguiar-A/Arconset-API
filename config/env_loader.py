import os
from dotenv import load_dotenv

# Caminho absoluto para o .env na raiz do projeto
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path)
