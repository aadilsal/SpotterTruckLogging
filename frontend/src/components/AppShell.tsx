import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, LayoutDashboard, ListChecks, LogOut, Route } from 'lucide-react';
import Logo from './Logo.tsx';
import ProfileModal from './ProfileModal.tsx';
import { useAuth } from '../lib/authContext';
import { fetchProfile, hasSavedDefaults, type DriverProfile } from '../lib/profile';
import { cn } from '../lib/utils';

/** Carrier defaults, fetched once here and shared with every page underneath
 * (the dashboard's setup nudge, the trip planner's pre-fill) instead of each
 * page re-fetching independently. */
type ProfileContextValue = {
  profile: DriverProfile | null;
  loading: boolean;
  hasDefaults: boolean;
  openCarrierSettings: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useDriverProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useDriverProfile must be used inside <AppShell>');
  return ctx;
}

const NAV_LINKS = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/plan', label: 'Plan a Trip', icon: Route, end: false },
  { to: '/app/trips', label: 'My Trips', icon: ListChecks, end: false },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { api, user, logout } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProfile(api)
      .then(saved => {
        if (!cancelled) setProfile(saved);
      })
      .catch(() => {
        // No saved profile yet is not an error — the nudge banner just shows.
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const openCarrierSettings = useCallback(() => setShowProfile(true), []);

  const contextValue: ProfileContextValue = {
    profile,
    loading: profileLoading,
    hasDefaults: hasSavedDefaults(profile),
    openCarrierSettings,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      <div className="min-h-screen flex flex-col bg-surface text-zinc-100 font-sans selection:bg-blue-500/30">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/[0.03] rounded-full blur-[100px]" />
        </div>

        <header className="sticky top-0 relative z-20 h-14 shrink-0 border-b border-white/[0.06] bg-surface/80 backdrop-blur-xl">
          <div className="h-full flex items-center justify-between gap-2 px-3 sm:px-5">
            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
              <Logo
                size={30}
                showTagline
                wordmarkClassName="text-[13px] sm:text-[15px] font-semibold tracking-tight text-zinc-50"
              />

              <nav className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-white/[0.08] text-zinc-50'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      )
                    }
                  >
                    <link.icon size={13} />
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {user?.username && (
                <span className="hidden lg:block text-xs text-zinc-400 mr-1">
                  Signed in as <span className="text-zinc-200 font-medium">{user.username}</span>
                </span>
              )}
              <button
                type="button"
                onClick={openCarrierSettings}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-white/[0.08] bg-white/[0.03] hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
              >
                <Building2 size={13} />
                <span className="hidden sm:inline">Carrier</span>
                {!profileLoading && !contextValue.hasDefaults && (
                  <span
                    aria-label="Carrier defaults not set up"
                    className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-surface"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 border border-white/[0.08] bg-white/[0.03] hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>

          {/* Mobile nav — the top bar collapses the link labels, so give small
              screens a second row instead of hiding navigation entirely. */}
          <nav className="md:hidden flex items-center gap-1 px-3 pb-2 -mt-0.5 overflow-x-auto custom-scrollbar">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-white/[0.08] text-zinc-50'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                  )
                }
              >
                <link.icon size={13} />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </div>

      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={saved => setProfile(saved)}
        />
      )}
    </ProfileContext.Provider>
  );
}
