import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchAdminSettings, updateAdminSettings } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/parametres")({
  component: ParametresPage,
});

function numVal(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ParametresPage() {
  const qc = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
  });

  const [commissionPct, setCommissionPct] = useState("0");
  const [fraisBase, setFraisBase] = useState("500");
  const [rayonKm, setRayonKm] = useState("10");
  const [platformName, setPlatformName] = useState("GoLivra");
  const [supportEmail, setSupportEmail] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setCommissionPct(String(numVal(s.platform_fee_percent?.valeur ?? s.commission_marketplace_defaut_pct?.valeur, 0)));
    setFraisBase(String(numVal(s.frais_livraison_base_fcfa?.valeur, 500)));
    setRayonKm(String(numVal(s.rayon_livraison_defaut_km?.valeur, 10)));
    setPlatformName(String(s.golivra_platform_name?.valeur ?? "GoLivra"));
    setSupportEmail(String(s.golivra_support_email?.valeur ?? ""));
    setMaintenance(Boolean(s.golivra_maintenance_mode?.valeur));
    setSignupsOpen(s.golivra_signups_open?.valeur !== false);
    setEmailNotif(s.golivra_email_notifications?.valeur !== false);
    setSmsNotif(s.golivra_sms_notifications?.valeur !== false);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminSettings({
        platform_fee_percent: numVal(commissionPct),
        frais_livraison_base_fcfa: numVal(fraisBase),
        rayon_livraison_defaut_km: numVal(rayonKm),
        golivra_platform_name: platformName.trim() || "GoLivra",
        golivra_support_email: supportEmail.trim(),
        golivra_maintenance_mode: maintenance,
        golivra_signups_open: signupsOpen,
        golivra_email_notifications: emailNotif,
        golivra_sms_notifications: smsNotif,
      }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div>
      <PageHeader title="Paramètres" description="Configuration de la plateforme (enregistrée en base)" />

      {settingsQuery.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les paramètres. Déployez le backend à jour et exécutez sql/amendments-features-v5.sql.
          </AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-4 border-primary/30 bg-primary/5">
          <AlertDescription>Paramètres enregistrés.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Commissions & livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comm">Commission plateforme sur ventes (%)</Label>
              <Input
                id="comm"
                type="number"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                disabled={settingsQuery.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frais">Frais de livraison de base (FCFA)</Label>
              <Input
                id="frais"
                type="number"
                value={fraisBase}
                onChange={(e) => setFraisBase(e.target.value)}
                disabled={settingsQuery.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rayon">Rayon de livraison max (km)</Label>
              <Input
                id="rayon"
                type="number"
                value={rayonKm}
                onChange={(e) => setRayonKm(e.target.value)}
                disabled={settingsQuery.isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Paramètres système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la plateforme</Label>
              <Input
                id="name"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                disabled={settingsQuery.isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">E-mail de support</Label>
              <Input
                id="support"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={settingsQuery.isLoading}
              />
            </div>
            <Separator />
            {[
              { id: "maint", label: "Mode maintenance", value: maintenance, set: setMaintenance },
              { id: "signup", label: "Inscriptions ouvertes", value: signupsOpen, set: setSignupsOpen },
              { id: "notif-email", label: "Notifications e-mail", value: emailNotif, set: setEmailNotif },
              { id: "notif-sms", label: "Notifications SMS", value: smsNotif, set: setSmsNotif },
            ].map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <Label htmlFor={s.id} className="text-sm font-normal">
                  {s.label}
                </Label>
                <Switch id={s.id} checked={s.value} onCheckedChange={s.set} disabled={settingsQuery.isLoading} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || settingsQuery.isLoading}
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </div>
  );
}
