import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminDeliveries, formatDateTimeFr, formatStatutLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/livraisons")({
  component: LivraisonsPage,
});

function LivraisonsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const deliveriesQuery = useQuery({
    queryKey: ["admin", "deliveries", statusFilter, typeFilter],
    queryFn: () =>
      fetchAdminDeliveries({
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : (typeFilter as "commande" | "externe"),
      }),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const deliveries = useMemo(() => {
    const list = deliveriesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      const hay = [
        d.id,
        d.commande?.numero,
        d.commerce_nom,
        d.client_nom,
        d.livreur?.nom,
        d.adresse,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [deliveriesQuery.data, search]);

  const rows = deliveries.map((d) => [
    <Link key={`id-${d.id}`} to="/admin/livraisons/$id" params={{ id: d.id }} className="font-mono text-primary hover:underline">
      {d.id.slice(0, 8)}
    </Link>,
    <Badge key={`type-${d.id}`} variant="outline">
      {d.type_livraison === "externe" ? "Externe" : "Commande"}
    </Badge>,
    d.commande?.numero || d.commerce_nom || d.client_nom || "—",
    d.livreur?.nom || "—",
    <span key={`addr-${d.id}`} className="max-w-[200px] truncate block">
      {d.adresse || "—"}
    </span>,
    <Badge key={`st-${d.id}`} variant={d.en_retard ? "destructive" : "secondary"}>
      {formatStatutLabel(d.statut)}
    </Badge>,
    formatDateTimeFr(d.commande_created_at),
    formatDateTimeFr(d.created_at),
    formatDateTimeFr(d.livree_at),
    <Button key={`act-${d.id}`} size="sm" variant="outline" asChild>
      <Link to="/admin/livraisons/$id" params={{ id: d.id }}>
        Détail
      </Link>
    </Button>,
  ]);

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Commandes clients et livraisons externes créées par les commerces — avec horaires et retards"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher (ID, commerce…)"
          className="max-w-xs"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="commande">Commande client</SelectItem>
            <SelectItem value="externe">Livraison externe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="attribuee">Attribuée</SelectItem>
            <SelectItem value="en_route">En route</SelectItem>
            <SelectItem value="livree">Livrée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {deliveriesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={[
            "ID",
            "Type",
            "Référence",
            "Livreur",
            "Adresse",
            "Statut",
            "Cmd. créée",
            "Livraison créée",
            "Terminée",
            "",
          ]}
          rows={rows}
          emptyTitle="Aucune livraison"
          emptyDescription="Les livraisons commandes et externes apparaîtront ici."
        />
      )}
    </div>
  );
}
