import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Percent, Wallet, TrendingUp, Receipt } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { fetchAdminCommissions, formatDateFr, formatStatutLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/commissions")({
  component: CommissionsPage,
});

function CommissionsPage() {
  const query = useQuery({
    queryKey: ["admin", "commissions"],
    queryFn: fetchAdminCommissions,
  });

  const data = query.data;

  const rows = (data?.lignes ?? []).slice(0, 50).map((l) => [
    formatDateFr(l.periode),
    l.etablissement,
    String(l.livraisons),
    `${Number(l.montant).toLocaleString("fr-FR")} FCFA`,
    `${Number(l.commission).toLocaleString("fr-FR")} FCFA`,
    <Badge key={`st-${l.id}`} variant="secondary">
      {formatStatutLabel(l.statut)}
    </Badge>,
  ]);

  return (
    <div>
      <PageHeader
        title="Commissions livraison"
        description="Revenus GoLivra sur les frais de livraison uniquement (0 % sur les ventes produits)"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Commissions totales"
          icon={Percent}
          value={data ? `${Number(data.total_commission).toLocaleString("fr-FR")} FCFA` : undefined}
        />
        <KpiCard
          label="Commissions du mois"
          icon={TrendingUp}
          value={data ? `${Number(data.commission_mois).toLocaleString("fr-FR")} FCFA` : undefined}
        />
        <KpiCard
          label="Reversements en attente"
          icon={Wallet}
          value={
            data
              ? `${Number(data.reversements_en_attente).toLocaleString("fr-FR")} FCFA`
              : undefined
          }
        />
        <KpiCard label="Sous-commandes" icon={Receipt} value={data?.factures_emises} />
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <DataTable
            columns={["Période", "Entreprise", "Livraisons", "Montant", "Commission", "Statut"]}
            rows={rows}
            emptyTitle="Aucune commission"
            emptyDescription="Les commissions calculées apparaîtront ici."
          />
        )}
      </div>
    </div>
  );
}
