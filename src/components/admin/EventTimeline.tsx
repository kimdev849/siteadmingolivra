import { formatDateTimeFr } from "@/lib/admin-api";

export type TimelineStep = {
  key: string;
  label: string;
  at: string;
  label_fr?: string | null;
};

type Props = {
  steps: TimelineStep[];
  title?: string;
  emptyMessage?: string;
};

export function EventTimeline({
  steps,
  title,
  emptyMessage = "Aucun horaire enregistré.",
}: Props) {
  const items = steps.filter((s) => s?.at);
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {title ? <p className="mb-1 font-semibold text-foreground">{title}</p> : null}
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {title ? <p className="mb-3 text-sm font-semibold text-foreground">{title}</p> : null}
      <ol className="space-y-0">
        {items.map((step, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${step.key}-${step.at}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                {!isLast ? <span className="my-1 w-px flex-1 min-h-[1.25rem] bg-border" /> : null}
              </div>
              <div className={isLast ? "pb-0" : "pb-4"}>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.label_fr || formatDateTimeFr(step.at)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
