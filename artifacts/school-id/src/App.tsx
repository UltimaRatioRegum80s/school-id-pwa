import "@/lib/api";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { IosInstallPrompt } from "@/components/IosInstallPrompt";
import LoginPage from "@/pages/LoginPage";
import ScanPage from "@/pages/ScanPage";
import DashboardPage from "@/pages/DashboardPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import StudentsPage from "@/pages/StudentsPage";
import AdminPage from "@/pages/AdminPage";
import RegisterSchoolPage from "@/pages/RegisterSchoolPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

function ProtectedApp() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/register" component={RegisterSchoolPage} />
      {!isAuthenticated ? (
        <Route component={LoginPage} />
      ) : (
        <>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/scan" component={ScanPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/activities" component={ActivitiesPage} />
          <Route path="/students" component={StudentsPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <>
      <BottomNav />
      <IosInstallPrompt />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="flex flex-col min-h-screen bg-background">
              <ProtectedApp />
              <AuthenticatedLayout />
            </div>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
