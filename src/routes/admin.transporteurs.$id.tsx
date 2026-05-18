import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Loader2, Plus, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  activateLogisticsCourierAdmin,
  createLogisticsCourierAdmin,
  fetchAdminLogisticsDetail,
  formatDateFr,
  formatStatutLabel,
  suspendLogisticsCourierAdmin,
  updateLogisticsStatusAdmin,
  type AdminCourier,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/transporteurs/$id")({
  component: TransporteurDetailPage,
});

function TransporteurDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [courierOpen, setCourierOpen] = useState(false);
  const [courierCreating, setCourierCreating] = useState(false);
  const [courierError, setCourierError] = useState<string | null>(null);
  const [courierForm, setCourierForm] = useState({
    nom: "",
    telephone: "",
    motDePasse: "",
    typeVehicule: "moto" as "moto" | "voiture" | "velo" | "pied",
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "logistics", id],
    queryFn: () => fetchAdminLogisticsDetail(id),
  });

  const company = detailQuery.data;
  const statut = company?.statut_moderation || company?.statut;
  const canManageCouriers = statut === "active";

  const run = async (action: "activate" | "reject" | "suspend") => {
    setLoading(action);
    try {
      await updateLogisticsStatusAdmin(id, action);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      await detailQuery.refetch();
    } finally {
      setLoading(null);
    }
  };

  const handleCreateCourier = async () => {
    setCourierCreating(true);
    setCourierError(null);
    try {
      await createLogisticsCourierAdmin(id, {
        nom: courierForm.nom.trim(),
        telephone: courierForm.telephone.trim(),
        motDePasse: courierForm.motDePasse,
        typeVehicule: courierForm.typeVehicule,
      });
      setCourierOpen(false);
      setCourierForm({ nom: "", telephone: "", motDePasse: "", typeVehicule: "moto" });
      await detailQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["admin", "logistics"] });
    } catch (e) {
      setCourierError(e instanceof Error ? e.message : "Erreur lors de la création du livreur.");
    } finally {
      setCourierCreating(false);
    }
  };

  const toggleCourier = async (livreur: AdminCourier, action: "suspend" | "activate") => {
    const key = `${action}-${livreur.id}`;
    setLoading(key);
    try {
      if (action === "suspend") await suspendLogisticsCourierAdmin(id, livreur.id);
      else await activateLogisticsCourierAdmin(id, livreur.id);
      await detailQuery.refetch();
    } finally {
      setLoading(null);
    }
  };

  const courierRows = (company?.livreurs ?? []).map((l) => {
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
      canManageCouriers ? (
        <div key={`act-${l.id}`} className="flex gap-1">
          {actif ? (
            <Button
              size="sm"
              variant="outline"
              disabled={loading === `suspend-${l.id}`}
              onClick={() => void toggleCourier(l, "suspend")}
            >
              {loading === `suspend-${l.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Ban className="h-3 w-3" />
              )}
              Suspendre
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={loading === `activate-${l.id}`}
              onClick={() => void toggleCourier(l, "activate")}
            >
              {loading === `activate-${l.id}` ? (
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
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/transporteurs">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={company?.nom || "Détail transporteur"}
        description="Informations, livreurs et actions de modération"
        actions={
          <>
            {canManageCouriers ? (
              <Dialog open={courierOpen} onOpenChange={setCourierOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" /> Ajouter un livreur
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouveau livreur</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="grid gap-1.5">
                      <Label>Nom</Label>
                      <Input
                        value={courierForm.nom}
                        onChange={(ev) => setCourierForm((f) => ({ ...f, nom: ev.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Téléphone (+242…)</Label>
                      <Input
                        placeholder="+242061234567"
                        value={courierForm.telephone}
                        onChange={(ev) => setCourierForm((f) => ({ ...f, telephone: ev.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Mot de passe (app mobile)</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={courierForm.motDePasse}
                        onChange={(ev) => setCourierForm((f) => ({ ...f, motDePasse: ev.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Type de véhicule</Label>
                      <Select
                        value={courierForm.typeVehicule}
                        onValueChange={(v) =>
                          setCourierForm((f) => ({
                            ...f,
                            typeVehicule: v as typeof f.typeVehicule,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moto">Moto</SelectItem>
                          <SelectItem value="voiture">Voiture</SelectItem>
                          <SelectItem value="velo">Vélo</SelectItem>
                          <SelectItem value="pied">À pied</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {courierError ? <p className="text-sm text-destructive">{courierError}</p> : null}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCourierOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      disabled={
                        courierCreating ||
                        !courierForm.nom.trim() ||
                        !courierForm.telephone.trim() ||
                        courierForm.motDePasse.length < 6
                      }
                      onClick={() => void handleCreateCourier()}
                    >
                      {courierCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
            {statut === "active" ? (
              <Button variant="outline" disabled={!!loading} onClick={() => void run("suspend")}>
                {loading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Suspendre
              </Button>
            ) : null}
            {statut === "en_attente" || statut === "suspendue" ? (
              <>
                <Button variant="outline" disabled={!!loading} onClick={() => void run("reject")}>
                  Rejeter
                </Button>
                <Button disabled={!!loading} onClick={() => void run("activate")}>
                  {loading === "activate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Valider
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : company ? (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Statut</dt>
                  <dd>
                    <Badge variant={statut === "active" ? "default" : "secondary"}>
                      {formatStatutLabel(statut)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Téléphone</dt>
                  <dd>{company.telephone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>{company.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Gestionnaire</dt>
                  <dd>
                    {company.gestionnaire?.nom || "—"}
                    {company.gestionnaire?.email ? (
                      <span className="block text-xs text-muted-foreground">{company.gestionnaire.email}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Inscription</dt>
                  <dd>{formatDateFr(company.created_at)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {!canManageCouriers ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Validez l&apos;entreprise pour pouvoir créer et gérer des livreurs.
            </p>
          ) : null}

          <DataTable
            columns={["Nom", "Téléphone", "Véhicule", "Disponibilité", "Compte", "Actions"]}
            rows={courierRows}
            emptyTitle="Aucun livreur"
            emptyDescription={
              canManageCouriers
                ? "Ajoutez un livreur pour lui donner accès à l'application mobile."
                : "Les livreurs apparaîtront ici une fois l'entreprise validée."
            }
          />
        </>
      ) : (
        <p className="text-sm text-destructive">Entreprise introuvable.</p>
      )}
    </div>
  );
}
