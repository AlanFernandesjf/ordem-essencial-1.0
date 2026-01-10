import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  GraduationCap,
  Heart,
  Wallet,
  Home,
  Plane,
  Dumbbell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Crown,
  HelpCircle,
  BookOpen,
  Smartphone,
  Coins,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Minha Semana", href: "/", icon: LayoutDashboard },
  { name: "Hábitos", href: "/habitos", icon: CheckSquare },
  { name: "Estudos", href: "/estudos", icon: GraduationCap },
  { name: "Saúde", href: "/saude", icon: Heart },
  { name: "Finanças", href: "/financas", icon: Wallet },
  { name: "Casa & Compras", href: "/casa", icon: Home },
  { name: "Viagens", href: "/viagens", icon: Plane },
  { name: "Treinos", href: "/treinos", icon: Dumbbell },
];

const bottomNavigation = [
  { name: "Suporte", href: "/suporte", icon: HelpCircle },
  { name: "Tutorial", href: "/tutorial", icon: BookOpen },
  { name: "Aplicativos", href: "/apps", icon: Smartphone },
  { name: "Comprar Créditos", href: "/comprar-creditos", icon: Coins },
  { name: "Planos Premium", href: "/assinatura", icon: Crown },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [planType, setPlanType] = useState<string>("");

  useEffect(() => {
    checkUser();

    const openHandler = () => setIsMobileOpen(true);
    const closeHandler = () => setIsMobileOpen(false);
    window.addEventListener("open-sidebar", openHandler);
    window.addEventListener("close-sidebar", closeHandler);
    (window as any).openSidebar = openHandler;
    (window as any).closeSidebar = closeHandler;

    // Subscribe to profile and subscription changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.new && (payload.new as any).id) {
            checkUser();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
        },
        (payload) => {
           checkUser();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("open-sidebar", openHandler);
      window.removeEventListener("close-sidebar", closeHandler);
      delete (window as any).openSidebar;
      delete (window as any).closeSidebar;
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || "");
      
      // Check subscription directly first
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status, plan_type, current_period_end')
        .eq('user_id', user.id)
        .single();

      const { data } = await supabase.from('profiles').select('role, avatar_url, subscription_status').eq('id', user.id).single();
      
      if (data?.role === 'admin') setIsAdmin(true);
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      
      // Check validity
      const now = new Date();
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
      const isSubValid = sub?.status === 'active' || (sub?.status === 'canceled' && periodEnd && periodEnd > now);

      // Prioritize active subscription from user_subscriptions
      if (isSubValid) {
        setSubscriptionStatus('pro');
        setPlanType(sub.plan_type);
      } else if (data?.subscription_status) {
        // Only fallback to profile if we don't have a contradictory subscription
        // If we have a subscription and it is NOT valid (e.g. canceled and expired), 
        // we should arguably consider them free, ignoring the stale profile 'pro'.
        if (sub && !isSubValid) {
             setSubscriptionStatus('free');
        } else {
             setSubscriptionStatus(data.subscription_status);
        }
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <>
      

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                <img src="/logo.svg" alt="Ordem Essencial" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-semibold text-lg text-foreground">Ordem Essencial</h1>
                <p className="text-xs text-muted-foreground">Organize sua vida</p>
              </div>
            </Link>
            
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 -mr-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  location.pathname === "/admin" && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Shield size={20} className="text-red-500" />
                Painel Admin
              </Link>
            )}
          </nav>

          {/* Bottom Navigation */}
          <div className="p-4 border-t border-sidebar-border space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  {item.name}
                </Link>
              );
            })}
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
            >
              <LogOut size={20} />
              Sair
            </button>
          </div>

          {/* User profile */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl || undefined} alt={userEmail} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {userEmail.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={userEmail}>
                  {userEmail || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isAdmin ? "Administrador" : 
                   subscriptionStatus === 'trial' ? "Teste Grátis" : 
                   subscriptionStatus === 'pro' ? (planType === 'yearly' ? "Plano Anual" : planType === 'monthly' ? "Plano Mensal" : "Membro PRO") : 
                   "Membro Gratuito"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
