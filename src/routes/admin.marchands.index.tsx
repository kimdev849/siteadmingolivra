import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  activateEnterpriseAdmin,
  fetchAdminEnterprises,
  formatDateFr,
  formatStatutLabel,
  formatTypeLabel,
  rejectEnterpriseAdmin,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/marchands/")({
  component: MarchandsPage,
});

function statusBadgeVariant(statut?: string) {
  if (statut === "active") return "default" as const;
  if (statut === "en_attente") return "secondary" as const;
  if (statut === "suspendue") return "destructive" as const;
  if (statut === "rejetee") return "destructive" as const;
  return "outline" as const;
}

function MarchandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; nom: string } | null>(null);

  const enterprisesQuery = useQuery({
    queryKey: ["admin", "enterprises", typeFilter, statusFilter, search],
    queryFn: () =>
      fetchAdminEnterprises({
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
      }),
  });

  const rows = useMemo(() => {
    const list = enterprisesQuery.data ?? [];
    return list.map((e) => {
      const statut = e.statut_moderation || e.statut || "—";
      return [
        <Link
          key={`name-${e.id}`}
          to="/admin/marchands/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.nom}
        </Link>,
        formatTypeLabel(e.type),
        <Badge key={`st-${e.id}`} variant={statusBadgeVariant(statut)}>
          {formatStatutLabel(statut)}
        </Badge>,
        formatDateFr(e.created_at),
        <div key={`act-${e.id}`} className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/marchands/$id" params={{ id: e.id }}>
              Détail
            </Link>
          </Button>
          {statut === "en_attente" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={actingId === e.id}
                onClick={() => setRejectTarget({ id: e.id, nom: e.nom })}
              >
                {actingId === e.id && rejectTarget?.id === e.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Rejeter"
                )}
              </Button>
              <Button
                size="sm"
                disabled={actingId === e.id}
                onClick={async () => {
                  setActingId(e.id);
                  try {
                    await activateEnterpriseAdmin(e.id);
                    await queryClient.invalidateQueries({ queryKey: ["admin"] });
                    toast.success(`« ${e.nom} » a été activé.`);
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Impossible d'activer ce commerce."
                    );
                  } finally {
                    setActingId(null);
                  }
                }}
              >
                {actingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Valider"}
              </Button>
            </>
          ) : null}
        </div>,
      ];
    });
  }, [enterprisesQuery.data, actingId, queryClient]);

  return (
    <div>
      <PageHeader
        title="Restaurants & Boutiques"
        description="Validation des restaurants et boutiques"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher…"
          className="w-full sm:max-w-xs"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="boutique">Boutique</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
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
            setTypeFilter("all");
            setSearch("");
          }}
        >
          <Filter className="h-4 w-4" /> En attente
        </Button>
      </div>

      {enterprisesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : enterprisesQuery.isError ? (
        <p className="text-sm text-destructive">
          {enterprisesQuery.error instanceof Error
            ? enterprisesQuery.error.message
            : "Impossible de charger la liste."}
        </p>
      ) : (
        <DataTable
          columns={["Nom", "Type", "Statut", "Date d'inscription", "Actions"]}
          rows={rows}
          emptyTitle="Aucun commerce"
          emptyDescription="Les restaurants et boutiques inscrits apparaîtront ici."
        />
      )}

      {/* Dialogue de confirmation pour le refus */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le commerce</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment refuser « {rejectTarget?.nom} » ? Ce commerce
              n'apparaîtra plus sur le marketplace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={actingId === rejectTarget?.id}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={actingId === rejectTarget?.id}
              onClick={async () => {
                if (!rejectTarget) return;
                setActingId(rejectTarget.id);
                try {
                  await rejectEnterpriseAdmin(rejectTarget.id);
                  await queryClient.invalidateQueries({ queryKey: ["admin"] });
                  toast.success(`« ${rejectTarget.nom} » a été refusé.`);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Impossible de refuser ce commerce."
                  );
                } finally {
                  setActingId(null);
                  setRejectTarget(null);
                }
              }}
            >
              {actingId === rejectTarget?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
