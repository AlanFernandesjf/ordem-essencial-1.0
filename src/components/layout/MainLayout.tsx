import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Menu } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { status, loading, daysRemaining } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    const isSubscriptionPage = location.pathname === '/assinatura';
    
    // Se não tiver assinatura nenhuma, redireciona (exceto se já estiver lá)
    if (status === 'none' && !isSubscriptionPage) {
        // Opcional: Permitir acesso limitado ou forçar assinatura
        // navigate('/assinatura'); 
        return; 
    }

    // Bloqueio por inadimplência ou fim do trial
    if ((status === 'past_due' || status === 'canceled') && !isSubscriptionPage) {
      navigate('/assinatura');
      toast({
        variant: "destructive",
        title: "Assinatura Suspensa",
        description: "Renove sua assinatura para continuar acessando."
      });
      return;
    }

    if (status === 'trial' && daysRemaining !== null && daysRemaining <= 0 && !isSubscriptionPage) {
        navigate('/assinatura');
        toast({
            variant: "destructive",
            title: "Período de Teste Finalizado",
            description: "Assine um plano para continuar."
        });
        return;
    }

    // Alertas de Vencimento
    if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && status !== 'past_due') {
        const alertDays = [7, 5, 3, 1];
        if (alertDays.includes(daysRemaining)) {
             toast({
                title: "Assinatura Vencendo",
                description: `Sua assinatura renova em ${daysRemaining} dias.`,
                variant: "default", 
            });
        }
    }

  }, [status, loading, daysRemaining, location.pathname, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
            <div className="lg:hidden mb-4 flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => {
                  const fn = (window as any).openSidebar;
                  if (typeof fn === "function") fn();
                  else window.dispatchEvent(new Event("open-sidebar"));
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-card text-foreground"
              >
                <Menu size={28} />
              </button>
              <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-card border border-border shadow-card">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img src="/logo.svg" alt="Ordem Essencial" className="w-full h-full object-cover" />
                </div>
                <span className="text-base font-semibold">Ordem Essencial</span>
              </div>
            </div>
            {/* Alerta Visual Fixo se estiver perto de vencer */}
            {daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0 && status !== 'past_due' && location.pathname !== '/assinatura' && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                        {status === 'trial' 
                            ? "Seu período de teste gratuito está terminando! Faça o pagamento agora para não perder o acesso." 
                            : `Sua assinatura vence em ${daysRemaining} dias. Evite o bloqueio renovando agora.`}
                    </AlertDescription>
                </Alert>
            )}
          {children}
        </div>
      </main>
    </div>
  );
}
