import { cn } from "@/lib/utils";

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const weekData = [
  { day: 0, habitsCompleted: 3, totalHabits: 5 },
  { day: 1, habitsCompleted: 5, totalHabits: 5 },
  { day: 2, habitsCompleted: 4, totalHabits: 5 },
  { day: 3, habitsCompleted: 5, totalHabits: 5 },
  { day: 4, habitsCompleted: 2, totalHabits: 5 },
  { day: 5, habitsCompleted: 0, totalHabits: 5 }, // today (partial)
  { day: 6, habitsCompleted: 0, totalHabits: 5 }, // future
];

export function WeekOverview() {
  const today = new Date().getDay();
  
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4">Semana Atual</h3>
      <div className="flex items-end justify-between gap-2">
        {weekData.map((data, index) => {
          const isToday = index === today;
          const isFuture = index > today;
          const percentage = isFuture ? 0 : (data.habitsCompleted / data.totalHabits) * 100;
          
          return (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-full">
                <div className="h-20 bg-muted rounded-lg overflow-hidden flex flex-col-reverse">
                  <div
                    className={cn(
                      "w-full rounded-lg transition-all duration-500 ease-out",
                      isFuture ? "bg-muted" : percentage === 100 ? "bg-success" : "bg-primary",
                      isToday && "animate-pulse"
                    )}
                    style={{ height: `${percentage}%` }}
                  />
                </div>
                {isToday && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {days[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
