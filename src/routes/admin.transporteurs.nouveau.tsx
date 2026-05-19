import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreateLogisticsCompanyForm,
  type LogisticsCompanyCredentials,
} from "@/components/admin/CreateLogisticsCompanyForm";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/admin/transporteurs/nouveau")({
  component: NouvelleEntrepriseLogistiquePage,
});

function NouvelleEntrepriseLogistiquePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState<LogisticsCompanyCredentials | null>(null);

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/admin/transporteurs">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
      </Button>

      <PageHeader
        title="Créer une entreprise"
        description="Entreprise de livraison et compte responsable"
      />

      {credentials ? (
        <Alert className="mb-6 max-w-2xl border-primary/30 bg-primary/5">
          <AlertDescription className="space-y-2 text-sm">
            <p className="font-semibold text-foreground">
              Entreprise « {credentials.nomEntreprise} » créée — transmettez ces identifiants au responsable :
            </p>
            <p>
              <span className="text-muted-foreground">Connexion :</span>{" "}
              <a
                href="https://golivrasiteadmin.onrender.com/login"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                golivrasiteadmin.onrender.com/login
              </a>
            </p>
            <p>
              <span className="text-muted-foreground">E-mail responsable :</span>{" "}
              <strong>{credentials.email}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Mot de passe :</span>{" "}
              <strong>{credentials.motDePasse}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Ce n&apos;est pas l&apos;e-mail de contact de l&apos;entreprise. Le responsable gère ensuite ses
              livreurs et livraisons depuis l&apos;espace entreprise.
            </p>
            <Button
              className="mt-2"
              onClick={() => {
                setCredentials(null);
                void navigate({ to: "/admin/transporteurs" });
              }}
            >
              Retour à la liste
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!credentials ? (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <CreateLogisticsCompanyForm
            submitLabel="Créer"
            onCancel={() => void navigate({ to: "/admin/transporteurs" })}
            onSuccess={async (creds) => {
              await queryClient.invalidateQueries({ queryKey: ["admin", "logistics"] });
              setCredentials(creds);
            }}
          />
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
