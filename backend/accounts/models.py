from django.conf import settings
from django.db import models


class DriverProfile(models.Model):
    """Carrier/truck details a user saves once and reuses on every trip.

    Mirrors the corresponding fields on Trip: the profile supplies the defaults,
    and each Trip keeps its own copy so editing the profile later never rewrites
    the record of a trip that already happened.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='driver_profile',
        on_delete=models.CASCADE,
    )
    carrier_name = models.CharField(max_length=255, blank=True, default='')
    truck_number = models.CharField(max_length=100, blank=True, default='')
    main_office_address = models.CharField(max_length=255, blank=True, default='')
    home_terminal_address = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile for {self.user}'

    @property
    def is_complete(self) -> bool:
        """True once there is enough saved to be worth pre-filling a form with."""
        return bool(self.carrier_name and self.truck_number)
