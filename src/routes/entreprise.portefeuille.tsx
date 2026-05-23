import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, ArrowDownToLine } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchMyWallet, requestMyWithdrawal } from "@/lib/logistics-api";
import { formatDateFr } from "@/lib/admin-api";

export const Route = createFileRoute("/entreprise/portefeuille")({
  component: EntreprisePortefeuillePage,
});

function EntreprisePortefeuillePage() {
  const qc = useQueryClient();
  const [montant, setMontant] = useState("");
  const [numero, setNumero] = useState("");
  const [methode, setMethode] = useState("airtel_money");

  const query = useQuery({ queryKey: ["logistics", "wallet"], queryFn: fetchMyWallet });

  const retrait = useMutation({
    mutationFn: () =>
      requestMyWithdrawal({
        montant: Number(montant),
        methode,
        numero_compte: numero,
      }),
    onSuccess: () => {
      setMontant("");
      void qc.invalidateQueries({ queryKey: ["logistics", "wallet"] });
    },
  });

  const w = query.data;

  return (
    <div>
      <PageHeader
        title="Portefeuille"
        description="Revenus livraison (part entreprise) — retrait vers Mobile Money"
      />

      <KpiCard
        label="Solde disponible"
        icon={Wallet}
        value={w ? `${Number(w.solde_fcfa).toLocaleString("fr-FR")} FCFA` : undefined}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" /> Demander un retrait
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Montant (FCFA)"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              type="number"
            />
            <Input
              placeholder="Numéro Airtel / MTN"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant={methode === "airtel_money" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethode("airtel_money")}
              >
                Airtel
              </Button>
              <Button
                type="button"
                variant={methode === "mtn_money" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethode("mtn_money")}
              >
                MTN
              </Button>
            </div>
            <Button
              className="w-full"
              disabled={retrait.isPending || !montant || !numero}
              onClick={() => retrait.mutate()}
            >
              Envoyer la demande
            </Button>
            <p className="text-xs text-muted-foreground">
              Validation par GoLivra sous 1–3 jours. Minimum 1 000 FCFA.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {(w?.transactions ?? []).map((t) => (
              <div key={t.id} className="flex justify-between text-sm border-b border-border py-2">
                <span>{t.description || t.type}</span>
                <span className={t.type === "debit" ? "text-red-600" : "text-emerald-700"}>
                  {t.type === "debit" ? "-" : "+"}
                  {Number(t.montant).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Mes demandes de retrait</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(w?.retraits ?? []).map((r) => (
            <div key={r.id} className="flex justify-between items-center text-sm py-2 border-b">
              <span>
                {Number(r.montant).toLocaleString("fr-FR")} FCFA — {formatDateFr(r.created_at)}
              </span>
              <Badge variant="secondary">{r.statut}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
