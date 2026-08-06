from typing import TYPE_CHECKING

from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

from accounts.models import DriverProfile

if TYPE_CHECKING:
    from django.contrib.auth.models import User
else:
    from django.contrib.auth import get_user_model

    User = get_user_model()

PASSWORD = 'RoadTrip!2024'


class ThrottleResetAPITestCase(APITestCase):
    """DRF resolves throttle_classes at import time, so settings overrides cannot
    switch throttling off. Reset the shared rate-limit cache instead, otherwise
    the 'auth' budget leaks between tests."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        super().setUp()


class RegistrationTests(ThrottleResetAPITestCase):
    url = '/api/auth/register/'

    def test_register_returns_token_pair(self):
        res = self.client.post(self.url, {'username': 'jane', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['username'], 'jane')

    def test_register_never_echoes_password(self):
        res = self.client.post(self.url, {'username': 'jane', 'password': PASSWORD}, format='json')
        self.assertNotIn('password', str(res.data))

    def test_duplicate_username_rejected_case_insensitively(self):
        User.objects.create_user(username='jane', password=PASSWORD)
        res = self.client.post(self.url, {'username': 'JANE', 'password': PASSWORD}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_weak_password_rejected(self):
        res = self.client.post(self.url, {'username': 'jane', 'password': '123'}, format='json')
        self.assertEqual(res.status_code, 400)


class LoginTests(ThrottleResetAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='jane', password=PASSWORD)

    def test_login_returns_tokens(self):
        res = self.client.post(
            '/api/auth/login/', {'username': 'jane', 'password': PASSWORD}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)

    def test_login_with_wrong_password_rejected(self):
        res = self.client.post(
            '/api/auth/login/', {'username': 'jane', 'password': 'nope'}, format='json'
        )
        self.assertEqual(res.status_code, 401)

    def test_me_requires_a_token(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_me_returns_the_caller(self):
        self.client.force_authenticate(self.user)
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.data['username'], 'jane')


class DriverProfileTests(ThrottleResetAPITestCase):
    url = '/api/profile/'

    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password=PASSWORD)
        self.bob = User.objects.create_user(username='bob', password=PASSWORD)

    def test_profile_requires_auth(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_profile_is_created_on_first_access(self):
        self.client.force_authenticate(self.jane)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['carrier_name'], '')
        self.assertTrue(DriverProfile.objects.filter(user=self.jane).exists())

    def test_profile_saves_and_trims(self):
        self.client.force_authenticate(self.jane)
        res = self.client.put(
            self.url,
            {
                'carrier_name': '  Acme Freight  ',
                'truck_number': 'T-1',
                'main_office_address': '1 Main St',
                'home_terminal_address': '1 Main St',
            },
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['carrier_name'], 'Acme Freight')
        self.assertTrue(res.data['is_complete'])

    def test_profiles_are_isolated_between_users(self):
        self.client.force_authenticate(self.jane)
        self.client.put(
            self.url,
            {'carrier_name': 'Jane Freight', 'truck_number': 'J-1',
             'main_office_address': 'x', 'home_terminal_address': 'x'},
            format='json',
        )
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get(self.url).data['carrier_name'], '')


class PasswordResetTests(ThrottleResetAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            username='jane', email='jane@example.com', password=PASSWORD
        )

    def _request_reset(self, email):
        return self.client.post('/api/auth/password-reset/', {'email': email}, format='json')

    def test_reset_email_is_sent(self):
        res = self._request_reset('jane@example.com')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reset-password?uid=', mail.outbox[0].body)

    def test_unknown_email_does_not_leak_account_existence(self):
        known = self._request_reset('jane@example.com')
        unknown = self._request_reset('nobody@example.com')
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data['detail'], unknown.data['detail'])
        self.assertEqual(len(mail.outbox), 1)  # nothing sent for the unknown address

    def _uid_and_token(self):
        self._request_reset('jane@example.com')
        body = mail.outbox[-1].body
        query = body.split('reset-password?')[1].split()[0]
        parts = dict(p.split('=') for p in query.split('&'))
        return parts['uid'], parts['token']

    def test_reset_confirm_changes_the_password(self):
        uid, token = self._uid_and_token()
        res = self.client.post(
            '/api/auth/password-reset/confirm/',
            {'uid': uid, 'token': token, 'new_password': 'BrandNewPass!99'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPass!99'))

    def test_token_cannot_be_reused(self):
        uid, token = self._uid_and_token()
        payload = {'uid': uid, 'token': token, 'new_password': 'BrandNewPass!99'}
        self.assertEqual(
            self.client.post('/api/auth/password-reset/confirm/', payload, format='json').status_code,
            200,
        )
        self.assertEqual(
            self.client.post('/api/auth/password-reset/confirm/', payload, format='json').status_code,
            400,
        )

    def test_bad_token_rejected(self):
        uid, _ = self._uid_and_token()
        res = self.client.post(
            '/api/auth/password-reset/confirm/',
            {'uid': uid, 'token': 'not-a-real-token', 'new_password': 'BrandNewPass!99'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_weak_new_password_rejected(self):
        uid, token = self._uid_and_token()
        res = self.client.post(
            '/api/auth/password-reset/confirm/',
            {'uid': uid, 'token': token, 'new_password': '123'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)


class AuthThrottleTests(ThrottleResetAPITestCase):
    """The 'auth' scope is the defence against credential stuffing."""

    def setUp(self):
        super().setUp()
        User.objects.create_user(username='jane', password=PASSWORD)

    def test_repeated_failed_logins_get_rate_limited(self):
        statuses = [
            self.client.post(
                '/api/auth/login/',
                {'username': 'jane', 'password': f'wrong-{i}'},
                format='json',
            ).status_code
            for i in range(15)
        ]
        self.assertIn(429, statuses, f'expected a 429 among {statuses}')
        # The limit must bite before all 15 guesses land.
        self.assertLess(statuses.index(429), 15)
