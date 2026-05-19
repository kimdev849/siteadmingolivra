import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { DeliveryDelayBadge } from "@/components/entreprise/DeliveryDelayBadge";
import { ENTREPRISE_OPS_REFETCH_MS } from "@/lib/entreprise-nav";
import { formatStatutLabel } from "@/lib/admin-api";
import {
  assignMyDelivery,
  fetchMyCouriers,
  fetchMyDeliveries,
  fetchMyLogisticsCompany,
  type LogisticsDelivery,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/livraisons/")({
  component: EntrepriseLivraisonsPage,
});

function EntrepriseLivraisonsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignTarget, setAssignTarget] = useState<LogisticsDelivery | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["logistics", "livraisons", statusFilter],
    queryFn: () => fetchMyDeliveries(statusFilter === "all" ? undefined : statusFilter),
    refetchInterval: ENTREPRISE_OPS_REFETCH_MS,
  });

  const couriersQuery = useQuery({
    queryKey: ["logistics", "livreurs"],
    queryFn: fetchMyCouriers,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canAssign = statut === "active";
  const couriers = (couriersQuery.data ?? []).filter((c) => c.utilisateur?.est_actif !== false);
  const deliveries = deliveriesQuery.data ?? [];

  const openAssign = (delivery: LogisticsDelivery) => {
    setAssignTarget(delivery);
    setSelectedCourierId(delivery.livreur?.id || "");
    setAssignError(null);
  };

  const confirmAssign = async () => {
    if (!assignTarget || !selectedCourierId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await assignMyDelivery(assignTarget.id, selectedCourierId);
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livraisons"] });
      setAssignTarget(null);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "Attribution impossible.");
    } finally {
      setAssigning(false);
    }
  };

  const rows = deliveries.map((d) => {
    const needsCourier = !d.livreur?.id && d.statut !== "livree" && d.statut !== "annulee";
    return [
      d.commande?.numero || d.id.slice(0, 8),
      d.adresse || "—",
      d.livreur?.nom || "—",
      <Badge key={`st-${d.id}`} variant="secondary">
        {formatStatutLabel(d.statut)}
      </Badge>,
      <DeliveryDelayBadge key={`delay-${d.id}`} delivery={d} />,
      `${d.minutes_depuis_creation ?? 0} min`,
      canAssign && (needsCourier || d.livreur?.id) ? (
        <Button key={`as-${d.id}`} size="sm" variant="outline" onClick={() => openAssign(d)}>
          <UserPlus className="h-3 w-3" />
          {d.livreur?.id ? "Réattribuer" : "Attribuer"}
        </Button>
      ) : (
        "—"
      ),
    ];
  });

  return (
    <div>
      <PageHeader
        title="Livraisons"
        description="Consultez les courses et attribuez-les à vos livreurs"
      />

      {!canAssign ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Votre entreprise doit être validée (statut actif) pour attribuer des livreurs aux courses.
        </p>
      ) : null}

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
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
          columns={["Commande", "Adresse", "Livreur", "Statut", "Retard", "Durée", "Actions"]}
          rows={rows}
          emptyTitle="Aucune livraison"
          emptyDescription="Les nouvelles courses à livrer apparaîtront ici."
        />
      )}

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attribuer un livreur</DialogTitle>
            <DialogDescription>
              Course {assignTarget?.commande?.numero || assignTarget?.id.slice(0, 8)} —{" "}
              {assignTarget?.adresse || "adresse non renseignée"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label>Livreur</Label>
            <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un livreur" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.utilisateur?.nom || "Livreur"} — {c.utilisateur?.telephone || c.type_vehicule}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {couriers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Créez d&apos;abord un livreur dans l&apos;onglet Livreurs.
              </p>
            ) : null}
            {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={assigning} onClick={() => setAssignTarget(null)}>
              Annuler
            </Button>
            <Button
              disabled={!selectedCourierId || assigning || couriers.length === 0}
              onClick={() => void confirmAssign()}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
