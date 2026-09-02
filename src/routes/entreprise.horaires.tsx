import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Clock, Save, RotateCcw, CheckCircle2, AlertCircle, Loader2, Store } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchMyEnterprises, fetchHoraires, saveHoraires, type HorairesEntry } from "@/lib/commerce-api";

export const Route = createFileRoute("/entreprise/horaires")({
  component: EntrepriseHorairesPage,
});

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type DayState = {
  jour: number;
  ouvert: boolean;
  ouverture: string;
  fermeture: string;
};

function defaultDays(): DayState[] {
  return DAY_NAMES.map((_, jour) => ({
    jour,
    ouvert: true,
    ouverture: "09:00",
    fermeture: "22:00",
  }));
}

function timeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
}

const TIME_OPTS = timeOptions();

function EntrepriseHorairesPage() {
  const queryClient = useQueryClient();
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>("");
  const [days, setDays] = useState<DayState[]>(defaultDays());
  const [hasChanges, setHasChanges] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch user's enterprises
  const enterprisesQuery = useQuery({
    queryKey: ["my-enterprises"],
    queryFn: fetchMyEnterprises,
  });

  const enterprises = enterprisesQuery.data ?? [];

  // Auto-select first enterprise
  useEffect(() => {
    if (enterprises.length > 0 && !selectedEnterprise) {
      setSelectedEnterprise(enterprises[0].id);
    }
  }, [enterprises, selectedEnterprise]);

  // Fetch horaires for selected enterprise
  const horairesQuery = useQuery({
    queryKey: ["horaires", selectedEnterprise],
    queryFn: () => fetchHoraires(selectedEnterprise),
    enabled: !!selectedEnterprise,
  });

  // Load horaires into local state
  useEffect(() => {
    if (!horairesQuery.data) return;
    const fetched = horairesQuery.data;
    const next = defaultDays();
    for (const h of fetched) {
      const day = next.find((d) => d.jour === h.jour);
      if (day) {
        day.ouvert = true;
        day.ouverture = h.ouverture?.slice(0, 5) ?? "09:00";
        day.fermeture = h.fermeture?.slice(0, 5) ?? "22:00";
      }
    }
    // Mark days without horaires as closed
    for (const day of next) {
      if (!fetched.some((h) => h.jour === day.jour)) {
        day.ouvert = false;
      }
    }
    setDays(next);
    setHasChanges(false);
  }, [horairesQuery.data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows: HorairesEntry[] = days
        .filter((d) => d.ouvert)
        .map((d) => ({
          jour: d.jour,
          ouverture: d.ouverture + ":00",
          fermeture: d.fermeture + ":00",
        }));
      return saveHoraires(selectedEnterprise, rows);
    },
    onSuccess: () => {
      setHasChanges(false);
      setFeedback({ type: "success", message: "Horaires enregistrés avec succès." });
      queryClient.invalidateQueries({ queryKey: ["horaires", selectedEnterprise] });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message || "Erreur lors de l'enregistrement." });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const updateDay = useCallback((jour: number, patch: Partial<DayState>) => {
    setDays((prev) => prev.map((d) => (d.jour === jour ? { ...d, ...patch } : d)));
    setHasChanges(true);
  }, []);

  const resetDays = useCallback(() => {
    if (horairesQuery.data) {
      // Re-trigger the useEffect by refetching
      horairesQuery.refetch();
    }
  }, [horairesQuery]);

  const openCount = days.filter((d) => d.ouvert).length;
  const ent = enterprises.find((e) => e.id === selectedEnterprise);

  return (
    <div>
      <PageHeader
        title="Horaires d'ouverture"
        description="Gérez les horaires de votre commerce. Les clients ne pourront commander que pendant ces créneaux."
      />

      {/* Enterprise selector */}
      {enterprises.length > 1 && (
        <div className="mb-4">
          <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
            <SelectTrigger className="w-full max-w-sm">
              <Store className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Choisir un commerce" />
            </SelectTrigger>
            <SelectContent>
              {enterprises.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nom} ({e.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {            feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Loading */}
      {enterprisesQuery.isLoading || horairesQuery.isLoading ? (
        <div className="flex items-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm">Chargement des horaires…</p>
        </div>
      ) : enterprises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun commerce associé à votre compte.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status summary */}
          <Card className="mb-4">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">
                    {openCount > 0
                      ? `${openCount} jour${openCount > 1 ? "s" : ""} d'ouverture`
                      : "Tout est fermé"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ent?.nom || "Commerce"}
                  </p>
                </div>
              </div>
              <Badge variant={openCount > 0 ? "default" : "destructive"}>
                {openCount > 0 ? "Actif" : "Fermé"}
              </Badge>
            </CardContent>
          </Card>

          {/* Days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Jours de la semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {days.map((day) => (
                  <div
                    key={day.jour}
                    className={`flex items-center gap-4 rounded-lg border p-3 transition-colors ${
                      day.ouvert
                        ? "border-border bg-card"
                        : "border-border/50 bg-muted/30 opacity-60"
                    }`}
                  >
                    {/* Toggle */}
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-semibold">{DAY_NAMES[day.jour]}</p>
                    </div>

                    <Switch
                      checked={day.ouvert}
                      onCheckedChange={(v) => updateDay(day.jour, { ouvert: v })}
                    />

                    {/* Time selectors */}
                    {day.ouvert ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Select
                          value={day.ouverture}
                          onValueChange={(v) => updateDay(day.jour, { ouverture: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-sm text-muted-foreground">à</span>

                        <Select
                          value={day.fermeture}
                          onValueChange={(v) => updateDay(day.jour, { fermeture: v })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="flex-1 text-sm italic text-muted-foreground">Fermé</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
            <Button
              variant="outline"
              onClick={resetDays}
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
