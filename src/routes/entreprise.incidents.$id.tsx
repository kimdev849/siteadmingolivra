import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Store,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { toast } from "sonner";
import {
  fetchMyIncidentDetail,
  resolveMyIncident,
  cancelMyIncident,
  addMyIncidentNote,
  escalateMyIncident,
  type IncidentDelivery,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/incidents/$id")({
  component: IncidentDetailPage,
});

function riskBadge(level: string) {
  switch (level) {
    case "CRITIQUE":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Critique
        </Badge>
      );
    case "INCIDENT":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Incident
        </Badge>
      );
    case "RETARD":
      return (
        <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" /> Retard
        </Badge>
      );
    case "A_SURVEILLER":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> A surveiller
        </Badge>
      );
    default:
      return <Badge variant="secondary">Normal</Badge>;
  }
}

function incidentLevelBadge(level: string | null) {
  if (!level) return null;
  switch (level) {
    case "niveau_3":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> Intervention requise
        </Badge>
      );
    case "niveau_2":
      return (
        <Badge variant="destructive" className="bg-orange-500">
          <Clock className="mr-1 h-3 w-3" /> Situation grave
        </Badge>
      );
    case "niveau_1":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" /> Retard leger
        </Badge>
      );
    default:
      return <Badge variant="secondary">{level}</Badge>;
  }
}

function IncidentDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["logistics", "incident", id],
    queryFn: () => fetchMyIncidentDetail(id),
  });

  const inc = detailQuery.data;

  const withLoading = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident", id] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incidents"] });
      await queryClient.invalidateQueries({ queryKey: ["logistics", "incident-stats"] });
    } finally {
      setLoading(null);
    }
  };

  const handleResolve = () =>
    withLoading("resolve", async () => {
      const raison = prompt(
        "Pourquoi cet incident est-il resolu ?\n\n" +
          "Decrivez ce qui s'est passe : le livreur a fini par livrer, le probleme est regle, etc."
      );
      if (raison === null) return;
      await resolveMyIncident(id, raison || undefined);
      toast.success("Incident resolu", {
        description: "La situation est maintenant sous controle.",
      });
    });

  const handleCancel = () =>
    withLoading("cancel", async () => {
      const raison = prompt(
        "Pourquoi annulez-vous cette livraison ?\n\n" +
          "Exemples :\n" +
          "- Le livreur est injoignable depuis longtemps\n" +
          "- Le colis est probablement perdu\n" +
          "- Le client ne veut plus attendre\n" +
          "- Autre raison"
      );
      if (raison === null) return;
      await cancelMyIncident(id, raison || undefined);
      toast.success("Livraison annulee", {
        description: "Le livreur est libere et le client sera notifie.",
      });
    });

  const handleEscalate = () =>
    withLoading("escalate", async () => {
      if (
        !confirm(
          "Remonter cette situation a GoLivra ?\n\n" +
            "L'equipe GoLivra prendra en charge le probleme. " +
            "Utilisez cette option quand vous ne pouvez pas resoudre seul."
        )
      )
        return;
      await escalateMyIncident(id);
      toast.success("Situation remontee a GoLivra", {
        description: "L'equipe sera notifiee et interviendra.",
      });
    });

  const handleAddNote = () =>
    withLoading("note", async () => {
      if (!note.trim()) return;
      await addMyIncidentNote(id, note.trim());
      toast.success("Note enregistree");
      setNote("");
    });

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/entreprise/incidents">
          <ArrowLeft className="h-4 w-4" /> Retour aux incidents
        </Link>
      </Button>

      <PageHeader
        title={
          inc
            ? `Incident — ${inc.client?.nom || "Client inconnu"}`
            : "Details de l'incident"
        }
        description={
          inc
            ? `${inc.commerce?.nom || "Commerce inconnu"} — ${inc.delay_label} de retard`
            : "Chargement..."
        }
      />

      {detailQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
        </p>
      ) : detailQuery.isError || !inc ? (
        <p className="text-sm text-destructive">Incident introuvable.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* ── Situation actuelle ──────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span>Situation actuelle</span>
                  <Badge variant="secondary">{inc.statut}</Badge>
                  {riskBadge(inc.risk_level)}
                  {incidentLevelBadge(inc.incident_level)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p>
                      {inc.type_livraison === "externe"
                        ? "Livraison externe"
                        : "Commande client"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p>
                      {inc.montant_total != null
                        ? `${inc.montant_total.toLocaleString("fr-FR")} FCFA`
                        : "\u2014"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Adresse de livraison
                  </p>
                  <p className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {inc.adresse_livraison || "Non renseignee"}
                  </p>
                </div>
                {inc.adresse_retrait ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Adresse de retrait (commerce)
                    </p>
                    <p className="flex items-start gap-1">
                      <Store className="mt-0.5 h-3 w-3 shrink-0" />
                      {inc.adresse_retrait}
                    </p>
                  </div>
                ) : null}
                {inc.note ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Note du client
                    </p>
                    <p>{inc.note}</p>
                  </div>
                ) : null}
                {inc.incident_reason ? (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Motif declare
                    </p>
                    <p className="font-medium">{inc.incident_reason}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* ── Que faire ? ─────────────────────────────────────── */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4" /> Que faire maintenant ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>1.</strong> Appelez d'abord le livreur pour comprendre
                    la situation.
                  </p>
                  <p>
                    <strong>2.</strong> Si le livreur a livre, marquez comme resolu.
                  </p>
                  <p>
                    <strong>3.</strong> Si le livreur est bloque et ne peut pas
                    livrer, annulez la course pour liberer le livreur.
                  </p>
                  <p>
                    <strong>4.</strong> Si vous ne pouvez pas resoudre seul,
                    remontez la situation a GoLivra.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!loading}
                    onClick={() => void handleResolve()}
                  >
                    {loading === "resolve" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    Livraison effectuee
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!!loading}
                    onClick={() => void handleCancel()}
                  >
                    {loading === "cancel" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    Annuler la course
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!loading}
                    onClick={() => void handleEscalate()}
                  >
                    {loading === "escalate" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                    )}
                    Signaler a GoLivra
                  </Button>
                </div>

                <div>
                  <Textarea
                    placeholder="Note interne (optionnel) : que s'est-il passe ?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={!!loading || !note.trim()}
                    onClick={() => void handleAddNote()}
                  >
                    {loading === "note" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    Enregistrer la note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Chronologie ─────────────────────────────────────── */}
            {inc.timeline?.length ? (
              <EventTimeline steps={inc.timeline} title="Chronologie" />
            ) : null}
          </div>

          <div className="space-y-4">
            {/* ── Le livreur ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Le livreur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inc.livreur ? (
                  <>
                    <p className="font-medium">{inc.livreur.nom}</p>
                    {inc.livreur.telephone ? (
                      <a
                        href={`tel:${inc.livreur.telephone}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {inc.livreur.telephone}
                      </a>
                    ) : null}
                    <p className="text-muted-foreground capitalize">
                      {inc.livreur.type_vehicule || "\u2014"}
                    </p>
                    {inc.livreur.est_actif === false ? (
                      <Badge variant="destructive">Compte desactive</Badge>
                    ) : (
                      <Badge variant="secondary">Compte actif</Badge>
                    )}
                    {inc.last_activity_ago != null ? (
                      <p className="text-xs text-muted-foreground">
                        Derniere activite : il y a {inc.last_activity_ago} min
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Aucun livreur n'est assigne a cette course.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Le client ───────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Le client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inc.client ? (
                  <>
                    <p className="font-medium">{inc.client.nom || "\u2014"}</p>
                    {inc.client.telephone ? (
                      <a
                        href={`tel:${inc.client.telephone}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {inc.client.telephone}
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Aucune information client.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Le commerce ─────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Le commerce
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inc.commerce ? (
                  <>
                    <p className="font-medium">{inc.commerce.nom}</p>
                    {inc.commerce.telephone ? (
                      <a
                        href={`tel:${inc.commerce.telephone}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {inc.commerce.telephone}
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Aucune information commerce.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Actions deja effectuees ─────────────────────────── */}
            {inc.operator_actions?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Actions deja effectuees ({inc.operator_actions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {inc.operator_actions.map((a) => (
                    <div
                      key={a.id}
                      className="border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <p className="text-xs font-medium">{a.action_label}</p>
                      {a.details ? (
                        <p className="text-xs text-muted-foreground">
                          {a.details}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground">
                        {a.operateur_nom} — {a.created_at_label}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
