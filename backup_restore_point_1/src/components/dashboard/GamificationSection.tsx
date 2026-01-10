
import { Trophy, Medal, Star, Flame, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Badge {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
  description: string;
}

export function GamificationSection() {
  const [level, setLevel] = useState(1);
  const [currentXP, setCurrentXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    
    const handleUpdate = () => fetchProfile();
    window.addEventListener('gamification-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('gamification-updated', handleUpdate);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setLevel(data.level || 1);
        setCurrentXP(data.current_xp || 0);
        setStreak(data.current_streak || 0);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextLevelXP = level * 1000;
  const progress = Math.min((currentXP / nextLevelXP) * 100, 100);

  const badges: Badge[] = [
    {
      id: "1",
      name: "Iniciante Focado",
      icon: <Target className="w-5 h-5" />,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      unlocked: currentXP >= 50,
      description: "Ganhou 50 XP",
    },
    {
      id: "2",
      name: "Em Chamas",
      icon: <Flame className="w-5 h-5" />,
      color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
      unlocked: streak >= 3,
      description: "Manteve ofensiva de 3 dias",
    },
    {
      id: "3",
      name: "Mestre da Rotina",
      icon: <Trophy className="w-5 h-5" />,
      color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      unlocked: streak >= 7,
      description: "Completou todos os hábitos por 7 dias",
    },
    {
      id: "4",
      name: "Super Produtivo",
      icon: <Star className="w-5 h-5" />,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      unlocked: level >= 10,
      description: "Alcançou nível 10",
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card mb-6 animate-fade-in border border-border/50">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        
        {/* Level & Progress */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {level}
              </div>
              <div>
                <h3 className="font-bold text-lg">Nível {level}</h3>
                <p className="text-sm text-muted-foreground">Continue assim! Você está indo melhor que ontem.</p>
                <div className="mt-2 text-xs font-bold text-primary/80 tracking-wide uppercase">
                  CUMPRA O QUE VOCÊ SE PROMETEU
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium">
              <Flame size={16} className="fill-current" />
              {streak} dias seguidos
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-muted-foreground">
              <span>XP {currentXP}</span>
              <span>{nextLevelXP} XP</span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground text-center">
              Faltam {nextLevelXP - currentXP} XP para o próximo nível
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="w-full md:w-auto flex flex-col gap-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Conquistas Recentes</h4>
          <div className="flex gap-3 flex-wrap justify-center md:justify-start">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                  badge.unlocked 
                    ? badge.color + " shadow-sm hover:scale-110 cursor-help"
                    : "bg-muted text-muted-foreground/30 grayscale opacity-50"
                )}
                title={badge.unlocked ? badge.name : "Bloqueado: " + badge.description}
              >
                {badge.icon}
                
                {/* Tooltip personalizado simples */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block w-32 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg z-10 text-center border border-border">
                  <p className="font-bold mb-0.5">{badge.name}</p>
                  <p className="opacity-80 text-[10px]">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
