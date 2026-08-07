import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value?: string | number;
  hint?: string;
}

export function KpiCard({ label, icon: Icon, value, hint }: KpiCardProps) {
  const displayValue = value !== undefined && value !== null ? String(value) : "—";
  const displayHint = hint ?? (value !== undefined && value !== null ? undefined : "Aucune donnée");

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{displayValue}</p>
            {displayHint ? <p className="text-xs text-muted-foreground">{displayHint}</p> : null}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
