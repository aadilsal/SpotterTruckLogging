from django.db import models

class Trip(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    cycle_used = models.FloatField(default=0.0)
    distance_miles = models.FloatField(null=True, blank=True)
    estimated_hours = models.FloatField(null=True, blank=True)
    route_geometry = models.TextField(null=True, blank=True)
    
    # Driver/Carrier info
    carrier_name = models.CharField(max_length=255, blank=True, null=True)
    main_office_address = models.CharField(max_length=255, blank=True, null=True)
    home_terminal_address = models.CharField(max_length=255, blank=True, null=True)
    truck_number = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip {self.id}: {self.pickup_location} to {self.dropoff_location}"

class Stop(models.Model):
    STOP_TYPES = (
        ('PICKUP', 'Pickup'),
        ('DROPOFF', 'Dropoff'),
        ('FUEL', 'Fuel'),
        ('BREAK', 'Break'),
        ('OVERNIGHT_REST', 'Overnight Rest'),
    )
    trip = models.ForeignKey(Trip, related_name='stops', on_delete=models.CASCADE)
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    location = models.CharField(max_length=255, null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.stop_type} for Trip {self.trip_id}"
