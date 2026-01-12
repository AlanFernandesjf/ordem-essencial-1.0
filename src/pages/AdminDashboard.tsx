import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Calendar, CreditCard, Edit, Save, X, Plus, Trash2, DollarSign, Package, Video, MessageCircle, MessageSquareWarning, Coins } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CancellationFeedback {
  id: string;
  user_id: string;
  reasons: string[];
  other_reason: string | null;
  created_at: string;
  user_email?: string;
}

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
}

interface TutorialFAQ {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  active: boolean;
  description?: string;
  marketing_features?: string[];
  is_popular?: boolean;
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  user_email?: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  level: number;
  current_streak: number;
  created_at: string;
  subscription_status?: string;
  subscription_plan?: string;
  credits?: number; // Added
  subscription?: {
    status: string;
    plan_type: string;
    payment_method: string;
    created_at: string;
    amount: number;
  };
}

const AVAILABLE_FEATURES = [
  { id: 'habits', label: 'Hábitos' },
  { id: 'studies', label: 'Estudos' },
  { id: 'health', label: 'Saúde' },
  { id: 'finance', label: 'Finanças' },
  { id: 'home', label: 'Casa' },
  { id: 'travel', label: 'Viagens' },
  { id: 'workouts', label: 'Treinos' },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Estados para edição de usuário
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados para criação de usuário
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Estados para criação de plano
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanInterval, setNewPlanInterval] = useState<string>("monthly");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [newPlanDescription, setNewPlanDescription] = useState("");
  const [newPlanMarketingFeatures, setNewPlanMarketingFeatures] = useState("");
  const [newPlanIsPopular, setNewPlanIsPopular] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Form states (User Edit)
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editLevel, setEditLevel] = useState(1);

  // Estados para adicionar créditos
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [selectedUserForCredits, setSelectedUserForCredits] = useState<{id: string, email: string} | null>(null);

  // Estados para Tutoriais
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [faqs, setFaqs] = useState<TutorialFAQ[]>([]);
  const [feedbacks, setFeedbacks] = useState<CancellationFeedback[]>([]);
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState(false);
  const [isCreateFaqOpen, setIsCreateFaqOpen] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoDesc, setNewVideoDesc] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newFaqQuestion, setNewFaqQuestion] = useState("");
  const [newFaqAnswer, setNewFaqAnswer] = useState("");
  const [isCreatingTutorial, setIsCreatingTutorial] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchPlans(), fetchPayments(), fetchTutorials(), fetchFaqs(), fetchFeedback()]);
    setLoading(false);
  };

  const fetchFeedback = async () => {
    try {
        const { data, error } = await supabase
            .from('cancellation_feedback')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.warn("Feedback table not found:", error.message);
            toast({
                variant: "destructive",
                title: "Erro no Feedback",
                description: "A tabela 'cancellation_feedback' não foi encontrada. Execute o SQL de migração."
            });
            return;
        }
        setFeedbacks(data || []);
    } catch (error) {
        console.error("Error fetching feedback:", error);
    }
  };

  const fetchTutorials = async () => {
    try {
      const { data, error } = await supabase
        .from('tutorial_videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("Tabela tutorial_videos pode não existir:", error.message);
        return;
      }
      setVideos(data || []);
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error);
    }
  };

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('tutorial_faqs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("Tabela tutorial_faqs pode não existir:", error.message);
        return;
      }
      setFaqs(data || []);
    } catch (error) {
      console.error("Erro ao buscar FAQs:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Busca perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Busca assinaturas
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*');

      if (subsError) {
          console.warn("Erro ao buscar user_subscriptions:", subsError.message);
      }

      // Busca créditos
      const { data: creditsData } = await supabase.from('user_credits').select('*');

      const formattedUsers = profiles.map(profile => {
        // Encontra assinatura do usuário
        const userSubs = subscriptions?.filter((s: any) => s.user_id === profile.id) || [];
        const sortedSubs = userSubs.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Encontra créditos
        const userCredits = creditsData?.find((c: any) => c.user_id === profile.id);

        // Se não tiver na tabela subscriptions, tenta usar os campos do profile (legado/fallback)
        const activeSub = sortedSubs?.[0] || (profile.subscription_status ? {
            status: profile.subscription_status,
            plan_type: profile.subscription_plan,
            created_at: profile.created_at, // Fallback
            amount: 0 // Fallback
        } : null);

        return {
          ...profile,
          credits: userCredits?.credits_remaining || 0,
          subscription: activeSub
        };
      });

      setUsers(formattedUsers);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) {
        // Se a tabela não existir, não quebra a página, apenas loga
        console.warn("Tabela plans pode não existir ainda:", error.message);
        return;
      }
      setPlans(data || []);
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
    }
  };

  const fetchPayments = async () => {
    // Simulação ou busca real se tabela existir
    // Como a tabela pode não existir, usamos um try/catch silencioso ou mock
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (!error && data) {
            setPayments(data);
        }
    } catch (e) {
        console.warn("Tabela payments não disponível");
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName || !newPlanPrice) return;
    setCreatingPlan(true);
    try {
        const { error } = await supabase.from('plans').insert({
            name: newPlanName,
            price: parseFloat(newPlanPrice),
            interval: newPlanInterval,
            features: selectedFeatures,
            active: true,
            description: newPlanDescription,
            marketing_features: newPlanMarketingFeatures.split('\n').filter(f => f.trim() !== ''),
            is_popular: newPlanIsPopular
        });

        if (error) throw error;

        toast({ title: "Plano criado com sucesso!" });
        setIsCreatePlanOpen(false);
        setNewPlanName("");
        setNewPlanPrice("");
        setNewPlanDescription("");
        setNewPlanMarketingFeatures("");
        setNewPlanIsPopular(false);
        setSelectedFeatures([]);
        fetchPlans();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao criar plano", description: error.message });
    } finally {
        setCreatingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir este plano?")) return;
      try {
          const { error } = await supabase.from('plans').delete().eq('id', id);
          if (error) throw error;
          toast({ title: "Plano excluído" });
          fetchPlans();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Erro", description: error.message });
      }
  };

  const handleRefund = async (userId: string) => {
      if (!confirm("Confirmar reembolso via Asaas? Isso estornará o último pagamento.")) return;
      
      // Simulação de chamada API Asaas
      toast({
          title: "Processando Reembolso...",
          description: "Conectando com API Asaas."
      });

      setTimeout(() => {
          toast({
              title: "Reembolso Solicitado",
              description: "O estorno foi processado no Asaas com sucesso (Simulação).",
              variant: "default" // Sucesso
          });
      }, 1500);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza? Isso apagará todos os dados do usuário.")) return;
    
    try {
      // Tenta deletar via RPC (que remove do auth.users e cascateia)
      const { error } = await supabase.rpc('delete_user_by_admin', {
        user_id_to_delete: userId
      });

      if (error) {
        // Se a RPC não existir ou falhar, tenta fallback (apenas profile) mas avisa
        console.warn("Erro ao deletar via RPC, tentando deletar profile:", error);
        if (error.message.includes("function") && error.message.includes("does not exist")) {
             // Fallback para deletar apenas o profile (comportamento antigo)
             const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
             if (profileError) throw profileError;
             toast({ 
                title: "Perfil removido (Parcial)", 
                description: "O perfil foi removido, mas o login pode persistir. Execute o script 'delete_user_rpc.sql' no Supabase." 
             });
        } else {
            throw error;
        }
      } else {
        toast({ title: "Usuário removido com sucesso" });
      }

      fetchUsers();
    } catch (error: any) {
       console.error("Erro ao deletar usuário:", error);
       toast({ 
         variant: "destructive", 
         title: "Erro ao deletar", 
         description: error.message || "Erro desconhecido." 
       });
    }
  };

  const openAddCreditsModal = (user: UserProfile) => {
    setSelectedUserForCredits({ id: user.id, email: user.email });
    setCreditsToAdd("10"); // Default value
    setIsAddCreditsOpen(true);
  };

  const confirmAddCredits = async () => {
    if (!selectedUserForCredits || !creditsToAdd) return;
    const amount = parseInt(creditsToAdd);
    if (isNaN(amount)) {
        toast({ variant: "destructive", title: "Valor inválido" });
        return;
    }

    try {
        const userId = selectedUserForCredits.id;
        // Check if row exists first
        const { data: existing } = await supabase.from('user_credits').select('*').eq('user_id', userId).single();
        
        if (existing) {
            const { error } = await supabase
                .from('user_credits')
                .update({ credits_remaining: existing.credits_remaining + amount })
                .eq('user_id', userId);
            if (error) throw error;
        } else {
             const { error } = await supabase
                .from('user_credits')
                .insert({ user_id: userId, credits_remaining: 20 + amount }); // 20 default + amount
             if (error) throw error;
        }

        toast({ title: "Créditos adicionados!" });
        setIsAddCreditsOpen(false);
        fetchUsers();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // ... (manter funções existentes: handleEditClick, handleSaveUser, handleCreateUser, getStatusBadge, formatCurrency)


  const handleCreateVideo = async () => {
    if (!newVideoTitle || !newVideoUrl) {
        toast({ variant: "destructive", title: "Preencha título e URL" });
        return;
    }
    setIsCreatingTutorial(true);
    try {
        const { error } = await supabase.from('tutorial_videos').insert({
            title: newVideoTitle,
            description: newVideoDesc,
            url: newVideoUrl
        });
        if (error) throw error;
        toast({ title: "Vídeo adicionado!" });
        setIsCreateVideoOpen(false);
        setNewVideoTitle(""); setNewVideoDesc(""); setNewVideoUrl("");
        fetchTutorials();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
        setIsCreatingTutorial(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Excluir este vídeo?")) return;
    try {
        const { error } = await supabase.from('tutorial_videos').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Vídeo excluído" });
        fetchTutorials();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleCreateFaq = async () => {
    if (!newFaqQuestion || !newFaqAnswer) {
        toast({ variant: "destructive", title: "Preencha pergunta e resposta" });
        return;
    }
    setIsCreatingTutorial(true);
    try {
        const { error } = await supabase.from('tutorial_faqs').insert({
            question: newFaqQuestion,
            answer: newFaqAnswer
        });
        if (error) throw error;
        toast({ title: "FAQ adicionada!" });
        setIsCreateFaqOpen(false);
        setNewFaqQuestion(""); setNewFaqAnswer("");
        fetchFaqs();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
        setIsCreatingTutorial(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Excluir esta pergunta?")) return;
    try {
        const { error } = await supabase.from('tutorial_faqs').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "FAQ excluída" });
        fetchFaqs();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditRole(user.role || 'user');
    setEditStatus(user.subscription?.status || user.subscription_status || 'free');
    setEditPlan(user.subscription?.plan_type || user.subscription_plan || 'none');
    setEditLevel(user.level || 1);
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      // 1. Atualizar Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          level: editLevel,
          subscription_status: editStatus,
          subscription_plan: editPlan === 'none' ? null : editPlan,
          is_admin: editRole === 'admin'
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // 2. Se mudou para pago, criar registro em subscriptions
      if ((editStatus === 'active' || editStatus === 'premium') && 
          (editingUser.subscription_status !== editStatus || editingUser.subscription_plan !== editPlan)) {
         
         const { error: subError } = await supabase
           .from('subscriptions')
           .insert({
             user_id: editingUser.id,
             status: editStatus,
             plan_type: editPlan,
             payment_method: 'manual_admin',
             amount: 0,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
           });
           
         if (subError) {
           console.error("Erro ao criar log de subscription:", subError);
           toast({
             variant: "destructive",
             title: "Aviso",
             description: "Perfil salvo, mas erro ao registrar histórico de assinatura."
           });
         }
      }

      toast({
        title: "Usuário atualizado",
        description: `As alterações para ${editingUser.email} foram salvas.`
      });

      setIsEditDialogOpen(false);
      fetchUsers(); // Recarrega lista
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha."
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.rpc('create_user_by_admin', {
        new_email: newEmail,
        new_password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Usuário criado!",
        description: `O usuário ${newEmail} foi criado com sucesso.`
      });

      setIsCreateDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error.message || error.details || "Erro desconhecido ao criar usuário."
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>;
      case 'premium':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Premium</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Gratuito</Badge>;
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, planos e finanças</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Atualizar Dados
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:w-[600px]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="finance">Financeiro</TabsTrigger>
            <TabsTrigger value="tutorials">Tutoriais</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="space-y-6">
            <div className="flex flex-col gap-6">
              {/* Seção de Vídeos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Vídeos Tutoriais
                  </h2>
                  <Button onClick={() => setIsCreateVideoOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Vídeo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {videos.map((video) => (
                    <Card key={video.id} className="relative overflow-hidden">
                      <div className="absolute top-2 right-2 z-10">
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteVideo(video.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{video.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                           {video.url.includes('youtube') || video.url.includes('vimeo') ? (
                               <iframe 
                                 src={video.url.replace('watch?v=', 'embed/')} 
                                 className="w-full h-full" 
                                 title={video.title} 
                                 allowFullScreen 
                               />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                   Preview Indisponível
                               </div>
                           )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-2 block hover:underline">
                            {video.url}
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                  {videos.length === 0 && (
                    <div className="col-span-3 text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                      Nenhum vídeo cadastrado.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t my-4" />

              {/* Seção de FAQs */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Perguntas Frequentes
                  </h2>
                  <Button onClick={() => setIsCreateFaqOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Pergunta
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pergunta</TableHead>
                          <TableHead>Resposta</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faqs.map((faq) => (
                          <TableRow key={faq.id}>
                            <TableCell className="font-medium">{faq.question}</TableCell>
                            <TableCell className="max-w-md truncate" title={faq.answer}>
                              {faq.answer}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleDeleteFaq(faq.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {faqs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              Nenhuma pergunta cadastrada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
             {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assinantes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.subscription?.status === 'active' || u.subscription?.status === 'premium').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Novos Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita Estimada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(users.reduce((acc, curr) => acc + (curr.subscription?.amount || 0), 0))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Gestão de Usuários</h2>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <CardTitle>Base de Usuários</CardTitle>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por email..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Vence em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{user.email}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="capitalize font-medium">
                                  {user.subscription?.plan_type || user.subscription_plan || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(user.subscription?.status || user.subscription_status || 'free')}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col text-sm">
                                    <span>{user.subscription?.created_at ? new Date(user.subscription.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                                    <span className="text-xs text-muted-foreground">{user.subscription?.payment_method || '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                  {/* Data de Vencimento */}
                                  {user.subscription?.current_period_end ? (
                                      <span className="text-sm">
                                          {new Date(user.subscription.current_period_end).toLocaleDateString('pt-BR')}
                                      </span>
                                  ) : user.subscription?.created_at ? (
                                      <span className="text-sm text-muted-foreground" title="Estimado (30 dias)">
                                          {new Date(new Date(user.subscription.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}*
                                      </span>
                                  ) : '-'}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-amber-600">{user.credits || 0}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-amber-500 hover:text-amber-700 hover:bg-amber-100"
                                        title="Adicionar Créditos"
                                        onClick={() => openAddCreditsModal(user)}
                                    >
                                        <Coins className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                    variant="ghost"  
                                    size="icon"
                                    title="Editar"
                                    onClick={() => handleEditClick(user)}
                                    >
                                    <Edit className="w-4 h-4" />
                                    </Button>
                                    {/* Botão de Reembolso só aparece se tiver pago algo */}
                                    {user.subscription?.amount && user.subscription.amount > 0 && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                                            title="Solicitar Reembolso (Asaas)"
                                            onClick={() => handleRefund(user.id)}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                    title="Excluir Usuário"
                                    onClick={() => handleDeleteUser(user.id)}
                                    >
                                    <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Planos de Assinatura</h2>
                <Button onClick={() => setIsCreatePlanOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Novo Plano
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeletePlan(plan.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <CardDescription>
                                {plan.interval === 'monthly' ? 'Mensal' : plan.interval === 'yearly' ? 'Anual' : 'Vitalício'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-4">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Produtos Inclusos:</p>
                                <div className="flex flex-wrap gap-2">
                                    {plan.features?.map(f => {
                                        const label = AVAILABLE_FEATURES.find(af => af.id === f)?.label || f;
                                        return <Badge key={f} variant="secondary">{label}</Badge>
                                    })}
                                    {(!plan.features || plan.features.length === 0) && <span className="text-sm text-muted-foreground">Nenhum</span>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {plans.length === 0 && (
                    <div className="col-span-3 text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                        Nenhum plano cadastrado. Crie o primeiro!
                    </div>
                )}
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-4">
             <h2 className="text-xl font-semibold">Resumo Financeiro</h2>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Vendas Totais</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.filter(u => u.subscription?.amount && u.subscription.amount > 0).length}</div>
                        <p className="text-xs text-muted-foreground">Transações confirmadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Receita Total</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                             {formatCurrency(users.reduce((acc, curr) => acc + (curr.subscription?.amount || 0), 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">Valor bruto acumulado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Ticket Médio</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {(() => {
                                const payingUsers = users.filter(u => u.subscription?.amount && u.subscription.amount > 0);
                                const total = payingUsers.reduce((acc, curr) => acc + (curr.subscription?.amount || 0), 0);
                                return formatCurrency(payingUsers.length ? total / payingUsers.length : 0);
                            })()}
                        </div>
                    </CardContent>
                </Card>
             </div>

             <Card className="mt-6">
                 <CardHeader>
                     <CardTitle>Histórico Recente (Simulação)</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead>Data</TableHead>
                                 <TableHead>Usuário</TableHead>
                                 <TableHead>Valor</TableHead>
                                 <TableHead>Status</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {users.filter(u => u.subscription?.amount && u.subscription.amount > 0).slice(0, 10).map(u => (
                                 <TableRow key={u.id}>
                                     <TableCell>{new Date(u.subscription!.created_at).toLocaleDateString()}</TableCell>
                                     <TableCell>{u.email}</TableCell>
                                     <TableCell>{formatCurrency(u.subscription!.amount)}</TableCell>
                                     <TableCell><Badge className="bg-green-500">Pago</Badge></TableCell>
                                 </TableRow>
                             ))}
                             {users.filter(u => u.subscription?.amount && u.subscription.amount > 0).length === 0 && (
                                 <TableRow><TableCell colSpan={4} className="text-center">Nenhuma venda registrada</TableCell></TableRow>
                             )}
                         </TableBody>
                     </Table>
                 </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5" />
                  Feedback de Cancelamento
                </CardTitle>
                <CardDescription>
                  Motivos informados pelos usuários ao cancelar a assinatura.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Forma de Pagamento</TableHead>
                      <TableHead>Motivos</TableHead>
                      <TableHead>Outros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum feedback registrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedbacks.map((item) => {
                        const user = users.find(u => u.id === item.user_id);
                        
                        // Extract payment method from reasons
                        const paymentReason = item.reasons?.find(r => r.startsWith('PAYMENT:'));
                        const displayReasons = item.reasons?.filter(r => !r.startsWith('PAYMENT:')) || [];
                        
                        let paymentMethod = 'Desconhecido';
                        if (paymentReason) {
                            const rawMethod = paymentReason.replace('PAYMENT:', '');
                            if (rawMethod === 'CREDIT_CARD') paymentMethod = 'Cartão de Crédito';
                            else if (rawMethod === 'PIX') paymentMethod = 'Pix';
                            else if (rawMethod === 'BOLETO') paymentMethod = 'Boleto';
                            else paymentMethod = rawMethod;
                        }

                        return (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{user?.name || 'Usuário'}</span>
                                <span className="text-xs text-muted-foreground">{user?.email || item.user_id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                    {paymentMethod}
                                </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                  {displayReasons.map((r, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                                  ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={item.other_reason || ""}>
                              {item.other_reason || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Faça alterações no perfil de {editingUser?.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              
              {/* Role */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Permissão
                </Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Comum</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Assinatura */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="active">Ativo (Pago)</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plano */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plan" className="text-right">
                  Plano
                </Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="lifetime">Vitalício</SelectItem>
                    {/* Aqui poderíamos listar os planos dinâmicos também */}
                    {plans.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nível */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="level" className="text-right">
                  Nível
                </Label>
                <Input
                  id="level"
                  type="number"
                  value={editLevel}
                  onChange={(e) => setEditLevel(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie um novo usuário manualmente. Ele poderá fazer login com estas credenciais.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="exemplo@email.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-password" className="text-right">
                  Senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="******"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Plan Dialog */}
        <Dialog open={isAddCreditsOpen} onOpenChange={setIsAddCreditsOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Adicionar Créditos</DialogTitle>
              <DialogDescription>
                Adicione créditos para {selectedUserForCredits?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="credits-amount">Quantidade de Créditos</Label>
                <Input
                  id="credits-amount"
                  type="number"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                  placeholder="Ex: 10"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCreditsOpen(false)}>Cancelar</Button>
              <Button onClick={confirmAddCredits} className="bg-amber-500 hover:bg-amber-600">
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Plan Dialog */}
        <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Plano</DialogTitle>
                    <DialogDescription>Defina as características do novo plano de assinatura.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-name" className="text-right">Nome</Label>
                        <Input id="plan-name" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} className="col-span-3" placeholder="Ex: Plano Ouro" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-price" className="text-right">Preço (R$)</Label>
                        <Input id="plan-price" type="number" value={newPlanPrice} onChange={(e) => setNewPlanPrice(e.target.value)} className="col-span-3" placeholder="97.00" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-interval" className="text-right">Recorrência</Label>
                        <Select value={newPlanInterval} onValueChange={setNewPlanInterval}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Mensal</SelectItem>
                                <SelectItem value="yearly">Anual</SelectItem>
                                <SelectItem value="lifetime">Vitalício</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-desc" className="text-right">Subtítulo</Label>
                        <Input id="plan-desc" value={newPlanDescription} onChange={(e) => setNewPlanDescription(e.target.value)} className="col-span-3" placeholder="Ex: Flexibilidade total" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-features" className="text-right">Benefícios</Label>
                        <div className="col-span-3">
                             <Textarea 
                                id="plan-features" 
                                value={newPlanMarketingFeatures} 
                                onChange={(e) => setNewPlanMarketingFeatures(e.target.value)} 
                                placeholder="Digite um benefício por linha..."
                                rows={5}
                             />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="plan-popular" className="text-right">Destaque</Label>
                        <div className="flex items-center space-x-2 col-span-3">
                            <Checkbox 
                                id="plan-popular" 
                                checked={newPlanIsPopular} 
                                onCheckedChange={(checked) => setNewPlanIsPopular(!!checked)} 
                            />
                            <Label htmlFor="plan-popular" className="cursor-pointer">Marcar como "Mais Popular"</Label>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 items-start gap-4 mt-4">
                        <Label className="text-right pt-2">Produtos</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-3">
                            {AVAILABLE_FEATURES.map((feature) => (
                                <div key={feature.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`feature-${feature.id}`} 
                                        checked={selectedFeatures.includes(feature.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedFeatures([...selectedFeatures, feature.id]);
                                            else setSelectedFeatures(selectedFeatures.filter(f => f !== feature.id));
                                        }}
                                    />
                                    <Label htmlFor={`feature-${feature.id}`} className="cursor-pointer">{feature.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreatePlan} disabled={creatingPlan}>
                        {creatingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Plano"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Create Video Dialog */}
        <Dialog open={isCreateVideoOpen} onOpenChange={setIsCreateVideoOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Vídeo Tutorial</DialogTitle>
              <DialogDescription>
                Adicione um novo vídeo do YouTube ou Vimeo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="video-title">Título</Label>
                <Input
                  id="video-title"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="Ex: Como organizar finanças"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="video-url">URL do Vídeo</Label>
                <Input
                  id="video-url"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="video-desc">Descrição</Label>
                <Textarea
                  id="video-desc"
                  value={newVideoDesc}
                  onChange={(e) => setNewVideoDesc(e.target.value)}
                  placeholder="Breve descrição do conteúdo..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateVideoOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateVideo} disabled={isCreatingTutorial}>
                {isCreatingTutorial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Vídeo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create FAQ Dialog */}
        <Dialog open={isCreateFaqOpen} onOpenChange={setIsCreateFaqOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Pergunta Frequente</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="faq-question">Pergunta</Label>
                <Input
                  id="faq-question"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="Ex: Como cancelo minha assinatura?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-answer">Resposta</Label>
                <Textarea
                  id="faq-answer"
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Digite a resposta aqui..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateFaqOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateFaq} disabled={isCreatingTutorial}>
                {isCreatingTutorial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Adicionar Pergunta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
