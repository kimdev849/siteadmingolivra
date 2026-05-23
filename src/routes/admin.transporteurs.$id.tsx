import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchAdminLogisticsDetail,
  formatDateFr,
  formatDateTimeFr,
  formatStatutLabel,
  updateLogisticsStatusAdmin,
  type AdminDelivery,
} from "@/lib/admin-api";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { LogisticsStatsPanel } from "@/components/admin/LogisticsStatsPanel";

export const Route = createFileRoute("/admin/transporteurs/$id")({
  component: TransporteurDetailPage,
});

function TransporteurDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "logistics", id],
    queryFn: () => fetchAdminLogisticsDetail(id),
  });

  const company = detailQuery.data;
  const statut = company?.statut_moderation || company?.statut;

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

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/transporteurs">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={company?.nom || "Détail"}
        description="Validation plateforme — la gestion des livreurs est assurée par l'entreprise"
        actions={
          <>
            {statut === "active" ? (
              <Button variant="outline" disabled={!!loading} onClick={() => void run("suspend")}>
                {loading === "suspend" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
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
        {company.stats ? (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Statistiques entreprise</h2>
            <LogisticsStatsPanel stats={company.stats} />
          </div>
        ) : null}
        <Card>
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
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd>{company.telephone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">E-mail</dt>
                <dd>{company.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsable</dt>
                <dd>
                  {company.gestionnaire?.nom || "—"}
                  {company.gestionnaire?.telephone ? (
                    <span className="block text-xs text-muted-foreground">
                      {company.gestionnaire.telephone}
                    </span>
                  ) : null}
                  {company.gestionnaire?.email ? (
                    <span className="block text-xs text-muted-foreground">
                      {company.gestionnaire.email}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Livreurs</dt>
                <dd>{company.nb_livreurs ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Inscription</dt>
                <dd>{formatDateFr(company.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

      {company.resume_livraisons ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Courses en cours</p>
              <p className="text-2xl font-bold">{company.resume_livraisons.en_cours}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">En retard</p>
              <p className="text-2xl font-bold text-destructive">{company.resume_livraisons.en_retard}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Livreurs</p>
              <p className="text-2xl font-bold">{company.nb_livreurs ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {company?.livreurs?.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Livreurs ({company.livreurs.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Nom</th>
                  <th className="pb-2 pr-4">Téléphone</th>
                  <th className="pb-2 pr-4">Véhicule</th>
                  <th className="pb-2 pr-4">Dispo</th>
                  <th className="pb-2">Livraisons</th>
                </tr>
              </thead>
              <tbody>
                {company.livreurs.map((l) => (
                  <tr key={l.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{l.utilisateur?.nom || "—"}</td>
                    <td className="py-2 pr-4">{l.utilisateur?.telephone || "—"}</td>
                    <td className="py-2 pr-4 capitalize">{l.type_vehicule || "—"}</td>
                    <td className="py-2 pr-4">{l.est_disponible ? "Oui" : "Non"}</td>
                    <td className="py-2">
                      {l.nb_livraisons_reussies ?? 0} / {l.nb_livraisons_total ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {company?.livraisons_recentes?.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Livraisons récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(company.livraisons_recentes as AdminDelivery[]).map((liv) => (
              <div key={liv.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{liv.type_livraison === "externe" ? "Externe" : "Commande"}</Badge>
                  <Badge variant={liv.en_retard ? "destructive" : "secondary"}>{formatStatutLabel(liv.statut)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Créée {formatDateTimeFr(liv.created_at)}
                    {liv.livree_at ? ` · Terminée ${formatDateTimeFr(liv.livree_at)}` : ""}
                  </span>
                </div>
                {liv.timeline?.length ? <EventTimeline steps={liv.timeline} /> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
        </>
      ) : (
        <p className="text-sm text-destructive">Entreprise introuvable.</p>
      )}
    </div>
  );
}
