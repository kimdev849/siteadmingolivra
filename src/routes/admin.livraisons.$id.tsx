import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAdminDeliveryDetail, formatDateTimeFr, formatStatutLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/livraisons/$id")({
  component: LivraisonDetailPage,
});

function LivraisonDetailPage() {
  const { id } = Route.useParams();

  const detailQuery = useQuery({
    queryKey: ["admin", "delivery", id],
    queryFn: () => fetchAdminDeliveryDetail(id),
  });

  const d = detailQuery.data;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/livraisons">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={d ? `Livraison ${d.id.slice(0, 8)}` : "Détail livraison"}
        description={
          d?.type_livraison === "externe"
            ? "Livraison externe créée par un commerce"
            : "Livraison liée à une commande client"
        }
      />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : detailQuery.isError || !d ? (
        <p className="text-sm text-destructive">Livraison introuvable.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span>Statut</span>
                  <Badge variant="secondary">{formatStatutLabel(d.statut)}</Badge>
                  <Badge variant="outline">{d.type_livraison === "externe" ? "Externe" : "Commande"}</Badge>
                  {d.en_retard ? <Badge variant="destructive">En retard</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {d.commerce_nom ? (
                  <p>
                    <span className="text-muted-foreground">Commerce : </span>
                    {d.commerce?.id ? (
                      <Link to="/admin/marchands/$id" params={{ id: d.commerce.id }} className="text-primary hover:underline">
                        {d.commerce_nom}
                      </Link>
                    ) : (
                      d.commerce_nom
                    )}
                  </p>
                ) : null}
                {d.commande?.numero ? (
                  <p>
                    <span className="text-muted-foreground">Commande : </span>
                    <Link
                      to="/admin/commandes/$id"
                      params={{ id: d.commande.id }}
                      className="text-primary hover:underline">
                      {d.commande.numero}
                    </Link>
                  </p>
                ) : null}
                {d.client_nom ? (
                  <p>
                    <span className="text-muted-foreground">Client : </span>
                    {d.client_nom}
                    {d.client_telephone ? ` · ${d.client_telephone}` : ""}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted-foreground">Retrait : </span>
                  {d.adresse_retrait || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Livraison : </span>
                  {d.adresse || "—"}
                </p>
                {d.note ? (
                  <p>
                    <span className="text-muted-foreground">Note : </span>
                    {d.note}
                  </p>
                ) : null}
                {d.montant_total != null ? (
                  <p>
                    <span className="text-muted-foreground">Montant : </span>
                    {d.montant_total.toLocaleString("fr-FR")} FCFA
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {d.timeline?.length ? <EventTimeline steps={d.timeline} title="Chronologie" /> : null}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Horaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Commande passée</p>
                  <p>{formatDateTimeFr(d.commande_created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Livraison créée</p>
                  <p>{formatDateTimeFr(d.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Attribuée</p>
                  <p>{formatDateTimeFr(d.attribuee_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collectée</p>
                  <p>{formatDateTimeFr(d.collectee_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terminée</p>
                  <p>{formatDateTimeFr(d.livree_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Livreur</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {d.livreur ? (
                  <>
                    <p className="font-medium">{d.livreur.nom || "—"}</p>
                    <p className="text-muted-foreground">{d.livreur.telephone || "—"}</p>
                    <p className="text-muted-foreground capitalize">{d.livreur.type_vehicule || "—"}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Aucun livreur attribué</p>
                )}
                {d.entreprise_logistique ? (
                  <p className="mt-3 text-muted-foreground">
                    Entreprise :{" "}
                    <Link
                      to="/admin/transporteurs/$id"
                      params={{ id: d.entreprise_logistique.id }}
                      className="text-primary hover:underline">
                      {d.entreprise_logistique.nom}
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
