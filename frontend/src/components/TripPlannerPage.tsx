/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Loader2, Pencil, Search,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { extractApiError } from '../lib/api';
import { applyProfileToForm, hasSavedDefaults } from '../lib/profile';
import { useDriverProfile } from './AppShell';
import FormField from './FormField.tsx';
import QuickCheckModal from './QuickCheckModal.tsx';
import type { TripCheckResult } from '../types/compliance';
import {
  type TripFormData,
  type FieldErrors,
  type FormField as FormFieldName,
  validateField,
  validateForm,
  parseCycleUsed,
} from '../lib/validation';

const INITIAL_FORM: TripFormData = {
  current_location: 'Dallas, TX',
  pickup_location: 'Chicago, IL',
  dropoff_location: 'Los Angeles, CA',
  cycle_used: '45',
  carrier_name: '',
  main_office_address: '',
  home_terminal_address: '',
  truck_number: '',
};

/** The standalone "plan a trip" screen (/app/plan). Creating a trip now
 * navigates to /app/trips/:id to view the result, instead of swapping panels
 * in place — planning and reviewing are two different jobs, so they get two
 * different screens. */
export default function TripPlannerPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const { profile, openCarrierSettings } = useDriverProfile();
  const appliedProfileRef = useRef(false);

  const [formData, setFormData] = useState<TripFormData>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FormFieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkOpen, setCheckOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [checkResult, setCheckResult] = useState<TripCheckResult | null>(null);

  // Apply saved carrier defaults exactly once, as soon as they arrive —
  // re-applying on every profile change would clobber in-progress edits.
  useEffect(() => {
    if (appliedProfileRef.current || !profile) return;
    appliedProfileRef.current = true;
    setFormData(current => applyProfileToForm(current, profile));
  }, [profile]);

  const showError = (field: FormFieldName) => submitAttempted || !!touched[field];

  const updateField = (field: FormFieldName, value: string) => {
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

  const handleBlur = (field: FormFieldName) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const err = validateField(field, formData);
    setFieldErrors(prev => {
      const updated = { ...prev };
      if (err) updated[field] = err;
      else delete updated[field];
      return updated;
    });
  };

  const dispatchTrip = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        cycle_used: parseCycleUsed(formData.cycle_used),
        home_terminal_address: formData.home_terminal_address || formData.main_office_address,
      };
      const res = await api.post('/api/trips/', payload);
      navigate(`/app/trips/${res.data.id}`);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        setError(extractApiError(err, 'Failed to generate trip. Please check your inputs.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');

    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await dispatchTrip();
  };

  /** Pre-dispatch verdict: same inputs, but nothing is created or saved. */
  const handleQuickCheck = async () => {
    setSubmitAttempted(true);
    setCheckError('');

    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCheckResult(null);
    setCheckOpen(true);
    setChecking(true);
    try {
      const payload = { ...formData, cycle_used: parseCycleUsed(formData.cycle_used) };
      const res = await api.post('/api/trips/check/', payload);
      setCheckResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setCheckOpen(false);
      } else {
        setCheckError(extractApiError(err, 'Could not check this trip.'));
      }
    } finally {
      setChecking(false);
    }
  };

  const handleDispatchFromCheck = () => {
    setCheckOpen(false);
    void dispatchTrip();
  };

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Plan a trip</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Enter the route and current cycle hours. We&apos;ll check every FMCSA rule and generate
          logs before anything gets dispatched.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
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
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <fieldset className="space-y-3.5">
              <legend className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-0.5">
                Driver & Carrier
              </legend>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Saved defaults
                  </p>
                  <p className="text-xs text-zinc-300 truncate mt-0.5">
                    {hasSavedDefaults(profile)
                      ? [profile?.carrier_name, profile?.truck_number].filter(Boolean).join(' · ')
                      : 'None saved yet'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCarrierSettings}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-blue-400 border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/15 transition-colors"
                >
                  <Pencil size={11} />
                  {hasSavedDefaults(profile) ? 'Edit' : 'Set up'}
                </button>
              </div>

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
          </div>

          {submitAttempted && hasFieldErrors && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Please fix the highlighted fields before generating your trip.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleQuickCheck}
              disabled={checking}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-blue-300 border border-blue-500/25 bg-blue-500/[0.08] hover:bg-blue-500/[0.14] transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {checking ? <Loader2 className="animate-spin" size={16} /> : <Search size={15} />}
              Quick Check (no dispatch)
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Trip & Logs'}
            </button>
          </div>
        </form>
      </div>

      <QuickCheckModal
        open={checkOpen}
        loading={checking}
        error={checkError}
        result={checkResult}
        onClose={() => setCheckOpen(false)}
        onDispatch={handleDispatchFromCheck}
      />
    </div>
  );
}
