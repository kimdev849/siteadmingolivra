import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Loader2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryDelayBadge } from "@/components/entreprise/DeliveryDelayBadge";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { formatStatutLabel } from "@/lib/admin-api";
import { fetchMyDelays, fetchMyLogisticsCompany } from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/retards")({
  component: EntrepriseRetardsPage,
});

function EntrepriseRetardsPage() {
  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const delaysQuery = useQuery({
    queryKey: ["logistics", "retards"],
    queryFn: fetchMyDelays,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canAssign = statut === "active";
  const data = delaysQuery.data;
  const retards = data?.livraisons ?? [];

  const rows = retards.map((d) => [
    d.commande?.numero || d.id.slice(0, 8),
    d.adresse || "—",
    d.livreur?.nom || "Non attribué",
    <Badge key={`st-${d.id}`} variant="secondary">
      {formatStatutLabel(d.statut)}
    </Badge>,
    <DeliveryDelayBadge key={`delay-${d.id}`} delivery={d} />,
    `${d.minutes_depuis_creation ?? 0} min`,
    canAssign ? (
      <Button key={`act-${d.id}`} size="sm" variant="outline" asChild>
        <Link to="/entreprise/livraisons">Attribuer</Link>
      </Button>
    ) : (
      "—"
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Retards"
        description="Courses dépassant les seuils d'attribution ou de livraison"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total retards" icon={AlertTriangle} value={data?.total} />
        <KpiCard label="Retard attribution" icon={Clock} value={data?.assignation} />
        <KpiCard label="Retard livraison" icon={Clock} value={data?.livraison} />
      </div>

      {data?.seuils_retard ? (
        <Card className="mb-6 border-border">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Seuils : attribution après <strong>{data.seuils_retard.assignation_minutes} min</strong> sans
            livreur, livraison après <strong>{data.seuils_retard.livraison_minutes} min</strong> en route.
          </CardContent>
        </Card>
      ) : null}

      {delaysQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      ) : retards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-primary">Aucun retard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Toutes les courses respectent les délais configurés. Continuez le suivi depuis{" "}
            <Link to="/entreprise/operations" className="text-primary hover:underline">
              Opérations live
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={["Commande", "Adresse", "Livreur", "Statut", "Retard", "Durée", "Action"]}
          rows={rows}
          emptyTitle="Aucun retard"
          emptyDescription="Tout est à jour."
        />
      )}

      {canAssign && retards.length > 0 ? (
        <div className="mt-4">
          <Button asChild>
            <Link to="/entreprise/livraisons">
              <UserPlus className="h-4 w-4" /> Gérer les attributions
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
