import type { AxiosInstance } from 'axios';
import type { TripFormData } from './validation';

/** Carrier defaults a user saves once and reuses on every trip. */
export type DriverProfile = {
  carrier_name: string;
  truck_number: string;
  main_office_address: string;
  home_terminal_address: string;
  is_complete?: boolean;
  updated_at?: string;
};

export const EMPTY_PROFILE: DriverProfile = {
  carrier_name: '',
  truck_number: '',
  main_office_address: '',
  home_terminal_address: '',
};

/** The editable string fields — deliberately excludes the read-only extras. */
export type ProfileField =
  | 'carrier_name'
  | 'truck_number'
  | 'main_office_address'
  | 'home_terminal_address';

export const PROFILE_FIELDS: { name: ProfileField; label: string; placeholder: string }[] = [
  { name: 'carrier_name', label: 'Carrier Name', placeholder: 'Nexus Transport LLC' },
  { name: 'truck_number', label: 'Truck / Tractor #', placeholder: 'TRK-9000' },
  { name: 'main_office_address', label: 'Main Office Address', placeholder: '123 Logistics Way, Dallas, TX' },
  { name: 'home_terminal_address', label: 'Home Terminal Address', placeholder: 'Same as main office if left blank' },
];

export async function fetchProfile(api: AxiosInstance): Promise<DriverProfile> {
  const res = await api.get('/api/profile/');
  return { ...EMPTY_PROFILE, ...res.data };
}

export async function saveProfile(
  api: AxiosInstance,
  profile: DriverProfile
): Promise<DriverProfile> {
  const res = await api.put('/api/profile/', {
    carrier_name: profile.carrier_name,
    truck_number: profile.truck_number,
    main_office_address: profile.main_office_address,
    home_terminal_address: profile.home_terminal_address,
  });
  return { ...EMPTY_PROFILE, ...res.data };
}

/** Overlay saved defaults onto trip form data, leaving routing fields alone. */
export function applyProfileToForm(
  form: TripFormData,
  profile: DriverProfile
): TripFormData {
  return {
    ...form,
    carrier_name: profile.carrier_name || form.carrier_name,
    truck_number: profile.truck_number || form.truck_number,
    main_office_address: profile.main_office_address || form.main_office_address,
    home_terminal_address: profile.home_terminal_address || form.home_terminal_address,
  };
}

export function hasSavedDefaults(profile: DriverProfile | null): boolean {
  return !!profile && (!!profile.carrier_name || !!profile.truck_number);
}
