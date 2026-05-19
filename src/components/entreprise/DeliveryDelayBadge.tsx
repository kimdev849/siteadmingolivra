import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LogisticsDelivery } from "@/lib/logistics-api";

type Props = {
  delivery: Pick<LogisticsDelivery, "en_retard" | "type_retard" | "minutes_retard">;
};

export function DeliveryDelayBadge({ delivery }: Props) {
  if (!delivery.en_retard) return null;

  const label =
    delivery.type_retard === "assignation"
      ? `Retard attribution +${delivery.minutes_retard ?? 0} min`
      : `Retard livraison +${delivery.minutes_retard ?? 0} min`;

  return (
    <Badge variant="destructive" className="gap-1 font-normal">
      <AlertTriangle className="h-3 w-3" />
      {label}
    </Badge>
  );
}
