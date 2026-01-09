import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Droplets, Flame } from "lucide-react";

interface DietPlan {
  calories_target: number;
  macros_target: {
    protein: string;
    carbs: string;
    fats: string;
  };
  hydration_target: string;
  meals: {
    name: string;
    time: string;
    options: {
      name: string;
      ingredients: string[];
      preparation?: string;
    }[];
  }[];
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
        
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Droplets className="h-8 w-8 text-blue-500 mb-2" />
            <h3 className="font-bold text-xl">{plan.hydration_target}</h3>
            <p className="text-sm text-muted-foreground">Meta de Água</p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <Utensils className="h-8 w-8 text-green-500 mb-2" />
            <div className="flex gap-2 text-sm font-medium">
              <span>P: {plan.macros_target.protein}</span>
              <span>C: {plan.macros_target.carbs}</span>
              <span>G: {plan.macros_target.fats}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Macros (Prot/Carb/Gord)</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Refeições do Dia</h3>
        {plan.meals.map((meal, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  {meal.name}
                  <Badge variant="outline" className="font-normal">
                    {meal.time}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {meal.options.map((option, optIndex) => (
                  <div key={optIndex} className="bg-muted/20 p-3 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">{option.name}</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {option.ingredients.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                    {option.preparation && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Preparo: {option.preparation}
                      </p>
                    )}
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
