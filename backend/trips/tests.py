from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from hos.models import DispatchCheck
from logs.models import DailyLog, DutyEvent
from trips.models import Trip

if TYPE_CHECKING:
    from django.contrib.auth.models import User
else:
    from django.contrib.auth import get_user_model

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
class TripCheckTests(ThrottleResetAPITestCase):
    """POST /api/trips/check/ — the pre-dispatch verdict endpoint."""

    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password='RoadTrip!2024')
        self.client.force_authenticate(self.jane)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        res = self.client.post('/api/trips/check/', TRIP_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 401)

    def test_returns_a_verdict_with_reasoning(self):
        res = self.client.post('/api/trips/check/', TRIP_PAYLOAD, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIn('is_compliant', res.data)
        self.assertIn('overall_score', res.data)
        self.assertIn('rules', res.data)
        self.assertIn('distance_miles', res.data)
        self.assertIn('estimated_driving_hours', res.data)
        self.assertIn('projected_days', res.data)
        self.assertIn('reasoning', res.data)
        self.assertIn('summary', res.data['reasoning'])
        self.assertIn('issues', res.data['reasoning'])

    def test_does_not_create_a_trip_or_any_related_rows(self):
        self.client.post('/api/trips/check/', TRIP_PAYLOAD, format='json')
        self.assertEqual(Trip.objects.count(), 0)
        self.assertEqual(DutyEvent.objects.count(), 0)
        self.assertEqual(DailyLog.objects.count(), 0)

    def test_logs_a_dispatch_check_audit_row(self):
        self.assertEqual(DispatchCheck.objects.count(), 0)
        res = self.client.post('/api/trips/check/', TRIP_PAYLOAD, format='json')
        self.assertEqual(DispatchCheck.objects.count(), 1)
        check = DispatchCheck.objects.get()
        self.assertEqual(check.owner, self.jane)
        self.assertEqual(check.is_compliant, res.data['is_compliant'])
        self.assertEqual(check.pickup_location, TRIP_PAYLOAD['pickup_location'])
        self.assertTrue(check.reasoning_summary)

    def test_missing_required_field_returns_400(self):
        payload = {**TRIP_PAYLOAD}
        del payload['dropoff_location']
        res = self.client.post('/api/trips/check/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Trip.objects.count(), 0)
        self.assertEqual(DispatchCheck.objects.count(), 0)

    def test_dispatch_check_is_logged_even_when_non_compliant(self):
        # Way over cycle limit before the trip even starts.
        payload = {**TRIP_PAYLOAD, 'cycle_used': 69.5}
        res = self.client.post('/api/trips/check/', payload, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertFalse(res.data['is_compliant'])
        self.assertTrue(res.data['reasoning']['issues'])
        check = DispatchCheck.objects.get()
        self.assertFalse(check.is_compliant)


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


@override_settings(ORS_API_KEY='MOCK')
class DutyEventEditTests(ThrottleResetAPITestCase):
    """Editing a generated schedule's duty events — the whole point being that
    compliance and the daily logs must reflect the edit, not the original
    idealized plan."""

    def setUp(self):
        super().setUp()
        self.jane = User.objects.create_user(username='jane', password='RoadTrip!2024')
        self.bob = User.objects.create_user(username='bob', password='RoadTrip!2024')
        self.client.force_authenticate(self.jane)
        self.trip = self.client.post('/api/trips/', TRIP_PAYLOAD, format='json').data
        self.assertTrue(self.trip['compliance']['is_compliant'])

    def _url(self, event_id=None):
        base = f"/api/trips/{self.trip['id']}/duty-events/"
        return base if event_id is None else f'{base}{event_id}/'

    def _get_trip(self):
        return self.client.get(f"/api/trips/{self.trip['id']}/").data

    def test_duty_event_endpoints_require_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self._url()).status_code, 401)

    def test_events_are_scoped_to_the_owning_trip(self):
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get(self._url()).status_code, 404)

        event_id = self.trip['duty_events'][0]['id']
        self.assertEqual(self.client.get(self._url(event_id)).status_code, 404)
        self.assertEqual(
            self.client.patch(self._url(event_id), {'location': 'nope'}, format='json').status_code,
            404,
        )
        self.assertEqual(self.client.delete(self._url(event_id)).status_code, 404)

    def test_extending_a_driving_event_past_11_hours_breaks_compliance(self):
        driving_event = next(e for e in self.trip['duty_events'] if e['status'] == 'DRIVING')
        start = datetime.fromisoformat(driving_event['start_time'].replace('Z', '+00:00'))
        # Deterministic relative to the event's own start, not wall-clock time.
        blown_end_time = (start + timedelta(hours=12)).isoformat()

        res = self.client.patch(
            self._url(driving_event['id']), {'end_time': blown_end_time}, format='json'
        )
        self.assertEqual(res.status_code, 200, res.data)

        trip = self._get_trip()
        self.assertFalse(trip['compliance']['is_compliant'])
        self.assertGreater(trip['compliance']['violation_count'], 0)
        self.assertTrue(trip['compliance']['reasoning']['issues'])

    def test_end_time_before_start_time_is_rejected(self):
        event = self.trip['duty_events'][0]
        res = self.client.patch(
            self._url(event['id']),
            {'start_time': event['end_time'], 'end_time': event['start_time']},
            format='json',
        )
        self.assertEqual(res.status_code, 400)

    def test_trip_field_cannot_be_spoofed(self):
        bob_trip = None
        self.client.force_authenticate(self.bob)
        bob_trip = self.client.post('/api/trips/', TRIP_PAYLOAD, format='json').data
        self.client.force_authenticate(self.jane)

        event = self.trip['duty_events'][0]
        res = self.client.patch(
            self._url(event['id']), {'trip': bob_trip['id'], 'location': 'still janes'}, format='json'
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(DutyEvent.objects.get(pk=event['id']).trip_id, self.trip['id'])

    def test_editing_an_event_regenerates_daily_logs_without_duplicates(self):
        event = self.trip['duty_events'][0]
        self.client.patch(self._url(event['id']), {'location': 'Edited Stop'}, format='json')

        trip = self._get_trip()
        dates = [log['date'] for log in trip['daily_logs']]
        self.assertEqual(len(dates), len(set(dates)))
        self.assertEqual(
            DailyLog.objects.filter(trip_id=self.trip['id']).count(), len(trip['daily_logs'])
        )

    def test_deleting_an_event_regenerates_logs(self):
        events = self.trip['duty_events']
        res = self.client.delete(self._url(events[-1]['id']))
        self.assertEqual(res.status_code, 204)
        self.assertFalse(DutyEvent.objects.filter(pk=events[-1]['id']).exists())

        trip = self._get_trip()
        self.assertEqual(len(trip['duty_events']), len(events) - 1)

    def test_adding_an_event_is_reflected_in_the_schedule(self):
        last = self.trip['duty_events'][-1]
        payload = {
            'status': 'ON_DUTY_NOT_DRIVING',
            'start_time': last['end_time'],
            'end_time': last['end_time'][:11] + '23:59:59Z',
            'location': 'Unplanned dock delay',
        }
        res = self.client.post(self._url(), payload, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(DutyEvent.objects.get(pk=res.data['id']).trip_id, self.trip['id'])

        trip = self._get_trip()
        self.assertEqual(len(trip['duty_events']), len(self.trip['duty_events']) + 1)


class HealthCheckTests(ThrottleResetAPITestCase):
    def test_healthz_reports_ok(self):
        res = self.client.get('/healthz/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'ok')
