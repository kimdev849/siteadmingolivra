import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLogisticsCompanyAdmin, type CreateLogisticsCompanyPayload } from "@/lib/admin-api";

export type LogisticsCompanyCredentials = {
  email: string;
  motDePasse: string;
  nomEntreprise: string;
};

type Props = {
  onSuccess?: (credentials: LogisticsCompanyCredentials) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

const emptyForm = {
  nomEntreprise: "",
  telephoneEntreprise: "",
  emailEntreprise: "",
  responsableNom: "",
  responsableEmail: "",
  responsableMotDePasse: "",
  responsableTelephone: "",
};

export function CreateLogisticsCompanyForm({ onSuccess, onCancel, submitLabel = "Créer" }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canSubmit =
    form.nomEntreprise.trim().length > 0 &&
    form.responsableNom.trim().length > 0 &&
    form.responsableEmail.trim().length > 0 &&
    form.responsableMotDePasse.length >= 6;

  const handleSubmit = async () => {
    setCreating(true);
    setError(null);
    try {
      const respEmail = form.responsableEmail.trim().toLowerCase();
      const payload: CreateLogisticsCompanyPayload = {
        nomEntreprise: form.nomEntreprise.trim(),
        telephoneEntreprise: form.telephoneEntreprise.trim() || undefined,
        emailEntreprise: form.emailEntreprise.trim() || undefined,
        gestionnaire: {
          nom: form.responsableNom.trim(),
          email: respEmail,
          motDePasse: form.responsableMotDePasse,
          telephone: form.responsableTelephone.trim() || undefined,
        },
      };
      await createLogisticsCompanyAdmin(payload);
      const credentials: LogisticsCompanyCredentials = {
        email: respEmail,
        motDePasse: form.responsableMotDePasse,
        nomEntreprise: form.nomEntreprise.trim(),
      };
      setForm(emptyForm);
      onSuccess?.(credentials);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="nomEntreprise">Nom de l&apos;entreprise *</Label>
          <Input
            id="nomEntreprise"
            value={form.nomEntreprise}
            onChange={(ev) => setForm((f) => ({ ...f, nomEntreprise: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="telEntreprise">Contact</Label>
          <Input
            id="telEntreprise"
            placeholder="+242…"
            value={form.telephoneEntreprise}
            onChange={(ev) => setForm((f) => ({ ...f, telephoneEntreprise: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="emailEntreprise">E-mail</Label>
          <Input
            id="emailEntreprise"
            type="email"
            value={form.emailEntreprise}
            onChange={(ev) => setForm((f) => ({ ...f, emailEntreprise: ev.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-6">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="respNom">Responsable *</Label>
          <Input
            id="respNom"
            value={form.responsableNom}
            onChange={(ev) => setForm((f) => ({ ...f, responsableNom: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="respTel">Contact</Label>
          <Input
            id="respTel"
            placeholder="+242…"
            value={form.responsableTelephone}
            onChange={(ev) => setForm((f) => ({ ...f, responsableTelephone: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="respEmail">E-mail *</Label>
          <Input
            id="respEmail"
            type="email"
            value={form.responsableEmail}
            onChange={(ev) => setForm((f) => ({ ...f, responsableEmail: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="respMdp">Mot de passe * (min. 6)</Label>
          <Input
            id="respMdp"
            type="password"
            autoComplete="new-password"
            value={form.responsableMotDePasse}
            onChange={(ev) => setForm((f) => ({ ...f, responsableMotDePasse: ev.target.value }))}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Le responsable se connecte sur la même page avec son e-mail (espace entreprise, pas l&apos;admin).
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canSubmit || creating} onClick={() => void handleSubmit()}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={creating} onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </div>
  );
}
