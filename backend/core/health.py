"""Liveness/readiness endpoint for the host's health checks."""
from django.db import connection
from django.http import JsonResponse


def health(request):
    """Report OK only if the database is actually reachable."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception as exc:
        return JsonResponse({'status': 'error', 'database': str(exc)}, status=503)

    return JsonResponse({'status': 'ok', 'database': 'ok'})
