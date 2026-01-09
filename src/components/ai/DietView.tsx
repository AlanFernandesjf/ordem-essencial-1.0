import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Utensils, Droplets, Clock, Sparkles } from "lucide-react";

interface DietPlan {
  calories_target: number;
  macros_target?: {
    protein: string;
    carbs: string;
    fats: string;
  };
  hydration_target: string;
  meals?: {
    name: string;
    time: string;
    options?: {
      name: string;
      ingredients?: string[];
      preparation?: string;
    }[];
  }[];
  tips?: string[];
}

export const DietView = ({ plan }: { plan: DietPlan }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Flame className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-bold text-2xl">{plan.calories_target}</h3>
            <p className="text-sm text-muted-foreground">Calorias Diárias</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Utensils className="h-8 w-8 text-primary mb-2" />
            <div className="flex gap-4 text-sm font-medium">
              <div className="flex flex-col">
                <span className="text-lg">{plan.macros_target?.protein || '-'}</span>
                <span className="text-muted-foreground text-xs">Prot</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg">{plan.macros_target?.carbs || '-'}</span>
                <span className="text-muted-foreground text-xs">Carb</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg">{plan.macros_target?.fats || '-'}</span>
                <span className="text-muted-foreground text-xs">Gord</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Droplets className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-bold text-2xl">{plan.hydration_target || 'N/A'}</h3>
            <p className="text-sm text-muted-foreground">Meta de Água</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {plan.meals?.map((meal, index) => (
          <Card key={index} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  {meal.name}
                </CardTitle>
                <span className="text-sm font-medium bg-background px-3 py-1 rounded-full border">
                  {meal.time}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {meal.options?.map((option, optIndex) => (
                <div key={optIndex} className="bg-background p-4 rounded-lg border shadow-sm">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                      {optIndex + 1}
                    </span>
                    {option.name}
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                    {option.ingredients?.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                  {option.preparation && (
                     <p className="mt-3 text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                       👨‍🍳 {option.preparation}
                     </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {plan.tips && plan.tips.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Sparkles size={18} />
              Dicas do Nutricionista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              {plan.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
