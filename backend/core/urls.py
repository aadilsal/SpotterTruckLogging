from django.contrib import admin
from django.urls import path, include

from .health import health

urlpatterns = [
    path("healthz/", health, name="health"),
    path("admin/", admin.site.urls),
    path("api/", include('accounts.urls')),
    path("api/", include('trips.urls')),
]
