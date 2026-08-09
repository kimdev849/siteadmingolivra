import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BellRing,
  Loader2,
  Megaphone,
  Power,
  Settings2,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchAdminSettings, updateAdminSettings } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/controle")({
  component: AdminControlePage,
});

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}

function AdminControlePage() {
  const qc = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
  });
  const s = settingsQuery.data;

  // État local des interrupteurs (initialisé depuis les settings)
  const [appEnabled, setAppEnabled] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [betaMode, setBetaMode] = useState(false);
  const [betaPhones, setBetaPhones] = useState("");
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [minVersion, setMinVersion] = useState("1.0.0");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!s) return;
    setAppEnabled(bool(s.golivra_app_enabled?.valeur));
    setMaintenance(bool(s.golivra_maintenance_mode?.valeur));
    setBetaMode(bool(s.golivra_beta_mode?.valeur));
    setBetaPhones(String(s.golivra_beta_phones?.valeur ?? ""));
    setOrdersEnabled(bool(s.golivra_orders_enabled?.valeur));
    setPaymentsEnabled(bool(s.golivra_payments_enabled?.valeur));
    setDeliveryEnabled(bool(s.golivra_delivery_enabled?.valeur));
    setMinVersion(String(s.golivra_min_app_version?.valeur ?? "1.0.0"));
    setAnnouncement(String(s.golivra_announcement?.valeur ?? ""));
  }, [s]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminSettings({
        golivra_app_enabled: appEnabled,
        golivra_maintenance_mode: maintenance,
        golivra_beta_mode: betaMode,
        golivra_beta_phones: betaPhones.trim(),
        golivra_orders_enabled: ordersEnabled,
        golivra_payments_enabled: paymentsEnabled,
        golivra_delivery_enabled: deliveryEnabled,
        golivra_min_app_version: minVersion.trim() || "1.0.0",
        golivra_announcement: announcement.trim(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  const isLoading = settingsQuery.isLoading;
  const isSaving = saveMutation.isPending;

  // États globaux calculés
  const appOnline = appEnabled && !maintenance;
  const statusDot = appEnabled ? (maintenance ? "bg-amber-500" : "bg-emerald-500") : "bg-red-500";

  const controls: {
    id: string;
    label: string;
    description: string;
    value: boolean;
    set: (v: boolean) => void;
    icon: React.ComponentType<{ className?: string }>;
    danger?: boolean;
  }[] = [
    {
      id: "kill",
      label: "Kill switch (application coupée)",
      description:
        "Désactive instantanément toute l'application : plus personne ne peut utiliser GoLivra. L'admin reste accessible.",
      value: appEnabled,
      set: setAppEnabled,
      icon: Power,
      danger: !appEnabled,
    },
    {
      id: "maint",
      label: "Mode maintenance",
      description:
        "Affiche « GoLivra est temporairement indisponible » aux utilisateurs. Pratique pendant les tests.",
      value: maintenance,
      set: setMaintenance,
      icon: Settings2,
    },
    {
      id: "beta",
      label: "Bêta fermée (accès restreint)",
      description:
        "Seuls les téléphones listés ci-dessous peuvent utiliser l'application. Les autres voient un écran d'accès refusé.",
      value: betaMode,
      set: setBetaMode,
      icon: ShieldCheck,
    },
    {
      id: "orders",
      label: "Commandes",
      description: "Active ou coupe la passation de commandes côté client.",
      value: ordersEnabled,
      set: setOrdersEnabled,
      icon: ShoppingCart,
    },
    {
      id: "payments",
      label: "Paiements",
      description: "Active ou coupe les paiements en ligne (PawaPay, wallet…).",
      value: paymentsEnabled,
      set: setPaymentsEnabled,
      icon: Wallet,
    },
    {
      id: "delivery",
      label: "Livraisons",
      description: "Active ou coupe les livraisons (livreurs + entreprises de livraison).",
      value: deliveryEnabled,
      set: setDeliveryEnabled,
      icon: Truck,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Contrôle de l'application"
        description="Interrupteurs à distance : coupez l'app, forcez une mise à jour, ou désactivez une fonctionnalité sans republier l'APK."
      />

      {settingsQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les paramètres. Vérifiez que sql/amendments-app-control.sql a bien
            été exécuté en base.
          </AlertDescription>
        </Alert>
      )}

      {/* Bandeau d'état global */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className={cn("relative flex h-3 w-3")}>
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                  statusDot,
                )}
              />
              <span className={cn("relative inline-flex h-3 w-3 rounded-full", statusDot)} />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {appEnabled ? (maintenance ? "En maintenance" : "En ligne") : "Application coupée"}
              </p>
              <p className="text-xs text-muted-foreground">
                {appOnline
                  ? "L'application fonctionne normalement pour tous les utilisateurs."
                  : appEnabled
                    ? "Les utilisateurs voient l'écran de maintenance."
                    : "Kill switch activé : l'application est inaccessible."}
              </p>
            </div>
          </div>
          <AlertTriangle
            className={cn("h-8 w-8", appOnline ? "text-muted-foreground/30" : "text-amber-500")}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Interrupteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Interrupteurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {controls.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <c.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Label htmlFor={c.id} className="text-sm font-medium">
                      {c.label}
                    </Label>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                </div>
                <Switch
                  id={c.id}
                  checked={c.value}
                  onCheckedChange={c.set}
                  disabled={isLoading}
                  className={c.danger ? "data-[state=checked]:bg-destructive" : undefined}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Version minimale + bêta + annonce */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Ban className="h-4 w-4" /> Version minimale (force la mise à jour)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="minver">Version minimale acceptée</Label>
                <Input
                  id="minver"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="Ex. 1.1.0"
                  className="mt-1 font-mono"
                  disabled={isLoading}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Les utilisateurs dont la version est <strong>inférieure</strong> verront l'écran «
                  Nouvelle version disponible » et devront installer le nouvel APK.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Téléphones autorisés (bêta fermée)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="betaphones">Téléphones autorisés (séparés par des virgules)</Label>
                <Input
                  id="betaphones"
                  value={betaPhones}
                  onChange={(e) => setBetaPhones(e.target.value)}
                  placeholder="Ex. +242067811462, +242066123456"
                  className="mt-1"
                  disabled={isLoading}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Actif uniquement si « Bêta fermée » est activé.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="h-4 w-4" /> Annonce affichée dans l'app
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="announce">Message (bannière)</Label>
                <Input
                  id="announce"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Ex. 🎉 Lancement de GoLivra à Brazzaville !"
                  className="mt-1"
                  disabled={isLoading}
                />
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BellRing className="h-3 w-3" /> Affiché en haut de l'application pour tous les
                  utilisateurs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={isSaving || isLoading}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement…
          </>
        ) : (
          "Enregistrer le contrôle"
        )}
      </Button>
      {saveMutation.isSuccess && (
        <p className="mt-2 text-sm text-emerald-600">
          ✓ Contrôle enregistré — appliqué immédiatement à l'application.
        </p>
      )}
    </div>
  );
}
