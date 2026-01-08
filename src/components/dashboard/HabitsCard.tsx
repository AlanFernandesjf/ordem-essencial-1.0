import { CheckSquare, Circle, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  icon?: string;
}

const initialHabits: Habit[] = [
  { id: "1", name: "Acordar às 6h", completed: true, icon: "🌅" },
  { id: "2", name: "Beber 2L de água", completed: false, icon: "💧" },
  { id: "3", name: "Exercício físico", completed: true, icon: "🏃" },
  { id: "4", name: "Leitura 30min", completed: false, icon: "📚" },
  { id: "5", name: "Meditação", completed: false, icon: "🧘" },
];

export function HabitsCard() {
  const [habits, setHabits] = useState(initialHabits);
  
  const completedCount = habits.filter((h) => h.completed).length;
  const progress = (completedCount / habits.length) * 100;

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => 
      h.id === id ? { ...h, completed: !h.completed } : h
    ));
  };

  return (
    <DashboardCard
      title="Hábitos de Hoje"
      icon={<CheckSquare size={18} />}
      action={
        <span className="text-xs font-medium text-muted-foreground">
          {completedCount}/{habits.length}
        </span>
      }
    >
      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Habits list */}
      <div className="space-y-2">
        {habits.map((habit) => (
          <button
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
              habit.completed
                ? "bg-success-light"
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            {habit.completed ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-lg mr-2">{habit.icon}</span>
            <span
              className={cn(
                "text-sm font-medium text-left flex-1",
                habit.completed ? "text-success line-through" : "text-foreground"
              )}
            >
              {habit.name}
            </span>
          </button>
        ))}
      </div>
    </DashboardCard>
  );
}
