import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { User, Bell, Shield, CreditCard, Loader2, Save, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarUploadModal } from "@/components/profile/AvatarUploadModal";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  cpf?: string;
  birth_date?: string;
}

interface UserSettings {
  notify_habits: boolean;
  notify_bills: boolean;
  notify_exams: boolean;
  gender: string;
}

interface UserSubscription {
  status: string;
  plan_type: string;
  current_period_end: string;
}

const Configuracoes = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    notify_habits: true,
    notify_bills: true,
    notify_exams: true,
    gender: 'female'
  });

  // Password Change State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Sync theme to DB
  useEffect(() => {
    if (!profile || loading) return;
    
    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('user_settings')
          .upsert({ 
            user_id: profile.id, 
            theme: theme 
          }, { onConflict: 'user_id' });
      } catch (error) {
        console.error("Erro ao sincronizar tema:", error);
      }
    }, 2000); // Debounce 2s to avoid too many writes during switching

    return () => clearTimeout(timer);
  }, [theme, profile?.id, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile({
        id: user.id,
        email: user.email || "",
        name: profileData?.name || "",
        avatar_url: profileData?.avatar_url || null
      });

      // Fetch Settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setSettings({
          notify_habits: settingsData.notify_habits ?? true,
          notify_bills: settingsData.notify_bills ?? true,
          notify_exams: settingsData.notify_exams ?? true,
          gender: settingsData.gender || 'female'
        });
        
        // Sync theme from DB if it exists and is different from current
        if (settingsData.theme && (settingsData.theme === 'light' || settingsData.theme === 'dark') && settingsData.theme !== theme) {
          setTheme(settingsData.theme);
        }
      }

      // Fetch Subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subData) {
        setSubscription(subData);
      }

    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar suas configurações."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    setSelectedFile(event.target.files[0]);
    // Reset input value to allow selecting same file again
    event.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    try {
      if (!profile) return;

      setUploadingAvatar(true);
      setSelectedFile(null); // Close modal
      
      const fileExt = 'jpg'; // We convert to jpeg in modal
      const filePath = `${profile.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!"
      });

    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Ocorreu um erro ao atualizar o avatar."
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o perfil."
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = async (key: keyof UserSettings) => {
    if (!profile) return;
    
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: profile.id,
          [key]: newValue
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a alteração."
      });
    }
  };

  const handleUpdateGender = async (value: string) => {
    console.log('Updating gender to:', value);
    if (!profile) return;
    
    setSettings(prev => ({ ...prev, gender: value }));

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: profile.id,
          gender: value
        }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error: any) {
      console.error("Erro ao salvar gênero:", error);
      
      // Handle missing column error gracefully
      if (error?.code === 'PGRST204' || error?.message?.includes("Could not find the 'gender' column")) {
        console.warn("Schema mismatch: gender column missing in user_settings. Change saved locally only.");
        // We don't show error toast to avoid blocking the user, as the local state is already updated.
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a alteração de gênero."
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: window.location.origin + '/redefinir-senha', // Adjust if needed
      });
      
      if (error) throw error;
      
      toast({
        title: "Email enviado",
        description: "Verifique seu email para redefinir a senha."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar o email de redefinição."
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erro", description: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não conferem." });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Sua senha foi alterada com sucesso." });
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar a senha." });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Personalize sua experiência no Tudo em Ordem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <DashboardCard title="Perfil" icon={<User size={18} />}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm ring-2 ring-background"
                >
                  {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div className="flex-1">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name" 
                  value={profile?.name || ""} 
                  onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Seu nome"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  value={profile?.cpf || ""} 
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input 
                  id="birthDate" 
                  type="date"
                  value={profile?.birth_date || ""} 
                  onChange={(e) => setProfile(prev => prev ? { ...prev, birth_date: e.target.value } : null)}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={profile?.email || ""} 
                disabled 
                className="mt-1 bg-muted"
              />
            </div>

            <div>
              <Label className="mb-2 block">Gênero (para cálculos corporais)</Label>
              <RadioGroup value={settings.gender || 'female'} onValueChange={(val) => handleUpdateGender(val)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="r-female" />
                  <Label htmlFor="r-female">Feminino</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="r-male" />
                  <Label htmlFor="r-male">Masculino</Label>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </DashboardCard>

        {/* Notifications */}
        <DashboardCard title="Notificações" icon={<Bell size={18} />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">Lembretes de hábitos</p>
                <p className="text-xs text-muted-foreground">Receba lembretes diários</p>
              </div>
              <Switch 
                checked={settings.notify_habits} 
                onCheckedChange={() => toggleSetting('notify_habits')} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">Alertas de contas</p>
                <p className="text-xs text-muted-foreground">Aviso antes do vencimento</p>
              </div>
              <Switch 
                checked={settings.notify_bills} 
                onCheckedChange={() => toggleSetting('notify_bills')} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">Provas e Estudos</p>
                <p className="text-xs text-muted-foreground">Lembrete de avaliações</p>
              </div>
              <Switch 
                checked={settings.notify_exams} 
                onCheckedChange={() => toggleSetting('notify_exams')} 
              />
            </div>
          </div>
        </DashboardCard>

        {/* Theme Settings */}
        <ThemeSettings />

        {/* Security */}
        <DashboardCard title="Segurança" icon={<Shield size={18} />}>
          <div className="space-y-4">
            <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  Alterar senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                  <DialogDescription>
                    Digite sua nova senha abaixo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar Senha
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handlePasswordReset} className="w-full justify-start text-muted-foreground">
              Enviar email de redefinição (alternativo)
            </Button>
            <Button variant="outline" disabled className="w-full justify-start opacity-50 cursor-not-allowed">
              Autenticação de dois fatores (Em breve)
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
              Excluir conta
            </Button>
          </div>
        </DashboardCard>

        {/* Subscription */}
        <DashboardCard title="Plano" icon={<CreditCard size={18} />} className="lg:col-span-2">
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div>
              <h3 className="font-semibold text-foreground">
                {subscription?.status === 'active' || subscription?.status === 'trial' 
                  ? (subscription.plan_type === 'yearly' ? 'Plano Anual' : 'Plano Mensal') 
                  : 'Plano Gratuito'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscription?.status === 'active' 
                  ? 'Sua assinatura está ativa e você tem acesso total.' 
                  : subscription?.status === 'trial'
                  ? 'Você está no período de teste gratuito.'
                  : 'Você está usando a versão gratuita com recursos básicos.'}
              </p>
            </div>
            {subscription?.status === 'active' || subscription?.status === 'trial' ? (
              <Button variant="outline" onClick={() => navigate('/assinatura')}>Gerenciar Assinatura</Button>
            ) : (
              <Button onClick={() => navigate('/assinatura')}>Upgrade para Premium</Button>
            )}
          </div>
        </DashboardCard>
      </div>
      
      <AvatarUploadModal
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        imageFile={selectedFile}
        onConfirm={handleCropConfirm}
      />
    </MainLayout>
  );
};

export default Configuracoes;
