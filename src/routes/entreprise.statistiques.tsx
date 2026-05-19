import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bike, PackageCheck, Percent, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStatutLabel } from "@/lib/admin-api";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { fetchMyCouriers, fetchMyStats } from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/statistiques")({
  component: EntrepriseStatistiquesPage,
});

function EntrepriseStatistiquesPage() {
  const statsQuery = useQuery({
    queryKey: ["logistics", "stats"],
    queryFn: fetchMyStats,
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const couriersQuery = useQuery({
    queryKey: ["logistics", "livreurs"],
    queryFn: fetchMyCouriers,
  });

  const stats = statsQuery.data;
  const chartData = Object.entries(stats?.par_statut ?? {}).map(([statut, count]) => ({
    statut: formatStatutLabel(statut),
    count,
  }));

  const topCouriers = [...(couriersQuery.data ?? [])]
    .sort((a, b) => Number(b.nb_livraisons_reussies ?? 0) - Number(a.nb_livraisons_reussies ?? 0))
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Statistiques"
        description="Performance de votre flotte et de vos livraisons"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Livraisons aujourd'hui" icon={PackageCheck} value={stats?.livraisons_aujourdhui} />
        <KpiCard label="Livrées aujourd'hui" icon={PackageCheck} value={stats?.livraisons_livrees_aujourdhui} />
        <KpiCard
          label="Taux de réussite"
          icon={Percent}
          value={stats?.taux_reussite_pct != null ? `${stats.taux_reussite_pct} %` : "—"}
        />
        <KpiCard
          label="Délai moyen"
          icon={BarChart3}
          value={stats?.delai_moyen_minutes != null ? `${stats.delai_moyen_minutes} min` : "—"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="statut" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Top livreurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {couriersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : topCouriers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun livreur.{" "}
                <Link to="/entreprise/livreurs/nouveau" className="text-primary hover:underline">
                  Créer un livreur
                </Link>
              </p>
            ) : (
              topCouriers.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.utilisateur?.nom || "—"}</span>
                  <span className="text-muted-foreground">
                    {c.nb_livraisons_reussies ?? 0} / {c.nb_livraisons_total ?? 0} livraisons
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Livreurs actifs" icon={Users} value={stats?.livreurs_actifs} />
        <KpiCard label="Disponibles" icon={Bike} value={stats?.livreurs_disponibles} />
        <KpiCard label="En retard" icon={PackageCheck} value={stats?.livraisons_en_retard} hint="Voir l'onglet Retards" />
      </div>
    </div>
  );
}
