from django.db.models import Count
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Trip
from .serializers import DutyEventSerializer, TripListSerializer, TripSerializer
from routing.services import RoutingUnavailable, get_route, geocode
from hos.engine import HOSEngine
from logs.models import DutyEvent
from logs.services import regenerate_daily_logs
from logs.pdf import LogPdfError, log_pdf_filename, render_logs_pdf
import json
import logging
from typing import cast

logger = logging.getLogger(__name__)

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        # Trip creation hits an external routing API and runs the HOS engine,
        # so it gets a tighter budget than ordinary reads.
        self.throttle_scope = 'trip_create' if self.action == 'create' else None
        return super().get_throttles()

    def get_queryset(self):
        queryset = Trip.objects.filter(owner=self.request.user).order_by('-created_at')
        if self.action == 'list':
            # Compliance is recomputed per trip from its duty events, so pull
            # them in one query instead of one per row.
            return queryset.prefetch_related('duty_events').annotate(
                log_count=Count('daily_logs', distinct=True)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return TripListSerializer
        return TripSerializer

    def create(self, request, *args, **kwargs):
        data = cast(dict, request.data)
        trip = Trip(
            owner=request.user,
            current_location=data.get('current_location'),
            pickup_location=data.get('pickup_location'),
            dropoff_location=data.get('dropoff_location'),
            cycle_used=float(data.get('cycle_used', 0.0)),
            carrier_name=data.get('carrier_name', ''),
            main_office_address=data.get('main_office_address', ''),
            home_terminal_address=data.get('home_terminal_address', ''),
            truck_number=data.get('truck_number', '')
        )

        # Geocode and route BEFORE saving: a trip with no distance is useless,
        # and persisting one would leave a broken row in the user's history.
        try:
            curr_coords = geocode(trip.current_location)
            pick_coords = geocode(trip.pickup_location)
            drop_coords = geocode(trip.dropoff_location)

            route1 = get_route(curr_coords, pick_coords)
            route2 = get_route(pick_coords, drop_coords)
        except RoutingUnavailable as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception('Routing provider call failed')
            return Response(
                {'detail': f'The routing provider could not be reached: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        trip.distance_miles = route1['distance_miles'] + route2['distance_miles']
        trip.estimated_hours = route1['duration_hours'] + route2['duration_hours']
        trip.route_geometry = json.dumps(route1['geometry'] + route2['geometry'])
        trip.save()

        # 3. HOS Engine
        engine = HOSEngine(trip)
        engine.run()

        # 4. Generate Daily Logs SVGs
        regenerate_daily_logs(trip)

        serializer = self.get_serializer(trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='logs/pdf')
    def logs_pdf(self, request, pk=None):
        """Every daily log for the trip, one page each."""
        trip = self.get_object()
        logs = trip.daily_logs.exclude(svg_content__isnull=True).exclude(
            svg_content=''
        ).order_by('date')
        return self._pdf_response(
            logs, log_pdf_filename(trip.id), f'ELD Logs — Trip {trip.id}'
        )

    @action(detail=True, methods=['get'], url_path=r'logs/(?P<log_id>[0-9]+)/pdf')
    def log_pdf(self, request, pk=None, log_id=None):
        """A single day's log sheet."""
        trip = self.get_object()
        log = get_object_or_404(trip.daily_logs, pk=log_id)
        return self._pdf_response(
            [log],
            log_pdf_filename(trip.id, log.date),
            f'Drivers Daily Log — {log.date}',
        )

    @staticmethod
    def _pdf_response(logs, filename, title):
        try:
            pdf_bytes = render_logs_pdf(logs, title=title)
        except LogPdfError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        # Let the browser read the filename when this is fetched via XHR.
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class DutyEventTripMixin(generics.GenericAPIView):
    """Scopes duty events to a trip owned by the caller.

    A trip's generated schedule is a starting plan, not a fixed record — a
    dispatcher edits it to reflect what actually happened (a delay, a skipped
    break, an extra stop), and every edit regenerates that trip's daily logs
    so the log sheets and the compliance verdict both stay truthful to the
    edited schedule.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = DutyEventSerializer

    def get_trip(self):
        return get_object_or_404(Trip, pk=self.kwargs['trip_id'], owner=self.request.user)

    def get_queryset(self):
        return DutyEvent.objects.filter(trip=self.get_trip()).order_by('start_time')


class DutyEventListCreateView(DutyEventTripMixin, generics.ListCreateAPIView):
    def perform_create(self, serializer):
        trip = self.get_trip()
        serializer.save(trip=trip)
        regenerate_daily_logs(trip)


class DutyEventDetailView(DutyEventTripMixin, generics.RetrieveUpdateDestroyAPIView):
    def perform_update(self, serializer):
        serializer.save()
        regenerate_daily_logs(self.get_trip())

    def perform_destroy(self, instance):
        trip = instance.trip
        instance.delete()
        regenerate_daily_logs(trip)

