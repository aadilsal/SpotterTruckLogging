import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DriverProfile
from .serializers import (
    DriverProfileSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


class RegisterView(generics.CreateAPIView):
    """Create an account and hand back a token pair so the client can go
    straight into the app without a second round trip to /login/."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'user': UserSerializer(user).data, **tokens_for(user)},
            status=201,
        )


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DriverProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH the caller's saved carrier defaults.

    Created on first access so the client never has to handle a 404.
    """

    serializer_class = DriverProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = DriverProfile.objects.get_or_create(user=self.request.user)
        return profile


class ThrottledLoginView(TokenObtainPairView):
    """Login with a rate limit, so the token endpoint is not a free password oracle."""

    throttle_scope = 'auth'


class PasswordResetRequestView(APIView):
    """Email a reset link. Always returns 200 so the response cannot be used to
    enumerate which email addresses have accounts."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        for user in User.objects.filter(email__iexact=email, is_active=True):
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'
            try:
                send_mail(
                    subject='Reset your SpotterTruckLogger password',
                    message=(
                        f'Hi {user.username},\n\n'
                        'Use the link below to choose a new password. '
                        'It expires shortly and can only be used once.\n\n'
                        f'{link}\n\n'
                        'If you did not request this, you can ignore this email.\n'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception('Failed to send password reset email')

        return Response(
            {'detail': 'If an account exists for that email, a reset link is on its way.'}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not default_token_generator.check_token(user, data['token']):
            return Response(
                {'detail': 'That reset link is invalid or has expired. Request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Your password has been updated. You can sign in now.'})
