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
  formatStatutLabel,
  updateLogisticsStatusAdmin,
} from "@/lib/admin-api";

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
                    <span className="block text-xs text-muted-foreground">{company.gestionnaire.telephone}</span>
                  ) : null}
                  {company.gestionnaire?.email ? (
                    <span className="block text-xs text-muted-foreground">{company.gestionnaire.email}</span>
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
      ) : (
        <p className="text-sm text-destructive">Entreprise introuvable.</p>
      )}
    </div>
  );
}
