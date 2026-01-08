import { useTheme, colorThemes } from "@/hooks/use-theme";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Switch } from "@/components/ui/switch";
import { Palette, Moon, Check } from "lucide-react";

export function ThemeSettings() {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  return (
    <>
      {/* Dark Mode */}
      <DashboardCard title="Modo Escuro" icon={<Moon size={18} />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Tema escuro</p>
              <p className="text-xs text-muted-foreground">
                Ativar modo escuro para reduzir cansaço visual
              </p>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setTheme("light")}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === "light" 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-full h-16 rounded-lg bg-[hsl(40_20%_96%)] border border-border/50 mb-2 flex items-center justify-center">
                <div className="w-8 h-2 rounded bg-[hsl(158_35%_45%)]" />
              </div>
              <p className="text-sm font-medium text-foreground">Claro</p>
            </button>
            
            <button
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === "dark" 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-full h-16 rounded-lg bg-[hsl(220_20%_14%)] border border-border/50 mb-2 flex items-center justify-center">
                <div className="w-8 h-2 rounded bg-[hsl(158_35%_55%)]" />
              </div>
              <p className="text-sm font-medium text-foreground">Escuro</p>
            </button>
          </div>
        </div>
      </DashboardCard>

      {/* Color Theme */}
      <DashboardCard title="Cores do Sistema" icon={<Palette size={18} />}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha a cor principal do seu painel
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colorThemes.map((ct) => {
              const isSelected = colorTheme.name === ct.name;
              return (
                <button
                  key={ct.name}
                  onClick={() => setColorTheme(ct)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? "border-primary shadow-md" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-lg" 
                      style={{ backgroundColor: `hsl(${ct.primary})` }}
                    />
                    <div 
                      className="w-8 h-8 rounded-lg" 
                      style={{ backgroundColor: `hsl(${ct.accent})` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground text-left">
                    {ct.name}
                  </p>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </DashboardCard>
    </>
  );
}
