from rest_framework import serializers
from .models import Trip, Stop
from logs.models import DutyEvent, DailyLog
from hos.checker import check_compliance
from hos.reasoning import build_reasoning

class StopSerializer(serializers.ModelSerializer[Stop]):
    class Meta:
        model = Stop
        fields = '__all__'

class DutyEventSerializer(serializers.ModelSerializer[DutyEvent]):
    class Meta:
        model = DutyEvent
        fields = '__all__'
        # trip is set by the view from the URL, not the client — this stops a
        # user from re-pointing an event at a trip they don't own by editing
        # the payload.
        read_only_fields = ['trip']

    def validate(self, attrs):
        start = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start and end and end <= start:
            raise serializers.ValidationError('end_time must be after start_time.')
        return attrs

class DailyLogSerializer(serializers.ModelSerializer[DailyLog]):
    class Meta:
        model = DailyLog
        fields = '__all__'

class TripSerializer(serializers.ModelSerializer[Trip]):
    stops = StopSerializer(many=True, read_only=True)
    duty_events = DutyEventSerializer(many=True, read_only=True)
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    compliance = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Trip
        fields = '__all__'

    def get_compliance(self, obj):
        report = check_compliance(obj)
        data = report.to_dict()
        data['reasoning'] = build_reasoning(report, {
            'distance_miles': obj.distance_miles,
            'estimated_driving_hours': obj.estimated_hours,
        })
        return data


class TripListSerializer(serializers.ModelSerializer[Trip]):
    """Summary rows for the trip history list.

    Deliberately omits stops, duty events and daily logs: each trip carries
    several ~37KB log SVGs, so embedding them would make the list many
    megabytes for a handful of trips.
    """

    log_count = serializers.IntegerField(read_only=True)
    compliance = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = (
            'id',
            'current_location',
            'pickup_location',
            'dropoff_location',
            'cycle_used',
            'distance_miles',
            'estimated_hours',
            'carrier_name',
            'truck_number',
            'created_at',
            'log_count',
            'compliance',
        )

    def get_compliance(self, obj):
        # Pass the prefetched events in so this doesn't re-query per trip;
        # check_compliance sorts whatever it is given.
        report = check_compliance(obj, obj.duty_events.all())
        return {
            'is_compliant': report.is_compliant,
            'overall_score': report.overall_score,
            'violation_count': report.violation_count,
        }
