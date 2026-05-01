import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import AtletaDashboard from "./pages/AtletaDashboard";
import Persone from "./pages/Persone";
import Tesseramenti from "./pages/Tesseramenti";
import Abbonamenti from "./pages/Abbonamenti";
import Soci from "./pages/Soci";
import Contabilita from "./pages/Contabilita";
import Comunicazioni from "./pages/Comunicazioni";
import Report from "./pages/Report";
import Presenze from "./pages/Presenze";
import TessereIngressi from "./pages/TessereIngressi";
import Impostazioni from "./pages/Impostazioni";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Accesso in attesa</h2>
          <p className="text-muted-foreground">Il tuo account non ha ancora un ruolo assegnato. Contatta l'amministratore.</p>
          <button onClick={() => supabase.auth.signOut()} className="text-primary underline text-sm">Esci</button>
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";
  const isSegreteria = role === "segreteria";
  const isAtleta = role === "atleta";
  const hasFullAccess = isAdmin || isSegreteria;

  if (isAtleta) {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<AtletaDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/comunicazioni" element={<Comunicazioni />} />
        <Route path="/abbonamenti" element={<Abbonamenti />} />
        {hasFullAccess && <Route path="/persone" element={<Persone />} />}
        {hasFullAccess && <Route path="/tesseramenti" element={<Tesseramenti />} />}
        {hasFullAccess && <Route path="/soci" element={<Soci />} />}
        {hasFullAccess && <Route path="/contabilita" element={<Contabilita />} />}
        {hasFullAccess && <Route path="/report" element={<Report />} />}
        <Route path="/presenze" element={<Presenze />} />
        {isAdmin && <Route path="/impostazioni" element={<Impostazioni />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
