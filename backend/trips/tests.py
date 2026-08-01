from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from logs.models import DailyLog
from trips.models import Trip

User = get_user_model()


class ThrottleResetAPITestCase(APITestCase):
    """Reset the shared rate-limit cache so the trip_create budget does not
    leak between tests."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        super().setUp()


TRIP_PAYLOAD = {
    'current_location': 'Dallas, TX',
    'pickup_location': 'Chicago, IL',
    'dropoff_location': 'Los Angeles, CA',
    'cycle_used': 45,
    'carrier_name': 'Acme Freight',
    'main_office_address': '1 Main St, Dallas, TX',
    'home_terminal_address': '1 Main St, Dallas, TX',
    'truck_number': 'T-100',
}


# ORS_API_KEY='MOCK' opts these tests into canned routing explicitly.
@override_settings(ORS_API_KEY='MOCK')
class TripOwnershipTests(ThrottleResetAPITestCase):
    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password='RoadTrip!2024')
        self.bob = User.objects.create_user(username='bob', password='RoadTrip!2024')

    def _create_trip(self, user):
        self.client.force_authenticate(user)
        res = self.client.post('/api/trips/', TRIP_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_trip_endpoints_require_auth(self):
        self.assertEqual(self.client.get('/api/trips/').status_code, 401)
        self.assertEqual(
            self.client.post('/api/trips/', TRIP_PAYLOAD, format='json').status_code, 401
        )

    def test_created_trip_is_owned_by_caller(self):
        data = self._create_trip(self.jane)
        self.assertEqual(Trip.objects.get(pk=data['id']).owner, self.jane)

    def test_owner_cannot_be_spoofed_via_payload(self):
        self.client.force_authenticate(self.jane)
        res = self.client.post(
            '/api/trips/', {**TRIP_PAYLOAD, 'owner': self.bob.pk}, format='json'
        )
        self.assertEqual(Trip.objects.get(pk=res.data['id']).owner, self.jane)

    def test_list_only_returns_own_trips(self):
        jane_trip = self._create_trip(self.jane)
        bob_trip = self._create_trip(self.bob)

        self.client.force_authenticate(self.jane)
        ids = [t['id'] for t in self.client.get('/api/trips/').data]
        self.assertIn(jane_trip['id'], ids)
        self.assertNotIn(bob_trip['id'], ids)

    def test_cannot_read_another_users_trip(self):
        bob_trip = self._create_trip(self.bob)
        self.client.force_authenticate(self.jane)
        self.assertEqual(self.client.get(f"/api/trips/{bob_trip['id']}/").status_code, 404)

    def test_cannot_delete_another_users_trip(self):
        bob_trip = self._create_trip(self.bob)
        self.client.force_authenticate(self.jane)
        self.assertEqual(self.client.delete(f"/api/trips/{bob_trip['id']}/").status_code, 404)
        self.assertTrue(Trip.objects.filter(pk=bob_trip['id']).exists())

    def test_trip_generates_daily_logs(self):
        data = self._create_trip(self.jane)
        self.assertGreater(len(data['daily_logs']), 0)
        self.assertTrue(data['daily_logs'][0]['svg_content'])

    def test_list_serializer_omits_heavy_fields(self):
        self._create_trip(self.jane)
        self.client.force_authenticate(self.jane)
        row = self.client.get('/api/trips/').data[0]
        self.assertNotIn('daily_logs', row)
        self.assertNotIn('duty_events', row)
        self.assertIn('log_count', row)
        self.assertIn('is_compliant', row['compliance'])


@override_settings(ORS_API_KEY='MOCK')
class LogPdfTests(ThrottleResetAPITestCase):
    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password='RoadTrip!2024')
        self.bob = User.objects.create_user(username='bob', password='RoadTrip!2024')
        self.client.force_authenticate(self.jane)
        self.trip = self.client.post('/api/trips/', TRIP_PAYLOAD, format='json').data
        self.log_id = self.trip['daily_logs'][0]['id']

    def test_all_days_pdf(self):
        res = self.client.get(f"/api/trips/{self.trip['id']}/logs/pdf/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/pdf')
        self.assertTrue(res.content.startswith(b'%PDF'))
        self.assertIn('attachment', res['Content-Disposition'])

    def test_single_day_pdf(self):
        res = self.client.get(f"/api/trips/{self.trip['id']}/logs/{self.log_id}/pdf/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.content.startswith(b'%PDF'))

    def test_pdf_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.get(f"/api/trips/{self.trip['id']}/logs/pdf/").status_code, 401
        )

    def test_pdf_is_owner_scoped(self):
        self.client.force_authenticate(self.bob)
        self.assertEqual(
            self.client.get(f"/api/trips/{self.trip['id']}/logs/pdf/").status_code, 404
        )
        self.assertEqual(
            self.client.get(f"/api/trips/{self.trip['id']}/logs/{self.log_id}/pdf/").status_code,
            404,
        )

    def test_unknown_log_id_returns_404(self):
        self.assertEqual(
            self.client.get(f"/api/trips/{self.trip['id']}/logs/99999999/pdf/").status_code, 404
        )

    def test_log_without_svg_reports_a_clear_error(self):
        DailyLog.objects.filter(trip_id=self.trip['id']).update(svg_content='')
        res = self.client.get(f"/api/trips/{self.trip['id']}/logs/pdf/")
        self.assertEqual(res.status_code, 404)
        self.assertIn('no daily logs', res.data['detail'].lower())


class RoutingSafetyTests(ThrottleResetAPITestCase):
    """The mock routing fallback must never be reachable in a production config."""

    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password='RoadTrip!2024')
        self.client.force_authenticate(self.jane)

    @override_settings(DEBUG=False, ORS_API_KEY=None, ALLOW_MOCK_ROUTING=False)
    def test_trip_creation_refuses_to_use_mock_data(self):
        res = self.client.post('/api/trips/', TRIP_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('routing provider is not configured', res.data['detail'].lower())

    @override_settings(DEBUG=False, ORS_API_KEY=None, ALLOW_MOCK_ROUTING=False)
    def test_failed_trip_is_not_persisted(self):
        self.client.post('/api/trips/', TRIP_PAYLOAD, format='json')
        self.assertEqual(Trip.objects.count(), 0)


class HealthCheckTests(ThrottleResetAPITestCase):
    def test_healthz_reports_ok(self):
        res = self.client.get('/healthz/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'ok')
