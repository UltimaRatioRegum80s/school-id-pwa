import "@/lib/api";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { IosInstallPrompt } from "@/components/IosInstallPrompt";
import { GlobalClock } from "@/components/GlobalClock";
import LoginPage from "@/pages/LoginPage";
import ScanPage from "@/pages/ScanPage";
import DashboardPage from "@/pages/DashboardPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import StudentsPage from "@/pages/StudentsPage";
import AdminPage from "@/pages/AdminPage";
import RegisterSchoolPage from "@/pages/RegisterSchoolPage";
import JoinSchoolPage from "@/pages/JoinSchoolPage";
import InviteRegisterPage from "@/pages/InviteRegisterPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
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
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      <Route path="/register" component={RegisterSchoolPage} />
      <Route path="/join" component={JoinSchoolPage} />
      <Route path="/join/:token" component={InviteRegisterPage} />
      {!isAuthenticated ? (
        <Route component={LoginPage} />
      ) : user?.mustChangePassword ? (
        <Route component={ChangePasswordPage} />
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

function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const authenticated = isAuthenticated && !user?.mustChangePassword;

  return (
    <div className={`flex flex-col min-h-screen bg-background${authenticated ? " md:pl-56" : ""}`}>
      {authenticated && <GlobalClock />}
      <ProtectedApp />
      {authenticated && (
        <>
          <DesktopSidebar />
          <BottomNav />
          <IosInstallPrompt />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
