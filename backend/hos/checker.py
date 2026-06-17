"""
FMCSA Hours of Service compliance checker.

Audits a chronological duty-event timeline and reports violations per rule.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Iterable, List, Optional, Sequence

REST_STATUSES = frozenset({'OFF_DUTY', 'SLEEPER_BERTH'})
ON_DUTY_STATUSES = frozenset({'DRIVING', 'ON_DUTY_NOT_DRIVING'})

RULE_DEFINITIONS: List[dict[str, str]] = [
    {
        'rule_id': '11_hour_driving',
        'rule_name': '11-Hour Driving Limit',
        'description': 'May drive a maximum of 11 hours after 10 consecutive hours off duty.',
    },
    {
        'rule_id': '14_hour_window',
        'rule_name': '14-Hour Duty Window',
        'description': 'May not drive beyond the 14th consecutive hour after coming on duty.',
    },
    {
        'rule_id': '30_minute_break',
        'rule_name': '30-Minute Break Rule',
        'description': 'Must take a 30-minute break when driving for 8 cumulative hours without at least a 30-minute interruption.',
    },
    {
        'rule_id': '70_hour_cycle',
        'rule_name': '70-Hour/8-Day Cycle Rule',
        'description': 'May not drive after 70 hours on duty in 8 consecutive days.',
    },
    {
        'rule_id': '10_hour_reset',
        'rule_name': '10-Hour Reset',
        'description': 'Must take 10 consecutive hours off duty or in sleeper berth to reset the 11-hour and 14-hour clocks.',
    },
    {
        'rule_id': '34_hour_restart',
        'rule_name': '34-Hour Restart',
        'description': 'Must take 34 consecutive hours off duty to reset the 70-hour cycle limit.',
    },
]


@dataclass
class Violation:
    rule_id: str
    rule_name: str
    message: str
    occurred_at: str
    severity: str = 'critical'

    def to_dict(self) -> dict[str, Any]:
        return {
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'message': self.message,
            'occurred_at': self.occurred_at,
            'severity': self.severity,
        }


@dataclass
class RuleResult:
    rule_id: str
    rule_name: str
    description: str
    passed: bool
    violations: List[Violation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'description': self.description,
            'passed': self.passed,
            'violations': [v.to_dict() for v in self.violations],
        }


@dataclass
class DailyCompliance:
    date: str
    passed: bool
    violation_count: int
    violations: List[Violation] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            'date': self.date,
            'passed': self.passed,
            'violation_count': self.violation_count,
            'violations': [v.to_dict() for v in self.violations],
        }


@dataclass
class ComplianceReport:
    is_compliant: bool
    overall_score: float
    violation_count: int
    rules: List[RuleResult]
    daily_status: List[DailyCompliance]

    def to_dict(self) -> dict[str, Any]:
        return {
            'is_compliant': self.is_compliant,
            'overall_score': self.overall_score,
            'violation_count': self.violation_count,
            'rules': [r.to_dict() for r in self.rules],
            'daily_status': [d.to_dict() for d in self.daily_status],
        }


def _hours_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600.0


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _empty_rules() -> dict[str, RuleResult]:
    return {
        d['rule_id']: RuleResult(
            rule_id=d['rule_id'],
            rule_name=d['rule_name'],
            description=d['description'],
            passed=True,
        )
        for d in RULE_DEFINITIONS
    }


def _add_violation(
    rules: dict[str, RuleResult],
    rule_id: str,
    message: str,
    occurred_at: datetime,
    all_violations: List[Violation],
) -> None:
    definition = next(d for d in RULE_DEFINITIONS if d['rule_id'] == rule_id)
    violation = Violation(
        rule_id=rule_id,
        rule_name=definition['rule_name'],
        message=message,
        occurred_at=_iso(occurred_at),
    )
    rules[rule_id].passed = False
    rules[rule_id].violations.append(violation)
    all_violations.append(violation)


def _build_daily_status(
    events: Sequence[Any],
    violations: Sequence[Violation],
) -> List[DailyCompliance]:
    if not events:
        return []

    dates = sorted({e.start_time.date() for e in events})
    by_date: dict[str, List[Violation]] = {d.isoformat(): [] for d in dates}

    for violation in violations:
        day = violation.occurred_at[:10]
        if day in by_date:
            by_date[day].append(violation)

    return [
        DailyCompliance(
            date=day,
            passed=len(day_violations) == 0,
            violation_count=len(day_violations),
            violations=day_violations,
        )
        for day, day_violations in by_date.items()
    ]


def check_compliance(trip, events: Optional[Iterable[Any]] = None) -> ComplianceReport:
    """
    Audit duty events for a trip and return a structured compliance report.

    Args:
        trip: Trip model instance (uses cycle_used for pre-trip on-duty hours).
        events: Optional iterable of duty events; defaults to trip.duty_events ordered by start_time.
    """
    if events is None:
        events = trip.duty_events.order_by('start_time')
    else:
        events = sorted(events, key=lambda e: e.start_time)

    rules = _empty_rules()
    all_violations: List[Violation] = []

    if not events:
        rule_list = list(rules.values())
        return ComplianceReport(
            is_compliant=True,
            overall_score=100.0,
            violation_count=0,
            rules=rule_list,
            daily_status=[],
        )

    initial_cycle = float(getattr(trip, 'cycle_used', 0.0) or 0.0)
    cycle_on_duty = initial_cycle

    if initial_cycle > 70.0 and events:
        _add_violation(
            rules,
            '70_hour_cycle',
            f'Trip started with {initial_cycle:.1f} on-duty hours already used, exceeding the 70-hour limit.',
            events[0].start_time,
            all_violations,
        )

    duty_window_start: Optional[datetime] = None
    driving_in_shift = 0.0
    driving_since_break = 0.0
    consecutive_rest_hours = 0.0
    prev_end: Optional[datetime] = None
    prev_status: Optional[str] = None
    cycle_reset_pending = initial_cycle >= 70.0

    for event in events:
        status = event.status
        duration = _hours_between(event.start_time, event.end_time)

        if prev_end is not None and event.start_time > prev_end:
            gap_hours = _hours_between(prev_end, event.start_time)
            if prev_status in REST_STATUSES and status in REST_STATUSES:
                consecutive_rest_hours += gap_hours
            elif prev_status in REST_STATUSES:
                consecutive_rest_hours = gap_hours if status in REST_STATUSES else 0.0
            else:
                consecutive_rest_hours = 0.0

        if status in REST_STATUSES:
            if duration >= 10.0:
                duty_window_start = None
                driving_in_shift = 0.0
                driving_since_break = 0.0
                consecutive_rest_hours = max(consecutive_rest_hours, duration)
                cycle_reset_pending = False
            elif duration >= 0.5:
                driving_since_break = 0.0
                consecutive_rest_hours = max(consecutive_rest_hours, duration)
            else:
                consecutive_rest_hours = max(consecutive_rest_hours, duration)

            if duration >= 34.0:
                cycle_on_duty = 0.0
                cycle_reset_pending = False

        elif status == 'DRIVING':
            if cycle_reset_pending:
                _add_violation(
                    rules,
                    '34_hour_restart',
                    'Driving occurred after exceeding the 70-hour cycle without a qualifying 34-hour off-duty restart.',
                    event.start_time,
                    all_violations,
                )

            shift_exhausted = (
                driving_in_shift >= 11.0 - 1e-6
                or (
                    duty_window_start is not None
                    and event.start_time >= duty_window_start + timedelta(hours=14) - timedelta(seconds=1)
                )
            )
            if shift_exhausted and consecutive_rest_hours < 10.0:
                _add_violation(
                    rules,
                    '10_hour_reset',
                    f'Driving resumed after only {consecutive_rest_hours:.1f} consecutive off-duty/sleeper hours (10 required to reset shift).',
                    event.start_time,
                    all_violations,
                )

            if duty_window_start is None:
                duty_window_start = event.start_time

            projected_driving = driving_in_shift + duration
            if projected_driving > 11.0 + 1e-6:
                _add_violation(
                    rules,
                    '11_hour_driving',
                    f'Driving total reached {projected_driving:.1f} hours in shift (limit: 11).',
                    event.end_time,
                    all_violations,
                )

            window_end = duty_window_start + timedelta(hours=14)
            if event.end_time > window_end + timedelta(seconds=1):
                _add_violation(
                    rules,
                    '14_hour_window',
                    f'Driving continued past the 14-hour duty window (window ended at {_iso(window_end)}).',
                    window_end,
                    all_violations,
                )

            projected_break_driving = driving_since_break + duration
            if projected_break_driving > 8.0 + 1e-6:
                _add_violation(
                    rules,
                    '30_minute_break',
                    f'Drove {projected_break_driving:.1f} cumulative hours without a 30-minute break (limit: 8).',
                    event.end_time,
                    all_violations,
                )

            cycle_on_duty += duration
            if cycle_on_duty > 70.0 + 1e-6:
                _add_violation(
                    rules,
                    '70_hour_cycle',
                    f'On-duty hours in cycle reached {cycle_on_duty:.1f} (limit: 70).',
                    event.end_time,
                    all_violations,
                )
                cycle_reset_pending = True

            driving_in_shift += duration
            driving_since_break += duration
            consecutive_rest_hours = 0.0

        elif status == 'ON_DUTY_NOT_DRIVING':
            if cycle_reset_pending:
                _add_violation(
                    rules,
                    '34_hour_restart',
                    'On-duty work occurred after exceeding the 70-hour cycle without a qualifying 34-hour off-duty restart.',
                    event.start_time,
                    all_violations,
                )

            if duty_window_start is None:
                duty_window_start = event.start_time

            if duration >= 0.5:
                driving_since_break = 0.0

            cycle_on_duty += duration
            if cycle_on_duty > 70.0 + 1e-6:
                _add_violation(
                    rules,
                    '70_hour_cycle',
                    f'On-duty hours in cycle reached {cycle_on_duty:.1f} (limit: 70).',
                    event.end_time,
                    all_violations,
                )
                cycle_reset_pending = True

            consecutive_rest_hours = 0.0

        prev_end = event.end_time
        prev_status = status

    rule_list = [rules[d['rule_id']] for d in RULE_DEFINITIONS]
    violation_count = len(all_violations)
    passed_rules = sum(1 for r in rule_list if r.passed)
    overall_score = round((passed_rules / len(rule_list)) * 100, 1) if rule_list else 100.0
    daily_status = _build_daily_status(events, all_violations)

    return ComplianceReport(
        is_compliant=violation_count == 0,
        overall_score=overall_score,
        violation_count=violation_count,
        rules=rule_list,
        daily_status=daily_status,
    )
