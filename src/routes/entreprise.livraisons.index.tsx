import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeliveryDelayBadge } from "@/components/entreprise/DeliveryDelayBadge";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { formatDateTimeFr, formatStatutLabel } from "@/lib/admin-api";
import {
  fetchMyDeliveries,
  fetchMyLogisticsCompany,
  retryMyDeliveryDispatch,
  type LogisticsDelivery,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/livraisons/")({
  component: EntrepriseLivraisonsPage,
});

function EntrepriseLivraisonsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["logistics", "livraisons", statusFilter],
    queryFn: () => fetchMyDeliveries(statusFilter === "all" ? undefined : statusFilter),
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canOperate = statut === "active";
  const deliveries = deliveriesQuery.data ?? [];

  const handleRetryDispatch = async (delivery: LogisticsDelivery) => {
    setRetryingId(delivery.id);
    setRetryError(null);
    try {
      await retryMyDeliveryDispatch(delivery.id);
      await queryClient.invalidateQueries({ queryKey: ["logistics"] });
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Relance impossible.");
    } finally {
      setRetryingId(null);
    }
  };

  const rows = deliveries.map((d) => {
    const needsCourier = !d.livreur?.id && d.statut !== "livree" && d.statut !== "annulee";
    return [
      d.commande?.numero || d.id.slice(0, 8),
      d.adresse || "—",
      d.livreur?.nom || "—",
      <Badge key={`st-${d.id}`} variant="secondary">
        {formatStatutLabel(d.statut)}
      </Badge>,
      <DeliveryDelayBadge key={`delay-${d.id}`} delivery={d} />,
      formatDateTimeFr(d.commande_created_at),
      formatDateTimeFr(d.created_at),
      formatDateTimeFr(d.attribuee_at),
      formatDateTimeFr(d.livree_at),
      canOperate && needsCourier ? (
        <Button
          key={`retry-${d.id}`}
          size="sm"
          variant="outline"
          disabled={retryingId === d.id}
          onClick={() => void handleRetryDispatch(d)}
        >
          {retryingId === d.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Relancer GoLivra
        </Button>
      ) : (
        "—"
      ),
    ];
  });

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Suivi des courses créées quand un restaurant ou une boutique marque une commande « prête ». L'attribution des livreurs est gérée par GoLivra."
      />

      {!canOperate ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Votre entreprise doit être validée (statut actif) pour suivre les courses de vos livreurs.
        </p>
      ) : null}

      {retryError ? <p className="mb-4 text-sm text-destructive">{retryError}</p> : null}

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="attribuee">Attribuée</SelectItem>
            <SelectItem value="en_route">En route</SelectItem>
            <SelectItem value="livree">Livrée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {deliveriesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={["Commande", "Adresse", "Livreur", "Statut", "Retard", "Cmd. créée", "Livraison créée", "Attribuée", "Terminée", "Actions"]}
          rows={rows}
          emptyTitle="Aucune livraison"
          emptyDescription="Les missions apparaissent ici lorsqu'un commerce marque une sous-commande comme prête."
        />
      )}
    </div>
  );
}
