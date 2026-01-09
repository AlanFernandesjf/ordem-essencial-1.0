import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Loader2, Copy, ScanLine, Barcode, CreditCard, QrCode, FileText, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { createSubscription } from "@/services/paymentService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [cpfValue, setCpfValue] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Checkout Unificado
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'boleto'>('credit_card');
  const [paymentData, setPaymentData] = useState<any>(null); // Dados retornados (QR Code, Barcode)
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'details' | 'success'>('select');

  // Credit Card State
  const [ccNumber, setCcNumber] = useState("");
  const [ccHolder, setCcHolder] = useState("");
  const [ccExpiry, setCcExpiry] = useState("");
  const [ccCcv, setCcCcv] = useState("");
  const [installments, setInstallments] = useState(1);

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
              await supabase.from('profiles').update({ subscription_status: 'pro' }).eq('id', user.id);
              toast({ title: "Pagamento Confirmado!", description: "Sua assinatura está ativa." });
              window.location.href = '/'; 
          } else if (manual) {
              toast({ title: "Ainda processando", description: "O pagamento ainda não foi confirmado. Aguarde alguns instantes." });
          }
      } catch (error) {
          console.error("Erro ao verificar pagamento", error);
      }
  };

  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isPolling) {
          interval = setInterval(() => checkPaymentStatus(false), 3000);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isPolling]);

  // Passo 1: Iniciar Checkout (Verificar CPF e Conexão)
  const initiateCheckout = async (planId: string) => {
      setSelectedPlan(planId);
      setLoading(true);
      try {
        // Teste de Conexão com Backend
        console.log("Testando conexão com Edge Function...");
        const { data: debugData, error: debugError } = await supabase.functions.invoke('create-payment', {
            body: { debug: true, email: 'test@check.com' }
        });

        if (debugError) {
            console.error("Erro de conexão (Debug):", debugError);
            throw new Error("Erro ao conectar com servidor de pagamentos. Verifique sua conexão.");
        }

        if (debugData) {
            console.log("Status Conexão:", debugData);
            if (debugData.env) {
                const missing = [];
                if (debugData.env.asaas_key !== 'OK') missing.push('ASAAS_API_KEY');
                // if (debugData.env.supabase_url !== 'OK') missing.push('SUPABASE_URL'); // Geralmente injetado auto
                
                if (missing.length > 0) {
                    throw new Error(`Configuração Errada no Servidor: Variáveis faltando (${missing.join(', ')}). Contate o suporte.`);
                }
            }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase.from('profiles').select('cpf').eq('id', user.id).single();

        if (!profile?.cpf) {
            setShowCpfModal(true);
            setLoading(false);
            return;
        }
        
        // Se tem CPF, abre o modal de checkout
        setCheckoutStep('select');
        setPaymentMethod('credit_card'); // Default
        setInstallments(1); // Reset
        setPaymentData(null);
        setShowCheckoutModal(true);

      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
      } finally {
        if (!showCpfModal) setLoading(false);
      }
  };

  // Passo 2: Processar Pagamento
  const processPayment = async () => {
    if (!selectedPlan) return;
    setLoading(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");

        let creditCardData = undefined;
        if (paymentMethod === 'credit_card') {
             // Validar campos
             if (!ccNumber || !ccHolder || !ccExpiry || !ccCcv) {
                 throw new Error("Preencha todos os dados do cartão.");
             }
             const [month, year] = ccExpiry.split('/');
             creditCardData = {
                 holderName: ccHolder,
                 number: ccNumber.replace(/\s/g, ''),
                 expiryMonth: month,
                 expiryYear: `20${year}`,
                 ccv: ccCcv
             };
        }

        const response = await createSubscription(
            selectedPlan, 
            user.email || '', 
            paymentMethod === 'credit_card' ? 'CREDIT_CARD' : paymentMethod === 'pix' ? 'PIX' : 'BOLETO',
            creditCardData,
            installments
        );

        if (!response.success) throw new Error(response.error || "Erro ao criar assinatura");

        // Sucesso
        if (paymentMethod === 'credit_card') {
            toast({ title: "Sucesso!", description: "Pagamento aprovado." });
            setTimeout(() => { window.location.href = '/'; }, 2000);
            setShowCheckoutModal(false);
        } else {
            // Pix ou Boleto -> Mostrar dados
            setPaymentData(response);
            setCheckoutStep('details'); // Vai para tela de QR Code / Código de Barras
            setIsPolling(true);
        }

    } catch (error: any) {
        console.error("Erro checkout:", error);
        toast({ 
            variant: "destructive", 
            title: "Erro no Pagamento", 
            description: error.message 
        });
    } finally {
        setLoading(false);
    }
  };

  const handleSaveCpf = async () => {
      if (!cpfValue || cpfValue.length < 11) {
          toast({ variant: "destructive", title: "CPF Inválido", description: "Digite um CPF válido." });
          return;
      }
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");
        const { error } = await supabase.from('profiles').update({ cpf: cpfValue }).eq('id', user.id);
        if (error) throw error;
        
        setShowCpfModal(false);
        if (selectedPlan) initiateCheckout(selectedPlan); // Retoma o fluxo

      } catch (error: any) {
          toast({ variant: "destructive", title: "Erro", description: error.message });
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

        {/* Modal CPF */}
        <Dialog open={showCpfModal} onOpenChange={setShowCpfModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete seu cadastro</DialogTitle>
                    <DialogDescription>Precisamos do seu CPF para emitir a nota fiscal.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" placeholder="000.000.000-00" value={cpfValue} onChange={(e) => setCpfValue(e.target.value.replace(/\D/g, ''))} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCpfModal(false)}>Cancelar</Button>
                    <Button onClick={handleSaveCpf} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Modal Checkout Unificado */}
        <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Finalizar Assinatura</DialogTitle>
                    <DialogDescription>
                        {selectedPlan === 'monthly-default' ? 'Plano Mensal - R$ 29,90' : 'Plano Anual - R$ 299,90'}
                    </DialogDescription>
                </DialogHeader>

                {checkoutStep === 'select' && (
                    <div className="space-y-6 py-4">
                        <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 gap-4">
                            <div>
                                <RadioGroupItem value="credit_card" id="cc" className="peer sr-only" />
                                <Label htmlFor="cc" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="h-6 w-6" />
                                        <span className="font-semibold">Cartão de Crédito</span>
                                    </div>
                                    <span className="text-xs text-center text-muted-foreground">Cobrança recorrente automática.<br/>Seus dados ficam salvos e você não precisa digitar novamente.</span>
                                </Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="pix" id="pix" className="peer sr-only" />
                                    <Label htmlFor="pix" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer h-full">
                                        <div className="flex flex-col items-center gap-2">
                                            <QrCode className="h-6 w-6" />
                                            <span className="font-semibold">Pix</span>
                                        </div>
                                        <span className="text-[10px] text-center text-muted-foreground mt-2">Pagamento manual a cada renovação.</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="boleto" id="boleto" className="peer sr-only" />
                                    <Label htmlFor="boleto" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer h-full">
                                        <div className="flex flex-col items-center gap-2">
                                            <Barcode className="h-6 w-6" />
                                            <span className="font-semibold">Boleto</span>
                                        </div>
                                        <span className="text-[10px] text-center text-muted-foreground mt-2">Pagamento manual a cada renovação.</span>
                                    </Label>
                                </div>
                            </div>
                        </RadioGroup>

                        {paymentMethod === 'credit_card' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Número do Cartão</Label>
                                    <div className="relative">
                                        <Input placeholder="0000 0000 0000 0000" value={ccNumber} onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))} maxLength={19} />
                                        <ScanLine className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome no Cartão</Label>
                                    <Input placeholder="COMO NO CARTAO" value={ccHolder} onChange={(e) => setCcHolder(e.target.value.toUpperCase())} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Validade</Label>
                                        <Input placeholder="MM/AA" value={ccExpiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4); setCcExpiry(v); }} maxLength={5} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>CVV</Label>
                                        <Input placeholder="123" value={ccCcv} onChange={(e) => setCcCcv(e.target.value.replace(/\D/g, ''))} maxLength={4} />
                                    </div>
                                </div>

                                {selectedPlan === 'yearly-default' && (
                                    <div className="space-y-2">
                                        <Label>Parcelamento</Label>
                                        <Select value={installments.toString()} onValueChange={(v) => setInstallments(Number(v))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">À vista (R$ 299,90/ano)</SelectItem>
                                                <SelectItem value="2">2x de R$ 149,95</SelectItem>
                                                <SelectItem value="3">3x de R$ 99,96</SelectItem>
                                                <SelectItem value="4">4x de R$ 74,97</SelectItem>
                                                <SelectItem value="5">5x de R$ 59,98</SelectItem>
                                                <SelectItem value="6">6x de R$ 49,98</SelectItem>
                                                <SelectItem value="10">10x de R$ 29,99</SelectItem>
                                                <SelectItem value="12">12x de R$ 24,99</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Parcelamento disponível apenas para cartão de crédito.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground mt-4">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span>Pagamento processado com segurança pelo <strong>Asaas</strong></span>
                        </div>

                        {paymentMethod === 'boleto' && (
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm flex items-start gap-2">
                                <FileText className="h-5 w-5 shrink-0" />
                                <p>Atenção: Pagamentos via Boleto podem levar até <strong>3 dias úteis</strong> para compensar. Sua assinatura será ativada automaticamente após a compensação.</p>
                            </div>
                        )}
                        
                        {paymentMethod === 'pix' && (
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-md text-sm flex items-start gap-2">
                                <QrCode className="h-5 w-5 shrink-0" />
                                <p>Liberação imediata! Você receberá um QR Code na próxima tela.</p>
                            </div>
                        )}
                    </div>
                )}

                {checkoutStep === 'details' && paymentData && (
                    <div className="py-4 space-y-6">
                        {paymentMethod === 'pix' && (
                            <div className="flex flex-col items-center gap-4">
                                {paymentData.pixQrCode && (
                                    <img src={`data:image/png;base64,${paymentData.pixQrCode}`} alt="QR Code Pix" className="w-48 h-48 border rounded-lg" />
                                )}
                                <div className="w-full space-y-2">
                                    <Label>Pix Copia e Cola</Label>
                                    <div className="flex gap-2">
                                        <Input readOnly value={paymentData.pixCopyPaste || ''} />
                                        <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(paymentData.pixCopyPaste); toast({title: "Copiado!"}); }}><Copy className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                                <p className="text-sm text-center text-muted-foreground">Abra o app do seu banco e escaneie o QR Code ou use o Copia e Cola.</p>
                            </div>
                        )}

                        {paymentMethod === 'boleto' && (
                             <div className="flex flex-col gap-4">
                                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/20">
                                    <Barcode className="h-16 w-16 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">Utilize o código abaixo para pagar.</p>
                                </div>
                                <div className="space-y-2">
                                   <Label>Linha Digitável</Label>
                                   <div className="flex items-center gap-2 w-full">
                                       <Input readOnly value={paymentData.boletoBarcode || ''} />
                                       <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(paymentData.boletoBarcode); toast({title: "Copiado!"}); }}><Copy className="h-4 w-4"/></Button>
                                   </div>
                               </div>
                               {paymentData.boletoUrl && (
                                   <Button variant="outline" className="w-full" onClick={() => window.open(paymentData.boletoUrl, '_blank')}>
                                       Abrir Boleto em PDF
                                   </Button>
                               )}
                           </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {checkoutStep === 'select' ? (
                        <>
                            <Button variant="outline" onClick={() => setShowCheckoutModal(false)}>Cancelar</Button>
                            <Button onClick={processPayment} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {paymentMethod === 'credit_card' ? 'Pagar Agora' : paymentMethod === 'pix' ? 'Gerar Pix' : 'Gerar Boleto'}
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <Button variant="outline" onClick={() => setShowCheckoutModal(false)} className="w-full">Fechar</Button>
                            <Button onClick={() => checkPaymentStatus(true)} className="w-full">Já Paguei</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 max-w-3xl mx-auto">
          {DEFAULT_PLANS.map((plan) => (
            <Card key={plan.id} className={`flex flex-col relative overflow-hidden border-2 transition-all ${plan.is_popular ? 'border-primary shadow-lg scale-105 z-10' : 'hover:border-primary/50'}`}>
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg">MAIS POPULAR</div>
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
                  <span className="text-lg font-normal text-muted-foreground">/{plan.interval === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                {plan.interval === 'yearly' && (
                  <p className="text-sm text-green-600 font-medium">Equivalente a {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price / 12)}/mês</p>
                )}
                <ul className="space-y-3">
                  {plan.marketing_features?.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2"><Check className="text-green-500 h-5 w-5" /><span>{feature}</span></li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" onClick={() => initiateCheckout(plan.id)} disabled={loading}>
                  Assinar Agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Pagamento seguro via Asaas. Cancele quando quiser.</p>
        </div>
      </div>
    </MainLayout>
  );
}
