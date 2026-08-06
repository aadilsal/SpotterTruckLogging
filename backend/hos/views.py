import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from routing.services import RoutingUnavailable, geocode, get_route
from trips.models import Trip

from .checker import check_compliance
from .engine import HOSEngine
from .models import DispatchCheck
from .reasoning import build_reasoning

logger = logging.getLogger(__name__)


class TripCheckView(APIView):
    """
    POST /api/trips/check/

    The pre-dispatch verdict endpoint. Given trip/driver inputs, this
    geocodes and routes the trip, simulates the full HOS schedule, and
    returns a compliance verdict with plain-English reasoning — all without
    creating a Trip, DutyEvent, Stop, or DailyLog. A hypothetical trip
    shouldn't have to be dispatched (or clutter trip history) just to find
    out whether it's legal.

    Every call is logged to DispatchCheck for the audit trail, whether or not
    the trip is ever actually dispatched — that log is the accountability
    record: proof a check was run and what it found.
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = 'trip_create'  # hits the same external routing API as trip creation

    def post(self, request, *args, **kwargs):
        data = request.data

        current_location = data.get('current_location')
        pickup_location = data.get('pickup_location')
        dropoff_location = data.get('dropoff_location')

        missing = [
            name
            for name, value in (
                ('current_location', current_location),
                ('pickup_location', pickup_location),
                ('dropoff_location', dropoff_location),
            )
            if not value
        ]
        if missing:
            return Response(
                {'detail': f'Missing required field(s): {", ".join(missing)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cycle_used = float(data.get('cycle_used', 0.0))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'cycle_used must be a number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        carrier_name = data.get('carrier_name') or ''
        truck_number = data.get('truck_number') or ''

        # Built but never saved: the whole point is to check a trip without
        # persisting it or requiring it to become a real dispatch.
        trip = Trip(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            cycle_used=cycle_used,
            carrier_name=carrier_name,
            truck_number=truck_number,
        )

        try:
            curr_coords = geocode(trip.current_location)
            pick_coords = geocode(trip.pickup_location)
            drop_coords = geocode(trip.dropoff_location)

            route1 = get_route(curr_coords, pick_coords)
            route2 = get_route(pick_coords, drop_coords)
        except RoutingUnavailable as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception('Routing provider call failed during trip check')
            return Response(
                {'detail': f'The routing provider could not be reached: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        trip.distance_miles = route1['distance_miles'] + route2['distance_miles']
        trip.estimated_hours = route1['duration_hours'] + route2['duration_hours']

        engine = HOSEngine(trip, persist=False)
        engine.run()

        report = check_compliance(trip, engine.events)
        trip_facts = {
            'distance_miles': trip.distance_miles,
            'estimated_driving_hours': trip.estimated_hours,
        }
        reasoning = build_reasoning(report, trip_facts)

        response_payload = {
            **report.to_dict(),
            'distance_miles': round(trip.distance_miles, 1),
            'estimated_driving_hours': round(trip.estimated_hours, 1),
            'projected_days': len(report.daily_status),
            'reasoning': reasoning,
        }

        owner = request.user if request.user and request.user.is_authenticated else None
        DispatchCheck.objects.create(
            owner=owner,
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            cycle_used=cycle_used,
            carrier_name=carrier_name,
            truck_number=truck_number,
            distance_miles=trip.distance_miles,
            estimated_driving_hours=trip.estimated_hours,
            is_compliant=report.is_compliant,
            overall_score=report.overall_score,
            violation_count=report.violation_count,
            reasoning_summary=reasoning['summary'],
            report=response_payload,
        )

        return Response(response_payload, status=status.HTTP_200_OK)
