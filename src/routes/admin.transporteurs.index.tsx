import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Filter, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAdminLogistics,
  formatDateFr,
  formatStatutLabel,
  updateLogisticsStatusAdmin,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/transporteurs/")({
  component: TransporteursPage,
});

function TransporteursPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "logistics", statusFilter, search],
    queryFn: () =>
      fetchAdminLogistics({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
      }),
  });

  const rows = useMemo(() => {
    return (query.data ?? []).map((e) => {
      const statut = e.statut_moderation || e.statut || "—";
      return [
        <Link
          key={`name-${e.id}`}
          to="/admin/transporteurs/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.nom}
        </Link>,
        <Badge key={`st-${e.id}`} variant={statut === "active" ? "default" : "secondary"}>
          {formatStatutLabel(statut)}
        </Badge>,
        String(e.nb_livreurs ?? 0),
        formatDateFr(e.created_at),
        <div key={`act-${e.id}`} className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/transporteurs/$id" params={{ id: e.id }}>
              Détail
            </Link>
          </Button>
          {statut === "en_attente" ? (
            <Button
              size="sm"
              disabled={actingId === e.id}
              onClick={async () => {
                setActingId(e.id);
                try {
                  await updateLogisticsStatusAdmin(e.id, "activate");
                  await queryClient.invalidateQueries({ queryKey: ["admin"] });
                } finally {
                  setActingId(null);
                }
              }}
            >
              {actingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Valider"}
            </Button>
          ) : null}
        </div>,
      ];
    });
  }, [query.data, actingId, queryClient]);

  return (
    <div>
      <PageHeader
        title="Entreprises de livraison"
        description="Créez et validez les entreprises — elles gèrent ensuite leurs livreurs en autonomie"
        actions={
          <Button asChild size="lg" className="shadow-sm">
            <Link to="/admin/transporteurs/nouveau">
              <Plus className="h-4 w-4" />
              Créer une entreprise
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher une entreprise…"
          className="max-w-xs"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="suspendue">Suspendu</SelectItem>
            <SelectItem value="rejetee">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setStatusFilter("en_attente");
            setSearch("");
          }}
        >
          <Filter className="h-4 w-4" /> En attente
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={["Nom entreprise", "Statut", "Nombre de livreurs", "Date", "Actions"]}
          rows={rows}
          emptyTitle="Aucune entreprise"
          emptyDescription="Créez une entreprise de livraison pour commencer."
        />
      )}
    </div>
  );
}
