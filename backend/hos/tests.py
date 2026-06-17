from datetime import datetime, timedelta
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone

from hos.checker import check_compliance
from hos.engine import HOSEngine
from trips.models import Trip


def _event(status, start, hours, location='Test'):
    end = start + timedelta(hours=hours)
    return SimpleNamespace(
        status=status,
        start_time=start,
        end_time=end,
        location=location,
        distance_miles=0.0,
    )


class ComplianceCheckerTests(TestCase):
    def _trip(self, cycle_used=0.0):
        return Trip.objects.create(
            current_location='Dallas, TX',
            pickup_location='Chicago, IL',
            dropoff_location='Los Angeles, CA',
            cycle_used=cycle_used,
            distance_miles=500.0,
        )

    def test_empty_events_is_compliant(self):
        trip = self._trip()
        report = check_compliance(trip, [])
        self.assertTrue(report.is_compliant)
        self.assertEqual(report.overall_score, 100.0)

    def test_valid_shift_passes(self):
        trip = self._trip()
        start = timezone.now().replace(hour=6, minute=0, second=0, microsecond=0)
        events = [
            _event('ON_DUTY_NOT_DRIVING', start, 1),
            _event('DRIVING', start + timedelta(hours=1), 8),
            _event('OFF_DUTY', start + timedelta(hours=9), 0.5),
            _event('DRIVING', start + timedelta(hours=9, minutes=30), 2),
            _event('SLEEPER_BERTH', start + timedelta(hours=11, minutes=30), 10),
        ]
        report = check_compliance(trip, events)
        self.assertTrue(report.is_compliant, [v.message for r in report.rules for v in r.violations])

    def test_11_hour_driving_violation(self):
        trip = self._trip()
        start = timezone.now()
        events = [
            _event('ON_DUTY_NOT_DRIVING', start, 1),
            _event('DRIVING', start + timedelta(hours=1), 12),
        ]
        report = check_compliance(trip, events)
        self.assertFalse(report.is_compliant)
        rule = next(r for r in report.rules if r.rule_id == '11_hour_driving')
        self.assertFalse(rule.passed)
        self.assertGreater(len(rule.violations), 0)

    def test_14_hour_window_violation(self):
        trip = self._trip()
        start = timezone.now()
        events = [
            _event('ON_DUTY_NOT_DRIVING', start, 3),
            _event('DRIVING', start + timedelta(hours=3), 12),
        ]
        report = check_compliance(trip, events)
        rule = next(r for r in report.rules if r.rule_id == '14_hour_window')
        self.assertFalse(rule.passed)

    def test_30_minute_break_violation(self):
        trip = self._trip()
        start = timezone.now()
        events = [
            _event('DRIVING', start, 9),
        ]
        report = check_compliance(trip, events)
        rule = next(r for r in report.rules if r.rule_id == '30_minute_break')
        self.assertFalse(rule.passed)

    def test_initial_cycle_used_violation(self):
        trip = self._trip(cycle_used=71.0)
        start = timezone.now()
        events = [_event('DRIVING', start, 1)]
        report = check_compliance(trip, events)
        rule = next(r for r in report.rules if r.rule_id == '70_hour_cycle')
        self.assertFalse(rule.passed)

    def test_engine_generated_trip_is_compliant(self):
        trip = self._trip(cycle_used=45.0)
        trip.distance_miles = 2800.0
        trip.save()
        HOSEngine(trip).run()
        report = check_compliance(trip)
        self.assertTrue(
            report.is_compliant,
            [v.message for r in report.rules for v in r.violations],
        )
