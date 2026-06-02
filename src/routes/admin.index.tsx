import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Store, Users, PackageCheck, Truck, Plus, Package, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { UsageDashboardPanel } from "@/components/admin/UsageDashboardPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";
import {
  fetchAdminStats,
  fetchPendingEnterprises,
  formatDateFr,
  formatStatutLabel,
  formatTypeLabel,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const pendingQuery = useQuery({
    queryKey: ["admin", "enterprises", "pending"],
    queryFn: fetchPendingEnterprises,
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const stats = statsQuery.data;
  const pending = pendingQuery.data ?? [];

  return (
    <div>
      <PageHeader title="Dashboard" description="Vue d'ensemble de la plateforme GoLivra" />

      {(stats?.incidents_ouverts ?? 0) > 0 ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-foreground">
                  {stats?.incidents_ouverts} incident{(stats?.incidents_ouverts ?? 0) > 1 ? "s" : ""} ouvert
                  {(stats?.incidents_ouverts ?? 0) > 1 ? "s" : ""} sur l&apos;application
                </p>
                <p className="text-sm text-muted-foreground">
                  Erreurs mobile, API ou admin — consultez la cause probable et le requestId pour diagnostiquer.
                </p>
              </div>
            </div>
            <Button variant="destructive" asChild>
              <Link to="/admin/observabilite">Voir Observabilité</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Commerces en attente"
          icon={Store}
          value={stats?.commerces_en_attente}
          hint={statsQuery.isLoading ? "Chargement…" : undefined}
        />
        <KpiCard
          label="Commerces actifs"
          icon={Store}
          value={stats?.commerces_actifs}
          hint={statsQuery.isLoading ? "Chargement…" : undefined}
        />
        <KpiCard
          label="Comptes en attente"
          icon={Users}
          value={stats?.comptes_marchands_en_attente}
          hint="En attente de validation"
        />
        <KpiCard
          label="Commandes"
          icon={ShoppingBag}
          value={stats?.commandes_total}
          hint={statsQuery.isLoading ? "Chargement…" : "Total en base"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Livraisons (total)"
          icon={Truck}
          value={stats?.livraisons_total}
          hint={stats?.livraisons_en_cours != null ? `${stats.livraisons_en_cours} en cours` : undefined}
        />
        <KpiCard
          label="Livraisons externes"
          icon={Package}
          value={stats?.livraisons_externes}
          hint="Créées par les commerces sur l'app"
        />
        <Button variant="outline" className="h-auto min-h-[88px] flex-col items-start gap-1 p-4" asChild>
          <Link to="/admin/livraisons">
            <span className="text-sm font-semibold">Voir toutes les livraisons</span>
            <span className="text-xs text-muted-foreground">Commandes clients + externes</span>
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <DashboardCharts />
      </div>

      <div className="mt-6">
        <UsageDashboardPanel />
      </div>

      <Card className="mt-6 border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Truck className="h-4 w-4 text-primary" />
            Entreprises de livraison
          </CardTitle>
          <Button asChild>
            <Link to="/admin/transporteurs/nouveau">
              <Plus className="h-4 w-4" /> Créer une entreprise
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Créez une entreprise de livraison et son compte responsable.
          </p>
          <Button variant="link" className="mt-2 h-auto p-0" asChild>
            <Link to="/admin/transporteurs">Voir toutes les entreprises →</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Commerces à valider</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/marchands">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun commerce en attente.</p>
            ) : (
              pending.slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTypeLabel(e.type)} · {formatDateFr(e.created_at)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/admin/marchands/$id" params={{ id: e.id }}>
                      Examiner
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PackageCheck className="h-4 w-4" /> Modération
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Les restaurants et boutiques créés depuis l’app mobile arrivent avec le statut{" "}
              <Badge variant="secondary">En attente</Badge>.
            </p>
            <p>
              Ils ne sont visibles côté clients qu’après validation admin (statut{" "}
              {formatStatutLabel("active")}).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/admin/comptes">Comptes en attente</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/marchands">Restaurants & boutiques</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
