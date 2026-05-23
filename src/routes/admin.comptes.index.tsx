import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approveUserAdmin,
  fetchPendingUsers,
  formatDateFr,
  rejectUserAdmin,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/comptes/")({
  component: ComptesPage,
});

function ComptesPage() {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", "pending"],
    queryFn: fetchPendingUsers,
  });

  const users = usersQuery.data ?? [];

  const run = async (userId: string, action: "approve" | "reject") => {
    setActingId(userId);
    try {
      if (action === "approve") await approveUserAdmin(userId);
      else await rejectUserAdmin(userId);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } finally {
      setActingId(null);
    }
  };

  const rows = users.map((u) => [
    u.nom || "—",
    u.telephone || "—",
    u.role === "restaurateur"
      ? "Restaurateur"
      : u.role === "commercant"
        ? "Commerçant"
        : u.role || "—",
    <Badge key={`st-${u.id}`} variant="secondary">
      En attente
    </Badge>,
    formatDateFr(u.created_at),
    <div key={`act-${u.id}`} className="flex flex-wrap gap-1">
      <Button size="sm" disabled={actingId === u.id} onClick={() => void run(u.id, "approve")}>
        {actingId === u.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        Approuver
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={actingId === u.id}
        onClick={() => void run(u.id, "reject")}
      >
        <XCircle className="h-3 w-3" /> Rejeter
      </Button>
    </div>,
  ]);

  return (
    <div>
      <PageHeader
        title="Comptes en attente"
        description="Validation des comptes restaurateurs et boutiques"
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/marchands">Voir les commerces</Link>
          </Button>
        }
      />

      {usersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : usersQuery.isError ? (
        <p className="text-sm text-destructive">Impossible de charger les comptes.</p>
      ) : (
        <DataTable
          columns={["Nom", "Téléphone", "Rôle", "Statut", "Inscription", "Actions"]}
          rows={rows}
          emptyTitle="Aucun compte en attente"
          emptyDescription="Les nouveaux comptes inscrits apparaîtront ici."
        />
      )}
    </div>
  );
}
