"""
Renders and persists a trip's DailyLog rows from its DutyEvent rows.

Split out of trips.views so it can be re-run whenever the underlying duty
events change (not just at trip creation) — a dispatcher editing a generated
schedule to reflect what actually happened needs the log sheets to follow.
"""

from datetime import timedelta

from .models import DailyLog
from .renderer import LogRenderer


class _SplitEvent:
    def __init__(self, status, start_time, end_time, distance_miles=0.0):
        self.status = status
        self.start_time = start_time
        self.end_time = end_time
        self.distance_miles = distance_miles


def regenerate_daily_logs(trip):
    """Rebuild every DailyLog for a trip from its current duty events.

    Safe to call repeatedly (e.g. after every duty-event edit): existing
    DailyLog rows for the trip are cleared first, so re-running never
    produces duplicates.
    """
    trip.daily_logs.all().delete()

    events = list(trip.duty_events.order_by('start_time'))
    if not events:
        return

    day_events = {}

    # 1. Fill leading OFF_DUTY on Day 1
    first_start = events[0].start_time
    day1_midnight = first_start.replace(hour=0, minute=0, second=0, microsecond=0)
    if first_start > day1_midnight:
        events.insert(0, _SplitEvent('OFF_DUTY', day1_midnight, first_start, 0.0))

    # 2. Fill trailing OFF_DUTY on Last Day
    last_end = events[-1].end_time
    last_day_next_midnight = last_end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    if last_end < last_day_next_midnight:
        events.append(_SplitEvent('OFF_DUTY', last_end, last_day_next_midnight, 0.0))

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

            day_events[date].append(_SplitEvent(ev.status, current_start, current_end, chunk_distance))

            current_start = current_end

    for date in sorted(day_events.keys()):
        evs = day_events[date]
        renderer = LogRenderer(date, evs, trip)
        svg_str = renderer.render()

        driving = sum((e.end_time - e.start_time).total_seconds() / 3600.0 for e in evs if e.status == 'DRIVING')
        on_duty = sum((e.end_time - e.start_time).total_seconds() / 3600.0 for e in evs if e.status == 'ON_DUTY_NOT_DRIVING')
        off_duty = sum(
            (e.end_time - e.start_time).total_seconds() / 3600.0
            for e in evs
            if e.status == 'OFF_DUTY' or e.status == 'SLEEPER_BERTH'
        )

        DailyLog.objects.create(
            trip=trip,
            date=date,
            total_driving_hours=driving,
            total_on_duty_hours=on_duty,
            total_off_duty_hours=off_duty,
            svg_content=svg_str,
        )
