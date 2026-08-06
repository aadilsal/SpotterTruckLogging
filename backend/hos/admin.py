from django.contrib import admin

from .models import DispatchCheck


@admin.register(DispatchCheck)
class DispatchCheckAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'owner',
        'pickup_location',
        'dropoff_location',
        'is_compliant',
        'overall_score',
        'violation_count',
        'created_at',
    )
    list_filter = ('is_compliant', 'created_at')
    search_fields = ('pickup_location', 'dropoff_location', 'carrier_name', 'truck_number')
    readonly_fields = (
        'owner',
        'current_location',
        'pickup_location',
        'dropoff_location',
        'cycle_used',
        'carrier_name',
        'truck_number',
        'distance_miles',
        'estimated_driving_hours',
        'is_compliant',
        'overall_score',
        'violation_count',
        'reasoning_summary',
        'report',
        'trip',
        'created_at',
    )
