import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { FormField as FormFieldName } from '../lib/validation';

const inputBase =
  'w-full bg-zinc-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2';

/** Labeled text input with inline validation — shared by the trip planner
 * form so every field validates and displays errors identically. */
export default function FormField({
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
  name: FormFieldName;
  type?: string;
  step?: string;
  value: string;
  error?: string;
  showError: boolean;
  onChange: (name: FormFieldName, value: string) => void;
  onBlur: (name: FormFieldName) => void;
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
