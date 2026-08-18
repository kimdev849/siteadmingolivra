import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Globe, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchAdminZonesBoard,
  updateAdminZonesBoard,
  createAdminArrondissement,
  deleteAdminArrondissement,
  type AdminZone,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/zones")({
  component: ZonesTarifsPage,
});

const UNASSIGNED_ZONE = "__none__";

/** Référence stable partagée : évite que `?? []` recrée un tableau à chaque
 * rendu (et donc des dépendances de useMemo/useEffect instables). */
const NO_DATA: never[] = [];

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
  const [expandedPays, setExpandedPays] = useState<Record<string, boolean>>({});
  const [expandedVilles, setExpandedVilles] = useState<Record<string, boolean>>({});
  // Nouvel arrondissement
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addVilleId, setAddVilleId] = useState<string | null>(null);
  const [addVilleNom, setAddVilleNom] = useState("");
  const [newArrondissementName, setNewArrondissementName] = useState("");

  const zones = boardQuery.data?.zones ?? NO_DATA;
  const pays = boardQuery.data?.pays ?? NO_DATA;
  const unlinked = boardQuery.data?.arrondissements_unlinked ?? NO_DATA;

  // Initialiser les assignations
  useEffect(() => {
    if (!boardQuery.data) return;
    const zd: Record<string, ZoneDraft> = {};
    for (const z of boardQuery.data.zones) {
      zd[z.id] = { price_base: String(z.price_base), is_active: z.is_active };
    }
    setZoneDrafts(zd);

    const ad: AssignmentDraft = {};
    for (const p of boardQuery.data.pays) {
      for (const v of p.villes) {
        for (const a of v.arrondissements) {
          ad[a.id] = a.zone_id ?? UNASSIGNED_ZONE;
        }
      }
    }
    for (const a of boardQuery.data.arrondissements_unlinked) {
      ad[a.id] = a.zone_id ?? UNASSIGNED_ZONE;
    }
    setAssignments(ad);
  }, [boardQuery.data]);

  // Désactiver unlinked au premier rendu
  useEffect(() => {
    if (pays.length > 0) {
      const first = pays[0];
      setExpandedPays((prev) => ({ ...prev, [first.id]: true }));
    }
  }, [pays]);

  const togglePays = (id: string) => setExpandedPays((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleVille = (id: string) => setExpandedVilles((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalArrondissements = useMemo(() => {
    let count = 0;
    for (const p of pays) for (const v of p.villes) count += v.arrondissements.length;
    return count + unlinked.length;
  }, [pays, unlinked]);

  const unassignedCount = useMemo(() => {
    return Object.values(assignments).filter((v) => v === UNASSIGNED_ZONE).length;
  }, [assignments]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminZonesBoard({
        zones: zones.map((z) => ({
          id: z.id,
          price_base: Number(zoneDrafts[z.id]?.price_base ?? z.price_base),
          is_active: zoneDrafts[z.id]?.is_active ?? z.is_active,
        })),
        assignments: Object.entries(assignments).map(([arrondissement_id, zoneId]) => ({
          arrondissement_id,
          zone_id: zoneId === UNASSIGNED_ZONE || !zoneId ? null : zoneId,
        })),
      }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ["admin", "zones"] });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createAdminArrondissement({
        ville_id: addVilleId!,
        name: newArrondissementName.trim(),
        zone_id: null,
      }),
    onSuccess: async () => {
      setNewArrondissementName("");
      setAddDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin", "zones"] });
    },
  });

  const [deletingArrId, setDeletingArrId] = useState<string | null>(null);
  const deleteArrMutation = useMutation({
    mutationFn: async (arrId: string) => {
      setDeletingArrId(arrId);
      await deleteAdminArrondissement(arrId);
    },
    onSuccess: () => {
      setDeletingArrId(null);
      qc.invalidateQueries({ queryKey: ["admin", "zones"] });
    },
    onSettled: () => setDeletingArrId(null),
  });

  const activeZones = useMemo(
    () => zones.filter((z) => zoneDrafts[z.id]?.is_active !== false),
    [zones, zoneDrafts],
  );

  // Prix « en direct » d'une zone : reflète immédiatement la saisie dans le
  // panneau « Tarifs par zone », sans attendre la sauvegarde. Utilisé dans le
  // sélecteur de zone des arrondissements.
  const priceOfZone = useCallback(
    (zoneId: string): number => {
      const raw = zoneDrafts[zoneId]?.price_base;
      if (raw === undefined || raw === "") return 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    },
    [zoneDrafts],
  );

  const handleAddClick = (villeId: string, villeNom: string) => {
    setAddVilleId(villeId);
    setAddVilleNom(villeNom);
    setNewArrondissementName("");
    setAddDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Zones de livraison"
        description="Pays → Villes → Arrondissements. Définissez les tarifs des zones, puis rattachez chaque arrondissement à une zone."
      />

      {boardQuery.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les données. Exécutez les migrations SQL sur Supabase puis
            redéployez le backend.
          </AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert className="mb-4 border-primary/30 bg-primary/5">
          <AlertDescription>Tarifs et zones enregistrés.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* CARTE : TARIFS PAR ZONE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tarifs par zone</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-5 overflow-y-auto pr-1">
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

        {/* CARTE : HIÉRARCHIE PAYS → VILLES → ARRONDISSEMENTS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4" />
              Pays → Villes → Arrondissements
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-1 overflow-y-auto pr-1">
            {boardQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : pays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun pays trouvé. Exécutez la migration SQL d'abord.
              </p>
            ) : (
              pays.map((p) => (
                <div key={p.id} className="border-b border-border pb-2 last:border-0">
                  {/* En-tête Pays */}
                  <button
                    type="button"
                    onClick={() => togglePays(p.id)}
                    className="flex w-full items-center gap-2 py-2 text-left font-semibold text-sm hover:text-primary transition-colors"
                  >
                    {expandedPays[p.id] ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {p.nom}
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {p.villes.length} ville(s)
                    </span>
                  </button>

                  {expandedPays[p.id] && (
                    <div className="ml-5 space-y-1 border-l-2 border-border pl-3">
                      {p.villes.map((v) => (
                        <div key={v.id}>
                          {/* En-tête Ville */}
                          <button
                            type="button"
                            onClick={() => toggleVille(v.id)}
                            className="flex w-full items-center gap-2 py-1.5 text-left text-sm font-medium hover:text-primary transition-colors"
                          >
                            {expandedVilles[v.id] ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {v.nom}
                            <span className="ml-auto text-xs text-muted-foreground font-normal">
                              {v.arrondissements.length}
                            </span>
                          </button>

                          {expandedVilles[v.id] && (
                            <div className="ml-5 space-y-2 py-1">
                              {v.arrondissements.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  Aucun arrondissement. Ajoutez-en un ci-dessous.
                                </p>
                              )}
                              {v.arrondissements.map((a) => (
                                <ArrondissementRow
                                  key={a.id}
                                  name={a.name}
                                  zones={zones}
                                  zoneId={assignments[a.id] ?? a.zone_id ?? UNASSIGNED_ZONE}
                                  onZoneChange={(zoneId) =>
                                    setAssignments((prev) => ({ ...prev, [a.id]: zoneId }))
                                  }
                                  onDelete={() => deleteArrMutation.mutate(a.id)}
                                  isDeleting={deletingArrId === a.id}
                                  priceOfZone={priceOfZone}
                                />
                              ))}

                              {/* Bouton ajouter */}
                              <button
                                type="button"
                                onClick={() => handleAddClick(v.id, v.nom)}
                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1"
                              >
                                <Plus className="h-3 w-3" />
                                Ajouter un arrondissement
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Arrondissements sans ville (legacy) */}
            {unlinked.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  Arrondissements non rattachés (legacy)
                </p>
                {unlinked.map((a) => (
                  <ArrondissementRow
                    key={a.id}
                    name={a.name}
                    zones={zones}
                    zoneId={assignments[a.id] ?? a.zone_id ?? UNASSIGNED_ZONE}
                    onZoneChange={(zoneId) =>
                      setAssignments((prev) => ({ ...prev, [a.id]: zoneId }))
                    }
                    onDelete={() => deleteArrMutation.mutate(a.id)}
                    isDeleting={deletingArrId === a.id}
                    priceOfZone={priceOfZone}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {zones.length} zone(s) · {totalArrondissements} arrondissement(s) · {unassignedCount} sans
        zone
        {unassignedCount > 0 ? " — le tarif plateforme par défaut s'applique au panier." : null}
        {" · "}
        {pays.length} pays · {pays.reduce((s, p) => s + p.villes.length, 0)} villes
      </p>

      <Button
        className="mt-4"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || boardQuery.isLoading}
      >
        {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sauvegarder
      </Button>

      {/* Dialog : ajouter un arrondissement */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un arrondissement</DialogTitle>
            <DialogDescription>
              Nouvel arrondissement pour <span className="font-medium">{addVilleNom}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="arr-name">Nom de l'arrondissement</Label>
            <Input
              id="arr-name"
              placeholder="Ex. Makélékélé"
              value={newArrondissementName}
              onChange={(e) => setNewArrondissementName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newArrondissementName.trim()) addMutation.mutate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newArrondissementName.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────

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
          <p className="text-[11px] text-muted-foreground">
            Tarif non appliqué tant que le prix est à 0.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 pb-2">
        <Switch
          id={`active-${zone.id}`}
          checked={active}
          onCheckedChange={(v) => onChange({ is_active: v })}
        />
        <Label htmlFor={`active-${zone.id}`} className="text-sm font-normal">
          Active
        </Label>
      </div>
    </div>
  );
}

function ArrondissementRow({
  name,
  zones,
  zoneId,
  onZoneChange,
  onDelete,
  isDeleting,
  priceOfZone,
}: {
  name: string;
  zones: AdminZone[];
  zoneId: string;
  onZoneChange: (zoneId: string) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  priceOfZone?: (zoneId: string) => number;
}) {
  const assigned = zoneId !== UNASSIGNED_ZONE;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 group">
      <span
        className={`min-w-0 flex-1 truncate text-sm font-medium ${!assigned ? "text-muted-foreground" : ""}`}
      >
        {name}
      </span>
      <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
        <Select value={zoneId || UNASSIGNED_ZONE} onValueChange={onZoneChange}>
          <SelectTrigger className="h-8 flex-1 sm:w-[168px] sm:flex-none">
            <SelectValue placeholder="Choisir une zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_ZONE}>— Non assigné —</SelectItem>
            {zones.map((z) => {
              const p = priceOfZone ? priceOfZone(z.id) : z.price_base;
              return (
                <SelectItem key={z.id} value={z.id}>
                  Zone {z.name}
                  {p > 0 ? ` · ${p.toLocaleString("fr-FR")} F` : " · prix à définir"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
            title="Supprimer"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
