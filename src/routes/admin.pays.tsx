import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Globe,
  Loader2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAdminPays,
  createAdminPays,
  updateAdminPays,
  deleteAdminPays,
  fetchAdminVilles,
  createAdminVille,
  updateAdminVille,
  deleteAdminVille,
  type AdminPays,
  type AdminVille,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/pays")({
  component: PaysVillesPage,
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  Page principale                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function PaysVillesPage() {
  const qc = useQueryClient();
  const paysQuery = useQuery({
    queryKey: ["admin", "pays"],
    queryFn: fetchAdminPays,
  });

  const [selectedPays, setSelectedPays] = useState<AdminPays | null>(null);

  const paysList = paysQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Pays & Villes"
        description="Gérez les pays et les villes disponibles sur la plateforme."
      />

      {paysQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les pays. Vérifiez que le backend est accessible.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* CARTE : LISTE DES PAYS */}
        <PaysCard
          paysList={paysList}
          isLoading={paysQuery.isLoading}
          selectedPays={selectedPays}
          onSelect={setSelectedPays}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["admin", "pays"] })}
        />

        {/* CARTE : VILLES DU PAYS SÉLECTIONNÉ */}
        <VillesCard
          pays={selectedPays}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {paysList.length} pays · Sélectionnez un pays pour gérer ses villes.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Carte Pays                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function PaysCard({
  paysList,
  isLoading,
  selectedPays,
  onSelect,
  onRefresh,
}: {
  paysList: AdminPays[];
  isLoading: boolean;
  selectedPays: AdminPays | null;
  onSelect: (p: AdminPays | null) => void;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPays, setEditingPays] = useState<AdminPays | null>(null);
  const [deletingPays, setDeletingPays] = useState<AdminPays | null>(null);

  // Formulaire
  const [formNom, setFormNom] = useState("");
  const [formIso2, setFormIso2] = useState("");
  const [formIso3, setFormIso3] = useState("");
  const [formIndicatif, setFormIndicatif] = useState("");

  const resetForm = () => {
    setFormNom("");
    setFormIso2("");
    setFormIso3("");
    setFormIndicatif("");
  };

  // Création
  const createMutation = useMutation({
    mutationFn: () =>
      createAdminPays({
        nom: formNom.trim(),
        code_iso2: formIso2.trim(),
        code_iso3: formIso3.trim(),
        indicatif: formIndicatif.trim() || undefined,
      }),
    onSuccess: () => {
      resetForm();
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "pays"] });
    },
  });

  // Modification
  const editMutation = useMutation({
    mutationFn: () =>
      updateAdminPays(editingPays!.id, {
        nom: formNom.trim() || undefined,
        code_iso2: formIso2.trim() || undefined,
        code_iso3: formIso3.trim() || undefined,
        indicatif: formIndicatif.trim() || undefined,
      }),
    onSuccess: () => {
      resetForm();
      setEditOpen(false);
      setEditingPays(null);
      qc.invalidateQueries({ queryKey: ["admin", "pays"] });
    },
  });

  // Suppression
  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminPays(deletingPays!.id),
    onSuccess: () => {
      setDeleteOpen(false);
      setDeletingPays(null);
      if (selectedPays?.id === deletingPays?.id) onSelect(null);
      qc.invalidateQueries({ queryKey: ["admin", "pays"] });
    },
  });

  const openEdit = (p: AdminPays) => {
    setEditingPays(p);
    setFormNom(p.nom);
    setFormIso2(p.code_iso2);
    setFormIso3(p.code_iso3);
    setFormIndicatif(p.indicatif || "");
    setEditOpen(true);
  };

  const canSubmit = formNom.trim().length >= 2 && formIso2.trim().length === 2 && formIso3.trim().length === 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Pays
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] space-y-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : paysList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun pays. Ajoutez-en un.</p>
        ) : (
          paysList.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                selectedPays?.id === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onSelect(selectedPays?.id === p.id ? null : p)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {p.code_iso2} / {p.code_iso3}
                  {p.indicatif ? ` · ${p.indicatif}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10"
                  title="Modifier"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                  title="Supprimer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingPays(p);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Dialog Ajouter */}
      <PaysFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Ajouter un pays"
        formNom={formNom}
        setFormNom={setFormNom}
        formIso2={formIso2}
        setFormIso2={setFormIso2}
        formIso3={formIso3}
        setFormIso3={setFormIso3}
        formIndicatif={formIndicatif}
        setFormIndicatif={setFormIndicatif}
        canSubmit={canSubmit}
        isPending={createMutation.isPending}
        onSubmit={() => createMutation.mutate()}
      />

      {/* Dialog Modifier */}
      <PaysFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier le pays"
        formNom={formNom}
        setFormNom={setFormNom}
        formIso2={formIso2}
        setFormIso2={setFormIso2}
        formIso3={formIso3}
        setFormIso3={setFormIso3}
        formIndicatif={formIndicatif}
        setFormIndicatif={setFormIndicatif}
        canSubmit={canSubmit}
        isPending={editMutation.isPending}
        onSubmit={() => editMutation.mutate()}
      />

      {/* Dialog Supprimer */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le pays</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingPays?.nom}</strong>&nbsp;?
              Les villes et arrondissements de ce pays seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Dialog formulaire pays                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function PaysFormDialog({
  open,
  onOpenChange,
  title,
  formNom,
  setFormNom,
  formIso2,
  setFormIso2,
  formIso3,
  setFormIso3,
  formIndicatif,
  setFormIndicatif,
  canSubmit,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  formNom: string;
  setFormNom: (v: string) => void;
  formIso2: string;
  setFormIso2: (v: string) => void;
  formIso3: string;
  setFormIso3: (v: string) => void;
  formIndicatif: string;
  setFormIndicatif: (v: string) => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Renseignez les informations du pays.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="pays-nom">Nom du pays</Label>
            <Input
              id="pays-nom"
              placeholder="Ex. Congo"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pays-iso2">Code ISO2</Label>
            <Input
              id="pays-iso2"
              placeholder="Ex. CG"
              maxLength={2}
              className="uppercase"
              value={formIso2}
              onChange={(e) => setFormIso2(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pays-iso3">Code ISO3</Label>
            <Input
              id="pays-iso3"
              placeholder="Ex. COG"
              maxLength={3}
              className="uppercase"
              value={formIso3}
              onChange={(e) => setFormIso3(e.target.value.toUpperCase())}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="pays-indicatif">Indicatif téléphone</Label>
            <Input
              id="pays-indicatif"
              placeholder="Ex. +242"
              value={formIndicatif}
              onChange={(e) => setFormIndicatif(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {title.startsWith("Ajouter") ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Carte Villes                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function VillesCard({
  pays,
}: {
  pays: AdminPays | null;
}) {
  const qc = useQueryClient();
  const villesQuery = useQuery({
    queryKey: ["admin", "pays", "villes", pays?.id],
    queryFn: () => fetchAdminVilles(pays!.id),
    enabled: !!pays,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingVille, setEditingVille] = useState<AdminVille | null>(null);
  const [deletingVille, setDeletingVille] = useState<AdminVille | null>(null);

  const [formNom, setFormNom] = useState("");
  const [formOrder, setFormOrder] = useState("0");

  const villes = villesQuery.data ?? [];

  const resetForm = () => {
    setFormNom("");
    setFormOrder("0");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminVille({
        pays_id: pays!.id,
        nom: formNom.trim(),
        sort_order: Number(formOrder) || 0,
      }),
    onSuccess: () => {
      resetForm();
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "pays", "villes", pays?.id] });
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateAdminVille(editingVille!.id, {
        nom: formNom.trim() || undefined,
        sort_order: Number(formOrder) || undefined,
      }),
    onSuccess: () => {
      resetForm();
      setEditOpen(false);
      setEditingVille(null);
      qc.invalidateQueries({ queryKey: ["admin", "pays", "villes", pays?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminVille(deletingVille!.id),
    onSuccess: () => {
      setDeleteOpen(false);
      setDeletingVille(null);
      qc.invalidateQueries({ queryKey: ["admin", "pays", "villes", pays?.id] });
    },
  });

  const openEdit = (v: AdminVille) => {
    setEditingVille(v);
    setFormNom(v.nom);
    setFormOrder(String(v.sort_order ?? 0));
    setEditOpen(true);
  };

  if (!pays) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4" />
            Villes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un pays pour voir ses villes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Villes — {pays.nom}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Ajouter
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] space-y-1 overflow-y-auto">
        {villesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : villes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune ville pour ce pays.</p>
        ) : (
          villes.map((v) => (
            <div
              key={v.id}
              className="group flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:border-primary/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{v.nom}</p>
                <p className="text-xs text-muted-foreground">
                  Ordre : {v.sort_order ?? 0}
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10"
                  title="Modifier"
                  onClick={() => {
                    openEdit(v);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                  title="Supprimer"
                  onClick={() => {
                    setDeletingVille(v);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {/* Dialog Ajouter */}
      <VilleFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Ajouter une ville"
        formNom={formNom}
        setFormNom={setFormNom}
        formOrder={formOrder}
        setFormOrder={setFormOrder}
        canSubmit={formNom.trim().length >= 2}
        isPending={createMutation.isPending}
        onSubmit={() => createMutation.mutate()}
      />

      {/* Dialog Modifier */}
      <VilleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Modifier la ville"
        formNom={formNom}
        setFormNom={setFormNom}
        formOrder={formOrder}
        setFormOrder={setFormOrder}
        canSubmit={formNom.trim().length >= 2}
        isPending={editMutation.isPending}
        onSubmit={() => editMutation.mutate()}
      />

      {/* Dialog Supprimer */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la ville</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingVille?.nom}</strong>&nbsp;?
              Les arrondissements de cette ville seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Dialog formulaire ville                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

function VilleFormDialog({
  open,
  onOpenChange,
  title,
  formNom,
  setFormNom,
  formOrder,
  setFormOrder,
  canSubmit,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  formNom: string;
  setFormNom: (v: string) => void;
  formOrder: string;
  setFormOrder: (v: string) => void;
  canSubmit: boolean;
  isPending: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Renseignez les informations de la ville.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="ville-nom">Nom de la ville</Label>
            <Input
              id="ville-nom"
              placeholder="Ex. Brazzaville"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ville-order">Ordre d'affichage</Label>
            <Input
              id="ville-order"
              type="number"
              min={0}
              placeholder="0"
              value={formOrder}
              onChange={(e) => setFormOrder(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {title.startsWith("Ajouter") ? "Ajouter" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
