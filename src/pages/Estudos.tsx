import { MainLayout } from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, GraduationCap, Calendar, BookOpen, Pencil, Trash2, Clock, Play, Pause, RotateCcw } from "lucide-react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContentItem {
  id: string;
  content: string;
  leitura: boolean;
  resumo: boolean;
  exercicio: boolean;
  revisao: boolean;
}

interface ProvaEntrega {
  id: string;
  title: string;
  date: string;
  time: string;
  color: "pink" | "blue" | "yellow";
}

interface GradeItem {
  id: string;
  horario: string;
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
}

interface Tarefa {
  id: string;
  text: string;
  done: boolean;
  day: string;
}

const Estudos = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState<ContentItem[]>([]);
  const [provasEntregas, setProvasEntregas] = useState<ProvaEntrega[]>([]);
  const [gradeData, setGradeData] = useState<GradeItem[]>([]);
  const [tarefas, setTarefas] = useState<Record<string, Tarefa[]>>({
    SEGUNDA: [], TERÇA: [], QUARTA: [], QUINTA: [], SEXTA: [], SÁBADO: [], DOMINGO: []
  });
  
  // Modal states
  const [contentModal, setContentModal] = useState(false);
  const [provaModal, setProvaModal] = useState(false);
  const [tarefaModal, setTarefaModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);
  
  // Edit states
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [editingProva, setEditingProva] = useState<ProvaEntrega | null>(null);
  const [editingTarefa, setEditingTarefa] = useState<{day: string, tarefa: Tarefa} | null>(null);
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  
  // Form states
  const [formContent, setFormContent] = useState("");
  const [formProvaTitle, setFormProvaTitle] = useState("");
  const [formProvaDate, setFormProvaDate] = useState("");
  const [formProvaTime, setFormProvaTime] = useState("");
  const [formProvaColor, setFormProvaColor] = useState<"pink" | "blue" | "yellow">("pink");
  const [formTarefaText, setFormTarefaText] = useState("");
  const [formTarefaDay, setFormTarefaDay] = useState("SEGUNDA");
  const [formGradeHorario, setFormGradeHorario] = useState("");
  const [formGradeSeg, setFormGradeSeg] = useState("");
  const [formGradeTer, setFormGradeTer] = useState("");
  const [formGradeQua, setFormGradeQua] = useState("");
  const [formGradeQui, setFormGradeQui] = useState("");
  const [formGradeSex, setFormGradeSex] = useState("");

  // Banner State
  const [studyTitle, setStudyTitle] = useState("Profissão Gestora de Tráfego");
  const [studyLink, setStudyLink] = useState("prateleiradenegocios.com.br");
  const [bannerModal, setBannerModal] = useState(false);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!timerActive && timerSeconds !== 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  const toggleTimer = () => setTimerActive(!timerActive);
  const resetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(0);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 0. Fetch Settings (Banner)
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('study_title, study_link')
        .eq('user_id', user.id)
        .single();
      
      if (settingsData) {
        if (settingsData.study_title) setStudyTitle(settingsData.study_title);
        if (settingsData.study_link) setStudyLink(settingsData.study_link);
      }

      // 1. Fetch Contents
      const { data: contentData, error: contentError } = await supabase
        .from('study_contents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      
      if (contentError) throw contentError;
      if (contentData) setContent(contentData);

      // 2. Fetch Exams
      const { data: examsData, error: examsError } = await supabase
        .from('study_exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (examsError) throw examsError;
      if (examsData) setProvasEntregas(examsData as ProvaEntrega[]);

      // 3. Fetch Schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('study_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (scheduleError) throw scheduleError;
      if (scheduleData) setGradeData(scheduleData);

      // 4. Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;
      
      if (tasksData) {
        const tasksByDay: Record<string, Tarefa[]> = {
            SEGUNDA: [], TERÇA: [], QUARTA: [], QUINTA: [], SEXTA: [], SÁBADO: [], DOMINGO: []
        };
        tasksData.forEach((task: Tarefa) => {
            if (tasksByDay[task.day]) {
                tasksByDay[task.day].push(task);
            } else {
                tasksByDay[task.day] = [task];
            }
        });
        setTarefas(tasksByDay);
      }

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleContent = async (id: string, field: 'leitura' | 'resumo' | 'exercicio' | 'revisao') => {
    try {
        const item = content.find(c => c.id === id);
        if (!item) return;

        const newValue = !item[field];
        
        // Optimistic update
        setContent(prev => prev.map(c => c.id === id ? { ...c, [field]: newValue } : c));

        const { error } = await supabase
            .from('study_contents')
            .update({ [field]: newValue })
            .eq('id', id);

        if (error) throw error;
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao atualizar",
            description: error.message
        });
    }
  };

  const toggleTarefa = async (day: string, id: string) => {
    try {
        const taskList = tarefas[day];
        const task = taskList?.find(t => t.id === id);
        if (!task) return;

        const newValue = !task.done;

        // Optimistic update
        setTarefas(prev => ({
            ...prev,
            [day]: prev[day].map(t => t.id === id ? { ...t, done: newValue } : t)
        }));

        const { error } = await supabase
            .from('study_tasks')
            .update({ done: newValue })
            .eq('id', id);
        
        if (error) throw error;

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao atualizar tarefa",
            description: error.message
        });
    }
  };

  // Content CRUD
  const openContentModal = (item?: ContentItem) => {
    if (item) {
      setEditingContent(item);
      setFormContent(item.content);
    } else {
      setEditingContent(null);
      setFormContent("");
    }
    setContentModal(true);
  };

  const saveContent = async () => {
    if (!formContent.trim()) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingContent) {
            const { error } = await supabase
                .from('study_contents')
                .update({ content: formContent })
                .eq('id', editingContent.id);
            
            if (error) throw error;

            setContent(prev => prev.map(c => c.id === editingContent.id ? { ...c, content: formContent } : c));
        } else {
            const { data, error } = await supabase
                .from('study_contents')
                .insert([{ user_id: user.id, content: formContent }])
                .select()
                .single();
            
            if (error) throw error;

            setContent(prev => [...prev, data]);
        }
        setContentModal(false);
        toast({ title: "Conteúdo salvo com sucesso!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao salvar conteúdo",
            description: error.message
        });
    }
  };

  const deleteContent = async (idToDelete?: string) => {
    const id = idToDelete || editingContent?.id;
    if (!id) return;
    try {
        const { error } = await supabase
            .from('study_contents')
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        setContent(prev => prev.filter(c => c.id !== id));
        setContentModal(false);
        toast({ title: "Conteúdo removido!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao remover conteúdo",
            description: error.message
        });
    }
  };

  // Prova CRUD
  const openProvaModal = (item?: ProvaEntrega) => {
    if (item) {
      setEditingProva(item);
      setFormProvaTitle(item.title);
      setFormProvaDate(item.date);
      setFormProvaTime(item.time);
      setFormProvaColor(item.color);
    } else {
      setEditingProva(null);
      setFormProvaTitle("");
      setFormProvaDate("");
      setFormProvaTime("");
      setFormProvaColor("pink");
    }
    setProvaModal(true);
  };

  const saveProva = async () => {
    if (!formProvaTitle.trim()) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const provaData = {
            title: formProvaTitle,
            date: formProvaDate,
            time: formProvaTime,
            color: formProvaColor
        };

        if (editingProva) {
            const { error } = await supabase
                .from('study_exams')
                .update(provaData)
                .eq('id', editingProva.id);

            if (error) throw error;

            setProvasEntregas(prev => prev.map(p => p.id === editingProva.id ? { ...p, ...provaData } : p));
        } else {
            const { data, error } = await supabase
                .from('study_exams')
                .insert([{ user_id: user.id, ...provaData }])
                .select()
                .single();

            if (error) throw error;

            setProvasEntregas(prev => [...prev, data]);
        }
        setProvaModal(false);
        toast({ title: "Item salvo com sucesso!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao salvar item",
            description: error.message
        });
    }
  };

  const deleteProva = async (idToDelete?: string) => {
    const id = idToDelete || editingProva?.id;
    if (!id) return;
    try {
        const { error } = await supabase
            .from('study_exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        setProvasEntregas(prev => prev.filter(p => p.id !== id));
        setProvaModal(false);
        toast({ title: "Item removido!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao remover item",
            description: error.message
        });
    }
  };

  // Tarefa CRUD
  const openTarefaModal = (day?: string, tarefa?: Tarefa) => {
    if (day && tarefa) {
      setEditingTarefa({ day, tarefa });
      setFormTarefaText(tarefa.text);
      setFormTarefaDay(day);
    } else {
      setEditingTarefa(null);
      setFormTarefaText("");
      setFormTarefaDay("SEGUNDA");
    }
    setTarefaModal(true);
  };

  const saveTarefa = async () => {
    if (!formTarefaText.trim()) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingTarefa) {
            // Check if day changed
            const updates: any = { text: formTarefaText };
            if (formTarefaDay !== editingTarefa.day) {
                updates.day = formTarefaDay;
            }

            const { error } = await supabase
                .from('study_tasks')
                .update(updates)
                .eq('id', editingTarefa.tarefa.id);

            if (error) throw error;

            // Update local state
            setTarefas(prev => {
                const newState = { ...prev };
                
                // If day changed, remove from old day and add to new
                if (formTarefaDay !== editingTarefa.day) {
                    newState[editingTarefa.day] = newState[editingTarefa.day].filter(t => t.id !== editingTarefa.tarefa.id);
                    newState[formTarefaDay] = [...(newState[formTarefaDay] || []), { ...editingTarefa.tarefa, text: formTarefaText, day: formTarefaDay }];
                } else {
                    newState[editingTarefa.day] = newState[editingTarefa.day].map(t => t.id === editingTarefa.tarefa.id ? { ...t, text: formTarefaText } : t);
                }
                return newState;
            });
        } else {
            const { data, error } = await supabase
                .from('study_tasks')
                .insert([{ user_id: user.id, text: formTarefaText, day: formTarefaDay }])
                .select()
                .single();

            if (error) throw error;

            setTarefas(prev => ({
                ...prev,
                [formTarefaDay]: [...(prev[formTarefaDay] || []), data]
            }));
        }
        setTarefaModal(false);
        toast({ title: "Tarefa salva com sucesso!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao salvar tarefa",
            description: error.message
        });
    }
  };

  const deleteTarefa = async (idToDelete?: string) => {
    const id = idToDelete || editingTarefa?.tarefa.id;
    if (!id) return;
    
    let day = editingTarefa?.day;
    if (!day && idToDelete) {
        // Find day
        day = Object.keys(tarefas).find(d => tarefas[d].some(t => t.id === idToDelete));
    }
    
    if (!day) return;

    try {
        const { error } = await supabase
            .from('study_tasks')
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        setTarefas(prev => ({
            ...prev,
            [day!]: prev[day!].filter(t => t.id !== id)
        }));
        setTarefaModal(false);
        toast({ title: "Tarefa removida!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao remover tarefa",
            description: error.message
        });
    }
  };

  // Grade CRUD
  const openGradeModal = (item?: GradeItem) => {
    if (item) {
      setEditingGrade(item);
      setFormGradeHorario(item.horario);
      setFormGradeSeg(item.seg);
      setFormGradeTer(item.ter);
      setFormGradeQua(item.qua);
      setFormGradeQui(item.qui);
      setFormGradeSex(item.sex);
    } else {
      setEditingGrade(null);
      setFormGradeHorario("");
      setFormGradeSeg("");
      setFormGradeTer("");
      setFormGradeQua("");
      setFormGradeQui("");
      setFormGradeSex("");
    }
    setGradeModal(true);
  };

  const saveGrade = async () => {
    if (!formGradeHorario.trim()) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const gradeItemData = {
            horario: formGradeHorario,
            seg: formGradeSeg,
            ter: formGradeTer,
            qua: formGradeQua,
            qui: formGradeQui,
            sex: formGradeSex
        };

        if (editingGrade) {
            const { error } = await supabase
                .from('study_schedule')
                .update(gradeItemData)
                .eq('id', editingGrade.id);

            if (error) throw error;

            setGradeData(prev => prev.map(g => g.id === editingGrade.id ? { ...g, ...gradeItemData } : g));
        } else {
            const { data, error } = await supabase
                .from('study_schedule')
                .insert([{ user_id: user.id, ...gradeItemData }])
                .select()
                .single();

            if (error) throw error;

            setGradeData(prev => [...prev, data]);
        }
        setGradeModal(false);
        toast({ title: "Grade atualizada com sucesso!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao salvar grade",
            description: error.message
        });
    }
  };

  const saveBanner = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_settings')
            .upsert({ 
                user_id: user.id,
                study_title: studyTitle, 
                study_link: studyLink 
            }, { onConflict: 'user_id' });

        if (error) throw error;
        
        setBannerModal(false);
        toast({ title: "Informações atualizadas!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: error.message
        });
    }
  };

  const deleteGrade = async (idToDelete?: string) => {
    const id = idToDelete || editingGrade?.id;
    if (!id) return;
    try {
        const { error } = await supabase
            .from('study_schedule')
            .delete()
            .eq('id', id);
        
        if (error) throw error;

        setGradeData(prev => prev.filter(g => g.id !== id));
        setGradeModal(false);
        toast({ title: "Item da grade removido!" });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao remover item da grade",
            description: error.message
        });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-foreground">Faculdade | Estudos ✅</h1>
      </div>

      {/* Course Banner */}
      <div className="mb-6 notion-card overflow-hidden group relative">
        <button 
            onClick={() => setBannerModal(true)}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full text-primary shadow-sm transition-all z-10"
        >
            <Pencil size={16} />
        </button>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[hsl(var(--notion-purple-bg))] to-[hsl(var(--notion-blue-bg))]">
          <div className="w-16 h-16 rounded-lg bg-card flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">{studyTitle}</h2>
            <p className="text-sm text-muted-foreground">{studyLink}</p>
          </div>
        </div>
      </div>

      <CrudModal
        open={bannerModal}
        onOpenChange={setBannerModal}
        title="Editar Cabeçalho"
        onSave={saveBanner}
      >
        <FormField label="Título / Profissão" value={studyTitle} onChange={setStudyTitle} placeholder="Ex: Engenharia de Software" />
        <FormField label="Subtítulo / Link" value={studyLink} onChange={setStudyLink} placeholder="Ex: faculdade.com.br" />
      </CrudModal>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Content Table */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-yellow justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                CONTEÚDO
              </div>
              <Button size="sm" variant="ghost" onClick={() => openContentModal()} className="h-7 px-2">
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[hsl(var(--notion-yellow-bg))]">
                    <th className="text-left p-3 text-sm font-semibold border-b border-border text-foreground">Conteúdo</th>
                    <th className="p-3 text-center text-sm font-semibold border-b border-border text-foreground">Leitura</th>
                    <th className="p-3 text-center text-sm font-semibold border-b border-border text-foreground">Resumo</th>
                    <th className="p-3 text-center text-sm font-semibold border-b border-border text-foreground">Exercício</th>
                    <th className="p-3 text-center text-sm font-semibold border-b border-border text-foreground">Revisão</th>
                    <th className="p-3 text-center text-sm font-semibold border-b border-border text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(content || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground text-sm">
                        Nenhum conteúdo cadastrado.
                      </td>
                    </tr>
                  ) : (
                    (content || []).map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-3 text-sm border-b border-border/50">{item.content}</td>
                      {(['leitura', 'resumo', 'exercicio', 'revisao'] as const).map((field) => (
                        <td key={field} className="p-3 text-center border-b border-border/50">
                          <button
                            onClick={() => toggleContent(item.id, field)}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all",
                              item[field]
                                ? "bg-info border-info text-info-foreground"
                                : "border-muted-foreground/30 hover:border-info"
                            )}
                          >
                            {item[field] && <Check size={12} />}
                          </button>
                        </td>
                      ))}
                      <td className="p-3 text-center border-b border-border/50">
                        <button onClick={() => openContentModal(item)} className="p-1 hover:bg-muted rounded mr-1 text-foreground hover:text-primary transition-colors">
                          <Pencil size={14} className="" />
                        </button>
                        <button onClick={() => deleteContent(item.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive/80 hover:text-destructive transition-colors">
                          <Trash2 size={14} className="" />
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>

          {/* College Schedule */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-pink justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                GRADE FACULDADE ADM.
              </div>
              <Button size="sm" variant="ghost" onClick={() => openGradeModal()} className="h-7 px-2">
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[hsl(var(--notion-pink-bg))]">
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">HORÁRIO</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">SEGUNDA</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">TERÇA</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">QUARTA</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">QUINTA</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">SEXTA</th>
                    <th className="p-2 text-xs font-semibold border-b border-border text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(gradeData || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground text-sm">
                        Nenhuma grade cadastrada.
                      </td>
                    </tr>
                  ) : (
                    (gradeData || []).map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="p-2 text-xs font-medium border-b border-border/50 bg-[hsl(var(--notion-pink-bg))]/50">
                        {row.horario}
                      </td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.seg}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.ter}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.qua}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.qui}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">{row.sex}</td>
                      <td className="p-2 text-xs border-b border-border/50 text-center">
                        <button onClick={() => openGradeModal(row)} className="p-1 hover:bg-muted rounded mr-1 text-foreground hover:text-primary transition-colors">
                          <Pencil size={12} className="" />
                        </button>
                        <button onClick={() => deleteGrade(row.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive/80 hover:text-destructive transition-colors">
                          <Trash2 size={12} className="" />
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Cronômetro */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-blue justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                CRONÔMETRO DE ESTUDOS
              </div>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
               <div className="text-4xl font-mono font-bold tabular-nums text-foreground">
                 {formatTime(timerSeconds)}
               </div>
               <div className="flex gap-2 w-full">
                 <Button 
                   className={cn("flex-1 text-white", timerActive ? "bg-amber-500 hover:bg-amber-600" : "bg-green-500 hover:bg-green-600")}
                   onClick={toggleTimer}
                 >
                   {timerActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                   {timerActive ? "Pausar" : "Iniciar"}
                 </Button>
                 <Button variant="outline" onClick={resetTimer} disabled={timerSeconds === 0}>
                   <RotateCcw className="mr-2 h-4 w-4" />
                   Zerar
                 </Button>
               </div>
            </div>
          </div>

          {/* Provas e Entregas */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-blue justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                PROVAS, TRABALHOS E ENTREGAS
              </div>
              <Button size="sm" variant="ghost" onClick={() => openProvaModal()} className="h-7 px-2">
                <Plus size={14} />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              {(provasEntregas || []).length === 0 ? (
                <div className="text-center text-muted-foreground text-sm">Nenhum item cadastrado.</div>
              ) : (
                (provasEntregas || []).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg text-sm flex items-center justify-between group",
                    item.color === "pink" && "bg-[hsl(var(--notion-pink-bg))] border-l-4 border-[hsl(var(--notion-pink))]",
                    item.color === "blue" && "bg-[hsl(var(--notion-blue-bg))] border-l-4 border-[hsl(var(--notion-blue))]",
                    item.color === "yellow" && "bg-[hsl(var(--notion-yellow-bg))] border-l-4 border-[hsl(var(--notion-yellow))]"
                  )}
                >
                  <div className="font-medium text-foreground">{item.title} - {item.date} - {item.time}</div>
                  <div className="flex gap-1">
                    <button onClick={() => openProvaModal(item)} className="p-1 hover:bg-background/50 rounded text-foreground hover:text-primary transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteProva(item.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive/80 hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* Tarefas da Semana */}
          <div className="notion-card">
            <div className="notion-card-header notion-header-orange justify-between">
              <span>📋 TAREFAS DA SEMANA</span>
              <Button size="sm" variant="ghost" onClick={() => openTarefaModal()} className="h-7 px-2">
                <Plus size={14} />
              </Button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(tarefas || {}) as [string, Tarefa[]][]).map(([day, tasks]) => (
                  <div key={day}>
                    <h4 className="font-semibold text-xs mb-2 text-muted-foreground">{day}</h4>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2 group">
                          <button
                            onClick={() => toggleTarefa(day, task.id)}
                            className={cn(
                              "w-3.5 h-3.5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all",
                              task.done
                                ? "bg-success border-success text-success-foreground"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {task.done && <Check size={8} />}
                          </button>
                          <span className={cn("text-xs flex-1", task.done && "line-through text-muted-foreground")}>
                            {task.text}
                          </span>
                          <div className="flex gap-0.5">
                            <button onClick={() => openTarefaModal(day, task)} className="p-0.5 hover:bg-muted rounded text-foreground hover:text-primary transition-colors">
                              <Pencil size={12} className="" />
                            </button>
                            <button onClick={() => deleteTarefa(task.id)} className="p-0.5 hover:bg-destructive/10 rounded text-destructive/80 hover:text-destructive transition-colors">
                              <Trash2 size={12} className="" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Modal */}
      <CrudModal
        open={contentModal}
        onOpenChange={setContentModal}
        title={editingContent ? "Editar Conteúdo" : "Adicionar Conteúdo"}
        onSave={saveContent}
      >
        <FormField label="Conteúdo" value={formContent} onChange={setFormContent} placeholder="Ex: Matéria X" />
      </CrudModal>

      {/* Prova Modal */}
      <CrudModal
        open={provaModal}
        onOpenChange={setProvaModal}
        title={editingProva ? "Editar Item" : "Adicionar Item"}
        onSave={saveProva}
      >
        <FormField label="Título" value={formProvaTitle} onChange={setFormProvaTitle} placeholder="Ex: Prova de Matemática" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data" value={formProvaDate} onChange={setFormProvaDate} placeholder="DD/MM" />
          <FormField label="Hora" value={formProvaTime} onChange={setFormProvaTime} placeholder="HH:MM" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cor</label>
          <div className="flex gap-2">
            {(['pink', 'blue', 'yellow'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setFormProvaColor(color)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  color === 'pink' && "bg-[hsl(var(--notion-pink))]",
                  color === 'blue' && "bg-[hsl(var(--notion-blue))]",
                  color === 'yellow' && "bg-[hsl(var(--notion-yellow))]",
                  formProvaColor === color ? "border-foreground scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
        </div>
      </CrudModal>

      {/* Tarefa Modal */}
      <CrudModal
        open={tarefaModal}
        onOpenChange={setTarefaModal}
        title={editingTarefa ? "Editar Tarefa" : "Adicionar Tarefa"}
        onSave={saveTarefa}
      >
        <FormField label="Tarefa" value={formTarefaText} onChange={setFormTarefaText} placeholder="Descrição da tarefa" />
        <div className="space-y-2">
          <Label>Dia da Semana</Label>
          <Select value={formTarefaDay} onValueChange={setFormTarefaDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(tarefas).map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CrudModal>

      {/* Grade Modal */}
      <CrudModal
        open={gradeModal}
        onOpenChange={setGradeModal}
        title={editingGrade ? "Editar Grade" : "Adicionar Horário"}
        onSave={saveGrade}
      >
        <FormField label="Horário" value={formGradeHorario} onChange={setFormGradeHorario} placeholder="Ex: 7H30" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Segunda" value={formGradeSeg} onChange={setFormGradeSeg} />
          <FormField label="Terça" value={formGradeTer} onChange={setFormGradeTer} />
          <FormField label="Quarta" value={formGradeQua} onChange={setFormGradeQua} />
          <FormField label="Quinta" value={formGradeQui} onChange={setFormGradeQui} />
          <FormField label="Sexta" value={formGradeSex} onChange={setFormGradeSex} />
        </div>
      </CrudModal>
    </MainLayout>
  );
};

export default Estudos;
