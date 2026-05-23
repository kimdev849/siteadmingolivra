import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, Info } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminPlatformWallet, formatDateFr } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/portefeuille")({
  component: AdminPortefeuillePage,
});

function AdminPortefeuillePage() {
  const query = useQuery({
    queryKey: ["admin", "portefeuille"],
    queryFn: fetchAdminPlatformWallet,
  });
  const w = query.data;

  return (
    <div>
      <PageHeader
        title="Portefeuille GoLivra"
        description="Revenus plateforme — commissions sur livraisons uniquement"
      />

      {w?.message ? (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex gap-2 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            {w.message}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Solde disponible"
          icon={Wallet}
          value={w ? `${Number(w.solde_fcfa).toLocaleString("fr-FR")} FCFA` : undefined}
        />
        <KpiCard
          label="Commissions livraison (total)"
          icon={TrendingUp}
          value={
            w
              ? `${Number(w.commissions_livraison_total_fcfa).toLocaleString("fr-FR")} FCFA`
              : undefined
          }
        />
        <KpiCard
          label="Commissions (ce mois)"
          icon={TrendingUp}
          value={
            w ? `${Number(w.commissions_livraison_mois_fcfa).toLocaleString("fr-FR")} FCFA` : undefined
          }
        />
        <KpiCard
          label="Retraits en attente"
          icon={Clock}
          value={w ? `${w.nb_retraits_en_attente} demande(s)` : undefined}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (w?.transactions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune transaction. Les crédits apparaissent quand une livraison est terminée.
            </p>
          ) : (
            (w?.transactions ?? []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{t.description || t.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateFr(t.created_at)}</p>
                </div>
                <span className="font-semibold text-emerald-700">
                  +{Number(t.montant).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
