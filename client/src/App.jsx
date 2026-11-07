import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Home from './pages/Home';

// The admin console is code-split so the public landing page stays light.
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LiveDraw = lazy(() => import('./pages/LiveDraw'));

function RequireAdmin({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/admin/login" replace />;
}

const Fallback = () => <div className="flex min-h-screen items-center justify-center text-emerald-900/60">Loading…</div>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/draw"
              element={
                <RequireAdmin>
                  <LiveDraw />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
