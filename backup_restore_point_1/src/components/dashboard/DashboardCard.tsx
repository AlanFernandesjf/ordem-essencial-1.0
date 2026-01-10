import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function DashboardCard({ title, icon, children, className, action }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
