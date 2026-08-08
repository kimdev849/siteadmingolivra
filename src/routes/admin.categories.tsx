import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Tags, Trash2, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CATEGORY_KIND_LABELS,
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
  type AdminCategoryKind,
  type AdminProductCategory,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AdminCategoryKind>("produits");

  const query = useQuery({
    queryKey: ["admin", "categories", kind],
    queryFn: () => fetchAdminCategories(kind),
  });

  const list = query.data ?? [];

  return (
    <div>
      <PageHeader
        title="Catégories du catalogue"
        description="Le référentiel global des catégories. Les commerçants choisissent ici — ils ne créent plus de catégorie eux-mêmes."
      />

      {/* Sélecteur produits / menus */}
      <div className="mb-4 inline-flex rounded-lg border bg-muted p-1">
        {(["produits", "menus"] as AdminCategoryKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "produits" ? <Tags className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
            {CATEGORY_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {query.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Impossible de charger les catégories. Vérifiez que la migration des catégories globales est appliquée en base.
          </AlertDescription>
        </Alert>
      )}

      <CategoriesCard
        kind={kind}
        list={list}
        isLoading={query.isLoading}
        onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "categories", kind] })}
      />
    </div>
  );
}

function CategoriesCard({
  kind,
  list,
  isLoading,
  onChanged,
}: {
  kind: AdminCategoryKind;
  list: AdminProductCategory[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProductCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminProductCategory | null>(null);

  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formOrdre, setFormOrdre] = useState("0");

  const resetForm = () => {
    setFormNom("");
    setFormDescription("");
    setFormImageUrl("");
    setFormOrdre("0");
  };

  const openEdit = (c: AdminProductCategory) => {
    setEditing(c);
    setFormNom(c.nom);
    setFormDescription(c.description ?? "");
    setFormImageUrl(c.image_url ?? "");
    setFormOrdre(String(c.ordre ?? 0));
    setEditOpen(true);
  };

  const canSubmit = formNom.trim().length >= 2;

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminCategory(kind, {
        nom: formNom.trim(),
        description: formDescription.trim() || undefined,
        image_url: formImageUrl.trim() || undefined,
        ordre: Number(formOrdre) || 0,
      }),
    onSuccess: () => {
      resetForm();
      setAddOpen(false);
      onChanged();
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateAdminCategory(kind, editing!.id, {
        nom: formNom.trim() || undefined,
        description: formDescription.trim() || undefined,
        image_url: formImageUrl.trim() || undefined,
        ordre: Number(formOrdre) || 0,
      }),
    onSuccess: () => {
      resetForm();
      setEditOpen(false);
      setEditing(null);
      onChanged();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminCategory(kind, deleting!.id),
    onSuccess: () => {
      setDeleteOpen(false);
      setDeleting(null);
      onChanged();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (c: AdminProductCategory) =>
      updateAdminCategory(kind, c.id, { est_active: !c.est_active }),
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            {kind === "produits" ? <Tags className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
            {CATEGORY_KIND_LABELS[kind]}
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
      <CardContent className="max-h-[560px] space-y-1.5 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune catégorie. Ajoutez-en une.</p>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                c.est_active ? "border-border" : "border-border bg-muted/40 opacity-70"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{c.nom}</p>
                  {c.est_active ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Masquée
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ordre {c.ordre}
                  {c.description ? ` · ${c.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10"
                  title={c.est_active ? "Masquer la catégorie" : "Activer la catégorie"}
                  onClick={() => toggleActive.mutate(c)}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10"
                  title="Modifier"
                  onClick={() => openEdit(c)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                  title="Supprimer"
                  onClick={() => {
                    setDeleting(c);
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
      <CategoryFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={`Ajouter une catégorie ${kind === "produits" ? "de produit" : "de plat"}`}
        formNom={formNom}
        setFormNom={setFormNom}
        formDescription={formDescription}
        setFormDescription={setFormDescription}
        formImageUrl={formImageUrl}
        setFormImageUrl={setFormImageUrl}
        formOrdre={formOrdre}
        setFormOrdre={setFormOrdre}
        canSubmit={canSubmit}
        isPending={createMutation.isPending}
        onSubmit={() => createMutation.mutate()}
      />

      {/* Dialog Modifier */}
      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={`Modifier la catégorie ${kind === "produits" ? "de produit" : "de plat"}`}
        formNom={formNom}
        setFormNom={setFormNom}
        formDescription={formDescription}
        setFormDescription={setFormDescription}
        formImageUrl={formImageUrl}
        setFormImageUrl={setFormImageUrl}
        formOrdre={formOrdre}
        setFormOrdre={setFormOrdre}
        canSubmit={canSubmit}
        isPending={editMutation.isPending}
        onSubmit={() => editMutation.mutate()}
      />

      {/* Dialog Supprimer */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleting?.nom}</strong>&nbsp;?
              Les produits existants conserveront leur catégorie (elle sera simplement détachée).
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
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  title,
  formNom,
  setFormNom,
  formDescription,
  setFormDescription,
  formImageUrl,
  setFormImageUrl,
  formOrdre,
  setFormOrdre,
  canSubmit,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  formNom: string;
  setFormNom: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formImageUrl: string;
  setFormImageUrl: (v: string) => void;
  formOrdre: string;
  setFormOrdre: (v: string) => void;
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
            Les commerçants verront cette catégorie dans leur formulaire de publication.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cat-nom">Nom *</Label>
            <Input
              id="cat-nom"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              placeholder="Ex. Vêtements, Pizzas & Pâtes…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-desc">Description (optionnelle)</Label>
            <Input
              id="cat-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Petite description affichée aux vendeurs…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-img">Image (URL, optionnelle)</Label>
            <Input
              id="cat-img"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-ordre">Ordre d'affichage</Label>
            <Input
              id="cat-ordre"
              value={formOrdre}
              onChange={(e) => setFormOrdre(e.target.value)}
              inputMode="numeric"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
