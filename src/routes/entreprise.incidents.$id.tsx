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
  Package,
  Navigation,
  MessageSquare,
  ChevronRight,
  Camera,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EventTimeline } from "@/components/admin/EventTimeline";
import { toast } from "sonner";
import {
  fetchMyIncidentDetail,
  resolveMyIncident,
  cancelMyIncident,
  addMyIncidentNote,
  escalateMyIncident,
} from "@/lib/logistics-api";

export const Route = createFileRoute("/entreprise/incidents/$id")({
  component: IncidentDetailPage,
});

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function severityBadge(level: string | null) {
  switch (level) {
    case "niveau_3":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Incident critique
        </Badge>
      );
    case "niveau_2":
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-500">
          <Clock className="h-3 w-3" /> Retard important
        </Badge>
      );
    case "niveau_1":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> A surveiller
        </Badge>
      );
    default:
      return null;
  }
}

function formatDelay(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h${String(m).padStart(2, "0")}min` : `${h}h`;
  }
  return `${minutes} min`;
}

const MOTIFS_INCIDENT = [
  { key: "trafic", label: "Embouteillage / trafic" },
  { key: "panne", label: "Panne vehicule" },
  { key: "accident", label: "Accident" },
  { key: "client_injoignable", label: "Client injoignable" },
  { key: "adresse_incorrecte", label: "Adresse incorrecte" },
  { key: "probleme_colis", label: "Probleme avec le colis" },
  { key: "probleme_commerce", label: "Probleme au commerce" },
  { key: "livreur_injoignable", label: "Livreur injoignable" },
  { key: "autre", label: "Autre" },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

function IncidentDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  // Etat du workflow
  const [step, setStep] = useState<"main" | "contact" | "decision" | "transfer" | "cancel" | "escalate">("main");
  const [motif, setMotif] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Une erreur inconnue s'est produite.";
      toast.error("Erreur", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  /* ── Actions ────────────────────────────────────────────────── */

  const handleContactDone = () => {
    // Enregistrer le contact comme note
    if (motif || contactNote) {
      withLoading("contact", async () => {
        const fullNote = `[Contact livreur] Motif : ${motif || "non precise"}${contactNote ? ` — ${contactNote}` : ""}`;
        await addMyIncidentNote(id, fullNote);
        toast.success("Contact enregistre");
        setStep("decision");
      });
    } else {
      setStep("decision");
    }
  };

  const handleResolve = () =>
    withLoading("resolve", async () => {
      await resolveMyIncident(id, contactNote || "Probleme resolu apres contact du livreur");
      toast.success("Incident resolu — La livraison peut continuer");
      setStep("main");
    });

  const handleEscalate = () =>
    withLoading("escalate", async () => {
      if (!escalateReason.trim()) {
        toast.error("Expliquez la situation.");
        return;
      }
      await addMyIncidentNote(id, `[Escalade a GoLivra] ${escalateReason}`);
      await escalateMyIncident(id);
      toast.success("Situation remontee a GoLivra");
      setStep("main");
    });

  const handleCancel = () =>
    withLoading("cancel", async () => {
      if (!cancelReason.trim()) {
        toast.error("Indiquez la raison de l'annulation.");
        return;
      }
      await cancelMyIncident(id, cancelReason);
      toast.success("Livraison annulee");
      setStep("main");
    });

  const handleAddNote = () =>
    withLoading("note", async () => {
      if (!contactNote.trim()) return;
      await addMyIncidentNote(id, contactNote.trim());
      toast.success("Note enregistree");
      setContactNote("");
    });

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to="/entreprise/incidents">
          <ArrowLeft className="h-4 w-4" /> Retour
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
            ? `${inc.commerce?.nom || "Commerce inconnu"} — +${formatDelay(inc.delay_minutes)} de retard`
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
            {/* ── Situation ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  Situation actuelle
                  <Badge variant="secondary">{inc.statut}</Badge>
                  {severityBadge(inc.incident_level)}
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
                  <p className="text-xs text-muted-foreground">Adresse de livraison</p>
                  <p className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {inc.adresse_livraison || "Non renseignee"}
                  </p>
                </div>
                {inc.adresse_retrait ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Adresse de retrait</p>
                    <p className="flex items-start gap-1">
                      <Store className="mt-0.5 h-3 w-3 shrink-0" />
                      {inc.adresse_retrait}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* ── Colis ─────────────────────────────────────────── */}
            <Card
              className={
                inc.colis_recupere
                  ? "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"
                  : "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
              }
            >
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 shrink-0" />
                  {inc.colis_recupere ? (
                    <>
                      <span className="font-medium">Colis recupere</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-muted-foreground">
                        En possession de {inc.livreur?.nom || "le livreur"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Colis au commerce</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-muted-foreground">
                        Un nouveau livreur peut etre assigne
                      </span>
                    </>
                  )}
                </div>
                {inc.colis_recupere && inc.colis_necessite_transfert && (
                  <p className="mt-1.5 text-xs text-orange-700 dark:text-orange-300">
                    Un transfert physique est necessaire pour changer de livreur.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── WORKFLOW ──────────────────────────────────────── */}
            {step === "main" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-4 w-4" /> Que faire maintenant ?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {inc.colis_recupere
                      ? "Le colis est physiquement chez le livreur. Vous devez d'abord le contacter pour comprendre la situation."
                      : "Le colis n'a pas encore ete recupere. Vous pouvez contacter le commerce ou relancer l'attribution."}
                  </p>

                  {/* Etape 1 : Contacter */}
                  <Button
                    className="w-full justify-start gap-2"
                    variant="outline"
                    onClick={() => setStep("contact")}
                  >
                    <Phone className="h-4 w-4" />
                    1. Contacter le livreur
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>

                  <Separator />

                  {/* Actions rapides */}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions directes
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      disabled={!!loading}
                      onClick={() => void handleResolve()}
                    >
                      {loading === "resolve" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      Probleme resolu
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      disabled={!!loading}
                      onClick={() => setStep("transfer")}
                    >
                      <ArrowUpRight className="h-4 w-4 text-orange-600" />
                      Transferer le colis
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      disabled={!!loading}
                      onClick={() => setStep("cancel")}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                      Interrompre / Annuler
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => setStep("escalate")}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Remonter a GoLivra
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Etape 1 : Contact livreur ────────────────────── */}
            {step === "contact" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Etape 1 — Contacter le livreur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Appelez le livreur pour comprendre la situation, puis renseignez le motif ci-dessous.
                  </p>

                  {inc.livreur?.telephone ? (
                    <a
                      href={`tel:${inc.livreur.telephone}`}
                      className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
                    >
                      <Phone className="h-4 w-4" />
                      Appeler {inc.livreur.nom}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aucun numero de telephone disponible pour ce livreur.
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Motif du retard
                    </label>
                    <Select value={motif} onValueChange={setMotif}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionnez le motif" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOTIFS_INCIDENT.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Details (optionnel)
                    </label>
                    <Textarea
                      placeholder='Ex : "Le livreur a indique etre en panne a 5 km du commerce, attend un mecanicien"'
                      value={contactNote}
                      onChange={(e) => setContactNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep("main")}
                    >
                      Retour
                    </Button>
                    <Button
                      disabled={!!loading}
                      onClick={() => void handleContactDone()}
                    >
                      {loading === "contact" ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
                      Enregistrer et continuer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Etape 2 : Decision ───────────────────────────── */}
            {step === "decision" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Etape 2 — Que se passe-t-il ?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Apres avoir contacte le livreur, quelle est la situation ?
                  </p>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={!!loading}
                    onClick={() => void handleResolve()}
                  >
                    {loading === "resolve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Le probleme est resolu</p>
                      <p className="text-xs text-muted-foreground">
                        Le livreur peut continuer. L'incident est ferme.
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={!!loading}
                    onClick={() => setStep("transfer")}
                  >
                    <ArrowUpRight className="h-4 w-4 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium">Le livreur ne peut pas continuer</p>
                      <p className="text-xs text-muted-foreground">
                        {inc.colis_recupere
                          ? "Organiser un transfert physique du colis"
                          : "Relancer l'attribution a un autre livreur"}
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    disabled={!!loading}
                    onClick={() => setStep("main")}
                  >
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                    <div className="text-left">
                      <p className="font-medium">Remonter a GoLivra</p>
                      <p className="text-xs text-muted-foreground">
                        La situation necessite l'intervention de GoLivra
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground"
                    onClick={() => setStep("main")}
                  >
                    Retour
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Transfert ────────────────────────────────────── */}
            {step === "transfer" && (
              <Card className="border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Transfert du colis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inc.colis_recupere ? (
                    <>
                      <div className="rounded-md border border-orange-200 bg-orange-100 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
                        <p className="font-medium text-orange-800 dark:text-orange-200">
                          Le colis est actuellement chez {inc.livreur?.nom || "le livreur"}
                        </p>
                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                          Le nouveau livreur devra recuperer physiquement le colis
                          aupres du livreur actuel.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Motif du transfert
                        </label>
                        <Select value={motif} onValueChange={setMotif}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionnez le motif" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOTIFS_INCIDENT.map((m) => (
                              <SelectItem key={m.key} value={m.key}>
                                {m.label}
                              </SelectItem>
                        ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Details du transfert
                        </label>
                        <Textarea
                          placeholder="Decrivez la situation pour le nouveau livreur"
                          value={contactNote}
                          onChange={(e) => setContactNote(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Prochaine etape :
                        </p>
                        <p>
                          1. Selectionnez un nouveau livreur disponible
                        </p>
                        <p>
                          2. Le nouveau livreur se rend aupres du livreur actuel
                        </p>
                        <p>
                          3. Le colis est remis physiquement
                        </p>
                        <p>
                          4. Le nouveau livreur confirme la recuperation
                        </p>
                        <p>
                          5. La livraison reprend normalement
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Le colis n'a pas encore ete recupere. Vous pouvez simplement
                        relancer l'attribution pour trouver un nouveau livreur.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("decision")}>
                      Retour
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!!loading}
                      onClick={() => {
                        withLoading("transfer", async () => {
                          const note = `[Transfert demande] Motif : ${motif || "non precise"}${contactNote ? ` — ${contactNote}` : ""}`;
                          await addMyIncidentNote(id, note);
                          toast.success("Demande de transfert enregistree");
                          setStep("main");
                        });
                      }}
                    >
                      {loading === "transfer" ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
                      Enregistrer la demande
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Interruption / Annulation ─────────────────────── */}
            {step === "cancel" && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Interrompre ou annuler la livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inc.colis_recupere ? (
                    <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        Le colis est actuellement chez {inc.livreur?.nom || "le livreur"}
                      </p>
                      <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                        Cette action retire le livreur de la course. Le colis devra
                        etre recupere physiquement par un autre livreur ou retourne
                        au commerce.
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Que souhaitez-vous faire ?
                    </p>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        disabled={!!loading}
                        onClick={() => setStep("transfer")}
                      >
                        <ArrowUpRight className="h-4 w-4 text-orange-600" />
                        <div className="text-left">
                          <p className="font-medium">Interrompre et transferer</p>
                          <p className="text-xs text-muted-foreground">
                            Retirer le livreur actuel et trouver un remplacant
                          </p>
                        </div>
                      </Button>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Annuler definitivement la livraison
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Reserves aux cas ou la livraison ne peut plus etre effectuee :
                          colis perdu, detruit, ou situation impossible.
                        </p>
                        <Textarea
                          placeholder="Expliquez pourquoi la livraison ne peut plus etre effectuee"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("main")}>
                      Retour
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={!!loading || !cancelReason.trim()}
                      onClick={() => void handleCancel()}
                    >
                      {loading === "cancel" ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
                      Annuler definitivement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Escalade a GoLivra ─────────────────────────── */}
            {step === "escalate" && (
              <Card className="border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Remonter a GoLivra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    La situation necessite l'intervention de GoLivra. Expliquez le contexte ci-dessous.
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Description de la situation
                    </label>
                    <Textarea
                      placeholder="Expliquez pourquoi cette situation doit etre remontee..."
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("main")}>
                      Retour
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={!!loading || !escalateReason.trim()}
                      onClick={() => void handleEscalate()}
                    >
                      {loading === "escalate" ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
                      Remonter a GoLivra
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Note libre ────────────────────────────────────── */}
            {step === "main" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4" /> Ajouter une note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Note interne sur cette situation..."
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={!!loading || !contactNote.trim()}
                    onClick={() => void handleAddNote()}
                  >
                    {loading === "note" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    Enregistrer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Preuve de livraison ─────────────────────────── */}
            {inc.proof_photo_url ? (
              <Card className="border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Camera className="h-4 w-4" /> Preuve de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <img
                      src={inc.proof_photo_url}
                      alt="Preuve de livraison"
                      className="w-full object-cover"
                      style={{ maxHeight: 300 }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    {inc.proof_taken_at ? (
                      <div>
                        <p className="font-medium text-foreground">Horodatage</p>
                        <p>{new Date(inc.proof_taken_at).toLocaleString("fr-FR")}</p>
                      </div>
                    ) : null}
                    {inc.proof_gps_lat != null && inc.proof_gps_lng != null ? (
                      <div>
                        <p className="font-medium text-foreground">Position GPS</p>
                        <p>{inc.proof_gps_lat.toFixed(6)}, {inc.proof_gps_lng.toFixed(6)}</p>
                      </div>
                    ) : null}
                    {inc.proof_client_present != null ? (
                      <div>
                        <p className="font-medium text-foreground">Client present</p>
                        <p>{inc.proof_client_present ? "Oui" : "Non"}</p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* ── Chronologie ──────────────────────────────────── */}
            {inc.timeline?.length ? (
              <EventTimeline
                steps={inc.timeline.map((t, i) => ({
                  key: t.type || String(i),
                  label: t.titre || t.type,
                  at: t.date,
                  label_fr: t.date_label,
                }))}
                title="Chronologie"
              />
            ) : null}
          </div>

          {/* ── Colonne droite ────────────────────────────────── */}
          <div className="space-y-4">
            {/* Livreur */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Le livreur</CardTitle>
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
                    {inc.last_activity_ago != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        Derniere activite : il y a {inc.last_activity_ago} min
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Aucun livreur assigne.</p>
                )}
              </CardContent>
            </Card>

            {/* Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Le client</CardTitle>
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
                  <p className="text-muted-foreground">Aucune info client.</p>
                )}
              </CardContent>
            </Card>

            {/* Commerce */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Le commerce</CardTitle>
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
                  <p className="text-muted-foreground">Aucune info commerce.</p>
                )}
              </CardContent>
            </Card>

            {/* Actions effectuees */}
            {inc.operator_actions?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Actions effectuees ({inc.operator_actions.length})
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
                        <p className="text-xs text-muted-foreground">{a.details}</p>
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
