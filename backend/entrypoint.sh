#!/bin/sh
set -e

echo "==> [Docker Entrypoint] Esperando a que PostgreSQL este disponible..."
python - << 'EOF'
import socket, time, os
db_host = os.getenv("DB_HOST", "db")
db_port = int(os.getenv("DB_PORT", 5432))
for i in range(30):
    try:
        s = socket.create_connection((db_host, db_port), timeout=2)
        s.close()
        print(f"==> PostgreSQL listo en {db_host}:{db_port}!")
        break
    except OSError:
        time.sleep(1)
else:
    print("==> Error: Tiempo de espera agotado para PostgreSQL.")
    exit(1)
EOF

echo "==> [Docker Entrypoint] 1. Creando tablas en la base de datos..."
python init_db.py

echo "==> [Docker Entrypoint] 2. Ejecutando Seed Inicial de datos (Ciclo 1)..."
python seed.py

echo "==> [Docker Entrypoint] 3. Iniciando servidor FastAPI con Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
