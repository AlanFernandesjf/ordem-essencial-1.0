import { MainLayout } from "@/components/layout/MainLayout";
import { GamificationSection } from "@/components/dashboard/GamificationSection";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Calendar, Clock, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { formatDateForDB, formatDateDisplay } from "@/utils/dateUtils";
import { useToast } from "@/hooks/use-toast";

interface UrgenciaItem {
  id: string;
  text: string;
  done: boolean;
  priority?: string;
  date?: string;
  time?: string;
  type: 'chore' | 'appointment';
}

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [urgenciasList, setUrgenciasList] = useState<UrgenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Usuário");
  const [userUsername, setUserUsername] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userStatus, setUserStatus] = useState<"trial" | "pro" | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [time, setTime] = useState(new Date());
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    initializeData();
    const timer = setInterval(() => setTime(new Date()), 1000);

    const handleCreditsUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail !== undefined) {
            setCredits(customEvent.detail);
        }
    };

    window.addEventListener('credits-updated', handleCreditsUpdate);

    return () => {
        clearInterval(timer);
        window.removeEventListener('credits-updated', handleCreditsUpdate);
    };
  }, []);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 0. Fetch Profile & Subscription
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
          setUserName(profile.name.split(' ')[0]);
          setUserUsername(profile.username || "");
          setUserAvatar(profile.avatar_url || "");
      }

      const { data: sub } = await supabase.from('user_subscriptions').select('status').eq('user_id', user.id).single();
      if (sub) {
        if (sub.status === 'trial') setUserStatus('trial');
        else if (sub.status === 'active') setUserStatus('pro');
      }

      // 4. Fetch Urgencias (Home Chores & Appointments)
      const { data: chores } = await supabase
        .from('home_chores')
        .select('*')
        .eq('user_id', user.id)
        .eq('done', false)
        .not('due_date', 'is', null)
        .neq('due_date', '')
        .order('due_date', { ascending: true });

      const { data: appointments } = await supabase
        .from('health_appointments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gte('date', formatDateForDB(today))
        .order('date', { ascending: true });

      let combinedUrgencies: UrgenciaItem[] = [];

      if (appointments) {
        combinedUrgencies = combinedUrgencies.concat(appointments.map((a: any) => ({
          id: a.id,
          text: `Consulta: ${a.specialty} com ${a.doctor}`,
          done: false,
          date: a.date,
          time: a.time,
          type: 'appointment'
        })));
      }

      if (chores) {
        combinedUrgencies = combinedUrgencies.concat(chores.map((c: any) => ({
          id: c.id,
          text: c.name,
          done: c.done,
          priority: c.priority,
          date: c.due_date,
          time: c.time,
          type: 'chore'
        })));
      }

      setUrgenciasList(combinedUrgencies);

      // 5. Fetch Credits
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creditsData) {
        setCredits(creditsData.credits_remaining);
      } else {
        const { error: insertError } = await supabase
            .from('user_credits')
            .insert({ user_id: user.id, credits_remaining: 20 });
            
        if (!insertError) {
            setCredits(20);
        } else {
            console.warn("Could not initialize credits:", insertError);
            setCredits(0);
        }
      }

    } catch (error) {
      console.error("Error initializing data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar suas informações."
      });
    } finally {
      setLoading(false);
    }
  };


  const toggleUrgencia = async (id: string) => {
    const item = urgenciasList.find(u => u.id === id);
    if (!item) return;

    const newDone = !item.done;

    // Optimistic
    setUrgenciasList(prev => prev.map(u => u.id === id ? { ...u, done: newDone } : u));

    try {
      if (item.type === 'appointment') {
          const status = newDone ? 'completed' : 'scheduled';
          const { error } = await supabase
            .from('health_appointments')
            .update({ status })
            .eq('id', id);
            
          if (error) throw error;
      } else {
          const { error } = await supabase
            .from('home_chores')
            .update({ done: newDone })
            .eq('id', id);

          if (error) throw error;
      }
    } catch (error) {
      console.error("Erro ao atualizar urgência:", error);
      setUrgenciasList(prev => prev.map(u => u.id === id ? { ...u, done: !newDone } : u));
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status."
      });
    }
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6 animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-semibold text-foreground/80">Olá, {userName}</h2>
             {userStatus === 'trial' && (
               <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                 TESTE GRÁTIS
               </span>
             )}
             {userStatus === 'pro' && (
               <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                 PRO
               </span>
             )}
          </div>
          
          {credits !== null && (
            <Link to="/comprar-creditos" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium border border-amber-200 shadow-sm animate-fade-in hover:bg-amber-200 transition-colors">
                 <span className="text-base">🪙</span>
                 <span>{credits} créditos</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar size={14} />
                <span className="capitalize">{formattedDate}</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Social Dashboard</h1>
            </div>

            {/* Clock */}
            <div className="flex flex-col items-end gap-2">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                    {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
      </div>

      <GamificationSection />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dashboard Overview */}
        <div className="lg:col-span-2 space-y-6">
           <DashboardOverview />
        </div>

        {/* Right Column - Urgencies */}
        <div className="space-y-6">
           {/* Urgencies */}
           <div className="notion-card">
            <div className="notion-card-header notion-header-pink">
              🚨 URGÊNCIAS
            </div>
            <div className="p-4 space-y-3">
              {urgenciasList.length > 0 ? urgenciasList.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <button
                    onClick={() => toggleUrgencia(item.id)}
                    className={cn(
                      "w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
                      item.done
                        ? "bg-success border-success text-success-foreground"
                        : "border-muted-foreground/30 group-hover:border-success"
                    )}
                  >
                    {item.done && <Check size={10} />}
                  </button>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                      <span className={cn(
                        "text-sm flex items-center gap-2",
                        item.done && "line-through text-muted-foreground"
                      )}>
                        {item.type === 'appointment' && <Stethoscope size={14} className="text-blue-500 shrink-0" />}
                        {item.text}
                      </span>
                      {(item.date || item.time) && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {item.date ? formatDateDisplay(item.date) : ''}
                              {item.time ? ` às ${item.time.slice(0, 5)}` : ''}
                          </span>
                      )}
                  </div>
                </label>
              )) : (
                  <div className="text-center text-xs text-muted-foreground py-2">
                      Nenhuma urgência pendente.
                  </div>
              )}
              <div className="flex gap-2 justify-center mt-2">
                <Link to="/tarefas" className="text-xs text-primary hover:underline">Ver Tarefas</Link>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/habitos" className="p-3 notion-card text-center hover:shadow-card-hover transition-shadow">
              <span className="text-2xl mb-1 block">✅</span>
              <span className="text-xs font-medium">Hábitos</span>
            </Link>
            <Link to="/estudos" className="p-3 notion-card text-center hover:shadow-card-hover transition-shadow">
              <span className="text-2xl mb-1 block">📚</span>
              <span className="text-xs font-medium">Estudos</span>
            </Link>
            <Link to="/financas" className="p-3 notion-card text-center hover:shadow-card-hover transition-shadow">
              <span className="text-2xl mb-1 block">💰</span>
              <span className="text-xs font-medium">Finanças</span>
            </Link>
            <Link to="/treinos" className="p-3 notion-card text-center hover:shadow-card-hover transition-shadow">
              <span className="text-2xl mb-1 block">💪</span>
              <span className="text-xs font-medium">Treinos</span>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;