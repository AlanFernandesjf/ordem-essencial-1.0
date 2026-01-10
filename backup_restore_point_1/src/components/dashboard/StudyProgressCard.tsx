import { GraduationCap, BookOpen } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  progress: number;
  color: string;
}

const subjects: Subject[] = [
  { id: "1", name: "Cálculo II", progress: 65, color: "primary" },
  { id: "2", name: "Física I", progress: 45, color: "info" },
  { id: "3", name: "Programação", progress: 80, color: "success" },
  { id: "4", name: "História", progress: 30, color: "warning" },
];

const colorMap = {
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  accent: "bg-accent",
};

export function StudyProgressCard() {
  return (
    <DashboardCard
      title="Progresso dos Estudos"
      icon={<GraduationCap size={18} />}
    >
      <div className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{subject.name}</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {subject.progress}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  colorMap[subject.color as keyof typeof colorMap]
                )}
                style={{ width: `${subject.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
