import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateCourierForm } from "@/components/entreprise/CreateCourierForm";
import { useQuery } from "@tanstack/react-query";
import { fetchMyLogisticsCompany } from "@/lib/logistics-api";
import { formatStatutLabel } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/entreprise/livreurs/nouveau")({
  component: NouveauLivreurPage,
});

function NouveauLivreurPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ["logistics", "company"],
    queryFn: fetchMyLogisticsCompany,
  });

  const statut = companyQuery.data?.statut_moderation || companyQuery.data?.statut;
  const canManage = statut === "active";

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/entreprise/livreurs">
          <ArrowLeft className="h-4 w-4" /> Retour aux livreurs
        </Link>
      </Button>

      <PageHeader title="Nouveau livreur" description="Compte d'accès à l'application mobile" />

      {!canManage ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Entreprise <Badge variant="secondary">{formatStatutLabel(statut)}</Badge> — création impossible pour
          l&apos;instant.
        </p>
      ) : (
        <Card className="max-w-xl">
          <CardContent className="pt-6">
            <CreateCourierForm
              submitLabel="Créer"
              onCancel={() => void navigate({ to: "/entreprise/livreurs" })}
              onSuccess={async () => {
                await queryClient.invalidateQueries({ queryKey: ["logistics"] });
                await navigate({ to: "/entreprise/livreurs" });
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
