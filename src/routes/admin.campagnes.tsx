import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Loader2,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Image,
  Calendar,
  MapPin,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { apiUrl } from "@/lib/api";
import { getAdminToken } from "@/lib/auth-session";

export const Route = createFileRoute("/admin/campagnes")({
  component: CampagnesPage,
});

const TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  promo: "Promotion",
  lancement: "Lancement",
  saisonniere: "Saisonnière",
  offre_jour: "Offre du jour",
};

const TYPE_COLORS: Record<string, string> = {
  standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  promo: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  lancement: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  saisonniere: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  offre_jour: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

function getCampagneStatus(c: MarketingCampagne): {
  label: string;
  variant: "success" | "warning" | "secondary" | "destructive";
} {
  if (!c.est_actif) return { label: "Inactive", variant: "secondary" };
  const now = new Date();
  const debut = c.date_debut ? new Date(c.date_debut) : null;
  const fin = c.date_fin ? new Date(c.date_fin) : null;

  if (debut && fin) {
    if (now < debut) return { label: "À venir", variant: "warning" };
    if (now > fin) return { label: "Expirée", variant: "destructive" };
    const pct = ((now.getTime() - debut.getTime()) / (fin.getTime() - debut.getTime())) * 100;
    if (pct > 80) return { label: "Bientôt fin", variant: "warning" };
    return { label: "Active", variant: "success" };
  }
  if (debut && now < debut) return { label: "À venir", variant: "warning" };
  if (fin && now > fin) return { label: "Expirée", variant: "destructive" };
  return { label: "Active", variant: "success" };
}

function CampagnesPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampagne, setEditCampagne] = useState<MarketingCampagne | null>(null);

  // Form fields
  const [formNom, setFormNom] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("standard");
  const [formDateDebut, setFormDateDebut] = useState("");
  const [formDateFin, setFormDateFin] = useState("");
  const [formEstActif, setFormEstActif] = useState(true);
  const [formSelectedVilles, setFormSelectedVilles] = useState<string[]>([]);
  const [formPaysId, setFormPaysId] = useState<string>("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    setFormImage(null);
    setFormImageFile(null);
    setFormImagePreview(null);
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
    setFormImage(c.image_url);
    setFormImagePreview(c.image_url);
    setFormImageFile(null);
    if (c.villes.length > 0) {
      setFormPaysId(c.villes[0].pays_id);
    } else {
      setFormPaysId("");
    }
    setCreateOpen(true);
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setFormImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setFormImageFile(file);
    setFormImage(null); // Will be uploaded on save
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!formImageFile) return formImage;
    if (formImage && !formImageFile) return formImage;

    setUploadingImage(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error("Non connecté");

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data from data URL
          const parts = result.split(",");
          resolve(parts[1] || "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(formImageFile);
      });

      const res = await fetch(apiUrl("/api/uploads/image"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataUrl: `data:${formImageFile.type};base64,${base64}`,
          folder: "campagnes",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload échoué");
      }

      const data = await res.json();
      return data.url;
    } catch (e) {
      console.error("[campagnes] Upload error:", e);
      throw e;
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleVilleSelection = (villeId: string) => {
    setFormSelectedVilles((prev) =>
      prev.includes(villeId)
        ? prev.filter((id) => id !== villeId)
        : [...prev, villeId],
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const imageUrl = await uploadImage();
      return createAdminCampagne({
        nom: formNom.trim(),
        description: formDesc.trim() || undefined,
        type: formType,
        image_url: imageUrl || undefined,
        date_debut: formDateDebut ? new Date(formDateDebut).toISOString() : undefined,
        date_fin: formDateFin ? new Date(formDateFin).toISOString() : undefined,
        est_actif: formEstActif,
        ville_ids: formSelectedVilles.length > 0 ? formSelectedVilles : undefined,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "campagnes"] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Erreur lors de la création");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const imageUrl = await uploadImage();
      return updateAdminCampagne(editCampagne!.id, {
        nom: formNom.trim(),
        description: formDesc.trim() || undefined,
        type: formType,
        image_url: imageUrl || null,
        date_debut: formDateDebut ? new Date(formDateDebut).toISOString() : null,
        date_fin: formDateFin ? new Date(formDateFin).toISOString() : null,
        est_actif: formEstActif,
        ville_ids: formSelectedVilles,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setEditCampagne(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin", "campagnes"] });
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Erreur lors de la modification");
    },
  });

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

  const isPending = createMutation.isPending || updateMutation.isPending || uploadingImage;
  const formValid = formNom.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes & Merchandising"
        description="Créez et gérez les campagnes marketing, offres du jour et promotions. Ces campagnes sont diffusées sur l'accueil de l'app mobile GoLivra."
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            Les campagnes actives apparaissent sur l'accueil de l'application mobile
          </span>
        </div>
      </PageHeader>

      {campagnesQuery.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Impossible de charger les campagnes. Vérifiez que la table marketing_campaigns existe
            dans Supabase (SQL : amendments-campagnes-villes.sql).
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{campagnes.length}</strong> campagne(s)
          </p>
          {campagnes.filter((c) => {
            const s = getCampagneStatus(c);
            return s.variant === "success";
          }).length > 0 && (
            <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {campagnes.filter((c) => getCampagneStatus(c).variant === "success").length} active(s)
            </Badge>
          )}
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Button>
      </div>

      {campagnesQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campagnes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Megaphone className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aucune campagne</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Créez votre première campagne marketing. Elle apparaîtra sur l'accueil de l'app
                mobile GoLivra pour les utilisateurs concernés.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer la première campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campagnes.map((c) => {
            const status = getCampagneStatus(c);
            return (
              <Card
                key={c.id}
                className={`group relative overflow-hidden transition-all hover:shadow-md ${
                  !c.est_actif ? "opacity-70" : ""
                }`}
              >
                {/* Image bannière */}
                {c.image_url && (
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={c.image_url}
                      alt={c.nom}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}

                <CardContent className={`space-y-3 ${c.image_url ? "pt-4" : "pt-5"}`}>
                  {/* En-tête */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{c.nom}</h3>
                        <Badge
                          variant={
                            status.variant === "success"
                              ? "default"
                              : status.variant === "warning"
                                ? "secondary"
                                : status.variant === "destructive"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifier</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteId(c.id)}
                              disabled={deletingId === c.id}
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Supprimer</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {c.description}
                    </p>
                  )}

                  {/* Métadonnées */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[11px] ${TYPE_COLORS[c.type] || ""}`}
                    >
                      {TYPE_LABELS[c.type] || c.type}
                    </Badge>
                    {c.date_debut && (
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.date_debut).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {c.date_fin
                          ? ` - ${new Date(c.date_fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
                          : ""}
                      </Badge>
                    )}
                    {c.villes.length > 0 && (
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <MapPin className="h-3 w-3" />
                        {c.villes.length} ville(s)
                      </Badge>
                    )}
                    {c.image_url && (
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Image className="h-3 w-3" />
                        Image
                      </Badge>
                    )}
                  </div>

                  {/* Villes */}
                  {c.villes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.villes.slice(0, 4).map((v) => (
                        <span
                          key={v.id}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          {v.nom}
                        </span>
                      ))}
                      {c.villes.length > 4 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          +{c.villes.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog : Nouvelle / Modifier campagne */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {editCampagne ? "Modifier la campagne" : "Nouvelle campagne"}
            </DialogTitle>
            <DialogDescription>
              {editCampagne
                ? "Modifiez les informations de la campagne."
                : "Créez une campagne qui sera diffusée sur l'accueil de l'app mobile."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-nom">
                Nom de la campagne <span className="text-destructive">*</span>
              </Label>
              <Input
                id="camp-nom"
                placeholder="Ex. Offre du jour — Poulet DG"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="camp-desc">Description</Label>
              <Textarea
                id="camp-desc"
                placeholder="Description courte qui apparaîtra sur l'app mobile..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Apparaît sur l'accueil de l'app. Maximum 2 lignes.
              </p>
            </div>

            {/* Type + Actif */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="camp-type">Type de campagne</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="camp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offre_jour">🔥 Offre du jour</SelectItem>
                    <SelectItem value="promo">🏷️ Promotion</SelectItem>
                    <SelectItem value="lancement">🚀 Lancement</SelectItem>
                    <SelectItem value="saisonniere">📅 Saisonnière</SelectItem>
                    <SelectItem value="standard">📢 Standard</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formType === "offre_jour"
                    ? "Apparaît en haut de l'accueil. Une seule, locale et pertinente."
                    : formType === "promo"
                      ? "Promotion spéciale avec réduction."
                      : formType === "lancement"
                        ? "Mise en avant d'un nouveau commerce."
                        : formType === "saisonniere"
                          ? "Campagne liée à une période (fêtes, rentrée…)."
                          : "Campagne standard."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <div className="flex h-10 items-center gap-3 rounded-md border border-border px-3">
                  <Switch
                    id="camp-actif"
                    checked={formEstActif}
                    onCheckedChange={setFormEstActif}
                  />
                  <Label htmlFor="camp-actif" className="cursor-pointer font-normal">
                    {formEstActif ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-1.5">
              <Label>Période de diffusion</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="camp-debut" className="text-xs text-muted-foreground">
                    Début
                  </Label>
                  <Input
                    id="camp-debut"
                    type="datetime-local"
                    value={formDateDebut}
                    onChange={(e) => setFormDateDebut(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="camp-fin" className="text-xs text-muted-foreground">
                    Fin
                  </Label>
                  <Input
                    id="camp-fin"
                    type="datetime-local"
                    value={formDateFin}
                    onChange={(e) => setFormDateFin(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez vide pour une campagne sans limite de durée.
              </p>
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <Label>Image / Bannière</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleImagePick}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Image className="h-4 w-4" />
                    )}
                    {formImagePreview ? "Changer l'image" : "Choisir une image"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG ou WebP. Max 8 MB. Format paysage recommandé (1200×600).
                  </p>
                  {formImagePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                      onClick={() => {
                        setFormImagePreview(null);
                        setFormImageFile(null);
                        setFormImage(null);
                      }}
                    >
                      Supprimer l'image
                    </Button>
                  )}
                </div>
                {formImagePreview && (
                  <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img
                      src={formImagePreview}
                      alt="Aperçu"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Villes ciblées */}
            <div className="space-y-2">
              <Label>Villes ciblées (pertinence locale)</Label>
              <p className="text-xs text-muted-foreground">
                Sélectionnez un pays et choisissez les villes où cette campagne sera visible.
                Laissez vide pour une campagne nationale.
              </p>

              <Select
                value={formPaysId}
                onValueChange={(val) => {
                  setFormPaysId(val);
                  if (!val) setFormSelectedVilles([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pays (optionnel)" />
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
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {villesQuery.isLoading ? (
                    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Chargement…
                    </p>
                  ) : villes.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">
                      Aucune ville pour ce pays.
                    </p>
                  ) : (
                    villes.map((v) => {
                      const selected = formSelectedVilles.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
                            selected ? "bg-primary/5 font-medium" : ""
                          }`}
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

          <DialogFooter className="gap-2">
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
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editCampagne ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editCampagne ? "Enregistrer" : "Créer la campagne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : confirmation suppression */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer la campagne
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette campagne ? Elle disparaîtra immédiatement de
              l'app mobile. Cette action est irréversible.
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
              className="gap-2"
            >
              {deletingId === confirmDeleteId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
