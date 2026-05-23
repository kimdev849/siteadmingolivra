import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";
import { BarChart3, PackageCheck, Percent, Truck, Users, Wallet } from "lucide-react";
import type { AdminLogisticsStats } from "@/lib/admin-api";
import { formatStatutLabel } from "@/lib/admin-api";

export function LogisticsStatsPanel({ stats }: { stats: AdminLogisticsStats }) {
  const parStatut = Object.entries(stats.par_statut ?? {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Solde portefeuille"
          icon={Wallet}
          value={
            stats.portefeuille_solde_fcfa != null
              ? `${Number(stats.portefeuille_solde_fcfa).toLocaleString("fr-FR")} FCFA`
              : "—"
          }
        />
        <KpiCard
          label="Revenus livraison (total)"
          icon={Wallet}
          value={`${Number(stats.revenus_livraison_total_fcfa ?? 0).toLocaleString("fr-FR")} FCFA`}
        />
        <KpiCard
          label="Revenus livraison (jour)"
          icon={PackageCheck}
          value={`${Number(stats.revenus_livraison_aujourdhui_fcfa ?? 0).toLocaleString("fr-FR")} FCFA`}
        />
        <KpiCard
          label="Taux de réussite"
          icon={Percent}
          value={stats.taux_reussite_pct != null ? `${stats.taux_reussite_pct} %` : "—"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Livreurs" icon={Users} value={stats.livreurs_total} />
        <KpiCard label="Disponibles" icon={Users} value={stats.livreurs_disponibles} />
        <KpiCard label="Courses total" icon={Truck} value={stats.livraisons_total} />
        <KpiCard label="Aujourd'hui" icon={Truck} value={stats.livraisons_aujourdhui} />
        <KpiCard label="En cours" icon={Truck} value={stats.livraisons_en_cours} />
        <KpiCard label="En retard" icon={Truck} value={stats.livraisons_en_retard} />
      </div>

      {parStatut.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {parStatut.map(([st, count]) => (
                <li key={st} className="flex justify-between">
                  <span>{formatStatutLabel(st)}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Délai moyen (livraisons du jour)"
          icon={BarChart3}
          value={stats.delai_moyen_minutes != null ? `${stats.delai_moyen_minutes} min` : "—"}
        />
        <KpiCard
          label="Split livraison"
          icon={Percent}
          value={
            stats.split_livraison_percent
              ? `${stats.split_livraison_percent.delivery_logistics_percent} % / ${stats.split_livraison_percent.delivery_platform_percent} %`
              : "—"
          }
          hint="Entreprise / GoLivra"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Mis à jour : {new Date(stats.mis_a_jour_le).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
