export type TripFormData = {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  cycle_used: string;
  carrier_name: string;
  main_office_address: string;
  home_terminal_address: string;
  truck_number: string;
};

export type FormField = keyof TripFormData;

export type FieldErrors = Partial<Record<FormField, string>>;

const LOCATION_MIN = 3;
const LOCATION_PATTERN = /^[a-zA-Z0-9\s.,#'-]+$/;

function validateLocation(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length < LOCATION_MIN) return `${label} is too short`;
  if (!LOCATION_PATTERN.test(trimmed)) return `${label} contains invalid characters`;
  if (!trimmed.includes(',')) return `Use "City, State" format (e.g. Dallas, TX)`;
  return undefined;
}

export function validateField(field: FormField, data: TripFormData): string | undefined {
  switch (field) {
    case 'current_location':
      return validateLocation(data.current_location, 'Current location');
    case 'pickup_location':
      return validateLocation(data.pickup_location, 'Pickup location');
    case 'dropoff_location': {
      const err = validateLocation(data.dropoff_location, 'Dropoff location');
      if (err) return err;
      if (
        data.pickup_location.trim().toLowerCase() === data.dropoff_location.trim().toLowerCase()
      ) {
        return 'Dropoff must be different from pickup';
      }
      return undefined;
    }
    case 'cycle_used': {
      const raw = data.cycle_used.trim();
      if (!raw) return 'HOS cycle hours is required';
      const num = parseFloat(raw);
      if (Number.isNaN(num)) return 'Enter a valid number';
      if (num < 0) return 'Cannot be negative';
      if (num > 70) return 'Cannot exceed 70 hours (8-day cycle limit)';
      return undefined;
    }
    case 'carrier_name': {
      const trimmed = data.carrier_name.trim();
      if (!trimmed) return 'Carrier name is required';
      if (trimmed.length < 2) return 'Carrier name is too short';
      return undefined;
    }
    case 'truck_number': {
      const trimmed = data.truck_number.trim();
      if (!trimmed) return 'Truck number is required';
      if (trimmed.length < 2) return 'Truck number is too short';
      return undefined;
    }
    case 'main_office_address': {
      const trimmed = data.main_office_address.trim();
      if (!trimmed) return 'Main office address is required';
      if (trimmed.length < 5) return 'Enter a complete address';
      return undefined;
    }
    case 'home_terminal_address':
      return undefined;
    default:
      return undefined;
  }
}

export function validateForm(data: TripFormData): FieldErrors {
  const fields: FormField[] = [
    'current_location',
    'pickup_location',
    'dropoff_location',
    'cycle_used',
    'carrier_name',
    'truck_number',
    'main_office_address',
  ];

  const errors: FieldErrors = {};
  for (const field of fields) {
    const err = validateField(field, data);
    if (err) errors[field] = err;
  }
  return errors;
}

export function parseCycleUsed(value: string): number {
  return parseFloat(value.trim());
}
