from rest_framework import serializers
from .models import Trip, Stop
from logs.models import DutyEvent, DailyLog
from hos.checker import check_compliance

class StopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stop
        fields = '__all__'

class DutyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DutyEvent
        fields = '__all__'

class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = '__all__'

class TripSerializer(serializers.ModelSerializer):
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
        return report.to_dict()


class TripListSerializer(serializers.ModelSerializer):
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
