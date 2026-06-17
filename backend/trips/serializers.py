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

    class Meta:
        model = Trip
        fields = '__all__'

    def get_compliance(self, obj):
        report = check_compliance(obj)
        return report.to_dict()
