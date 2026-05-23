import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";
import { BarChart3, ShoppingBag, Truck, Wallet } from "lucide-react";
import type { AdminCommercePeriodStats, AdminCommerceStats } from "@/lib/admin-api";

function fmt(n: number): string {
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

function PeriodBlock({
  label,
  data,
}: {
  label: string;
  data: AdminCommercePeriodStats;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="CA produits" icon={Wallet} value={fmt(data.ca_produits_fcfa)} />
          <KpiCard label="Frais livraison" icon={Truck} value={fmt(data.frais_livraison_fcfa)} />
          <KpiCard label="Total payé clients" icon={ShoppingBag} value={fmt(data.total_paye_client_fcfa)} />
          <KpiCard label="Panier moyen (produits)" icon={BarChart3} value={fmt(data.panier_moyen_fcfa)} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Commandes</dt>
            <dd className="font-semibold">{data.commandes}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Livrées</dt>
            <dd className="font-semibold">{data.commandes_livrees}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Annulées / refusées</dt>
            <dd className="font-semibold">{data.commandes_annulees}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">En cours</dt>
            <dd className="font-semibold">{data.commandes_en_cours}</dd>
          </div>
        </dl>
        {data.top_produits.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Top produits (CA)</p>
            <ul className="space-y-1 text-sm">
              {data.top_produits.map((p) => (
                <li key={p.nom} className="flex justify-between gap-2">
                  <span className="truncate">{p.nom}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {p.quantite} × — {fmt(p.ca_fcfa)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CommerceStatsPanel({ stats }: { stats: AdminCommerceStats }) {
  const p = stats.periodes;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{stats.note}</p>
      <PeriodBlock label="7 derniers jours" data={p.j7} />
      <PeriodBlock label="30 derniers jours" data={p.j30} />
      <PeriodBlock label="90 derniers jours" data={p.j90} />
      <PeriodBlock label="Depuis l'inscription (total)" data={p.total} />
      <p className="text-xs text-muted-foreground">
        Mis à jour : {new Date(stats.mis_a_jour_le).toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
