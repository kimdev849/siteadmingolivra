import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Ban, Loader2, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { CourierAvailabilityBadge } from "@/components/entreprise/CourierAvailabilityBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDateFr, formatStatutLabel } from "@/lib/admin-api";
import {
  activateMyCourier,
  fetchMyCourier,
  fetchMyCouriers,
  fetchMyLogisticsCompany,
  setMyCourierAvailability,
  suspendMyCourier,
  type CourierDetail,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/livreurs/$id")({
  component: LivreurDetailPage,
});

function LivreurDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const couriersQuery = useQuery({
    queryKey: ["logistics", "livreurs"],
    queryFn: fetchMyCouriers,
  });

  const detailQuery = useQuery({
    queryKey: ["logistics", "livreur", id],
    queryFn: () => fetchMyCourier(id),
    retry: false,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canManage = statut === "active";
  const livreurFromList = couriersQuery.data?.find((l) => l.id === id);
  const livreur: CourierDetail | undefined = detailQuery.data ?? livreurFromList;
  const detailPartial = Boolean(livreur && !detailQuery.data && detailQuery.isError);
  const compteActif = livreur?.compte_actif !== false && livreur?.utilisateur?.est_actif !== false;
  const isLoading = detailQuery.isLoading || (couriersQuery.isLoading && !livreur);

  const toggleDisponibilite = async (disponible: boolean) => {
    setActing("dispo");
    try {
      await setMyCourierAvailability(id, disponible);
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livreur", id] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livreurs"] });
    } finally {
      setActing(null);
    }
  };

  const toggleCompte = async (action: "suspend" | "activate") => {
    setActing(action);
    try {
      if (action === "suspend") await suspendMyCourier(id);
      else await activateMyCourier(id);
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livreur", id] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "livreurs"] });
    } finally {
      setActing(null);
    }
  };

  const deliveryRows = (livreur?.livraisons_recentes ?? []).map((d) => [
    d.commande?.numero || d.id.slice(0, 8),
    d.adresse || "—",
    <Badge key={`st-${d.id}`} variant="secondary">
      {formatStatutLabel(d.statut)}
    </Badge>,
    formatDateFr(d.created_at),
  ]);

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/entreprise/livreurs">
          <ArrowLeft className="h-4 w-4" /> Retour aux livreurs
        </Link>
      </Button>

      <PageHeader
        title={livreur?.utilisateur?.nom || "Livreur"}
        description="Fiche détaillée et historique récent"
        actions={
          canManage && livreur ? (
            compteActif ? (
              <Button
                variant="outline"
                disabled={!!acting}
                onClick={() => void toggleCompte("suspend")}
              >
                {acting === "suspend" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Suspendre le compte
              </Button>
            ) : (
              <Button disabled={!!acting} onClick={() => void toggleCompte("activate")}>
                {acting === "activate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Réactiver le compte
              </Button>
            )
          ) : null
        }
      />

      {detailPartial ? (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Fiche partielle — l&apos;historique des courses sera disponible dès que le serveur sera à
          jour. Le livreur est bien inscrit, même s&apos;il ne s&apos;est pas encore connecté à
          l&apos;app mobile.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : livreur ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Téléphone (connexion app)</p>
                <p className="font-medium">{livreur.utilisateur?.telephone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p>{livreur.utilisateur?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Véhicule</p>
                <p className="capitalize">{livreur.type_vehicule || "—"}</p>
              </div>
              {livreur.plaque_immatriculation ? (
                <div>
                  <p className="text-xs text-muted-foreground">Plaque</p>
                  <p>{livreur.plaque_immatriculation}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs text-muted-foreground">Inscription</p>
                <p>{formatDateFr(livreur.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CourierAvailabilityBadge
                  estDisponible={livreur.est_disponible}
                  compteActif={compteActif}
                />
                <Badge variant={compteActif ? "outline" : "destructive"}>
                  {compteActif ? "Compte actif" : "Compte suspendu"}
                </Badge>
              </div>

              {canManage && compteActif && !detailPartial ? (
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-3">
                  <Label htmlFor="dispo-switch" className="text-sm">
                    Disponible pour les courses
                  </Label>
                  <Switch
                    id="dispo-switch"
                    disabled={acting === "dispo"}
                    checked={Boolean(livreur.est_disponible)}
                    onCheckedChange={(v) => void toggleDisponibilite(v)}
                  />
                </div>
              ) : detailPartial && canManage && compteActif ? (
                <p className="text-xs text-muted-foreground">
                  La disponibilité se règle sur l&apos;app mobile, ou depuis cette fiche après mise
                  à jour du serveur.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Total livraisons</dt>
                  <dd className="text-lg font-semibold">
                    {livreur.resume?.total_historique ?? livreur.nb_livraisons_total ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Réussies</dt>
                  <dd className="text-lg font-semibold">
                    {livreur.resume?.reussies_historique ?? livreur.nb_livraisons_reussies ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">En cours (récent)</dt>
                  <dd className="text-lg font-semibold">
                    {livreur.resume?.recentes_en_cours ?? 0}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Dernières livraisons</CardTitle>
            </CardHeader>
            <CardContent>
              {detailPartial ? (
                <p className="text-sm text-muted-foreground">
                  Historique des courses indisponible pour le moment.
                </p>
              ) : deliveryRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune course attribuée pour le moment.
                </p>
              ) : (
                <DataTable
                  columns={["Commande", "Adresse", "Statut", "Date"]}
                  rows={deliveryRows}
                  emptyTitle="Aucune livraison"
                  emptyDescription=""
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Livreur introuvable dans votre entreprise."}
        </p>
      )}
    </div>
  );
}
