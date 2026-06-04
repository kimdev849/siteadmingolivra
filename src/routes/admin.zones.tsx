import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAdminZonesBoard,
  updateAdminZonesBoard,
  type AdminArrondissement,
  type AdminZone,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/zones")({
  component: ZonesTarifsPage,
});

const UNASSIGNED_ZONE = "__none__";

type ZoneDraft = { price_base: string; is_active: boolean };
type AssignmentDraft = Record<string, string>;

function ZonesTarifsPage() {
  const qc = useQueryClient();
  const boardQuery = useQuery({
    queryKey: ["admin", "zones"],
    queryFn: fetchAdminZonesBoard,
  });

  const [zoneDrafts, setZoneDrafts] = useState<Record<string, ZoneDraft>>({});
  const [assignments, setAssignments] = useState<AssignmentDraft>({});
  const [saved, setSaved] = useState(false);

  const zones = boardQuery.data?.zones ?? [];
  const arrondissements = boardQuery.data?.arrondissements ?? [];

  useEffect(() => {
    if (!boardQuery.data) return;
    const zd: Record<string, ZoneDraft> = {};
    for (const z of boardQuery.data.zones) {
      zd[z.id] = { price_base: String(z.price_base), is_active: z.is_active };
    }
    setZoneDrafts(zd);
    const ad: AssignmentDraft = {};
    for (const a of boardQuery.data.arrondissements) {
      ad[a.id] = a.zone_id ?? UNASSIGNED_ZONE;
    }
    setAssignments(ad);
  }, [boardQuery.data]);

  const activeZones = useMemo(() => zones.filter((z) => zoneDrafts[z.id]?.is_active !== false), [zones, zoneDrafts]);
  const unassignedCount = useMemo(
    () =>
      arrondissements.filter((a) => {
        const v = assignments[a.id] ?? a.zone_id ?? UNASSIGNED_ZONE;
        return v === UNASSIGNED_ZONE || !v;
      }).length,
    [arrondissements, assignments],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminZonesBoard({
        zones: zones.map((z) => ({
          id: z.id,
          price_base: Number(zoneDrafts[z.id]?.price_base ?? z.price_base),
          is_active: zoneDrafts[z.id]?.is_active ?? z.is_active,
        })),
        assignments: arrondissements.map((a) => {
          const raw = assignments[a.id] ?? a.zone_id ?? UNASSIGNED_ZONE;
          return {
            arrondissement_id: a.id,
            zone_id: raw === UNASSIGNED_ZONE || !raw ? null : raw,
          };
        }),
      }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ["admin", "zones"] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div>
      <PageHeader
        title="Zones de livraison"
        description="Définissez les tarifs des zones A à E, puis rattachez chaque arrondissement à une zone. Rien n’est pré-configuré en base."
      />

      {boardQuery.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les zones. Exécutez{" "}
            <code className="text-xs">sql/amendments-delivery-zones.sql</code> sur Supabase puis redéployez le backend.
          </AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-4 border-primary/30 bg-primary/5">
          <AlertDescription>Tarifs et zones enregistrés.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tarifs par zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {boardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              zones.map((z) => (
                <ZonePriceRow
                  key={z.id}
                  zone={z}
                  draft={zoneDrafts[z.id]}
                  onChange={(patch) =>
                    setZoneDrafts((prev) => ({
                      ...prev,
                      [z.id]: {
                        price_base: prev[z.id]?.price_base ?? String(z.price_base),
                        is_active: prev[z.id]?.is_active ?? z.is_active,
                        ...patch,
                      },
                    }))
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" />
              Arrondissements → zone
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {boardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              arrondissements.map((a) => (
                <ArrondissementRow
                  key={a.id}
                  row={a}
                  zones={zones}
                  zoneId={assignments[a.id] ?? a.zone_id ?? UNASSIGNED_ZONE}
                  onZoneChange={(zoneId) => setAssignments((prev) => ({ ...prev, [a.id]: zoneId }))}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {activeZones.length} zone(s) active(s) · {unassignedCount} arrondissement(s) sans zone.
        {unassignedCount > 0
          ? " Tant qu’un arrondissement n’est pas assigné, le tarif plateforme par défaut s’applique au panier."
          : null}{" "}
        Chaque changement de prix est historisé dans <code>zone_price_history</code>.
      </p>

      <Button className="mt-4" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || boardQuery.isLoading}>
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sauvegarder
      </Button>
    </div>
  );
}

function ZonePriceRow({
  zone,
  draft,
  onChange,
}: {
  zone: AdminZone;
  draft?: ZoneDraft;
  onChange: (patch: Partial<ZoneDraft>) => void;
}) {
  const price = draft?.price_base ?? String(zone.price_base);
  const active = draft?.is_active ?? zone.is_active;

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="min-w-[120px] flex-1">
        <Label className="text-xs text-muted-foreground">Zone {zone.name}</Label>
        <p className="text-sm font-medium">{zone.label}</p>
      </div>
      <div className="w-32 space-y-1">
        <Label htmlFor={`price-${zone.id}`}>Prix (FCFA)</Label>
        <Input
          id={`price-${zone.id}`}
          type="number"
          min={0}
          step={50}
          placeholder="Ex. 1500"
          value={price}
          onChange={(e) => onChange({ price_base: e.target.value })}
        />
        {Number(price) <= 0 ? (
          <p className="text-[11px] text-muted-foreground">Tarif non appliqué tant que le prix est à 0.</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pb-2">
        <Switch id={`active-${zone.id}`} checked={active} onCheckedChange={(v) => onChange({ is_active: v })} />
        <Label htmlFor={`active-${zone.id}`} className="text-sm font-normal">
          Active
        </Label>
      </div>
    </div>
  );
}

function ArrondissementRow({
  row,
  zones,
  zoneId,
  onZoneChange,
}: {
  row: AdminArrondissement;
  zones: AdminZone[];
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
}) {
  const assigned = zoneId !== UNASSIGNED_ZONE;

  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm font-medium ${!assigned ? "text-muted-foreground" : ""}`}>{row.name}</span>
      <Select value={zoneId || UNASSIGNED_ZONE} onValueChange={onZoneChange}>
        <SelectTrigger className="w-[168px]">
          <SelectValue placeholder="Choisir une zone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_ZONE}>— Non assigné —</SelectItem>
          {zones.map((z) => (
            <SelectItem key={z.id} value={z.id}>
              Zone {z.name}
              {z.price_base > 0 ? ` · ${z.price_base.toLocaleString("fr-FR")} F` : " · prix à définir"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
