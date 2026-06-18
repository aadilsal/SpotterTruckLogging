#!/bin/sh
set -e

echo "Waiting for database..."
python <<'PY'
import os
import sys
import time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

max_attempts = 30
for attempt in range(1, max_attempts + 1):
    try:
        import django
        django.setup()
        from django.db import connection
        connection.ensure_connection()
        print("Database is ready.")
        break
    except Exception as exc:
        if attempt == max_attempts:
            print(f"Database connection failed after {max_attempts} attempts: {exc}", file=sys.stderr)
            sys.exit(1)
        print(f"Attempt {attempt}/{max_attempts} failed: {exc}")
        time.sleep(2)
PY

python manage.py migrate --noinput
exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 2
