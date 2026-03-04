import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Persone from "./pages/Persone";
import Tesseramenti from "./pages/Tesseramenti";
import Abbonamenti from "./pages/Abbonamenti";
import Soci from "./pages/Soci";
import Contabilita from "./pages/Contabilita";
import Comunicazioni from "./pages/Comunicazioni";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/persone" element={<Persone />} />
            <Route path="/tesseramenti" element={<Tesseramenti />} />
            <Route path="/abbonamenti" element={<Abbonamenti />} />
            <Route path="/soci" element={<Soci />} />
            <Route path="/contabilita" element={<Contabilita />} />
            <Route path="/comunicazioni" element={<Comunicazioni />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
