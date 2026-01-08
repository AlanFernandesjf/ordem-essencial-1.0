import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
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
            {/* Alerta Visual Fixo se estiver perto de vencer */}
            {daysRemaining !== null && daysRemaining <= 5 && daysRemaining > 0 && status !== 'past_due' && location.pathname !== '/assinatura' && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                        Sua assinatura vence em {daysRemaining} dias. Evite o bloqueio renovando agora.
                    </AlertDescription>
                </Alert>
            )}
          {children}
        </div>
      </main>
    </div>
  );
}
