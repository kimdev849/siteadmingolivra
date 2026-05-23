import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationDeliveryCard } from "@/components/entreprise/OperationDeliveryCard";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import {
  fetchMyLogisticsCompany,
  fetchMyOperations,
  fetchMyStats,
  retryMyDeliveryDispatch,
  type LogisticsDelivery,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/operations")({
  component: EntrepriseOperationsPage,
});

function Column({
  title,
  count,
  deliveries,
  canOperate,
  retryingId,
  onRetryDispatch,
}: {
  title: string;
  count: number;
  deliveries: LogisticsDelivery[];
  canOperate: boolean;
  retryingId: string | null;
  onRetryDispatch: (d: LogisticsDelivery) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          {title}
          <Badge variant="secondary">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-[min(70vh,640px)] flex-col gap-2 overflow-y-auto">
        {deliveries.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Aucune course</p>
        ) : (
          deliveries.map((d) => (
            <OperationDeliveryCard
              key={d.id}
              delivery={d}
              showRetryDispatch={canOperate}
              retrying={retryingId === d.id}
              onRetryDispatch={() => onRetryDispatch(d)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EntrepriseOperationsPage() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const statsQuery = useQuery({
    queryKey: ["logistics", "stats"],
    queryFn: fetchMyStats,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const opsQuery = useQuery({
    queryKey: ["logistics", "operations"],
    queryFn: fetchMyOperations,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canOperate = statut === "active";
  const ops = opsQuery.data;
  const stats = statsQuery.data;

  const handleRetryDispatch = async (delivery: LogisticsDelivery) => {
    setRetryingId(delivery.id);
    try {
      await retryMyDeliveryDispatch(delivery.id);
      await queryClient.invalidateQueries({ queryKey: ["logistics"] });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Opérations en direct"
        description="Suivi des missions créées quand un commerce marque une commande prête. GoLivra attribue les livreurs disponibles."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={opsQuery.isFetching}
            onClick={() => void opsQuery.refetch()}
          >
            {opsQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-4 w-4 text-primary" />
        <span>
          Dernière mise à jour :{" "}
          {ops?.mis_a_jour_le ? new Date(ops.mis_a_jour_le).toLocaleTimeString("fr-FR") : "—"}
        </span>
        {(stats?.livraisons_en_retard ?? 0) > 0 ? (
          <Link to="/entreprise/retards">
            <Badge variant="destructive">{stats?.livraisons_en_retard} retard(s)</Badge>
          </Link>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiCard label="En cours" icon={Activity} value={stats?.livraisons_en_cours} />
        <KpiCard label="Sans livreur" icon={Activity} value={stats?.livraisons_sans_livreur} />
        <KpiCard label="Retards" icon={Activity} value={stats?.livraisons_en_retard} />
        <KpiCard
          label="Livrées aujourd'hui"
          icon={Activity}
          value={stats?.livraisons_livrees_aujourdhui}
        />
        <KpiCard label="Livreurs dispo." icon={Activity} value={stats?.livreurs_disponibles} />
        <KpiCard
          label="Délai moyen"
          icon={Activity}
          value={stats?.delai_moyen_minutes != null ? `${stats.delai_moyen_minutes} min` : "—"}
        />
      </div>

      {opsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des opérations…</p>
      ) : ops ? (
        <>
          {(ops.alertes_retard?.length ?? 0) > 0 ? (
            <Card className="mb-6 border-destructive/40 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-destructive">
                  Alertes retard ({ops.alertes_retard.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ops.alertes_retard.slice(0, 6).map((d) => (
                  <OperationDeliveryCard
                    key={`alert-${d.id}`}
                    delivery={d}
                    showRetryDispatch={canOperate}
                    retrying={retryingId === d.id}
                    onRetryDispatch={() => void handleRetryDispatch(d)}
                  />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Column
              title="En attente de livreur"
              count={ops.colonnes.sans_livreur.length}
              deliveries={ops.colonnes.sans_livreur}
              canOperate={canOperate}
              retryingId={retryingId}
              onRetryDispatch={(d) => void handleRetryDispatch(d)}
            />
            <Column
              title="En route"
              count={ops.colonnes.en_route.length}
              deliveries={ops.colonnes.en_route}
              canOperate={canOperate}
              retryingId={retryingId}
              onRetryDispatch={(d) => void handleRetryDispatch(d)}
            />
            <Column
              title="Autres actives"
              count={ops.colonnes.autres.length}
              deliveries={ops.colonnes.autres}
              canOperate={canOperate}
              retryingId={retryingId}
              onRetryDispatch={(d) => void handleRetryDispatch(d)}
            />
          </div>

          {(ops.livraisons_recentes_livrees?.length ?? 0) > 0 ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Livrées aujourd&apos;hui (récentes)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ops.livraisons_recentes_livrees.map((d) => (
                  <OperationDeliveryCard key={d.id} delivery={d} />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-destructive">Impossible de charger les opérations.</p>
      )}
    </div>
  );
}
