import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Habitos from "./pages/Habitos";
import Estudos from "./pages/Estudos";
import Saude from "./pages/Saude";
import Financas from "./pages/Financas";
import Casa from "./pages/Casa";
import Viagens from "./pages/Viagens";
import Treinos from "./pages/Treinos";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Subscription from "./pages/Subscription";
import RedefinirSenha from "./pages/RedefinirSenha";
import Suporte from "./pages/Suporte";
import Tutorial from "./pages/Tutorial";
import Apps from "./pages/Apps";
import Comunidade from "./pages/Comunidade";
import Mensagens from "./pages/Mensagens";
import BuyCredits from "./pages/BuyCredits";
import { AuthGuard } from "./components/layout/AuthGuard";
import { AdminGuard } from "./components/layout/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/habitos" element={<AuthGuard><Habitos /></AuthGuard>} />
          <Route path="/estudos" element={<AuthGuard><Estudos /></AuthGuard>} />
          <Route path="/saude" element={<AuthGuard><Saude /></AuthGuard>} />
          <Route path="/financas" element={<AuthGuard><Financas /></AuthGuard>} />
          <Route path="/casa" element={<AuthGuard><Casa /></AuthGuard>} />
          <Route path="/viagens" element={<AuthGuard><Viagens /></AuthGuard>} />
          <Route path="/treinos" element={<AuthGuard><Treinos /></AuthGuard>} />
          <Route path="/comunidade" element={<AuthGuard><Comunidade /></AuthGuard>} />
          <Route path="/mensagens" element={<AuthGuard><Mensagens /></AuthGuard>} />
          <Route path="/configuracoes" element={<AuthGuard><Configuracoes /></AuthGuard>} />
          <Route path="/assinatura" element={<AuthGuard><Subscription /></AuthGuard>} />
          <Route path="/subscription" element={<Navigate to="/assinatura" replace />} />
          <Route path="/redefinir-senha" element={<AuthGuard><RedefinirSenha /></AuthGuard>} />
          <Route path="/suporte" element={<AuthGuard><Suporte /></AuthGuard>} />
          <Route path="/tutorial" element={<AuthGuard><Tutorial /></AuthGuard>} />
          <Route path="/apps" element={<AuthGuard><Apps /></AuthGuard>} />
          <Route path="/comprar-creditos" element={<AuthGuard><BuyCredits /></AuthGuard>} />
          
          {/* Rota Admin */}
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
