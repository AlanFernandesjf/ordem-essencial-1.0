import { Heart, Calendar, Pill } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Link } from "react-router-dom";

interface HealthItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
}

const healthItems: HealthItem[] = [
  {
    id: "1",
    title: "Próxima consulta",
    subtitle: "Dentista - 15/01 às 14:30",
    icon: Calendar,
    iconBg: "bg-info-light text-info",
  },
  {
    id: "2",
    title: "Medicamentos",
    subtitle: "Vitamina D - Tomar às 8h",
    icon: Pill,
    iconBg: "bg-success-light text-success",
  },
];

export function HealthCard() {
  return (
    <DashboardCard
      title="Saúde & Cuidados"
      icon={<Heart size={18} />}
      action={
        <Link
          to="/saude"
          className="text-xs text-primary hover:underline"
        >
          Ver todos
        </Link>
      }
    >
      <div className="space-y-3">
        {healthItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${item.iconBg}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
