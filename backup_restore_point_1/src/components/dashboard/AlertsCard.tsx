import { AlertTriangle, Calendar, FileText, CreditCard } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  title: string;
  description: string;
  type: "exam" | "bill" | "deadline";
  daysLeft: number;
  icon: React.ElementType;
}

const alerts: Alert[] = [
  {
    id: "1",
    title: "Prova de Cálculo II",
    description: "Capítulos 5, 6 e 7",
    type: "exam",
    daysLeft: 3,
    icon: FileText,
  },
  {
    id: "2",
    title: "Fatura do cartão",
    description: "R$ 850,00",
    type: "bill",
    daysLeft: 5,
    icon: CreditCard,
  },
  {
    id: "3",
    title: "Trabalho de História",
    description: "Entregar via portal",
    type: "deadline",
    daysLeft: 2,
    icon: Calendar,
  },
];

const urgencyColors = {
  urgent: "bg-destructive/10 border-destructive text-destructive",
  soon: "bg-warning-light border-warning text-warning",
  normal: "bg-info-light border-info text-info",
};

function getUrgency(daysLeft: number) {
  if (daysLeft <= 2) return "urgent";
  if (daysLeft <= 5) return "soon";
  return "normal";
}

export function AlertsCard() {
  return (
    <DashboardCard
      title="Alertas Importantes"
      icon={<AlertTriangle size={18} />}
    >
      <div className="space-y-3">
        {alerts.map((alert) => {
          const urgency = getUrgency(alert.daysLeft);
          const Icon = alert.icon;
          
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all duration-200",
                urgencyColors[urgency]
              )}
            >
              <div className="p-2 rounded-lg bg-card/50">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm">{alert.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold">
                  {alert.daysLeft === 1 ? "Amanhã" : `${alert.daysLeft} dias`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
