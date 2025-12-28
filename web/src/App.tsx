import React, { Suspense, lazy, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/Layout";
import { AuthDevHelper } from "./components/AuthDevHelper";
import { FeatureGateProvider } from "./context/FeatureGateContext";
import { ToastProvider } from "./components/Toast";
import { useAuth, AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Insights = lazy(() => import("./pages/Insights"));
const Clients = lazy(() => import("./pages/Clients"));
const Settings = lazy(() => import("./pages/Settings"));
const Transactions = lazy(() => import("./pages/Transactions"));
const DataCleaning = lazy(() => import("./pages/DataCleaning"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const Help = lazy(() => import("./pages/Help"));
const RealEstateDashboard = lazy(() => import("./pages/RealEstateDashboard"));

const AIConsole = lazy(() =>
  import("./pages/AIConsole").then((m) => ({ default: m.AIConsole })),
);

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminVoice = lazy(() => import("./pages/admin/AdminVoice"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminEmergency = lazy(() => import("./pages/admin/AdminEmergency"));
const DeepDiveFinanceiroPage = lazy(() => import("./pages/DeepDiveFinanceiroPage"));
const AlertsCenter = lazy(() => import("./pages/AlertsCenter"));
const DesignSystem = lazy(() => import("./pages/_DesignSystem"));

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Carregando seu ambiente financeiro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to="/auth" replace state={{ from: location.pathname || "/" }} />
    );
  }

  return children;
}

export default function App() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <FeatureGateProvider>
          <AuthProvider>
            {import.meta.env.DEV && <AuthDevHelper />}

            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                    <p className="text-xs text-slate-400">Carregando Momentum...</p>
                  </div>
                </div>
              }
            >
              <Routes>
                <Route path="/auth" element={<AuthPage />} />

                {import.meta.env.DEV && (
                  <Route path="/_design-system" element={<DesignSystem />} />
                )}

                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Layout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="insights" element={<Insights />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="data-cleaning" element={<DataCleaning />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="ai" element={<AIConsole />} />
                  <Route path="help" element={<Help />} />
                  <Route path="real-estate" element={<RealEstateDashboard />} />
                  <Route path="cfo/deep-dive" element={<DeepDiveFinanceiroPage />} />
                  <Route path="alerts" element={<AlertsCenter />} />

                  <Route path="admin" element={<AdminLayout />}>
                    <Route path="plans" element={<AdminPlans />} />
                    <Route path="voice" element={<AdminVoice />} />
                    <Route path="support" element={<AdminSupport />} />
                    <Route path="emergency" element={<AdminEmergency />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </FeatureGateProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
