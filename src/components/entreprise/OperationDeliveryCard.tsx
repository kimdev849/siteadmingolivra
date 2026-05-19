import { Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatStatutLabel } from "@/lib/admin-api";
import type { LogisticsDelivery } from "@/lib/logistics-api";
import { DeliveryDelayBadge } from "@/components/entreprise/DeliveryDelayBadge";

type Props = {
  delivery: LogisticsDelivery;
  onAssign?: () => void;
  showAssign?: boolean;
};

export function OperationDeliveryCard({ delivery, onAssign, showAssign }: Props) {
  return (
    <Card className={delivery.en_retard ? "border-destructive/50 bg-destructive/5" : undefined}>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold">
              {delivery.commande?.numero || `Course ${delivery.id.slice(0, 8)}`}
            </p>
            <p className="flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{delivery.adresse || "Adresse non renseignée"}</span>
            </p>
          </div>
          <Badge variant="secondary">{formatStatutLabel(delivery.statut)}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {delivery.minutes_depuis_creation ?? 0} min
          </span>
          {delivery.livreur?.nom ? (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {delivery.livreur.nom}
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">Sans livreur</span>
          )}
        </div>

        <DeliveryDelayBadge delivery={delivery} />

        {showAssign && onAssign ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={onAssign}
          >
            {delivery.livreur?.id ? "Réattribuer" : "Attribuer un livreur"} →
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
