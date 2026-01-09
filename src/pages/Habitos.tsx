import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getWeekDates, formatDateForDB } from "@/utils/dateUtils";
import { useToast } from "@/hooks/use-toast";

const weekDays = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO", "DOMINGO"];

interface Habit {
  id: string;
  title: string;
}

interface ScheduleRow {
  time: string;
  schedule: string[];
}

interface Urgencia {
  id: number;
  text: string;
  done: boolean;
}



const Habitos = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedLogs, setCompletedLogs] = useState<Set<string>>(new Set()); // Format: "habitId-date"
  
  const [scheduleData, setScheduleData] = useState<ScheduleRow[]>([
    { time: "6:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "7:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "8:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "9:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "10:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "11:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "12:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "13:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "14:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "15:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "16:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "17:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "18:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "19:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "20:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "21:00", schedule: ["", "", "", "", "", "", ""] },
    { time: "22:00", schedule: ["", "", "", "", "", "", ""] },
  ]);
  const [urgenciasList, setUrgenciasList] = useState<Urgencia[]>([]);
  
  // Modal states
  const [habitModal, setHabitModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [urgenciaModal, setUrgenciaModal] = useState(false);
  
  // Edit states
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [editingUrgencia, setEditingUrgencia] = useState<Urgencia | null>(null);
  
  // Form states
  const [formHabitName, setFormHabitName] = useState("");
  const [formScheduleTime, setFormScheduleTime] = useState("");
  const [formScheduleItems, setFormScheduleItems] = useState<string[]>(["", "", "", "", "", "", ""]);
  const [formUrgenciaText, setFormUrgenciaText] = useState("");

  const weekDates = getWeekDates();

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch habits
      const { data: existingHabits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (habitsError) throw habitsError;
      setHabits(existingHabits || []);

      // 2. Fetch logs for this week
      const startDate = formatDateForDB(weekDates[0]);
      const endDate = formatDateForDB(weekDates[6]);

      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id, completed_date')
        .eq('user_id', user.id)
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);

      if (logsError) throw logsError;

      if (logs) {
        const logsSet = new Set<string>();
        logs.forEach(log => {
          logsSet.add(`${log.habit_id}-${log.completed_date}`);
        });
        setCompletedLogs(logsSet);
      }
    } catch (error: any) {
      console.error("Error initializing data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = async (dayIndex: number, habitId: string) => {
    const date = weekDates[dayIndex];
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
        await supabase
          .from('habit_logs')
          .delete()
          .match({ habit_id: habitId, completed_date: dateStr, user_id: user.id });
      } else {
        await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, completed_date: dateStr, user_id: user.id });

        // XP update
        const { data: profile } = await supabase.from('profiles').select('current_xp').eq('id', user.id).single();
        if (profile) {
          await supabase.from('profiles').update({ current_xp: profile.current_xp + 10 }).eq('id', user.id);
        }
      }
      
      // Notify other components
      window.dispatchEvent(new Event('gamification-updated'));
      
    } catch (error) {
      console.error("Error toggling habit:", error);
      setCompletedLogs(completedLogs); // Revert
      toast({
        variant: "destructive",
        title: "Erro ao atualizar hábito",
      });
    }
  };

  const toggleUrgencia = (id: number) => {
    setUrgenciasList(prev => prev.map(u => u.id === id ? { ...u, done: !u.done } : u));
  };

  // Habit CRUD
  const openHabitModal = (habit?: Habit) => {
    if (habit) {
      setEditingHabit(habit);
      setFormHabitName(habit.title);
    } else {
      setEditingHabit(null);
      setFormHabitName("");
    }
    setHabitModal(true);
  };

  const saveHabit = async () => {
    if (!formHabitName.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingHabit) {
        const { error } = await supabase
          .from('habits')
          .update({ title: formHabitName })
          .eq('id', editingHabit.id)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setHabits(prev => prev.map(h => h.id === editingHabit.id ? { ...h, title: formHabitName } : h));
        toast({ title: "Hábito atualizado!" });
      } else {
        const { data, error } = await supabase
          .from('habits')
          .insert({ title: formHabitName, user_id: user.id })
          .select()
          .single();
          
        if (error) throw error;
        
        setHabits(prev => [...prev, data]);
        toast({ title: "Hábito criado!" });
      }
      setHabitModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar hábito",
        description: error.message
      });
    }
  };

  const deleteHabit = async () => {
    if (editingHabit) {
      try {
        const { error } = await supabase
          .from('habits')
          .delete()
          .eq('id', editingHabit.id);
          
        if (error) throw error;
        
        setHabits(prev => prev.filter(h => h.id !== editingHabit.id));
        toast({ title: "Hábito excluído" });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir hábito",
          description: error.message
        });
      }
    }
    setHabitModal(false);
  };

  // Schedule CRUD
  const openScheduleModal = (row?: ScheduleRow) => {
    if (row) {
      setEditingSchedule(row);
      setFormScheduleTime(row.time);
      setFormScheduleItems([...row.schedule]);
    } else {
      setEditingSchedule(null);
      setFormScheduleTime("");
      setFormScheduleItems(["", "", "", "", "", "", ""]);
    }
    setScheduleModal(true);
  };

  const saveSchedule = () => {
    if (!formScheduleTime.trim()) return;
    const newRow: ScheduleRow = { time: formScheduleTime, schedule: formScheduleItems };
    if (editingSchedule) {
      setScheduleData(prev => prev.map(r => r.time === editingSchedule.time ? newRow : r));
    } else {
      setScheduleData(prev => [...prev, newRow]);
    }
    setScheduleModal(false);
  };

  const deleteSchedule = () => {
    if (editingSchedule) {
      setScheduleData(prev => prev.filter(r => r.time !== editingSchedule.time));
    }
    setScheduleModal(false);
  };

  // Urgencia CRUD
  const openUrgenciaModal = (urgencia?: Urgencia) => {
    if (urgencia) {
      setEditingUrgencia(urgencia);
      setFormUrgenciaText(urgencia.text);
    } else {
      setEditingUrgencia(null);
      setFormUrgenciaText("");
    }
    setUrgenciaModal(true);
  };

  const saveUrgencia = () => {
    if (!formUrgenciaText.trim()) return;
    if (editingUrgencia) {
      setUrgenciasList(prev => prev.map(u => u.id === editingUrgencia.id ? { ...u, text: formUrgenciaText } : u));
    } else {
      setUrgenciasList(prev => [...prev, { id: Date.now(), text: formUrgenciaText, done: false }]);
    }
    setUrgenciaModal(false);
  };

  const deleteUrgencia = () => {
    if (editingUrgencia) {
      setUrgenciasList(prev => prev.filter(u => u.id !== editingUrgencia.id));
    }
    setUrgenciaModal(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Hábitos ✅</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Habits Table & Weekly Schedule */}
        <div className="xl:col-span-2 space-y-6">
          {/* Daily Habits Table */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-yellow justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                HÁBITOS DIÁRIOS
              </div>
              <Button size="sm" variant="ghost" onClick={() => openHabitModal()} className="h-7 px-2">
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[hsl(var(--notion-yellow-bg))]">
                    <th className="text-left p-3 text-sm font-semibold border-b border-border text-foreground">DIA</th>
                    {habits.map((habit) => (
                      <th key={habit.id} className="p-3 text-center text-xs font-semibold border-b border-border min-w-[80px] text-foreground">
                        <div className="flex items-center justify-center gap-1 group">
                          <span>{habit.title}</span>
                          <button onClick={() => openHabitModal(habit)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/10 rounded">
                            <Pencil size={10} />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((day, dayIndex) => (
                    <tr key={day} className="hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium border-b border-border/50">{day}</td>
                      {habits.map((habit) => {
                        const date = weekDates[dayIndex];
                        const dateStr = formatDateForDB(date);
                        const isCompleted = completedLogs.has(`${habit.id}-${dateStr}`);
                        
                        return (
                          <td key={habit.id} className="p-3 text-center border-b border-border/50">
                            <button
                              onClick={() => toggleHabit(dayIndex, habit.id)}
                              className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all",
                                isCompleted
                                  ? "bg-info border-info text-info-foreground"
                                  : "border-muted-foreground/30 hover:border-info"
                              )}
                            >
                              {isCompleted && <Check size={12} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-pink justify-between">
              <span>📅 ROTINA SEMANAL</span>
              <Button size="sm" variant="ghost" onClick={() => openScheduleModal()} className="h-7 px-2">
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[hsl(var(--notion-pink-bg))]">
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Horário</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Segunda</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Terça</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Quarta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Quinta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Sexta</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Sábado</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Domingo</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleData.map((row) => (
                    <tr key={row.time} className="hover:bg-muted/30">
                      <td className="p-2 text-xs font-medium border-b border-border/50 bg-[hsl(var(--notion-pink-bg))]/50">
                        {row.time}
                      </td>
                      {row.schedule.map((item, idx) => (
                        <td key={idx} className="p-2 text-xs border-b border-border/50 text-center">
                          {item}
                        </td>
                      ))}
                      <td className="p-2 text-center border-b border-border/50">
                        <button onClick={() => openScheduleModal(row)} className="p-1 hover:bg-muted rounded mr-1">
                          <Pencil size={10} className="text-muted-foreground" />
                        </button>
                        <button onClick={() => { setEditingSchedule(row); deleteSchedule(); }} className="p-1 hover:bg-destructive/10 rounded">
                          <Trash2 size={10} className="text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Motivational Image */}
          <div className="notion-card overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop"
              alt="Motivational"
              className="w-full h-40 object-cover"
            />
            <div className="p-4 text-center bg-gradient-to-b from-card to-muted/30">
              <p className="text-sm italic text-muted-foreground">"Cumpra o que você se prometeu"</p>
            </div>
          </div>

          {/* Urgencies */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-pink justify-between">
              <span>🚨 URGÊNCIAS</span>
              <Button size="sm" variant="ghost" onClick={() => openUrgenciaModal()} className="h-7 px-2">
                <Plus size={14} />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {urgenciasList.map((item) => (
                <div key={item.id} className="flex items-start gap-3 group">
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
                  <span className={cn(
                    "text-sm flex-1",
                    item.done && "line-through text-muted-foreground"
                  )}>
                    {item.text}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button onClick={() => openUrgenciaModal(item)} className="p-1 hover:bg-muted rounded">
                      <Pencil size={12} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => { setEditingUrgencia(item); deleteUrgencia(); }} className="p-1 hover:bg-destructive/10 rounded">
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Clock Style */}
          <div className="notion-card">
            <div className="p-6 bg-[hsl(var(--notion-pink))] text-center">
              <div className="text-5xl font-bold tracking-wider text-[hsl(var(--notion-pink-foreground))]">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm mt-2 text-[hsl(var(--notion-pink-foreground))]/70">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Modal */}
      <CrudModal
        open={habitModal}
        onOpenChange={setHabitModal}
        title={editingHabit ? "Editar Hábito" : "Novo Hábito"}
        onSave={saveHabit}
        onDelete={deleteHabit}
        isEditing={!!editingHabit}
      >
        <FormField label="Nome" value={formHabitName} onChange={setFormHabitName} placeholder="Nome do hábito" />
      </CrudModal>

      {/* Schedule Modal */}
      <CrudModal
        open={scheduleModal}
        onOpenChange={setScheduleModal}
        title={editingSchedule ? "Editar Horário" : "Novo Horário"}
        onSave={saveSchedule}
        onDelete={deleteSchedule}
        isEditing={!!editingSchedule}
      >
        <FormField label="Horário" value={formScheduleTime} onChange={setFormScheduleTime} placeholder="Ex: 8:00" />
        {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day, idx) => (
          <FormField 
            key={day}
            label={day} 
            value={formScheduleItems[idx]} 
            onChange={(v) => {
              const newItems = [...formScheduleItems];
              newItems[idx] = v;
              setFormScheduleItems(newItems);
            }} 
            placeholder="Atividade" 
          />
        ))}
      </CrudModal>

      {/* Urgencia Modal */}
      <CrudModal
        open={urgenciaModal}
        onOpenChange={setUrgenciaModal}
        title={editingUrgencia ? "Editar Urgência" : "Nova Urgência"}
        onSave={saveUrgencia}
        onDelete={deleteUrgencia}
        isEditing={!!editingUrgencia}
      >
        <FormField label="Descrição" value={formUrgenciaText} onChange={setFormUrgenciaText} placeholder="O que precisa fazer?" />
      </CrudModal>
    </MainLayout>
  );
};

export default Habitos;
