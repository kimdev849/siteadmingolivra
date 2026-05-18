import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Filter, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  createLogisticsCompanyAdmin,
  fetchAdminLogistics,
  formatDateFr,
  formatStatutLabel,
  updateLogisticsStatusAdmin,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/transporteurs/")({
  component: TransporteursPage,
});

function TransporteursPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nomEntreprise: "",
    telephoneEntreprise: "",
    emailEntreprise: "",
    zoneActivite: "",
    gestionnaireNom: "",
    gestionnaireEmail: "",
    gestionnaireMotDePasse: "",
    gestionnaireTelephone: "",
  });

  const query = useQuery({
    queryKey: ["admin", "logistics", statusFilter, search],
    queryFn: () =>
      fetchAdminLogistics({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search.trim() || undefined,
      }),
  });

  const resetForm = () => {
    setForm({
      nomEntreprise: "",
      telephoneEntreprise: "",
      emailEntreprise: "",
      zoneActivite: "",
      gestionnaireNom: "",
      gestionnaireEmail: "",
      gestionnaireMotDePasse: "",
      gestionnaireTelephone: "",
    });
    setCreateError(null);
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createLogisticsCompanyAdmin({
        nomEntreprise: form.nomEntreprise.trim(),
        telephoneEntreprise: form.telephoneEntreprise.trim() || undefined,
        emailEntreprise: form.emailEntreprise.trim() || undefined,
        zoneActivite: form.zoneActivite.trim() || undefined,
        gestionnaire: {
          nom: form.gestionnaireNom.trim(),
          email: form.gestionnaireEmail.trim(),
          motDePasse: form.gestionnaireMotDePasse,
          telephone: form.gestionnaireTelephone.trim() || undefined,
        },
      });
      setCreateOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["admin", "logistics"] });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  const rows = useMemo(() => {
    return (query.data ?? []).map((e) => {
      const statut = e.statut_moderation || e.statut || "—";
      return [
        <Link
          key={`name-${e.id}`}
          to="/admin/transporteurs/$id"
          params={{ id: e.id }}
          className="font-medium text-primary hover:underline"
        >
          {e.nom}
        </Link>,
        <Badge key={`st-${e.id}`} variant={statut === "active" ? "default" : "secondary"}>
          {formatStatutLabel(statut)}
        </Badge>,
        String(e.nb_livreurs ?? 0),
        formatDateFr(e.created_at),
        <div key={`act-${e.id}`} className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/transporteurs/$id" params={{ id: e.id }}>
              Détail
            </Link>
          </Button>
          {statut === "en_attente" ? (
            <Button
              size="sm"
              disabled={actingId === e.id}
              onClick={async () => {
                setActingId(e.id);
                try {
                  await updateLogisticsStatusAdmin(e.id, "activate");
                  await queryClient.invalidateQueries({ queryKey: ["admin"] });
                } finally {
                  setActingId(null);
                }
              }}
            >
              {actingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Valider"}
            </Button>
          ) : null}
        </div>,
      ];
    });
  }, [query.data, actingId, queryClient]);

  return (
    <div>
      <PageHeader
        title="Entreprises de livraison"
        description="Création, validation et supervision des partenaires logistiques"
        actions={
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Créer une entreprise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle entreprise logistique</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="nomEntreprise">Nom de l&apos;entreprise</Label>
                  <Input
                    id="nomEntreprise"
                    value={form.nomEntreprise}
                    onChange={(ev) => setForm((f) => ({ ...f, nomEntreprise: ev.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="telEntreprise">Téléphone entreprise</Label>
                    <Input
                      id="telEntreprise"
                      placeholder="+242…"
                      value={form.telephoneEntreprise}
                      onChange={(ev) => setForm((f) => ({ ...f, telephoneEntreprise: ev.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="emailEntreprise">E-mail entreprise</Label>
                    <Input
                      id="emailEntreprise"
                      type="email"
                      value={form.emailEntreprise}
                      onChange={(ev) => setForm((f) => ({ ...f, emailEntreprise: ev.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="zone">Zone d&apos;activité</Label>
                  <Input
                    id="zone"
                    value={form.zoneActivite}
                    onChange={(ev) => setForm((f) => ({ ...f, zoneActivite: ev.target.value }))}
                  />
                </div>
                <p className="text-xs font-medium text-muted-foreground pt-2">Compte gestionnaire (connexion web)</p>
                <div className="grid gap-1.5">
                  <Label htmlFor="gestNom">Nom du gestionnaire</Label>
                  <Input
                    id="gestNom"
                    value={form.gestionnaireNom}
                    onChange={(ev) => setForm((f) => ({ ...f, gestionnaireNom: ev.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="gestEmail">E-mail gestionnaire</Label>
                  <Input
                    id="gestEmail"
                    type="email"
                    value={form.gestionnaireEmail}
                    onChange={(ev) => setForm((f) => ({ ...f, gestionnaireEmail: ev.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="gestMdp">Mot de passe gestionnaire</Label>
                  <Input
                    id="gestMdp"
                    type="password"
                    autoComplete="new-password"
                    value={form.gestionnaireMotDePasse}
                    onChange={(ev) => setForm((f) => ({ ...f, gestionnaireMotDePasse: ev.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="gestTel">Téléphone gestionnaire (optionnel)</Label>
                  <Input
                    id="gestTel"
                    placeholder="+242…"
                    value={form.gestionnaireTelephone}
                    onChange={(ev) => setForm((f) => ({ ...f, gestionnaireTelephone: ev.target.value }))}
                  />
                </div>
                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button
                  disabled={
                    creating ||
                    !form.nomEntreprise.trim() ||
                    !form.gestionnaireNom.trim() ||
                    !form.gestionnaireEmail.trim() ||
                    form.gestionnaireMotDePasse.length < 6
                  }
                  onClick={() => void handleCreate()}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher une entreprise…"
          className="max-w-xs"
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="suspendue">Suspendu</SelectItem>
            <SelectItem value="rejetee">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setStatusFilter("en_attente"); setSearch(""); }}>
          <Filter className="h-4 w-4" /> En attente
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <DataTable
          columns={["Nom entreprise", "Statut", "Nombre de livreurs", "Date", "Actions"]}
          rows={rows}
          emptyTitle="Aucune entreprise"
          emptyDescription="Créez une entreprise logistique ou attendez les inscriptions."
        />
      )}
    </div>
  );
}
