import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { OrderAmountBreakdown } from "@/components/admin/OrderAmountBreakdown";
import { ADMIN_LIVE_REFETCH_MS } from "@/lib/admin-nav";
import { fetchAdminOrder, formatDateTimeFr, formatStatutLabel, formatTypeLabel } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/commandes/$id")({
  component: CommandeDetailPage,
});

function CommandeDetailPage() {
  const { id } = Route.useParams();

  const detailQuery = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => fetchAdminOrder(id),
    refetchInterval: ADMIN_LIVE_REFETCH_MS,
  });

  const order = detailQuery.data;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/commandes">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={order ? `Commande ${order.numero}` : "Détail commande"}
        description="Vue détaillée multi-boutiques"
      />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : detailQuery.isError || !order ? (
        <p className="text-sm text-destructive">Commande introuvable.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {(order.sous_commandes ?? []).map((sc) => (
              <Card key={sc.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm font-semibold">
                    <span>
                      {formatTypeLabel(sc.etablissement?.type)} {sc.etablissement?.nom || "—"}
                    </span>
                    <Badge variant="secondary">{formatStatutLabel(sc.statut)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sc.articles.length === 0 ? (
                    <EmptyState
                      title="Aucun produit"
                      description="Les lignes de la commande apparaîtront ici."
                    />
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {sc.articles.map((a) => (
                        <li key={a.id} className="flex justify-between">
                          <span>
                            {a.nom_produit} × {a.quantite}
                          </span>
                          <span>{Number(a.sous_total).toLocaleString("fr-FR")} FCFA</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Separator className="my-4" />
                  <OrderAmountBreakdown
                    sousTotal={Number(sc.sous_total)}
                    fraisLivraison={Number(sc.frais_livraison)}
                    total={Number(sc.total)}
                    showCommissionNote={false}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Client</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Nom</dt>
                    <dd className="text-foreground">{order.client?.nom || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="text-foreground">{order.client?.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Téléphone</dt>
                    <dd className="text-foreground">{order.client?.telephone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Adresse de livraison</dt>
                    <dd className="text-foreground">{order.adresse_livraison || "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Horaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Commande passée</dt>
                    <dd>{formatDateTimeFr(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Commande livrée</dt>
                    <dd>{formatDateTimeFr(order.livree_at)}</dd>
                  </div>
                </dl>
                {order.timeline?.commande?.length ? (
                  <EventTimeline steps={order.timeline.commande} title="Étapes commande" />
                ) : null}
                {(order.livraisons ?? []).map((liv) => (
                  <EventTimeline
                    key={liv.id}
                    steps={liv.timeline}
                    title={`Livraison ${liv.id.slice(0, 8)}`}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderAmountBreakdown
                  sousTotal={Number(order.sous_total ?? 0)}
                  fraisLivraison={Number(order.frais_livraison_total ?? 0)}
                  remise={Number(order.remise_totale ?? 0)}
                  total={Number(order.total)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
