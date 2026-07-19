import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/Toast';
import { FullScreenLoader } from './components/ui';
import { lazy, Suspense, useEffect } from 'react';
import { supabase } from './lib/supabase';

const Welcome = lazy(() => import('./pages/auth/Welcome'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyOTP = lazy(() => import('./pages/auth/VerifyOTP'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const AppShell = lazy(() => import('./pages/AppShell'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/welcome" replace state={{ from: loc }} />;
  if (!profile) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session && profile) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuroraBg() {
  return (
    <div className="aurora-bg" aria-hidden>
      <div className="aurora-3" />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    supabase.auth.onAuthStateChange(() => {});
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AuroraBg />
          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route path="/welcome" element={<PublicOnly><Welcome /></PublicOnly>} />
                <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
                <Route path="/forgot" element={<ForgotPassword />} />
                <Route path="/reset" element={<ResetPassword />} />
                <Route path="/verify" element={<VerifyOTP />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
