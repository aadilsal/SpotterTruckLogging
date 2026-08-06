from typing import TYPE_CHECKING

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import DriverProfile

if TYPE_CHECKING:
    from django.contrib.auth.models import User
else:
    from django.contrib.auth import get_user_model

    User = get_user_model()


class DriverProfileSerializer(serializers.ModelSerializer[DriverProfile]):
    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = DriverProfile
        fields = (
            'carrier_name',
            'truck_number',
            'main_office_address',
            'home_terminal_address',
            'is_complete',
            'updated_at',
        )
        read_only_fields = ('updated_at',)

    def validate(self, attrs):
        # Trim incidental whitespace so pre-filled values stay clean.
        for key, value in attrs.items():
            if isinstance(value, str):
                attrs[key] = value.strip()
        return attrs


class UserSerializer(serializers.ModelSerializer["User"]):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class RegisterSerializer(serializers.ModelSerializer["User"]):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value
