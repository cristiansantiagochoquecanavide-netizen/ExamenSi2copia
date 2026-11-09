#!/bin/sh
set -e

echo "==> [Docker Entrypoint] Verificando conectividad con PostgreSQL..."
python - << 'EOF'
import socket, time, os
from urllib.parse import urlparse

database_url = os.getenv("DATABASE_URL", "")
db_host = os.getenv("DB_HOST")
db_port = int(os.getenv("DB_PORT", "5432"))

if not db_host and database_url:
    try:
        clean_url = database_url.replace("postgresql+asyncpg://", "http://").replace("postgres://", "http://").replace("postgresql://", "http://")
        parsed = urlparse(clean_url)
        if parsed.hostname:
            db_host = parsed.hostname
        if parsed.port:
            db_port = parsed.port
    except Exception as e:
        print(f"Nota parseando DATABASE_URL: {e}")

db_host = db_host or "db"

print(f"==> Esperando conexion a PostgreSQL en {db_host}:{db_port}...")
connected = False
for i in range(30):
    try:
        s = socket.create_connection((db_host, db_port), timeout=2)
        s.close()
        print(f"==> PostgreSQL listo en {db_host}:{db_port}!")
        connected = True
        break
    except OSError:
        time.sleep(1)

if not connected:
    print(f"==> [Aviso] No se pudo verificar puerto TCP en {db_host}:{db_port}. Intentando continuar con la inicializacion...")
EOF

echo "==> [Docker Entrypoint] 1. Creando tablas y aplicando migraciones en PostgreSQL..."
python seeders/init_db.py || echo "==> [Aviso] init_db reporto advertencia, continuando..."

echo "==> [Docker Entrypoint] 2. Ejecutando Seed Inicial de datos (idempotente)..."
python seeders/seed.py || echo "==> [Aviso] seed reporto advertencia, continuando..."

PORT="${PORT:-8000}"
echo "==> [Docker Entrypoint] 3. Iniciando servidor FastAPI con Uvicorn en puerto $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
