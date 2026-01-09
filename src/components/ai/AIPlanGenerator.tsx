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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

type PlanType = "diet" | "workout";

interface AIPlanGeneratorProps {
  type: PlanType;
  initialData?: {
    weight?: number;
    height?: number;
    age?: number;
    gender?: string;
  };
  onApplyPlan?: (plan: any, options: { replace: boolean, targetDays?: string[] }) => Promise<void>;
}

const DIET_DAYS = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];

export const AIPlanGenerator = ({ type, initialData, onApplyPlan }: AIPlanGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Apply Modal States
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMode, setApplyMode] = useState<"replace" | "append">("replace");
  const [applyDietScope, setApplyDietScope] = useState<"all" | "specific">("all");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Form States
  const [age, setAge] = useState(initialData?.age?.toString() || "");
  const [gender, setGender] = useState(initialData?.gender === 'male' ? 'Masculino' : initialData?.gender === 'female' ? 'Feminino' : "");
  const [weight, setWeight] = useState(initialData?.weight?.toString() || "");
  const [height, setHeight] = useState(initialData?.height?.toString() || "");
  const [goal, setGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState(""); // For Diet
  const [restrictions, setRestrictions] = useState(""); // For Diet
  const [preferences, setPreferences] = useState(""); // For Diet
  
  const [experienceLevel, setExperienceLevel] = useState(""); // For Workout
  const [daysAvailable, setDaysAvailable] = useState(""); // For Workout
  const [location, setLocation] = useState(""); // For Workout
  const [limitations, setLimitations] = useState(""); // For Workout

  useEffect(() => {
    if (initialData) {
        if (initialData.age) setAge(initialData.age.toString());
        if (initialData.gender) setGender(initialData.gender === 'male' ? 'Masculino' : 'Feminino');
        if (initialData.weight) setWeight(initialData.weight.toString());
        if (initialData.height) setHeight(initialData.height.toString());
    }
  }, [initialData]);

  useEffect(() => {
    fetchExistingPlan();
    fetchCredits();
  }, [type]);

  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (error) {
        console.error("Erro ao buscar créditos:", error);
        return null;
    }
    
    if (data) {
        setCredits(data.credits_remaining);
        return data.credits_remaining;
    } else {
        // Lazy init if no record exists
        const { error: insertError } = await supabase
            .from('user_credits')
            .insert({ user_id: user.id, credits_remaining: 20 });

        if (!insertError) {
            setCredits(20); 
            return 20;
        } else {
            console.error("Erro ao inicializar créditos:", insertError);
            return null;
        }
    }
  };

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
      
      // Update credits from response immediately
      if (data.credits !== undefined && data.credits !== null) {
          setCredits(data.credits);
          window.dispatchEvent(new CustomEvent('credits-updated', { detail: data.credits }));
      } else {
          // Fallback: If backend didn't return credits, check manually and deduct if needed
          const newCredits = await fetchCredits();
          if (newCredits !== null && credits !== null && newCredits >= credits) {
             // Credit didn't decrease! Force deduction locally to fix state
             const { data: user } = await supabase.auth.getUser();
             if (user.user) {
                 const { data: deductionResult, error: deductionError } = await supabase
                    .rpc('deduct_user_credit', { user_id_input: user.user.id });
                 
                 if (!deductionError && deductionResult && deductionResult.success) {
                     const forcedCredits = deductionResult.remaining;
                     setCredits(forcedCredits);
                     window.dispatchEvent(new CustomEvent('credits-updated', { detail: forcedCredits }));
                 }
             }
          }
      }

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
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    setPlan(null);
    setShowResetDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleApply = () => {
    if (!plan || !onApplyPlan) return;
    setShowApplyModal(true);
  };

  const handleConfirmApply = async () => {
    if (!plan || !onApplyPlan) return;
    
    // Validation for diet specific days
    if (type === 'diet' && applyDietScope === 'specific' && selectedDays.length === 0) {
        toast({
            variant: "destructive",
            title: "Selecione os dias",
            description: "Escolha pelo menos um dia para aplicar a dieta."
        });
        return;
    }

    try {
        setApplying(true);
        setShowApplyModal(false);
        
        const options = {
            replace: applyMode === 'replace',
            targetDays: type === 'diet' 
                ? (applyDietScope === 'all' ? ['DIÁRIO'] : selectedDays)
                : undefined
        };

        await onApplyPlan(plan.content, options);
        
        toast({
            title: "Plano Aplicado!",
            description: "Os itens foram adicionados com sucesso à sua planilha."
        });
    } catch (error: any) {
        console.error("Erro ao aplicar plano:", error);
        toast({
            variant: "destructive",
            title: "Erro ao aplicar",
            description: error.message || "Falha ao salvar itens na planilha."
        });
    } finally {
        setApplying(false);
    }
  };

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
          <div className="flex gap-2">
            {onApplyPlan && (
                <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleApply} 
                    disabled={applying}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                    {applying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Aplicar na Planilha
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RefreshCw size={14} />
                Novo Plano
            </Button>
          </div>
        </div>

        {type === 'diet' 
          ? <DietView plan={plan.content} /> 
          : <WorkoutView plan={plan.content} />
        }

        <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Plano de {type === 'diet' ? 'Dieta' : 'Treino'}</DialogTitle>
              <DialogDescription>
                Como você deseja adicionar este plano à sua planilha?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Modo de Aplicação</Label>
                <RadioGroup value={applyMode} onValueChange={(v: "replace" | "append") => setApplyMode(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="r-replace" />
                    <Label htmlFor="r-replace">Substituir Existente (Apaga o anterior)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="append" id="r-append" />
                    <Label htmlFor="r-append">Adicionar ao Existente (Mantém o anterior)</Label>
                  </div>
                </RadioGroup>
              </div>

              {type === 'diet' && (
                <div className="space-y-3 pt-2 border-t">
                  <Label>Dias da Semana</Label>
                  <RadioGroup value={applyDietScope} onValueChange={(v: "all" | "specific") => setApplyDietScope(v)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="d-all" />
                      <Label htmlFor="d-all">Todos os Dias (Rotina Diária)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific" id="d-specific" />
                      <Label htmlFor="d-specific">Dias Específicos</Label>
                    </div>
                  </RadioGroup>

                  {applyDietScope === 'specific' && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                      {DIET_DAYS.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`day-${day}`} 
                            checked={selectedDays.includes(day)}
                            onCheckedChange={(checked) => {
                                if (checked) setSelectedDays([...selectedDays, day]);
                                else setSelectedDays(selectedDays.filter(d => d !== day));
                            }}
                          />
                          <Label htmlFor={`day-${day}`} className="text-sm font-normal">{day}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplyModal(false)}>Cancelar</Button>
              <Button onClick={handleConfirmApply} disabled={applying}>
                {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Confirmar Aplicação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Gerar Novo Plano?</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja gerar um novo plano? O atual será arquivado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReset}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent relative">
      <div className="absolute top-0 right-0 bg-primary/10 px-3 py-1 rounded-full text-xs font-medium text-primary flex items-center gap-2 border border-primary/20">
        <Sparkles size={12} />
        {credits !== null ? `${credits} Créditos` : '...'}
      </div>
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
