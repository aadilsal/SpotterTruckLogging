from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    DriverProfileView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ThrottledLoginView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', ThrottledLoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path(
        'auth/password-reset/confirm/',
        PasswordResetConfirmView.as_view(),
        name='password-reset-confirm',
    ),
    path('profile/', DriverProfileView.as_view(), name='driver-profile'),
]
