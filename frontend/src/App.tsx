import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthScreen from './components/AuthScreen.tsx';
import ResetPasswordScreen from './components/ResetPasswordScreen.tsx';
import AppShell from './components/AppShell.tsx';
import Dashboard from './components/Dashboard.tsx';
import TripPlannerPage from './components/TripPlannerPage.tsx';
import TripsPage from './components/TripsPage.tsx';
import TripWorkspacePage from './components/TripWorkspacePage.tsx';
import { useAuth } from './lib/authContext';

/** Read the reset link's query params once, before any auth decision. */
function readResetParams(): { uid: string; token: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('uid');
  const token = params.get('token');
  if (!uid || !token) return null;
  return { uid, token };
}

function App() {
  const { token } = useAuth();
  const [resetParams, setResetParams] = useState(readResetParams);

  // Arriving from a password reset email takes priority over the login screen.
  if (resetParams) {
    return (
      <ResetPasswordScreen
        uid={resetParams.uid}
        token={resetParams.token}
        onDone={() => {
          // Drop the one-time token from the URL so a refresh doesn't reuse it.
          window.history.replaceState({}, '', window.location.pathname);
          setResetParams(null);
        }}
      />
    );
  }

  // No token in state (fresh load, sign-out, or a 401) => show the login screen.
  if (!token) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<TripPlannerPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id" element={<TripWorkspacePage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
