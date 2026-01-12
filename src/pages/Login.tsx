import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, AlertCircle, Info, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Login() {
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Extra register fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState(""); // Added username state
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("female");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const checkPasswordStrength = (pass: string) => {
    setPasswordStrength({
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPass = e.target.value;
    setPassword(newPass);
    checkPasswordStrength(newPass);
  };

  const isPasswordStrong = () => {
    return Object.values(passwordStrength).every(Boolean);
  };

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [resetEmail, setResetEmail] = useState("");
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length >= 5) {
      value = value.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    } else if (value.length >= 3) {
      value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    }
    
    setBirthDate(value);
  };

  const formatDateForDb = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/");
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      let description = error.message || "Verifique suas credenciais.";
      
      if (error.message.includes("Email not confirmed")) {
        description = "Por favor, confirme seu email antes de fazer login.";
      } else if (error.message.includes("Invalid login credentials")) {
        description = "Email ou senha incorretos.";
      }

      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar com Google",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isPasswordStrong()) {
        throw new Error("A senha não atende aos requisitos de segurança.");
      }

      if (password !== confirmPassword) {
        throw new Error("As senhas não coincidem.");
      }

      // Verificar CPF antes
      const { data: cpfExists, error: cpfCheckError } = await supabase
        .rpc('check_cpf_exists', { cpf_check: cpf });

      if (cpfCheckError) {
        console.warn("Erro verificação RPC (pode não existir ainda):", cpfCheckError);
      } else if (cpfExists) {
        throw new Error("Este CPF já está cadastrado.");
      }

      const formattedDate = formatDateForDb(birthDate);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            username: username, // Added username
            cpf: cpf,
            birth_date: formattedDate,
            gender: gender
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Conta criada com sucesso!",
        description: "Sua conta foi criada. Faça login para continuar.",
      });
      setActiveTab("login");
    } catch (error: any) {
      let description = error.message;
      if (error.message.includes("User already registered") || error.message.includes("already registered")) {
        description = "Este email já está cadastrado. Tente fazer login.";
      }

      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/redefinir-senha',
      });
      
      if (error) throw error;
      
      toast({ 
        title: "Email enviado", 
        description: "Verifique sua caixa de entrada para redefinir a senha." 
      });
      setResetModalOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: error.message || "Erro ao enviar email de recuperação." 
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted">
              <img src="/logo.svg" alt="Ordem Essencial" className="w-full h-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Ordem Essencial</CardTitle>
          <CardDescription>Gerencie sua vida em um só lugar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input 
                    id="email-login" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password-login">Senha</Label>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs font-normal" 
                      type="button"
                      onClick={() => setResetModalOpen(true)}
                    >
                      Esqueceu a senha?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password-login" 
                      type={showLoginPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Entrar
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou continue com
                    </span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-register">Nome Completo</Label>
                  <Input 
                    id="name-register" 
                    type="text" 
                    placeholder="Seu Nome" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username-register">Nome de Usuário</Label>
                  <Input 
                    id="username-register" 
                    type="text" 
                    placeholder="usuario123" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="cpf-register">CPF</Label>
                    <Input 
                        id="cpf-register" 
                        type="text" 
                        placeholder="000.000.000-00" 
                        value={cpf}
                        onChange={handleCpfChange}
                        required 
                        maxLength={14}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="birth-register">Data de Nascimento</Label>
                    <Input 
                        id="birth-register" 
                        type="text" 
                        placeholder="DD/MM/AAAA"
                        value={birthDate}
                        onChange={handleDateChange}
                        required 
                        maxLength={10}
                    />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender-register">Sexo</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender-register">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-register">Email</Label>
                  <Input 
                    id="email-register" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-register">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="password-register" 
                      type={showRegisterPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicators */}
                  <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded-md text-xs">
                    <p className="font-medium mb-1">Requisitos da senha:</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex items-center gap-2">
                        {passwordStrength.length ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                        <span className={passwordStrength.length ? "text-green-600" : "text-muted-foreground"}>Mínimo 8 caracteres</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.uppercase ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        <span className={passwordStrength.uppercase ? "text-green-600" : "text-muted-foreground"}>Letra maiúscula</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.lowercase ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        <span className={passwordStrength.lowercase ? "text-green-600" : "text-muted-foreground"}>Letra minúscula</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.number ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        <span className={passwordStrength.number ? "text-green-600" : "text-muted-foreground"}>Número</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.special ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        <span className={passwordStrength.special ? "text-green-600" : "text-muted-foreground"}>Caractere especial (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password-register">Confirmar Senha</Label>
                  <div className="relative">
                    <Input 
                      id="confirm-password-register" 
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          Protegido por Supabase Auth
        </CardFooter>
      </Card>

      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
