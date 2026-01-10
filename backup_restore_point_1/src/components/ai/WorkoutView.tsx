import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Calendar, Info } from "lucide-react";

interface WorkoutPlan {
  split: string;
  frequency: string;
  workouts?: {
    name: string;
    description: string;
    exercises?: {
      name: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }[];
  }[];
}

export const WorkoutView = ({ plan }: { plan: WorkoutPlan }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-xl border border-primary/10 flex-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Dumbbell size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Divisão</p>
            <h3 className="font-bold text-lg">{plan.split}</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-secondary/5 p-4 rounded-xl border border-secondary/10 flex-1">
          <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary-foreground">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Frequência</p>
            <h3 className="font-bold text-lg">{plan.frequency}</h3>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {plan.workouts?.map((workout, index) => (
          <Card key={index} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <CardTitle className="text-lg">{workout.name}</CardTitle>
                <Badge variant="secondary">{workout.description}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-1 divide-y divide-border/50">
                {workout.exercises?.map((exercise, exIndex) => (
                  <div key={exIndex} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-muted/20 px-2 rounded-lg transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{exercise.name}</h4>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Info size={10} /> {exercise.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex flex-col items-center w-16">
                        <span className="font-bold text-primary">{exercise.sets}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Séries</span>
                      </div>
                      <div className="flex flex-col items-center w-20">
                        <span className="font-bold">{exercise.reps}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Reps</span>
                      </div>
                      <div className="flex flex-col items-center w-16">
                        <span className="font-bold text-muted-foreground">{exercise.rest}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Descanso</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
