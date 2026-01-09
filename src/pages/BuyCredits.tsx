
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    credits: 10,
    price: 9.90,
    name: "Pacote Inicial",
    description: "Ideal para começar a experimentar.",
    popular: false
  },
  {
    id: 'pro',
    credits: 50,
    price: 39.90,
    name: "Pacote Pro",
    description: "Para quem usa IA com frequência.",
    popular: true
  },
  {
    id: 'expert',
    credits: 100,
    price: 69.90,
    name: "Pacote Expert",
    description: "Melhor custo-benefício.",
    popular: false
  }
];

export default function BuyCredits() {
  const { toast } = useToast();

  const handleBuy = (pkg: any) => {
    // Here would be the payment integration (Stripe, MercadoPago, etc)
    // For now, we'll show a contact/support message or a simulation
    toast({
      title: "Processando pedido...",
      description: "Você será redirecionado para o pagamento em breve. (Simulação)",
    });
    
    // In a real app, redirect to checkout url
    setTimeout(() => {
        window.open("https://wa.me/5511999999999?text=Quero comprar o pacote de creditos " + pkg.name, "_blank");
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Adquira mais Créditos IA</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Gere treinos e dietas personalizados com nossa Inteligência Artificial avançada.
            Seus créditos nunca expiram.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card key={pkg.id} className={`flex flex-col relative ${pkg.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Sparkles size={14} />
                  Mais Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-sm font-medium text-muted-foreground">R$</span>
                  <span className="text-4xl font-bold">{pkg.price.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                        <Zap size={16} />
                    </div>
                    <span className="font-medium">{pkg.credits} Créditos IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600">
                        <Check size={16} />
                    </div>
                    <span className="text-sm text-muted-foreground">Geração de Dietas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600">
                        <Check size={16} />
                    </div>
                    <span className="text-sm text-muted-foreground">Geração de Treinos</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                    className="w-full" 
                    variant={pkg.popular ? "default" : "outline"}
                    onClick={() => handleBuy(pkg)}
                >
                  Comprar Agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
