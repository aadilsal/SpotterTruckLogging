/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import axios from 'axios';
import MapView from './components/Map.tsx';
import LogView from './components/LogView.tsx';
import { apiUrl } from './lib/api';
import {
  Truck, MapPin, Route, FileText, Loader2, Activity,
  CalendarClock, ShieldCheck, Gauge, Fuel, ScrollText, CheckCircle2, AlertCircle
} from 'lucide-react';
import ScheduleView from './components/ScheduleView.tsx';
import ComplianceView from './components/ComplianceView.tsx';
import { cn } from './lib/utils';
import {
  type TripFormData,
  type FormField,
  type FieldErrors,
  validateField,
  validateForm,
  parseCycleUsed,
} from './lib/validation';

const TABS = [
  { id: 'map', label: 'Route Map', icon: MapPin },
  { id: 'logs', label: 'ELD Logs', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
] as const;

const INITIAL_FORM: TripFormData = {
  current_location: 'Dallas, TX',
  pickup_location: 'Chicago, IL',
  dropoff_location: 'Los Angeles, CA',
  cycle_used: '45',
  carrier_name: 'Nexus Transport LLC',
  main_office_address: '123 Logistics Way, Dallas, TX',
  home_terminal_address: '123 Logistics Way, Dallas, TX',
  truck_number: 'TRK-9000',
};

const inputBase =
  'w-full bg-zinc-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2';

function FormField({
  label,
  name,
  type = 'text',
  step,
  value,
  error,
  showError,
  onChange,
  onBlur,
}: {
  label: string;
  name: FormField;
  type?: string;
  step?: string;
  value: string;
  error?: string;
  showError: boolean;
  onChange: (name: FormField, value: string) => void;
  onBlur: (name: FormField) => void;
}) {
  const hasError = showError && !!error;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-xs font-medium text-zinc-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        className={cn(
          inputBase,
          hasError
            ? 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20 bg-red-500/[0.04]'
            : 'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900'
        )}
      />
      {hasError && (
        <p id={`${name}-error`} className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function App() {
  const [formData, setFormData] = useState<TripFormData>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('map');

  const showError = useCallback(
    (field: FormField) => submitAttempted || !!touched[field],
    [submitAttempted, touched]
  );

  const updateField = (field: FormField, value: string) => {
    const next = { ...formData, [field]: value };
    setFormData(next);

    if (showError(field) || touched[field]) {
      const err = validateField(field, next);
      setFieldErrors(prev => {
        const updated = { ...prev };
        if (err) updated[field] = err;
        else delete updated[field];
        return updated;
      });

      if (field === 'pickup_location' && (touched.dropoff_location || submitAttempted)) {
        const dropErr = validateField('dropoff_location', next);
        setFieldErrors(prev => {
          const updated = { ...prev };
          if (dropErr) updated.dropoff_location = dropErr;
          else delete updated.dropoff_location;
          return updated;
        });
      }
    }
  };

  const handleBlur = (field: FormField) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, formData);
    setFieldErrors(prev => {
      const updated = { ...prev };
      if (err) updated[field] = err;
      else delete updated[field];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');

    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        cycle_used: parseCycleUsed(formData.cycle_used),
        home_terminal_address: formData.home_terminal_address || formData.main_office_address,
      };

      const res = await axios.post(apiUrl('/api/trips/'), payload);
      setTrip(res.data);
      setActiveTab('logs');
    } catch (err: any) {
      const apiMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (typeof err.response?.data === 'object'
          ? Object.values(err.response.data).flat().join(', ')
          : null);
      setError(apiMsg || err.message || 'Failed to generate trip. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const fuelStops = trip?.duty_events?.filter((e: any) => e.status === 'ON_DUTY_NOT_DRIVING').length ?? 0;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const complianceScore = trip?.compliance?.overall_score;
  const isCompliant = trip?.compliance?.is_compliant ?? true;

  const kpis = trip ? [
    { label: 'Total Distance', value: `${trip.distance_miles?.toFixed(0) ?? '—'} mi`, icon: Gauge },
    { label: 'Est. Drive Time', value: `${trip.estimated_hours?.toFixed(1) ?? '—'} hrs`, icon: Activity },
    { label: 'Fuel Stops', value: String(fuelStops), icon: Fuel },
    { label: 'Log Sheets', value: String(trip.daily_logs?.length ?? 0), icon: ScrollText },
    {
      label: 'Compliance',
      value: complianceScore != null ? `${complianceScore}%` : '—',
      icon: CheckCircle2,
      accent: isCompliant,
      warning: complianceScore != null && !isCompliant,
    },
  ] : [];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/[0.03] rounded-full blur-[100px]" />
      </div>

      <header className="relative z-20 h-14 shrink-0 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="h-full flex items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-md" />
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <Truck size={18} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-zinc-50">SpotterTruckLogger</h1>
              <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">FMCSA Compliance Suite</p>
            </div>
            <span className="ml-2 px-2.5 py-1 rounded-full bg-white/[0.04] text-[10px] font-semibold text-zinc-400 border border-white/[0.08] tracking-wide">
              Enterprise
            </span>
          </div>
        </div>
      </header>

      {trip && (
        <div className="relative z-10 shrink-0 border-b border-white/[0.06] bg-zinc-900/40 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
            {kpis.map((kpi, i) => (
              <div
                key={kpi.label}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl border min-w-0 shrink-0',
                  kpi.accent
                    ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                    : kpi.warning
                      ? 'bg-red-500/[0.08] border-red-500/20'
                      : 'bg-white/[0.03] border-white/[0.06]'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-lg',
                  kpi.accent ? 'bg-emerald-500/15' : kpi.warning ? 'bg-red-500/15' : 'bg-white/[0.05]'
                )}>
                  <kpi.icon size={14} className={
                    kpi.accent ? 'text-emerald-400' : kpi.warning ? 'text-red-400' : 'text-zinc-400'
                  } />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold truncate">{kpi.label}</div>
                  <div className={cn(
                    'text-sm font-semibold tabular-nums',
                    kpi.accent ? 'text-emerald-400' : kpi.warning ? 'text-red-400' : 'text-zinc-100'
                  )}>
                    {kpi.value}
                  </div>
                </div>
                {i < kpis.length - 1 && <div className="hidden lg:block w-px h-8 bg-white/[0.06] ml-1" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <aside className="w-[360px] shrink-0 flex flex-col border-r border-white/[0.06] bg-zinc-950/60 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Activity className="text-blue-400" size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Trip Planner</h2>
                <p className="text-[11px] text-zinc-500">Configure route & carrier details</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              <fieldset className="space-y-3.5">
                <legend className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-0.5">
                  Routing
                </legend>

                <FormField
                  label="Current Location"
                  name="current_location"
                  value={formData.current_location}
                  error={fieldErrors.current_location}
                  showError={showError('current_location')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
                <FormField
                  label="Pickup Location"
                  name="pickup_location"
                  value={formData.pickup_location}
                  error={fieldErrors.pickup_location}
                  showError={showError('pickup_location')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
                <FormField
                  label="Dropoff Location"
                  name="dropoff_location"
                  value={formData.dropoff_location}
                  error={fieldErrors.dropoff_location}
                  showError={showError('dropoff_location')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
                <FormField
                  label="HOS Cycle Used (Hours)"
                  name="cycle_used"
                  type="number"
                  step="0.1"
                  value={formData.cycle_used}
                  error={fieldErrors.cycle_used}
                  showError={showError('cycle_used')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
              </fieldset>

              <div className="h-px bg-white/[0.06]" />

              <fieldset className="space-y-3.5">
                <legend className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-0.5">
                  Driver & Carrier
                </legend>

                <FormField
                  label="Carrier Name"
                  name="carrier_name"
                  value={formData.carrier_name}
                  error={fieldErrors.carrier_name}
                  showError={showError('carrier_name')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
                <FormField
                  label="Truck / Tractor #"
                  name="truck_number"
                  value={formData.truck_number}
                  error={fieldErrors.truck_number}
                  showError={showError('truck_number')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
                <FormField
                  label="Main Office Address"
                  name="main_office_address"
                  value={formData.main_office_address}
                  error={fieldErrors.main_office_address}
                  showError={showError('main_office_address')}
                  onChange={updateField}
                  onBlur={handleBlur}
                />
              </fieldset>

              {submitAttempted && hasFieldErrors && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Please fix the highlighted fields before generating your trip.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Trip & Logs'}
              </button>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </form>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c]/50">
          {trip ? (
            <>
              <div className="shrink-0 px-5 py-3 border-b border-white/[0.06]">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        activeTab === tab.id
                          ? 'bg-white/[0.1] text-zinc-50 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      )}
                    >
                      <tab.icon size={15} className={activeTab === tab.id ? 'text-blue-400' : ''} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'map' && <MapView trip={trip} />}
                {activeTab === 'logs' && <LogView trip={trip} />}
                {activeTab === 'schedule' && <ScheduleView trip={trip} />}
                {activeTab === 'compliance' && <ComplianceView trip={trip} />}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-6">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl scale-150" />
                <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] gradient-border">
                  <Route size={40} className="text-zinc-600" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-zinc-200 mb-2">No active trip</h3>
              <p className="text-sm text-zinc-500 max-w-md text-center leading-relaxed">
                Enter your routing details and carrier information in the sidebar to generate FMCSA compliant HOS logs and routing.
              </p>
              <div className="mt-8 flex items-center gap-6 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5"><MapPin size={12} /> Route planning</span>
                <span className="flex items-center gap-1.5"><FileText size={12} /> ELD log sheets</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> HOS compliance</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
