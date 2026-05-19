import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminDeliveries, formatDateFr, formatStatutLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/livraisons")({
  component: LivraisonsPage,
});

function LivraisonsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const deliveriesQuery = useQuery({
    queryKey: ["admin", "deliveries", statusFilter],
    queryFn: () => fetchAdminDeliveries(statusFilter === "all" ? undefined : statusFilter),
  });

  const deliveries = deliveriesQuery.data ?? [];

  const rows = deliveries.map((d) => [
    d.id.slice(0, 8),
    d.commande?.numero || "—",
    d.livreur?.nom || "—",
    d.adresse || "—",
    <Badge key={`st-${d.id}`} variant="secondary">
      {formatStatutLabel(d.statut)}
    </Badge>,
    formatDateFr(d.created_at),
  ]);

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Vue globale — l'attribution des livreurs est gérée par chaque entreprise de livraison"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher (ID livraison)" className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="en_route">En route</SelectItem>
            <SelectItem value="livree">Livrée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {deliveriesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={["ID", "Commande", "Livreur", "Adresse", "Statut", "Date"]}
          rows={rows}
          emptyTitle="Aucune livraison"
          emptyDescription="Les livraisons en cours apparaîtront ici."
        />
      )}
    </div>
  );
}