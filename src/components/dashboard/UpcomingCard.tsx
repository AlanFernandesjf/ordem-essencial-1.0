import { Calendar, Clock, MapPin } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  type: "study" | "health" | "task";
  time: string;
  location?: string;
  color: string;
}

const events: Event[] = [
  {
    id: "1",
    title: "Aula de Cálculo II",
    type: "study",
    time: "08:00 - 10:00",
    location: "Sala 204",
    color: "info",
  },
  {
    id: "2",
    title: "Consulta Dentista",
    type: "health",
    time: "14:30",
    location: "Clínica Sorriso",
    color: "accent",
  },
  {
    id: "3",
    title: "Entregar trabalho de História",
    type: "task",
    time: "23:59",
    color: "warning",
  },
];

const colorMap = {
  info: "bg-info-light border-info text-info",
  accent: "bg-accent-light border-accent text-accent",
  warning: "bg-warning-light border-warning text-warning",
  success: "bg-success-light border-success text-success",
};

export function UpcomingCard() {
  return (
    <DashboardCard
      title="Próximos Compromissos"
      icon={<Calendar size={18} />}
      action={
        <span className="text-xs text-muted-foreground">Hoje</span>
      }
    >
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              "p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-soft",
              colorMap[event.color as keyof typeof colorMap]
            )}
          >
            <h4 className="font-medium text-foreground text-sm mb-2">{event.title}</h4>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {event.time}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
