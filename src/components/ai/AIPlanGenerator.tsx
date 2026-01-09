import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles, BrainCircuit } from "lucide-react";
import { DietView } from "./DietView";
import { WorkoutView } from "./WorkoutView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlanType = "diet" | "workout";

interface AIPlanGeneratorProps {
  type: PlanType;
}

export const AIPlanGenerator = ({ type }: AIPlanGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  
  // Form States
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState(""); // For Diet
  const [restrictions, setRestrictions] = useState(""); // For Diet
  const [preferences, setPreferences] = useState(""); // For Diet
  
  const [experienceLevel, setExperienceLevel] = useState(""); // For Workout
  const [daysAvailable, setDaysAvailable] = useState(""); // For Workout
  const [location, setLocation] = useState(""); // For Workout
  const [limitations, setLimitations] = useState(""); // For Workout

  useEffect(() => {
    fetchExistingPlan();
  }, [type]);

  const fetchExistingPlan = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPlan(data);
        // Pre-fill form with saved user_data if needed
        const ud = data.user_data;
        if (ud) {
          setAge(ud.age || "");
          setGender(ud.gender || "");
          setWeight(ud.weight || "");
          setHeight(ud.height || "");
          setGoal(ud.goal || "");
          // ... others
        }
      }
    } catch (error) {
      console.error("Erro ao buscar plano:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    // Validação básica
    if (!age || !gender || !goal) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor preencha as informações básicas."
      });
      return;
    }

    try {
      setGenerating(true);
      
      const userData = type === 'diet' 
        ? { age, gender, weight, height, goal, activityLevel, restrictions, preferences }
        : { age, gender, goal, experienceLevel, daysAvailable, location, limitations };

      const { data, error } = await supabase.functions.invoke('generate-ai-plan', {
        body: { type, userData }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPlan(data.plan);
      toast({
        title: "Sucesso!",
        description: `Seu plano de ${type === 'diet' ? 'dieta' : 'treino'} foi gerado com IA.`
      });

    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      toast({
        variant: "destructive",
        title: "Erro na geração",
        description: error.message || "Não foi possível gerar o plano. Tente novamente."
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    if (confirm("Deseja gerar um novo plano? O atual será arquivado.")) {
      setPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <BrainCircuit className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Plano Gerado por IA</h3>
              <p className="text-xs text-muted-foreground">
                Criado em {new Date(plan.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RefreshCw size={14} />
            Novo Plano
          </Button>
        </div>

        {type === 'diet' 
          ? <DietView plan={plan.content} /> 
          : <WorkoutView plan={plan.content} />
        }
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          Gerador de {type === 'diet' ? 'Dieta' : 'Treino'} com IA
        </CardTitle>
        <CardDescription>
          Preencha os dados abaixo para que nossa IA crie um plano 100% personalizado para você.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        {/* Campos Comuns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Idade</Label>
            <Input type="number" placeholder="Anos" value={age} onChange={e => setAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Gênero</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === 'diet' && (
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input type="number" placeholder="Ex: 70" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Altura (cm)</Label>
              <Input type="number" placeholder="Ex: 175" value={height} onChange={e => setHeight(e.target.value)} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Objetivo Principal</Label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Emagrecimento">Emagrecimento (Perder gordura)</SelectItem>
              <SelectItem value="Hipertrofia">Hipertrofia (Ganhar massa muscular)</SelectItem>
              <SelectItem value="Definição">Definição Muscular</SelectItem>
              <SelectItem value="Saúde e Bem-estar">Manutenção/Saúde</SelectItem>
              <SelectItem value="Performance">Performance Atlética</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campos Específicos de Dieta */}
        {type === 'diet' && (
          <>
            <div className="space-y-2">
              <Label>Nível de Atividade</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sedentário">Sedentário (Pouco ou nenhum exercício)</SelectItem>
                  <SelectItem value="Leve">Leve (Exercício 1-3 dias/semana)</SelectItem>
                  <SelectItem value="Moderado">Moderado (Exercício 3-5 dias/semana)</SelectItem>
                  <SelectItem value="Intenso">Intenso (Exercício 6-7 dias/semana)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Restrições Alimentares (Opcional)</Label>
              <Input placeholder="Ex: Lactose, Glúten, Amendoim..." value={restrictions} onChange={e => setRestrictions(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preferências (Opcional)</Label>
              <Textarea placeholder="Ex: Gosto muito de frango, não gosto de peixe, prefiro 3 refeições grandes..." value={preferences} onChange={e => setPreferences(e.target.value)} />
            </div>
          </>
        )}

        {/* Campos Específicos de Treino */}
        {type === 'workout' && (
          <>
            <div className="space-y-2">
              <Label>Nível de Experiência</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante (Nunca treinou ou parou há muito tempo)</SelectItem>
                  <SelectItem value="Intermediário">Intermediário (Treina regularmente há 6 meses+)</SelectItem>
                  <SelectItem value="Avançado">Avançado (Treina sério há anos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dias por Semana</Label>
                <Select value={daysAvailable} onValueChange={setDaysAvailable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 dias</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="4">4 dias</SelectItem>
                    <SelectItem value="5">5 dias</SelectItem>
                    <SelectItem value="6">6 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Local de Treino</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Academia">Academia Completa</SelectItem>
                    <SelectItem value="Casa">Em Casa (Peso do corpo)</SelectItem>
                    <SelectItem value="CasaEquipada">Em Casa (Com halteres/elásticos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Limitações/Lesões (Opcional)</Label>
              <Textarea placeholder="Ex: Dor no joelho, não posso fazer agachamento pesado..." value={limitations} onChange={e => setLimitations(e.target.value)} />
            </div>
          </>
        )}

        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              A Inteligência Artificial está montando seu plano...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Gerar Plano Personalizado
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Pode levar até 30 segundos. A IA analisará seus dados para criar a melhor estratégia.
        </p>
      </CardContent>
    </Card>
  );
};
