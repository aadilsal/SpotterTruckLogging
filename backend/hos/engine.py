from datetime import timedelta
from django.utils import timezone
from logs.models import DutyEvent
from trips.models import Stop

class HOSEngine:
    def __init__(self, trip, start_time=None):
        self.trip = trip
        self.current_time = start_time or timezone.now()
        self.distance_remaining = trip.distance_miles or 0.0
        self.cycle_used = trip.cycle_used
        
        self.duty_window_used = 0.0
        self.driving_since_reset = 0.0
        self.driving_since_break = 0.0
        self.distance_since_fuel = 0.0
        
        self.AVERAGE_SPEED = 60.0  # mph

    def add_event(self, status, duration_hours, location=None, distance=0.0):
        end_time = self.current_time + timedelta(hours=duration_hours)
        event = DutyEvent(
            trip=self.trip,
            status=status,
            start_time=self.current_time,
            end_time=end_time,
            location=location,
            distance_miles=distance
        )
        event.save()
        self.current_time = end_time
        return event

    def add_stop(self, stop_type, location, duration_hours):
        arrival = self.current_time
        departure = self.current_time + timedelta(hours=duration_hours)
        Stop.objects.create(
            trip=self.trip,
            stop_type=stop_type,
            location=location,
            arrival_time=arrival,
            departure_time=departure
        )

    def run(self):
        # 1. Pickup
        self.add_stop('PICKUP', self.trip.pickup_location, 1.0)
        self.add_event('ON_DUTY_NOT_DRIVING', 1.0, self.trip.pickup_location)
        self.duty_window_used += 1.0
        self.cycle_used += 1.0

        while self.distance_remaining > 0:
            # Check limits before driving
            
            # 70-Hour Cycle Rule
            if self.cycle_used >= 70.0:
                self.add_stop('OVERNIGHT_REST', '34-Hour Restart', 34.0)
                self.add_event('OFF_DUTY', 34.0, 'Route Location')
                self.cycle_used = 0.0
                self.duty_window_used = 0.0
                self.driving_since_reset = 0.0
                self.driving_since_break = 0.0
                continue
                
            # 14-Hour Duty Window OR 11-Hour Driving Limit
            if self.duty_window_used >= 14.0 or self.driving_since_reset >= 11.0:
                self.add_stop('OVERNIGHT_REST', '10-Hour Reset', 10.0)
                self.add_event('SLEEPER_BERTH', 10.0, 'Route Location')
                self.duty_window_used = 0.0
                self.driving_since_reset = 0.0
                self.driving_since_break = 0.0
                continue
                
            # 30-Minute Break after 8 hours driving
            if self.driving_since_break >= 8.0:
                self.add_stop('BREAK', '30-Min Break', 0.5)
                self.add_event('OFF_DUTY', 0.5, 'Route Location')
                self.duty_window_used += 0.5
                self.cycle_used += 0.5
                self.driving_since_break = 0.0
                continue

            # Fuel Stop every 1000 miles
            if self.distance_since_fuel >= 1000.0:
                self.add_stop('FUEL', 'Fuel Stop', 0.5)
                self.add_event('ON_DUTY_NOT_DRIVING', 0.5, 'Route Location')
                self.duty_window_used += 0.5
                self.cycle_used += 0.5
                self.distance_since_fuel = 0.0
                # Fueling can count as the 30-minute break if needed, but let's reset break just in case
                self.driving_since_break = 0.0
                continue

            # Calculate allowed driving time for this chunk
            allowed_by_window = 14.0 - self.duty_window_used
            allowed_by_driving = 11.0 - self.driving_since_reset
            allowed_by_break = 8.0 - self.driving_since_break
            allowed_by_cycle = 70.0 - self.cycle_used
            
            distance_to_fuel = 1000.0 - self.distance_since_fuel
            time_to_fuel = distance_to_fuel / self.AVERAGE_SPEED
            
            time_to_dest = self.distance_remaining / self.AVERAGE_SPEED
            
            # Max time we can drive right now
            drive_hours = min(
                allowed_by_window,
                allowed_by_driving,
                allowed_by_break,
                allowed_by_cycle,
                time_to_fuel,
                time_to_dest
            )

            # If drive_hours is 0 or less, it means we hit a limit exactly, loop will handle it
            if drive_hours <= 0:
                continue

            drive_distance = drive_hours * self.AVERAGE_SPEED
            
            self.add_event('DRIVING', drive_hours, 'Route Location', drive_distance)
            
            self.distance_remaining -= drive_distance
            self.distance_since_fuel += drive_distance
            
            self.duty_window_used += drive_hours
            self.driving_since_reset += drive_hours
            self.driving_since_break += drive_hours
            self.cycle_used += drive_hours

        # Dropoff
        self.add_stop('DROPOFF', self.trip.dropoff_location, 1.0)
        self.add_event('ON_DUTY_NOT_DRIVING', 1.0, self.trip.dropoff_location)
