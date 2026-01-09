import { MainLayout } from "@/components/layout/MainLayout";
import { GamificationSection } from "@/components/dashboard/GamificationSection";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, Calendar, Clock, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getWeekDates, formatDateForDB } from "@/utils/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const weekDays = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];

interface Habit {
  id: string;
  title: string;
}

interface ScheduleItem {
  id: string;
  horario: string;
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
  sab?: string;
  dom?: string;
}

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
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedLogs, setCompletedLogs] = useState<Set<string>>(new Set()); // Format: "habitId-date"
  const [urgenciasList, setUrgenciasList] = useState<UrgenciaItem[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Usuário");
  const [userStatus, setUserStatus] = useState<"trial" | "pro" | null>(null);
  const [time, setTime] = useState(new Date());
  
  const weekDates = getWeekDates();

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    initializeData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 0. Fetch Profile & Subscription
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      if (profile?.name) setUserName(profile.name.split(' ')[0]);

      const { data: sub } = await supabase.from('user_subscriptions').select('status').eq('user_id', user.id).single();
      if (sub) {
        if (sub.status === 'trial') setUserStatus('trial');
        else if (sub.status === 'active') setUserStatus('pro');
      }

      // 1. Fetch habits
      const { data: existingHabits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      setHabits(existingHabits || []);

      // 2. Fetch logs for this week
      const startDate = formatDateForDB(weekDates[0]);
      const endDate = formatDateForDB(weekDates[6]);

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_date')
        .eq('user_id', user.id)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);

      if (logs) {
        const logsSet = new Set<string>();
        logs.forEach(log => {
          logsSet.add(`${log.habit_id}-${log.completed_date}`);
        });
        setCompletedLogs(logsSet);
      }

      // 3. Fetch Schedule
      const { data: schedule } = await supabase
        .from('study_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('horario'); // Order by time string might be imperfect but okay for now

      if (schedule) {
        setScheduleData(schedule.map((s: any) => ({
          id: s.id,
          horario: s.horario,
          seg: s.seg || "—",
          ter: s.ter || "—",
          qua: s.qua || "—",
          qui: s.qui || "—",
          sex: s.sex || "—",
          sab: "—", // Schema doesn't have sat/sun explicitly in study_schedule but we can add or ignore
          dom: "—"
        })));
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

  const toggleHabit = async (habitId: string, date: Date) => {
    const dateStr = formatDateForDB(date);
    const key = `${habitId}-${dateStr}`;
    const isCompleted = completedLogs.has(key);
    
    // Optimistic update
    const newLogs = new Set(completedLogs);
    if (isCompleted) {
      newLogs.delete(key);
    } else {
      newLogs.add(key);
    }
    setCompletedLogs(newLogs);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isCompleted) {
        // Remove
        await supabase
          .from('habit_logs')
          .delete()
          .match({ habit_id: habitId, completed_date: dateStr, user_id: user.id });
          
        // Decrease XP (optional logic)
      } else {
        // Add
        await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, completed_date: dateStr, user_id: user.id });
          
        // Manual XP update
        const { data: profile } = await supabase.from('profiles').select('current_xp').eq('id', user.id).single();
        if (profile) {
          await supabase.from('profiles').update({ current_xp: profile.current_xp + 10 }).eq('id', user.id);
        }
      }
      
      // Notify gamification section
      window.dispatchEvent(new Event('gamification-updated'));
      
    } catch (error) {
      console.error("Error toggling habit:", error);
      // Revert on error
      setCompletedLogs(completedLogs); 
      toast({
        variant: "destructive",
        title: "Erro ao atualizar hábito",
        description: "Tente novamente."
      });
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
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Calendar size={14} />
                <span className="capitalize">{formattedDate}</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Minha Semana ✅</h1>
            </div>

            {/* Clock */}
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

      <GamificationSection />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Habits Table & Weekly Schedule */}
        <div className="xl:col-span-2 space-y-6">
          {/* Daily Habits Table */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-yellow">
              <Check className="w-4 h-4" />
              HÁBITOS DIÁRIOS
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-notion-yellow-bg">
                    <th className="text-left p-3 text-sm font-semibold border-b border-border">DIA</th>
                    {habits.length > 0 ? habits.map((habit) => (
                      <th key={habit.id} className="p-3 text-center text-xs font-semibold border-b border-border min-w-[80px]">
                        {habit.title}
                      </th>
                    )) : (
                      <th className="p-3 text-center text-xs text-muted-foreground border-b border-border">
                        Nenhum hábito cadastrado
                      </th>
                    )}
                    <th className="p-2 border-b border-border">
                      <button className="p-1 hover:bg-muted rounded">
                        <Plus size={14} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((dayName, dayIndex) => {
                    const date = weekDates[dayIndex];
                    const isToday = formatDateForDB(date) === formatDateForDB(today);
                    
                    return (
                      <tr key={dayName} className={cn(
                        "hover:bg-muted/50 transition-colors",
                        isToday && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}>
                        <td className="p-3 border-b border-border text-sm font-medium">
                          <div className="flex flex-col">
                            <span>{dayName}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {date.getDate()}/{date.getMonth() + 1}
                            </span>
                          </div>
                        </td>
                        {habits.map((habit) => {
                           const isCompleted = completedLogs.has(`${habit.id}-${formatDateForDB(date)}`);
                           return (
                            <td key={habit.id} className="p-3 text-center border-b border-border">
                              <button
                                onClick={() => toggleHabit(habit.id, date)}
                                className={cn(
                                  "w-6 h-6 rounded border flex items-center justify-center transition-all duration-200",
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-input hover:bg-muted"
                                )}
                              >
                                {isCompleted && <Check size={14} />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-2 border-b border-border"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-pink flex items-center gap-2">
              <Clock className="w-4 h-4" />
              ROTINA SEMANAL
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-notion-pink-bg">
                    <th className="p-2 text-xs font-semibold border-b border-border">Horário</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Segunda</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Terça</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Quarta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Quinta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Sexta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Sábado</th>
                    <th className="p-2 text-xs font-semibold border-b border-border">Domingo</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="p-2 text-xs font-medium border-b border-border/50 bg-notion-pink-bg/50">
                        {row.horario}
                      </td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.seg}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.ter}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.qua}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.qui}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.sex}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.sab}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.dom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">


          {/* Urgencies */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-pink">
              🚨 URGÊNCIAS
            </div>
            <div className="p-4 space-y-3">
              {urgenciasList.map((item) => (
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
                              {item.date ? format(parseISO(item.date), "dd/MM", { locale: ptBR }) : ''}
                              {item.time ? ` às ${item.time.slice(0, 5)}` : ''}
                          </span>
                      )}
                  </div>
                </label>
              ))}
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-2">
                <Plus size={14} />
                Adicionar
              </button>
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
