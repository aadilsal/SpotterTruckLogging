from django.db import models
from trips.models import Trip

class DutyEvent(models.Model):
    STATUS_CHOICES = (
        ('OFF_DUTY', 'Off Duty'),
        ('SLEEPER_BERTH', 'Sleeper Berth'),
        ('DRIVING', 'Driving'),
        ('ON_DUTY_NOT_DRIVING', 'On Duty Not Driving'),
    )
    trip = models.ForeignKey(Trip, related_name='duty_events', on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=255, null=True, blank=True)
    distance_miles = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.status} from {self.start_time} to {self.end_time}"

class DailyLog(models.Model):
    trip = models.ForeignKey(Trip, related_name='daily_logs', on_delete=models.CASCADE)
    date = models.DateField()
    total_driving_hours = models.FloatField(default=0.0)
    total_on_duty_hours = models.FloatField(default=0.0)
    total_off_duty_hours = models.FloatField(default=0.0)
    image_url = models.URLField(null=True, blank=True)
    svg_content = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Log for {self.date} - Trip {self.trip_id}"
