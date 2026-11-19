import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ConversationalAdvisoryPage } from './pages/chat/ConversationalAdvisoryPage';
import { NewAdvisoryPage } from './pages/advisory/NewAdvisoryPage';
import { AdvisoryResultsPage } from './pages/advisory/AdvisoryResultsPage';
import { HistoryPage } from './pages/history/HistoryPage';
import { FarmProfilePage } from './pages/profile/FarmProfilePage';
import { AgentActivityPage } from './pages/advisory/AgentActivityPage';
import { WeatherViewPage } from './pages/advisory/WeatherViewPage';
import { MarketViewPage } from './pages/advisory/MarketViewPage';
import { SchemesViewPage } from './pages/advisory/SchemesViewPage';
import { RiskAlertsViewPage } from './pages/advisory/RiskAlertsViewPage';
import { CredentialsPage } from './pages/credentials/CredentialsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Stage 1 Workspace Rebuild Preview
import { WorkspaceShell } from './features/workspace';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#303030] border-t-[#8DBB91] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#8DBB91]">Initializing AgroSage...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Admin Route Guard (strictly verifies tenant_admin role)
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#303030] border-t-[#8DBB91] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#8DBB91]">Verifying admin privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-[#262626] rounded-2xl border border-red-800/60 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-red-400">
          <ShieldAlert className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-[#ECECEC]">Access Denied: Administrative Privilege Required</h2>
            <p className="text-xs text-red-300">Your account does not possess the tenant_admin role required for this section.</p>
          </div>
        </div>
        <p className="text-xs text-[#A3A3A3]">
          This route is restricted to authorized tenant administrators. Farmer members can access consultations, weather telemetry, and farm profile.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#8DBB91] text-[#171717] rounded-xl text-xs font-bold hover:bg-[#7ba87f] transition-colors"
          >
            <span>Return to Farmer Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

// Public Route Guard (redirects logged-in users away from /login & /register)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/workspace" replace />;

  return children;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfigProvider>
          <ThemeProvider>
            <ToastProvider>
              <Routes>
              {/* Public Auth Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* AgroSage Production Workspace Routes */}
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <WorkspaceShell />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace/:conversationId"
                element={
                  <ProtectedRoute>
                    <WorkspaceShell />
                  </ProtectedRoute>
                }
              />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout title="Agricultural Dashboard" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="chat" element={<ConversationalAdvisoryPage />} />
                <Route path="advisories/new" element={<ConversationalAdvisoryPage />} />
                <Route path="advisories/form" element={<NewAdvisoryPage />} />
                <Route path="advisories/:advisoryId" element={<AdvisoryResultsPage />} />
                <Route path="advisories" element={<HistoryPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="farm-profile" element={<FarmProfilePage />} />
                <Route path="agent-activity" element={<AgentActivityPage />} />
                <Route path="weather" element={<WeatherViewPage />} />
                <Route path="market" element={<MarketViewPage />} />
                <Route path="schemes" element={<SchemesViewPage />} />
                <Route path="risk-alerts" element={<RiskAlertsViewPage />} />
                <Route path="credentials" element={<CredentialsPage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Administration Routes */}
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminDashboardPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <AdminRoute>
                      <AdminUsersPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/agents"
                  element={
                    <AdminRoute>
                      <AdminAgentsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="admin/system"
                  element={
                    <AdminRoute>
                      <AdminSystemPage />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Development-Only Stage 1 Rebuild Preview Route */}
              {import.meta.env.DEV && (
                <Route
                  path="/__rebuild-preview"
                  element={
                    <ProtectedRoute>
                      <WorkspaceShell previewMode={true} />
                    </ProtectedRoute>
                  }
                />
              )}

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </ThemeProvider>
      </ConfigProvider>
    </AuthProvider>
  </BrowserRouter>
  );
};

export default App;
