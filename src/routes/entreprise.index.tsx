import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bike,
  PackageCheck,
  Plus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourierAvailabilityBadge } from "@/components/entreprise/CourierAvailabilityBadge";
import { OperationDeliveryCard } from "@/components/entreprise/OperationDeliveryCard";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { formatStatutLabel } from "@/lib/admin-api";
import {
  fetchMyCouriers,
  fetchMyLogisticsCompany,
  fetchMyOperations,
  fetchMyStats,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/")({
  component: EntrepriseDashboardPage,
});

function EntrepriseDashboardPage() {
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

  const couriersQuery = useQuery({
    queryKey: ["logistics", "livreurs"],
    queryFn: fetchMyCouriers,
  });

  const company = companyQuery.data;
  const stats = statsQuery.data;
  const statut = company?.statut_moderation || company?.statut;
  const canManage = statut === "active";
  const couriers = couriersQuery.data ?? [];
  const alertes = opsQuery.data?.alertes_retard ?? [];

  return (
    <div>
      <PageHeader
        title={company?.nom || "Tableau de bord"}
        description="Centre de pilotage de votre entreprise de livraison"
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/entreprise/livreurs/nouveau">
                <Plus className="h-4 w-4" /> Ajouter un livreur
              </Link>
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Votre entreprise est <Badge variant="secondary">{formatStatutLabel(statut)}</Badge>. Vous pourrez
            gérer livreurs et livraisons dès validation par GoLivra.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="En cours" icon={Activity} value={stats?.livraisons_en_cours} />
        <KpiCard label="Retards" icon={AlertTriangle} value={stats?.livraisons_en_retard} />
        <KpiCard label="Sans livreur" icon={PackageCheck} value={stats?.livraisons_sans_livreur} />
        <KpiCard label="Livrées aujourd'hui" icon={PackageCheck} value={stats?.livraisons_livrees_aujourdhui} />
        <KpiCard label="Livreurs" icon={Users} value={stats?.livreurs_total ?? couriers.length} />
        <KpiCard label="Disponibles" icon={Bike} value={stats?.livreurs_disponibles} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Opérations en direct</CardTitle>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link to="/entreprise/operations">Voir tout →</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {opsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : alertes.length > 0 ? (
              alertes.slice(0, 4).map((d) => <OperationDeliveryCard key={d.id} delivery={d} />)
            ) : (opsQuery.data?.livraisons_actives?.length ?? 0) > 0 ? (
              opsQuery.data!.livraisons_actives.slice(0, 4).map((d) => (
                <OperationDeliveryCard key={d.id} delivery={d} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aucune course active pour le moment.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link to="/entreprise/operations">
                <Activity className="h-4 w-4" /> Opérations live
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/entreprise/retards">
                <AlertTriangle className="h-4 w-4" /> Retards
                {(stats?.livraisons_en_retard ?? 0) > 0 ? (
                  <Badge variant="destructive" className="ml-auto">
                    {stats?.livraisons_en_retard}
                  </Badge>
                ) : null}
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/entreprise/statistiques">
                <BarChart3 className="h-4 w-4" /> Statistiques
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/entreprise/livraisons">
                <PackageCheck className="h-4 w-4" /> Toutes les livraisons
              </Link>
            </Button>
            {canManage ? (
              <Button asChild className="justify-start">
                <Link to="/entreprise/livreurs/nouveau">
                  <Plus className="h-4 w-4" /> Nouveau livreur
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Équipe livreurs</CardTitle>
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to="/entreprise/livreurs">Gérer →</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {couriersQuery.isLoading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : couriers.length === 0 ? (
            <p className="text-muted-foreground">Aucun livreur — créez votre première équipe.</p>
          ) : (
            couriers.slice(0, 6).map((l) => (
              <Link
                key={l.id}
                to="/entreprise/livreurs/$id"
                params={{ id: l.id }}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/50"
              >
                <span className="font-medium">{l.utilisateur?.nom || "—"}</span>
                <CourierAvailabilityBadge
                  estDisponible={l.est_disponible}
                  compteActif={l.utilisateur?.est_actif !== false}
                />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
