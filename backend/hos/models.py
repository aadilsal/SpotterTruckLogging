from django.conf import settings
from django.db import models


class DispatchCheck(models.Model):
    """
    An audit-trail record of a pre-dispatch HOS compliance check.

    Created every time /api/trips/check/ is called, whether or not the trip
    was ever actually dispatched. This is the accountability log: proof that
    a check was run, what it found, and what was told to the dispatcher —
    independent of whether a Trip ever gets created from it.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='dispatch_checks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    # Inputs, captured as submitted so the audit record stands on its own
    # even if the underlying Trip (if any) is later edited or deleted.
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    cycle_used = models.FloatField(default=0.0)
    carrier_name = models.CharField(max_length=255, blank=True, default='')
    truck_number = models.CharField(max_length=100, blank=True, default='')

    # Route facts used to produce the verdict.
    distance_miles = models.FloatField(null=True, blank=True)
    estimated_driving_hours = models.FloatField(null=True, blank=True)

    # The verdict itself.
    is_compliant = models.BooleanField()
    overall_score = models.FloatField()
    violation_count = models.IntegerField(default=0)
    reasoning_summary = models.TextField(blank=True, default='')

    # Full structured payload (compliance report + reasoning detail) exactly
    # as it was returned to the caller, for accountability/proof of due
    # diligence — not just the headline numbers.
    report = models.JSONField(default=dict, blank=True)

    # Whether this check went on to become an actual dispatched Trip.
    trip = models.ForeignKey(
        'trips.Trip',
        related_name='dispatch_checks',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        verdict = 'COMPLIANT' if self.is_compliant else 'NON-COMPLIANT'
        return f'DispatchCheck #{self.pk}: {self.pickup_location} -> {self.dropoff_location} [{verdict}]'
