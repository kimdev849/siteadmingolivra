import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, PackageCheck, Percent, TrendingUp, Store } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAdminCommissions, fetchAdminStats } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const statsQuery = useQuery({ queryKey: ["admin", "stats"], queryFn: fetchAdminStats });
  const commissionsQuery = useQuery({
    queryKey: ["admin", "commissions"],
    queryFn: fetchAdminCommissions,
  });

  const stats = statsQuery.data;
  const commissions = commissionsQuery.data;

  return (
    <div>
      <PageHeader title="Analytics" description="Performance globale de la plateforme" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Commandes totales" icon={ShoppingBag} value={stats?.commandes_total} />
        <KpiCard label="Commerces actifs" icon={Store} value={stats?.commerces_actifs} />
        <KpiCard
          label="Commission du mois"
          icon={Percent}
          value={
            commissions
              ? `${Number(commissions.commission_mois).toLocaleString("fr-FR")} FCFA`
              : undefined
          }
        />
        <KpiCard
          label="Commerces en attente"
          icon={TrendingUp}
          value={stats?.commerces_en_attente}
          hint="À valider"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PackageCheck className="h-4 w-4" /> Modération
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Comptes en attente : {stats?.comptes_marchands_en_attente ?? "—"}</p>
            <p>Commerces en attente : {stats?.commerces_en_attente ?? "—"}</p>
            <Button className="mt-2" asChild>
              <Link to="/admin/marchands">Restaurants & boutiques</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Commissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Total commissions :{" "}
              {commissions
                ? `${Number(commissions.total_commission).toLocaleString("fr-FR")} FCFA`
                : "—"}
            </p>
            <p>Sous-commandes suivies : {commissions?.factures_emises ?? "—"}</p>
            <Button variant="outline" className="mt-2" asChild>
              <Link to="/admin/commissions">Voir le détail</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
