"""
Turns a ComplianceReport (hos.checker) into a dispatcher-facing, plain-English
explanation instead of just rule codes and pass/fail flags.

A dispatcher deciding whether to assign a load needs to know *why* a trip
fails and *what to do about it* — not just which of six FMCSA rule IDs
tripped. That's what this module produces.
"""

from __future__ import annotations

from typing import Any, Optional

from .checker import ComplianceReport, RuleResult

RULE_RECOMMENDATIONS: dict[str, str] = {
    '11_hour_driving': (
        'Insert a 10-hour off-duty or sleeper-berth reset before the driver '
        'reaches 11 hours of driving in a shift.'
    ),
    '14_hour_window': (
        "Plan the day's driving to finish inside the 14-hour window from "
        'when the driver first came on duty — push remaining miles to the '
        'next shift after a qualifying reset.'
    ),
    '30_minute_break': (
        'Add a 30-minute off-duty break before the driver reaches 8 '
        'cumulative hours of driving.'
    ),
    '70_hour_cycle': (
        'The driver needs a 34-hour restart before taking on more on-duty '
        'hours in this cycle — dispatch after the restart, not before.'
    ),
    '10_hour_reset': (
        'Make sure the driver gets a full 10 consecutive hours off duty or '
        'in the sleeper berth before resuming driving.'
    ),
    '34_hour_restart': (
        'Insert a full 34-consecutive-hour off-duty restart before '
        'dispatching this trip.'
    ),
}


def _describe_rule_violations(rule: RuleResult) -> str:
    """One human-readable sentence covering every violation under a rule."""
    violations = rule.violations
    if not violations:
        return ''
    first = violations[0].message
    extra = len(violations) - 1
    if extra <= 0:
        return first
    return (
        f'{first} This happens {extra} more time{"s" if extra != 1 else ""} '
        'later in the trip as currently planned.'
    )


def build_reasoning(
    report: ComplianceReport, trip_facts: Optional[dict[str, Any]] = None
) -> dict[str, Any]:
    """
    Args:
        report: output of hos.checker.check_compliance
        trip_facts: optional context — distance_miles, carrier_name, etc. —
            used to make the compliant-case summary more concrete.

    Returns:
        {
            'summary': str,       # one paragraph, plain English
            'issues': [           # empty when compliant
                {
                    'rule_id': str,
                    'rule_name': str,
                    'plain_explanation': str,
                    'recommendation': str,
                },
                ...
            ],
        }
    """
    trip_facts = trip_facts or {}
    failed_rules = [r for r in report.rules if not r.passed]

    if report.is_compliant:
        pieces = ['This trip is compliant with FMCSA Hours of Service rules.']

        distance = trip_facts.get('distance_miles')
        if distance:
            pieces.append(
                f'Based on a {distance:,.0f}-mile route, the plan completes '
                'with no violations of the 11-hour driving, 14-hour window, '
                '30-minute break, 70-hour cycle, 10-hour reset, or 34-hour '
                'restart rules.'
            )

        days = len(report.daily_status)
        if days:
            pieces.append(
                f'The schedule spans {days} day{"s" if days != 1 else ""}.'
            )

        return {'summary': ' '.join(pieces), 'issues': []}

    issues = [
        {
            'rule_id': rule.rule_id,
            'rule_name': rule.rule_name,
            'plain_explanation': _describe_rule_violations(rule),
            'recommendation': RULE_RECOMMENDATIONS.get(
                rule.rule_id,
                'Adjust the schedule to bring this rule back into compliance.',
            ),
        }
        for rule in failed_rules
    ]

    rule_names = ', '.join(rule.rule_name for rule in failed_rules)
    n = len(failed_rules)
    summary = (
        f'This trip is NOT compliant as planned. It violates {n} rule'
        f'{"s" if n != 1 else ""}: {rule_names}. Dispatching as-is would '
        'put the driver out of HOS compliance — see the recommendations '
        'below before assigning this load.'
    )

    return {'summary': summary, 'issues': issues}
