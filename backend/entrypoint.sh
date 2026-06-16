#!/bin/sh
set -e

echo "Waiting for MySQL at ${DB_HOST:-localhost}:${DB_PORT:-3306}..."
python - <<'PYEOF'
import pymysql, os, time, sys

host     = os.getenv("DB_HOST", "localhost")
port     = int(os.getenv("DB_PORT", "3306"))
user     = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASSWORD", "")

for attempt in range(30):
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, connect_timeout=2)
        conn.close()
        print(f"MySQL is ready at {host}:{port}")
        sys.exit(0)
    except Exception as e:
        print(f"Attempt {attempt + 1}/30: MySQL not ready ({e}), retrying in 2s...")
        time.sleep(2)

print("ERROR: MySQL did not start within 60s.", file=sys.stderr)
sys.exit(1)
PYEOF

echo "Starting backend on port ${PORT:-5000}..."
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --threads 4 run:app
