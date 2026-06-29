import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAdminCampagnes,
  createAdminCampagne,
  updateAdminCampagne,
  deleteAdminCampagne,
  fetchAdminPays,
  fetchAdminVilles,
  type MarketingCampagne,
  type AdminPays,
  type AdminVille,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/campagnes")({
  component: CampagnesPage,
});

function CampagnesPage() {
  const qc = useQueryClient();

  const campagnesQuery = useQuery({
    queryKey: ["admin", "campagnes"],
    queryFn: fetchAdminCampagnes,
  });

  const paysQuery = useQuery({
    queryKey: ["admin", "pays"],
    queryFn: fetchAdminPays,
  });

  const campagnes = campagnesQuery.data ?? [];
  const pays = paysQuery.data ?? [];

  // Dialog : nouvelle campagne
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampagne, setEditCampagne] = useState<MarketingCampagne | null>(null);

  // Champs du formulaire
  const [formNom, setFormNom] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("standard");
  const [formDateDebut, setFormDateDebut] = useState("");
  const [formDateFin, setFormDateFin] = useState("");
  const [formEstActif, setFormEstActif] = useState(true);
  const [formSelectedVilles, setFormSelectedVilles] = useState<string[]>([]);

  // Sélecteur de pays → filtre les villes
  const [formPaysId, setFormPaysId] = useState<string>("");
  const villesQuery = useQuery({
    queryKey: ["admin", "villes", formPaysId],
    queryFn: () => fetchAdminVilles(formPaysId || undefined),
    enabled: !!formPaysId,
  });
  const villes = villesQuery.data ?? [];

  const resetForm = () => {
    setFormNom("");
    setFormDesc("");
    setFormType("standard");
    setFormDateDebut("");
    setFormDateFin("");
    setFormEstActif(true);
    setFormSelectedVilles([]);
    setFormPaysId("");
  };

  const openCreate = () => {
    resetForm();
    setEditCampagne(null);
    setCreateOpen(true);
  };

  const openEdit = (c: MarketingCampagne) => {
    setEditCampagne(c);
    setFormNom(c.nom);
    setFormDesc(c.description ?? "");
    setFormType(c.type);
    setFormDateDebut(c.date_debut ? c.date_debut.slice(0, 16) : "");
    setFormDateFin(c.date_fin ? c.date_fin.slice(0, 16) : "");
    setFormEstActif(c.est_actif);
    setFormSelectedVilles(c.ville_ids);
    // Trouver un pays parmi les villes
    if (c.villes.length > 0) {
      setFormPaysId(c.villes[0].pays_id);
    } else {
      setFormPaysId("");
    }
    setCreateOpen(true);
  };

  const toggleVilleSelection = (villeId: string) => {
    setFormSelectedVilles((prev) =>
      prev.includes(villeId)
        ? prev.filter((id) => id !== villeId)
        : [...prev, villeId],
    );
  };

  // Mutation : créer
  const createMutation = useMutation({
    mutationFn: () =>
      createAdminCampagne({
        nom: formNom.trim(),
        description: formDesc.trim() || undefined,
        type: formType,
        date_debut: formDateDebut ? new Date(formDateDebut).toISOString() : undefined,
        date_fin: formDateFin ? new Date(formDateFin).toISOString() : undefined,
        est_actif: formEstActif,
        ville_ids: formSelectedVilles.length > 0 ? formSelectedVilles : undefined,
      }),
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "campagnes"] });
    },
  });

  // Mutation : modifier
  const updateMutation = useMutation({
    mutationFn: () =>
      updateAdminCampagne(editCampagne!.id, {
        nom: formNom.trim(),
        description: formDesc.trim() || undefined,
        type: formType,
        date_debut: formDateDebut ? new Date(formDateDebut).toISOString() : null,
        date_fin: formDateFin ? new Date(formDateFin).toISOString() : null,
        est_actif: formEstActif,
        ville_ids: formSelectedVilles,
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setEditCampagne(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "campagnes"] });
    },
  });

  // Dialog : confirmation suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await deleteAdminCampagne(id);
    },
    onSuccess: () => {
      setDeletingId(null);
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin", "campagnes"] });
    },
    onSettled: () => setDeletingId(null),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const formValid = formNom.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="Campagnes marketing"
        description="Créez des campagnes et associez-les à une ou plusieurs villes."
      />

      {campagnesQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les campagnes. Exécutez la migration SQL.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campagnes.length} campagne(s)
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      {campagnesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : campagnes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucune campagne pour le moment.
            </p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              Créer la première campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campagnes.map((c) => (
            <Card key={c.id} className={!c.est_actif ? "opacity-60" : ""}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{c.nom}</h3>
                    {c.est_actif ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        <X className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {c.type}
                    </span>
                    {c.date_debut && (
                      <span className="text-xs text-muted-foreground">
                        Du {new Date(c.date_debut).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    {c.date_fin && (
                      <span className="text-xs text-muted-foreground">
                        au {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {c.villes.length} ville(s)
                    </span>
                  </div>
                  {c.villes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.villes.map((v) => (
                        <span
                          key={v.id}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {v.nom}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(c)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDeleteId(c.id)}
                    disabled={deletingId === c.id}
                    className="text-destructive hover:text-destructive"
                    title="Supprimer"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog : Nouvelle / Modifier campagne */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editCampagne ? "Modifier la campagne" : "Nouvelle campagne"}
            </DialogTitle>
            <DialogDescription>
              {editCampagne
                ? "Modifiez les informations de la campagne."
                : "Créez une nouvelle campagne marketing."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-nom">Nom de la campagne *</Label>
              <Input
                id="camp-nom"
                placeholder="Ex. Rentrée des classes"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-desc">Description</Label>
              <Textarea
                id="camp-desc"
                placeholder="Description de la campagne..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
              />
            </div>

            {/* Type + Actif */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-type">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="camp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="promo">Promotion</SelectItem>
                    <SelectItem value="lancement">Lancement</SelectItem>
                    <SelectItem value="saisonniere">Saisonnière</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  id="camp-actif"
                  checked={formEstActif}
                  onCheckedChange={setFormEstActif}
                />
                <Label htmlFor="camp-actif" className="font-normal">
                  Active
                </Label>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="camp-debut">Date début</Label>
                <Input
                  id="camp-debut"
                  type="datetime-local"
                  value={formDateDebut}
                  onChange={(e) => setFormDateDebut(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-fin">Date fin</Label>
                <Input
                  id="camp-fin"
                  type="datetime-local"
                  value={formDateFin}
                  onChange={(e) => setFormDateFin(e.target.value)}
                />
              </div>
            </div>

            {/* Villes associées */}
            <div className="space-y-2">
              <Label>Villes ciblées</Label>
              <p className="text-xs text-muted-foreground">
                Sélectionnez un pays, puis cochez les villes.
              </p>

              <Select
                value={formPaysId}
                onValueChange={(val) => {
                  setFormPaysId(val);
                  // Désélectionner les villes qui ne sont pas dans ce pays
                  if (val && villes.length > 0) {
                    // On garde la sélection actuelle, l'utilisateur peut décocher
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pays" />
                </SelectTrigger>
                <SelectContent>
                  {pays.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {formPaysId && (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {villesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                  ) : villes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune ville pour ce pays.
                    </p>
                  ) : (
                    villes.map((v) => {
                      const selected = formSelectedVilles.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleVilleSelection(v.id)}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          {v.nom}
                        </label>
                      );
                    })
                  )}
                </div>
              )}

              {formSelectedVilles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formSelectedVilles.map((vid) => {
                    const v = villes.find((vv) => vv.id === vid);
                    return v ? (
                      <span
                        key={vid}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {v.nom}
                        <button
                          type="button"
                          onClick={() => toggleVilleSelection(vid)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditCampagne(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (editCampagne) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
              disabled={!formValid || isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editCampagne ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : confirmation suppression */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la campagne</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
              }}
              disabled={deletingId === confirmDeleteId}
            >
              {deletingId === confirmDeleteId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
