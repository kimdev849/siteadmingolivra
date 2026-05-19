import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateFr, formatStatutLabel } from "@/lib/admin-api";
import { fetchMyLogisticsCompany } from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/profil")({
  component: EntrepriseProfilPage,
});

function EntrepriseProfilPage() {
  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const company = companyQuery.data;
  const statut = company?.statut_moderation || company?.statut;

  return (
    <div>
      <PageHeader title="Mon entreprise" description="Informations de votre société de livraison" />

      {companyQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : company ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Entreprise</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{company.nom}</dd>
                </div>
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
                  <dt className="text-xs text-muted-foreground">Inscription</dt>
                  <dd>{formatDateFr(company.created_at)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Responsable (vous)</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{company.gestionnaire?.nom || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">E-mail de connexion</dt>
                  <dd className="font-medium">{company.gestionnaire?.email || "—"}</dd>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cet e-mail sert à vous connecter sur golivrasiteadmin.onrender.com/login.
                  </p>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Téléphone</dt>
                  <dd>{company.gestionnaire?.telephone || "—"}</dd>
                </div>
                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link to="/entreprise/mot-de-passe">Changer mon mot de passe</Link>
                </Button>
              </dl>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-destructive">Impossible de charger les informations.</p>
      )}
    </div>
  );
}
