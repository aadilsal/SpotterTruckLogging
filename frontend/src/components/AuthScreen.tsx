import { useState } from 'react';
import axios from 'axios';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Loader2, LogIn, ShieldCheck, Truck, UserPlus,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { apiUrl, extractApiError } from '../lib/api';
import { cn } from '../lib/utils';

type Mode = 'login' | 'register';

const inputBase =
  'w-full bg-zinc-900/80 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 focus:ring-2';

/** "Forgot password" request form. Kept on the same screen so there is no router dependency. */
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter the email address on your account');
      return;
    }
    setLoading(true);
    try {
      await axios.post(apiUrl('/api/auth/password-reset/'), { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Could not send the reset email.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="text-emerald-400" size={22} />
        </div>
        <div>
          <p className="text-sm text-zinc-200 font-medium">Check your email</p>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            If an account exists for that address, a reset link is on its way. The link expires
            shortly and can only be used once.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Reset your password</h2>
        <p className="text-[11px] text-zinc-500 mt-1">
          We'll email you a link to choose a new one.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reset-email" className="text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jane@carrier.com"
          className={cn(
            inputBase,
            'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900'
          )}
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
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.98]"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : 'Send reset link'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to sign in
      </button>
    </form>
  );
}

export default function AuthScreen() {
  const { login, register, sessionExpired } = useAuth();
  const [forgot, setForgot] = useState(false);

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
  };

  const clientError = (): string | undefined => {
    if (!username.trim()) return 'Username is required';
    if (!password) return 'Password is required';
    if (isRegister && password.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const invalid = clientError();
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), email.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError(
        extractApiError(
          err,
          isRegister ? 'Could not create your account.' : 'Could not sign you in.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-y-auto bg-[#0a0a0c] text-zinc-100 font-sans px-6 py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/[0.03] rounded-full blur-[100px]" />
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
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase mt-1">
            FMCSA Compliance Suite
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-sm p-6 gradient-border">
          {forgot ? (
            <ForgotPassword onBack={() => setForgot(false)} />
          ) : (
          <>
          <div className="inline-flex w-full items-center gap-1 p-1 mb-6 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {(['login', 'register'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => switchMode(item)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  mode === item
                    ? 'bg-white/[0.1] text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {item === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                {item === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {sessionExpired && (
            <div className="flex items-start gap-2 p-3 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>Your session ended. Please sign in again.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-zinc-400">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="driver_jane"
                className={cn(
                  inputBase,
                  'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900'
                )}
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium text-zinc-400">
                  Email <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@carrier.com"
                  className={cn(
                    inputBase,
                    'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900'
                  )}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  inputBase,
                  'border-white/[0.08] focus:border-blue-500/50 focus:ring-blue-500/20 focus:bg-zinc-900'
                )}
              />
              {isRegister && (
                <p className="text-[11px] text-zinc-600">
                  At least 8 characters, not entirely numeric.
                </p>
              )}
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
              className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/25 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isRegister ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>

            {!isRegister && (
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="text-xs font-medium text-zinc-500 hover:text-blue-400 transition-colors"
              >
                Forgot your password?
              </button>
            )}
          </form>
          </>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
          <ShieldCheck size={12} />
          Your trips are private to your account.
        </p>
      </div>
    </div>
  );
}
