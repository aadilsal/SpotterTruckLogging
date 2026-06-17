from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Trip
from .serializers import TripSerializer
from routing.services import get_route, geocode
from hos.engine import HOSEngine
from logs.renderer import LogRenderer
from logs.models import DailyLog
import json
from datetime import timedelta

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        trip = Trip(
            current_location=data.get('current_location'),
            pickup_location=data.get('pickup_location'),
            dropoff_location=data.get('dropoff_location'),
            cycle_used=float(data.get('cycle_used', 0.0)),
            carrier_name=data.get('carrier_name', ''),
            main_office_address=data.get('main_office_address', ''),
            home_terminal_address=data.get('home_terminal_address', ''),
            truck_number=data.get('truck_number', '')
        )
        trip.save()

        # 1. Geocode
        curr_coords = geocode(trip.current_location)
        pick_coords = geocode(trip.pickup_location)
        drop_coords = geocode(trip.dropoff_location)

        # 2. Routing
        try:
            route1 = get_route(curr_coords, pick_coords)
            route2 = get_route(pick_coords, drop_coords)
            
            trip.distance_miles = route1['distance_miles'] + route2['distance_miles']
            trip.estimated_hours = route1['duration_hours'] + route2['duration_hours']
            
            # Combine geometry
            combined_geom = route1['geometry'] + route2['geometry']
            trip.route_geometry = json.dumps(combined_geom)
            trip.save()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 3. HOS Engine
        engine = HOSEngine(trip)
        engine.run()

        # 4. Generate Daily Logs SVGs
        self._generate_logs(trip)

        serializer = self.get_serializer(trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _generate_logs(self, trip):
        from datetime import timedelta
        
        events = list(trip.duty_events.order_by('start_time'))
        if not events: return
        
        class SplitEvent:
            def __init__(self, status, start_time, end_time, distance_miles=0.0):
                self.status = status
                self.start_time = start_time
                self.end_time = end_time
                self.distance_miles = distance_miles

        day_events = {}
        
        # 1. Fill leading OFF_DUTY on Day 1
        first_start = events[0].start_time
        day1_midnight = first_start.replace(hour=0, minute=0, second=0, microsecond=0)
        if first_start > day1_midnight:
            events.insert(0, SplitEvent('OFF_DUTY', day1_midnight, first_start, 0.0))
            
        # 2. Fill trailing OFF_DUTY on Last Day
        last_end = events[-1].end_time
        last_day_next_midnight = last_end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        if last_end < last_day_next_midnight:
            events.append(SplitEvent('OFF_DUTY', last_end, last_day_next_midnight, 0.0))

        # 3. Split multi-day events at midnight boundaries
        for ev in events:
            current_start = ev.start_time
            remaining_distance = getattr(ev, 'distance_miles', 0.0) or 0.0
            total_seconds = (ev.end_time - ev.start_time).total_seconds()
            
            while current_start < ev.end_time:
                date = current_start.date()
                if date not in day_events:
                    day_events[date] = []
                    
                next_day = current_start.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                current_end = min(ev.end_time, next_day)
                
                chunk_seconds = (current_end - current_start).total_seconds()
                chunk_distance = remaining_distance * (chunk_seconds / total_seconds) if total_seconds > 0 else 0.0
                
                day_events[date].append(SplitEvent(ev.status, current_start, current_end, chunk_distance))
                
                current_start = current_end

        for date in sorted(day_events.keys()):
            evs = day_events[date]
            renderer = LogRenderer(date, evs, trip)
            svg_str = renderer.render()
            
            # Calculate totals for the day
            driving = sum([(e.end_time - e.start_time).total_seconds() / 3600.0 for e in evs if e.status == 'DRIVING'])
            on_duty = sum([(e.end_time - e.start_time).total_seconds() / 3600.0 for e in evs if e.status == 'ON_DUTY_NOT_DRIVING'])
            off_duty = sum([(e.end_time - e.start_time).total_seconds() / 3600.0 for e in evs if e.status == 'OFF_DUTY' or e.status == 'SLEEPER_BERTH'])
            
            DailyLog.objects.create(
                trip=trip,
                date=date,
                total_driving_hours=driving,
                total_on_duty_hours=on_duty,
                total_off_duty_hours=off_duty,
                svg_content=svg_str
            )
