import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Ban, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  activateEnterpriseAdmin,
  fetchEnterpriseAdmin,
  formatDateFr,
  formatStatutLabel,
  formatTypeLabel,
  rejectEnterpriseAdmin,
  suspendEnterpriseAdmin,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/marchands/$id")({
  component: MarchandDetailPage,
});

function MarchandDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "enterprise", id],
    queryFn: () => fetchEnterpriseAdmin(id),
  });

  const enterprise = detailQuery.data;
  const statut = enterprise?.statut_moderation || enterprise?.statut;

  const runAction = async (action: "activate" | "reject" | "suspend") => {
    setError(null);
    setLoading(action);
    try {
      if (action === "activate") await activateEnterpriseAdmin(id);
      else if (action === "reject") await rejectEnterpriseAdmin(id);
      else await suspendEnterpriseAdmin(id);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      await detailQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setLoading(null);
    }
  };

  const productRows = (enterprise?.products ?? []).map((p) => [
    p.nom,
    p.kind === "plat" ? "Plat" : "Article",
    `${Number(p.prix).toLocaleString("fr-FR")} FCFA`,
    p.est_disponible ? "Disponible" : "Indisponible",
  ]);

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/marchands">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </Button>

      <PageHeader
        title={enterprise?.nom || "Détail"}
        description="Informations, produits et actions de modération"
        actions={
          <>
            {statut === "active" ? (
              <Button variant="outline" disabled={!!loading} onClick={() => void runAction("suspend")}>
                {loading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Suspendre
              </Button>
            ) : null}
            {statut === "en_attente" || statut === "suspendue" ? (
              <>
                <Button variant="outline" disabled={!!loading} onClick={() => void runAction("reject")}>
                  {loading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Rejeter
                </Button>
                <Button disabled={!!loading} onClick={() => void runAction("activate")}>
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

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : detailQuery.isError ? (
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error ? detailQuery.error.message : "Commerce introuvable."}
        </p>
      ) : enterprise ? (
        <Tabs defaultValue="infos">
          <TabsList>
            <TabsTrigger value="infos">Infos profil</TabsTrigger>
            <TabsTrigger value="produits">Produits ({enterprise.products?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Informations générales</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    ["Nom", enterprise.nom],
                    ["Type", formatTypeLabel(enterprise.type)],
                    ["Téléphone", enterprise.telephone || "—"],
                    ["Adresse", enterprise.adresse || enterprise.adresse_ligne1 || "—"],
                    [
                      "Statut",
                      <Badge key="st" variant={statut === "active" ? "default" : "secondary"}>
                        {formatStatutLabel(statut)}
                      </Badge>,
                    ],
                    ["Date d'inscription", formatDateFr(enterprise.created_at)],
                    ["Propriétaire", enterprise.proprietaire?.nom || "—"],
                    ["Tél. propriétaire", enterprise.proprietaire?.telephone || "—"],
                    [
                      "Compte propriétaire",
                      enterprise.proprietaire?.est_approuve ? "Approuvé" : "En attente",
                    ],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-sm text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                {enterprise.description ? (
                  <div className="mt-4">
                    <dt className="text-xs font-medium text-muted-foreground">Description</dt>
                    <dd className="mt-1 text-sm text-foreground">{enterprise.description}</dd>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produits" className="mt-4">
            <DataTable
              columns={["Produit", "Catégorie", "Prix", "Statut"]}
              rows={productRows}
              emptyTitle="Aucun produit"
              emptyDescription="Les produits publiés apparaîtront ici."
            />
          </TabsContent>
        </Tabs>
      ) : (
        <Button variant="outline" onClick={() => void navigate({ to: "/admin/marchands" })}>
          Retour à la liste
        </Button>
      )}
    </div>
  );
}
