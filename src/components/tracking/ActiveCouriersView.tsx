import { useEffect, useMemo, useState } from "react";
import { Bike, Clock, Loader2, Package, Phone, RefreshCw, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActiveCourier, ActiveCouriersTracking } from "@/lib/admin-api";
import { ActiveCouriersMap } from "@/components/tracking/ActiveCouriersMap";
import { COURIER_STATUS_LABEL, COURSE_STATUT_LABEL } from "@/components/tracking/courier-status";

function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Number(km).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

const STATUS_STYLE: Record<ActiveCourier["statut"], { dot: string; text: string }> = {
  en_course: { dot: "bg-[#0B6B45]", text: "text-[#0B6B45]" },
  disponible: { dot: "bg-green-500", text: "text-green-600" },
  hors_ligne: { dot: "bg-slate-400", text: "text-muted-foreground" },
};

type StatusFilter = "all" | ActiveCourier["statut"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "en_course", label: "En course" },
  { value: "disponible", label: "Disponibles" },
  { value: "hors_ligne", label: "Hors ligne" },
];

type Props = {
  data: ActiveCouriersTracking | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRefetch: () => void;
  /** Affiche le filtre par entreprise (vue admin globale). */
  showCompany?: boolean;
  title: string;
  description: string;
};

export function ActiveCouriersView({
  data,
  isLoading,
  isFetching,
  error,
  onRefetch,
  showCompany = false,
  title,
  description,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Horloge légère pour afficher « mis à jour il y a X s ».
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  const couriers = useMemo(() => data?.couriers ?? [], [data]); // Entreprises présentes dans la liste (filtre admin).
  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of couriers) {
      if (c.entreprise_id && c.entreprise_nom) map.set(c.entreprise_id, c.entreprise_nom);
    }
    return [...map.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [couriers]);

  // Si l'entreprise filtrée disparaît de la liste, on revient sur « Toutes ».
  useEffect(() => {
    if (companyFilter !== "all" && !companies.some((c) => c.id === companyFilter)) {
      setCompanyFilter("all");
    }
  }, [companies, companyFilter]);

  const filtered = couriers.filter(
    (c) =>
      (statusFilter === "all" || c.statut === statusFilter) &&
      (companyFilter === "all" || c.entreprise_id === companyFilter),
  );

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">Un instant, on cherche vos livreurs…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm font-medium text-destructive">{error.message}</p>
        <Button variant="outline" onClick={onRefetch}>
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  const resume = data?.resume;
  const generatedAt = data?.generated_at ?? null;
  const secondsSince =
    generatedAt && !Number.isNaN(new Date(generatedAt).getTime())
      ? Math.max(0, Math.floor((now - new Date(generatedAt).getTime()) / 1000))
      : null;
  const live = isFetching || (secondsSince != null && secondsSince <= 45);

  const countFor = (value: StatusFilter) => {
    if (value === "all") return couriers.length;
    const key = value === "disponible" ? "disponibles" : value;
    return resume?.[key as keyof typeof resume] ?? 0;
  };

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      {/* Stats live du jour */}
      {stats ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Package className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight text-foreground">
                {stats.livraisons_aujourdhui}
              </p>
              <p className="text-[11px] text-muted-foreground">livraisons aujourd'hui</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <Bike className="h-4.5 w-4.5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight text-foreground">
                {stats.livraisons_terminees}
              </p>
              <p className="text-[11px] text-muted-foreground">terminées</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Timer className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight text-foreground">
                {stats.delai_moyen_minutes != null ? `${stats.delai_moyen_minutes} min` : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">délai moyen</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtres + statut en direct */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <Button
                key={f.value}
                size="sm"
                variant={active ? "default" : "outline"}
                className="h-8 gap-1.5"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {countFor(f.value)}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showCompany && companies.length > 1 ? (
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-8 w-full sm:w-56">
                <SelectValue placeholder="Toutes les entreprises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entreprises</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              live ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                live ? "animate-pulse bg-green-500" : "bg-slate-400",
              )}
            />
            {live ? "En direct" : "En pause"}
          </span>
          {secondsSince != null ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              mis à jour il y a {secondsSince} s
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={onRefetch} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      <ActiveCouriersMap couriers={filtered} />

      {couriers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bike className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Aucun livreur pour le moment</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {showCompany
                ? "Dès qu'une entreprise de livraison crée des livreurs, ils apparaissent ici — avec leur position pendant les courses."
                : "Ajoutez un livreur pour le voir apparaître ici, avec sa position en temps réel pendant ses courses."}
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">Aucun livreur ne correspond à ce filtre</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Essayez un autre statut{showCompany ? " ou une autre entreprise" : ""} pour voir plus
              de monde.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {filtered.map((c) => {
            const st = STATUS_STYLE[c.statut] ?? STATUS_STYLE.hors_ligne;
            const dist = formatDistance(c.distance_km_restant);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <span
                  className={cn(
                    "relative flex h-3 w-3 shrink-0 rounded-full",
                    st.dot,
                    c.statut === "en_course" && "animate-pulse",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{c.nom}</p>
                    <span className={cn("text-xs font-medium", st.text)}>
                      {COURIER_STATUS_LABEL[c.statut]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[c.type_vehicule, showCompany ? c.entreprise_nom : null, c.telephone]
                      .filter(Boolean)
                      .join(" · ") || "Livreur GoLivra"}
                  </p>
                  {c.course ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant="secondary" className="gap-1 font-medium">
                        <Bike className="h-3 w-3" />
                        {c.course.reference}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {COURSE_STATUT_LABEL[c.course.statut] ?? c.course.statut}
                      </span>
                      {dist ? (
                        <span className="text-xs font-semibold text-[#0B6B45]">
                          à ~{dist} du destinataire
                        </span>
                      ) : null}
                    </div>
                  ) : c.position_age_min != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Position partagée il y a {c.position_age_min} min
                    </p>
                  ) : null}
                </div>
                {c.telephone ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title={`Appeler ${c.nom}`}
                    onClick={() => window.open(`tel:${c.telephone}`, "_self")}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
