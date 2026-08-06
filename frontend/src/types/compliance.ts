export interface ComplianceViolation {
  rule_id: string;
  rule_name: string;
  message: string;
  occurred_at: string;
  severity: string;
}

export interface ComplianceRule {
  rule_id: string;
  rule_name: string;
  description: string;
  passed: boolean;
  violations: ComplianceViolation[];
}

export interface DailyComplianceStatus {
  date: string;
  passed: boolean;
  violation_count: number;
  violations: ComplianceViolation[];
}

export interface ReasoningIssue {
  rule_id: string;
  rule_name: string;
  plain_explanation: string;
  recommendation: string;
}

export interface Reasoning {
  summary: string;
  issues: ReasoningIssue[];
}

export interface ComplianceReport {
  is_compliant: boolean;
  overall_score: number;
  violation_count: number;
  rules: ComplianceRule[];
  daily_status: DailyComplianceStatus[];
  /** Present on a dispatched trip's compliance and on a pre-dispatch check. */
  reasoning?: Reasoning;
}

/** Response shape of POST /api/trips/check/ — the pre-dispatch verdict. */
export interface TripCheckResult extends ComplianceReport {
  distance_miles: number;
  estimated_driving_hours: number;
  projected_days: number;
  reasoning: Reasoning;
}

export function getDailyCompliance(
  compliance: ComplianceReport | undefined,
  date: string
): DailyComplianceStatus | undefined {
  if (!compliance?.daily_status) return undefined;
  const normalized = date.slice(0, 10);
  return compliance.daily_status.find(d => d.date === normalized);
}
