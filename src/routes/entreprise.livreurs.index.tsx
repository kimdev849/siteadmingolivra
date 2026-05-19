import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Loader2, Plus, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  activateMyCourier,
  fetchMyCouriers,
  fetchMyLogisticsCompany,
  suspendMyCourier,
} from "@/lib/logistics-api";
import type { AdminCourier } from "@/lib/admin-api";

export const Route = createFileRoute("/entreprise/livreurs/")({
  component: LivreursListPage,
});

function LivreursListPage() {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const couriersQuery = useQuery({
    queryKey: ["logistics", "livreurs"],
    queryFn: fetchMyCouriers,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canManage = statut === "active";

  const toggleCourier = async (livreur: AdminCourier, action: "suspend" | "activate") => {
    const key = `${action}-${livreur.id}`;
    setActingId(key);
    try {
      if (action === "suspend") await suspendMyCourier(livreur.id);
      else await activateMyCourier(livreur.id);
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livreurs"] });
    } finally {
      setActingId(null);
    }
  };

  const rows = (couriersQuery.data ?? []).map((l) => {
    const actif = l.utilisateur?.est_actif !== false;
    return [
      l.utilisateur?.nom || "—",
      l.utilisateur?.telephone || "—",
      l.type_vehicule || "—",
      <Badge key={`disp-${l.id}`} variant={l.est_disponible ? "default" : "secondary"}>
        {l.est_disponible ? "Disponible" : "Indisponible"}
      </Badge>,
      <Badge key={`acc-${l.id}`} variant={actif ? "default" : "destructive"}>
        {actif ? "Actif" : "Suspendu"}
      </Badge>,
      canManage ? (
        <div key={`act-${l.id}`} className="flex flex-wrap gap-1">
          {actif ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actingId === `suspend-${l.id}`}
              onClick={() => void toggleCourier(l, "suspend")}
            >
              {actingId === `suspend-${l.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Ban className="h-3 w-3" />
              )}
              Suspendre
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={actingId === `activate-${l.id}`}
              onClick={() => void toggleCourier(l, "activate")}
            >
              {actingId === `activate-${l.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UserCheck className="h-3 w-3" />
              )}
              Réactiver
            </Button>
          )}
        </div>
      ) : (
        "—"
      ),
    ];
  });

  return (
    <div>
      <PageHeader
        title="Livreurs"
        description="Liste et gestion de votre équipe"
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/entreprise/livreurs/nouveau">
                <Plus className="h-4 w-4" /> Ajouter un livreur
              </Link>
            </Button>
          ) : null
        }
      />

      {!canManage ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Entreprise en attente de validation — ajout de livreurs indisponible pour le moment.
        </p>
      ) : null}

      {couriersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={["Nom", "Téléphone", "Véhicule", "Disponibilité", "Compte", "Actions"]}
          rows={rows}
          emptyTitle="Aucun livreur"
          emptyDescription={
            canManage
              ? "Créez un livreur pour lui donner accès à l'application mobile."
              : "Disponible après validation de l'entreprise."
          }
        />
      )}
    </div>
  );
}
