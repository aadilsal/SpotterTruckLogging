import { useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Truck } from 'lucide-react';
import { apiUrl, extractApiError } from '../lib/api';
import { cn } from '../lib/utils';

const inputBase =
  'w-full bg-zinc-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2 border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900';

/** Landing screen for the emailed reset link (/reset-password?uid=…&token=…). */
export default function ResetPasswordScreen({
  uid,
  token,
  onDone,
}: {
  uid: string;
  token: string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post(apiUrl('/api/auth/password-reset/confirm/'), {
        uid,
        token,
        new_password: password,
      });
      setDone(true);
    } catch (err) {
      setError(extractApiError(err, 'Could not reset your password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-y-auto bg-[#0a0a0c] text-zinc-100 font-sans px-6 py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-md" />
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <Truck size={22} className="text-white" />
            </div>
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">SpotterTruckLogger</h1>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-sm p-6 gradient-border">
          {done ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="text-emerald-400" size={22} />
              </div>
              <p className="text-sm text-zinc-200 font-medium">Password updated</p>
              <button
                type="button"
                onClick={onDone}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]"
              >
                Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <KeyRound className="text-blue-400" size={14} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Choose a new password</h2>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xs font-medium text-zinc-400">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputBase}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-medium text-zinc-400">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={inputBase}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
                  'text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2',
                  'disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.98]'
                )}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update password'}
              </button>

              <button
                type="button"
                onClick={onDone}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
