import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown, BookOpen, Wallet, CheckSquare, Dumbbell, Zap, Quote } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import { formatDateForDB } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const QUOTES = [
  "A disciplina é a mãe do êxito.",
  "O segredo do sucesso é a constância no objetivo.",
  "Faça o que você pode, com o que você tem, onde você está.",
  "Não espere por inspiração. Torne-se a inspiração.",
  "Pequenos progressos diários somam grandes resultados.",
  "A única maneira de fazer um excelente trabalho é amar o que você faz.",
  "Sua única limitação é aquela que você impõe a si mesmo.",
  "O futuro depende do que você faz hoje.",
  "Não conte os dias, faça os dias contarem.",
  "Persistência é o caminho do êxito."
];

export function DashboardOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ title: string; description: string; type: 'warning' | 'info' | 'success' }[]>([]);
  const [quote, setQuote] = useState("");
  
  // Metrics
  const [habitProgress, setHabitProgress] = useState(0); // %
  const [financeData, setFinanceData] = useState<{ name: string; value: number }[]>([]);
  const [studyProgress, setStudyProgress] = useState({ done: 0, total: 0 });
  const [fitnessProgress, setFitnessProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    fetchDashboardData();
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const formattedDate = formatDateForDB(today);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

      // 1. Habits
      const { data: allHabits } = await supabase.from('habits').select('id').eq('user_id', user.id);
      
      let completedHabitsCount = 0;
      let totalHabitsCount = allHabits?.length || 0;

      if (totalHabitsCount > 0) {
        const { count } = await supabase
          .from('habit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('date', formattedDate)
          .eq('completed', true);
        
        completedHabitsCount = count || 0;
      }
      
      const habitPercentage = totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0;
      setHabitProgress(habitPercentage);

      // 2. Finance (Current Month)
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('amount, type')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      let income = 0;
      let expense = 0;

      if (transactions) {
        transactions.forEach(t => {
          if (t.type === 'receita') income += Number(t.amount);
          else if (['custo_fixo', 'custo_variavel', 'divida'].includes(t.type)) expense += Number(t.amount);
        });
      }

      setFinanceData([
        { name: 'Receitas', value: income },
        { name: 'Despesas', value: expense }
      ]);

      // 3. Studies
      const { data: studyTasks } = await supabase
        .from('study_tasks')
        .select('done')
        .eq('user_id', user.id);

      let studyDone = 0;
      let studyTotal = 0;

      if (studyTasks) {
        studyTotal = studyTasks.length;
        studyDone = studyTasks.filter(t => t.done).length;
      }

      setStudyProgress({ done: studyDone, total: studyTotal });

      // 4. Fitness
      // We need to fetch exercises from workouts and count done vs total
      // Since structure is workouts -> exercises, we query fitness_exercises directly if possible, 
      // but we need to know if they belong to the user.
      // Assuming we can join or filter by user_id if column exists, but usually it's via workout_id.
      // Let's first get user's workouts days
      const { data: workouts } = await supabase
        .from('fitness_workout_days')
        .select('id')
        .eq('user_id', user.id);
        
      let fitnessDone = 0;
      let fitnessTotal = 0;

      if (workouts && workouts.length > 0) {
          const workoutIds = workouts.map(w => w.id);
          const { data: exercises } = await supabase
            .from('fitness_exercises')
            .select('done')
            .in('workout_id', workoutIds);
            
          if (exercises) {
              fitnessTotal = exercises.length;
              fitnessDone = exercises.filter(e => e.done).length;
          }
      }
      setFitnessProgress({ done: fitnessDone, total: fitnessTotal });


      // Generate Alerts
      const newAlerts = [];
      
      if (habitPercentage < 100 && totalHabitsCount > 0) {
        newAlerts.push({
          title: "Hábitos Pendentes",
          description: `Você completou ${habitPercentage}% dos seus hábitos hoje.`,
          type: 'info' as const
        });
      }

      if (expense > income && income > 0) {
        newAlerts.push({
          title: "Atenção Financeira",
          description: "Despesas superaram receitas este mês.",
          type: 'warning' as const
        });
      }
      
      if (fitnessTotal > 0 && fitnessDone === 0) {
           newAlerts.push({
          title: "Hora de Treinar!",
          description: "Você ainda não completou nenhum exercício.",
          type: 'info' as const
        });
      }

      setAlerts(newAlerts);

    } catch (error) {
      console.error("Error fetching dashboard overview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando visão geral...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Motivational Quote */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-4 rounded-xl border border-violet-500/20 flex items-center gap-4">
        <div className="p-2 bg-background rounded-full shadow-sm text-violet-500">
            <Quote size={20} />
        </div>
        <div>
            <p className="text-sm font-medium italic text-foreground/80">"{quote}"</p>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid gap-3">
        {alerts.slice(0, 2).map((alert, index) => (
          <Alert key={index} variant={alert.type === 'warning' ? "destructive" : "default"} className={`${alert.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : ''}`}>
            {alert.type === 'warning' && <AlertCircle className="h-4 w-4" />}
            {alert.type === 'info' && <AlertCircle className="h-4 w-4" />}
            {alert.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
            <AlertTitle className="text-sm font-semibold">{alert.title}</AlertTitle>
            <AlertDescription className="text-xs">{alert.description}</AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-primary/5 hover:text-primary border-dashed" onClick={() => navigate('/habitos')}>
            <CheckSquare size={18} />
            <span className="text-xs">Hábitos</span>
         </Button>
         <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-primary/5 hover:text-primary border-dashed" onClick={() => navigate('/financas')}>
            <Wallet size={18} />
            <span className="text-xs">Finanças</span>
         </Button>
         <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-primary/5 hover:text-primary border-dashed" onClick={() => navigate('/estudos')}>
            <BookOpen size={18} />
            <span className="text-xs">Estudos</span>
         </Button>
         <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 hover:bg-primary/5 hover:text-primary border-dashed" onClick={() => navigate('/treinos')}>
            <Dumbbell size={18} />
            <span className="text-xs">Treinos</span>
         </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Habits Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hábitos Hoje</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[120px] w-full flex items-center justify-center relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: habitProgress },
                      { name: 'Remaining', value: 100 - habitProgress }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell key="completed" fill="#22c55e" />
                    <Cell key="remaining" fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{habitProgress}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finance Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finanças (Mês)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value}`, 'Valor']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {financeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Receitas' ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Studies Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
             <div className="space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Tarefas Concluídas</span>
                   <span className="font-bold">{studyProgress.done} / {studyProgress.total}</span>
                </div>
                <Progress value={studyProgress.total > 0 ? (studyProgress.done / studyProgress.total) * 100 : 0} className="h-2" />
             </div>
          </CardContent>
        </Card>

        {/* Fitness Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treinos</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
             <div className="space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Exercícios Feitos</span>
                   <span className="font-bold">{fitnessProgress.done} / {fitnessProgress.total}</span>
                </div>
                <Progress value={fitnessProgress.total > 0 ? (fitnessProgress.done / fitnessProgress.total) * 100 : 0} className="h-2 bg-secondary" indicatorClassName="bg-blue-500" />
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
