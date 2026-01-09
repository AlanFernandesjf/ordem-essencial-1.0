import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { createSubscription } from "@/services/paymentService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  description?: string;
  marketing_features?: string[];
  is_popular?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'monthly-default',
    name: 'Mensal',
    price: 29.90,
    interval: 'monthly',
    description: 'Flexibilidade total',
    marketing_features: ['Acesso ilimitado a todas as áreas', 'Dashboard de Gamificação completa', 'Suporte prioritário'],
    is_popular: false
  },
  {
    id: 'yearly-default',
    name: 'Anual',
    price: 299.90,
    interval: 'yearly',
    description: 'Economize 2 meses',
    marketing_features: ['Todos os benefícios do Mensal', 'Emblema exclusivo de Membro Pro', 'Acesso antecipado a novas features'],
    is_popular: true
  }
];

export default function Subscription() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [showPaymentWait, setShowPaymentWait] = useState(false);
  const [cpfValue, setCpfValue] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const checkPaymentStatus = async (manual = false) => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: sub } = await supabase
              .from('user_subscriptions')
              .select('status')
              .eq('user_id', user.id)
              .single();
          
          if (sub?.status === 'active') {
              // Tentar atualizar o profile também para garantir sincronia
              await supabase.from('profiles').update({ subscription_status: 'pro' }).eq('id', user.id);
              
              toast({ title: "Pagamento Confirmado!", description: "Sua assinatura está ativa." });
              window.location.href = '/'; // Redireciona para Dashboard
          } else if (manual) {
              toast({ title: "Ainda processando", description: "O pagamento ainda não foi confirmado. Aguarde alguns instantes." });
          }
      } catch (error) {
          console.error("Erro ao verificar pagamento", error);
          if (manual) toast({ variant: "destructive", title: "Erro", description: "Erro ao verificar status." });
      }
  };

  // Polling automático quando o modal de espera estiver aberto
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (showPaymentWait) {
          interval = setInterval(() => checkPaymentStatus(false), 3000);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [showPaymentWait]);

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);
    
    try {
        // 1. Verificar se o usuário já tem CPF
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase
            .from('profiles')
            .select('cpf')
            .eq('id', user.id)
            .single();

        if (!profile?.cpf) {
            setShowCpfModal(true);
            setLoading(false);
            return;
        }

      toast({
        title: "Processando...",
        description: "Estamos gerando seu link de pagamento seguro.",
      });

      const response = await createSubscription(planId, user.email || '');

      if (!response.success) {
        throw new Error(response.error || "Erro desconhecido ao criar assinatura");
      }

      if (response.paymentUrl) {
        // Abrir link em nova aba
        window.open(response.paymentUrl, '_blank');
        setShowPaymentWait(true); // Abre modal de espera
      } else {
        toast({
          title: "Assinatura Criada!",
          description: response.message || "Verifique seu e-mail para realizar o pagamento.",
        });
      }

    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar pagamento",
        description: error.message === "FunctionsFetchError" 
          ? "Serviço de pagamento indisponível. Contate o suporte." 
          : error.message,
      });
    } finally {
      if (!showCpfModal && !showPaymentWait) setLoading(false);
    }
  };
  
  const handleSaveCpf = async () => {
      if (!cpfValue || cpfValue.length < 11) {
          toast({
              variant: "destructive",
              title: "CPF Inválido",
              description: "Por favor, digite um CPF válido."
          });
          return;
      }

      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");

        const { error } = await supabase
            .from('profiles')
            .update({ cpf: cpfValue })
            .eq('id', user.id);

        if (error) throw error;

        setShowCpfModal(false);
        if (selectedPlan) {
            handleSubscribe(selectedPlan);
        }

      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Erro ao salvar CPF",
              description: error.message
          });
          setLoading(false);
      }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Escolha seu Plano</h1>
          <p className="text-xl text-muted-foreground">
            Desbloqueie todo o potencial da sua organização pessoal.
          </p>
        </div>

        <Dialog open={showCpfModal} onOpenChange={setShowCpfModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete seu cadastro</DialogTitle>
                    <DialogDescription>
                        Para emitir a nota fiscal e processar o pagamento, precisamos do seu CPF.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input 
                            id="cpf" 
                            placeholder="000.000.000-00" 
                            value={cpfValue}
                            onChange={(e) => setCpfValue(e.target.value.replace(/\D/g, ''))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCpfModal(false)}>Cancelar</Button>
                    <Button onClick={handleSaveCpf} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar e Continuar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={showPaymentWait} onOpenChange={setShowPaymentWait}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Processando Assinatura</DialogTitle>
                    <DialogDescription>
                        A página de pagamento foi aberta em outra aba. 
                        Você tem <strong>7 dias grátis</strong> para testar, mas pode garantir sua assinatura pagando agora.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground text-center">
                        Verificando status...
                    </p>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setShowPaymentWait(false)} className="w-full">
                        Fechar e Aguardar
                    </Button>
                    <Button onClick={() => checkPaymentStatus(true)} className="w-full">
                        Verificar Status Agora
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 max-w-3xl mx-auto">
          {DEFAULT_PLANS.map((plan) => (
            <Card key={plan.id} className={`flex flex-col relative overflow-hidden border-2 transition-all ${plan.is_popular ? 'border-primary shadow-lg scale-105 z-10' : 'hover:border-primary/50'}`}>
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">
                  MAIS POPULAR
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.name} {plan.interval === 'yearly' && <Star className="fill-yellow-400 text-yellow-400 h-5 w-5" />}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="text-4xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)} 
                  <span className="text-lg font-normal text-muted-foreground">
                    /{plan.interval === 'monthly' ? 'mês' : 'ano'}
                  </span>
                </div>
                {plan.interval === 'yearly' && (
                  <p className="text-sm text-green-600 font-medium">
                    Equivalente a {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price / 12)}/mês
                  </p>
                )}

                <ul className="space-y-3">
                  {plan.marketing_features && plan.marketing_features.length > 0 ? (
                      plan.marketing_features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                            <Check className="text-green-500 h-5 w-5" />
                            <span>{feature}</span>
                        </li>
                      ))
                  ) : (
                      <li className="flex items-center gap-2 text-muted-foreground">
                          <Check className="text-gray-400 h-5 w-5" />
                          <span>Benefícios padrão</span>
                      </li>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                    className="w-full" 
                    size="lg" 
                    variant={plan.is_popular ? "default" : "outline"} 
                    onClick={() => handleSubscribe(plan.id)} 
                    disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Assinar {plan.name}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Pagamento seguro via Asaas (Pix ou Cartão de Crédito).</p>
          <p>Cancele quando quiser.</p>
        </div>
      </div>
    </MainLayout>
  );
}
