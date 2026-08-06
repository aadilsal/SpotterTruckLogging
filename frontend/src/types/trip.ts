import type { ComplianceReport } from './compliance';

export type DutyStatus = 'OFF_DUTY' | 'SLEEPER_BERTH' | 'DRIVING' | 'ON_DUTY_NOT_DRIVING';

export interface DutyEvent {
  id: number;
  trip: number;
  status: DutyStatus;
  start_time: string;
  end_time: string;
  location: string | null;
  distance_miles: number;
}

/** Payload for creating/editing a duty event — trip is set by the URL, not the client. */
export interface DutyEventInput {
  status: DutyStatus;
  start_time: string;
  end_time: string;
  location?: string;
  distance_miles?: number;
}

export interface Stop {
  id: number;
  trip: number;
  stop_type: 'PICKUP' | 'DROPOFF' | 'FUEL' | 'BREAK' | 'OVERNIGHT_REST';
  location: string | null;
  lat: number | null;
  lng: number | null;
  arrival_time: string | null;
  departure_time: string | null;
}

export interface DailyLog {
  id: number;
  trip: number;
  date: string;
  total_driving_hours: number;
  total_on_duty_hours: number;
  total_off_duty_hours: number;
  image_url: string | null;
  svg_content: string | null;
}

/** Lightweight row shape returned by GET /api/trips/ (list action) — no
 * duty events, stops, or log SVGs, just enough to render a trip card. */
export interface TripSummary {
  id: number;
  pickup_location: string;
  dropoff_location: string;
  current_location: string;
  distance_miles: number | null;
  estimated_hours: number | null;
  carrier_name: string | null;
  truck_number: string | null;
  created_at: string;
  log_count: number;
  compliance?: { is_compliant: boolean; overall_score: number; violation_count: number };
}

export interface Trip {
  id: number;
  owner: number | null;
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  cycle_used: number;
  distance_miles: number | null;
  estimated_hours: number | null;
  route_geometry: string | null;
  carrier_name: string | null;
  main_office_address: string | null;
  home_terminal_address: string | null;
  truck_number: string | null;
  created_at: string;
  stops: Stop[];
  duty_events: DutyEvent[];
  daily_logs: DailyLog[];
  compliance: ComplianceReport;
}
