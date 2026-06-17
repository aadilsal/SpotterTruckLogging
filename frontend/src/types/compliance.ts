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

export interface ComplianceReport {
  is_compliant: boolean;
  overall_score: number;
  violation_count: number;
  rules: ComplianceRule[];
  daily_status: DailyComplianceStatus[];
}

export function getDailyCompliance(
  compliance: ComplianceReport | undefined,
  date: string
): DailyComplianceStatus | undefined {
  if (!compliance?.daily_status) return undefined;
  const normalized = date.slice(0, 10);
  return compliance.daily_status.find(d => d.date === normalized);
}
