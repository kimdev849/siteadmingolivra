import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchAdminWithdrawals,
  formatDateFr,
  processAdminWithdrawal,
  type WithdrawalRequest,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/retraits")({
  component: AdminRetraitsPage,
});

function statutBadge(statut: string) {
  if (statut === "en_attente") return <Badge variant="secondary">En attente</Badge>;
  if (statut === "paye") return <Badge className="bg-emerald-600">Payé</Badge>;
  if (statut === "rejete") return <Badge variant="destructive">Rejeté</Badge>;
  return <Badge variant="outline">{statut}</Badge>;
}

function AdminRetraitsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("en_attente");
  const query = useQuery({
    queryKey: ["admin", "retraits", filter],
    queryFn: () => fetchAdminWithdrawals(filter || undefined),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approuver" | "rejeter" }) =>
      processAdminWithdrawal(id, action),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "retraits"] }),
  });

  const rows = (query.data ?? []).map((r: WithdrawalRequest) => [
    formatDateFr(r.created_at),
    r.utilisateur?.nom || "—",
    r.utilisateur?.telephone || "—",
    `${Number(r.montant).toLocaleString("fr-FR")} FCFA`,
    r.methode,
    r.numero_compte,
    statutBadge(r.statut),
    r.statut === "en_attente" ? (
      <div key={`act-${r.id}`} className="flex gap-2">
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ id: r.id, action: "approuver" })}
        >
          Payer
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ id: r.id, action: "rejeter" })}
        >
          Rejeter
        </Button>
      </div>
    ) : (
      "—"
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Demandes de retrait"
        description="Validez les retraits vers Airtel / MTN (commerce, entreprise logistique)"
      />

      <div className="mb-4 flex gap-2">
        {["en_attente", "paye", "rejete", ""].map((s) => (
          <Button
            key={s || "all"}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "" ? "Tous" : s === "en_attente" ? "En attente" : s === "paye" ? "Payés" : "Rejetés"}
          </Button>
        ))}
      </div>

      <DataTable
        columns={["Date", "Utilisateur", "Tél.", "Montant", "Méthode", "N° compte", "Statut", "Actions"]}
        rows={rows}
        emptyTitle="Aucune demande"
        emptyDescription="Les retraits des portefeuilles apparaîtront ici."
      />
    </div>
  );
}
