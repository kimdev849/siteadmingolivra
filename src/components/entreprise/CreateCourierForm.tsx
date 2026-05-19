import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMyCourier, type CreateCourierPayload } from "@/lib/logistics-api";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

const emptyForm = {
  nom: "",
  telephone: "",
  motDePasse: "",
  typeVehicule: "moto" as CreateCourierPayload["typeVehicule"],
  plaqueImmatriculation: "",
};

export function CreateCourierForm({ onSuccess, onCancel, submitLabel = "Créer le livreur" }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canSubmit =
    form.nom.trim().length > 0 && form.telephone.trim().length > 0 && form.motDePasse.length >= 6;

  const handleSubmit = async () => {
    setCreating(true);
    setError(null);
    try {
      await createMyCourier({
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        motDePasse: form.motDePasse,
        typeVehicule: form.typeVehicule,
        plaqueImmatriculation: form.plaqueImmatriculation.trim() || undefined,
      });
      setForm(emptyForm);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="livNom">Nom *</Label>
          <Input
            id="livNom"
            value={form.nom}
            onChange={(ev) => setForm((f) => ({ ...f, nom: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="livTel">Téléphone *</Label>
          <Input
            id="livTel"
            placeholder="+242061234567"
            value={form.telephone}
            onChange={(ev) => setForm((f) => ({ ...f, telephone: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="livVeh">Véhicule *</Label>
          <Select
            value={form.typeVehicule}
            onValueChange={(v) => setForm((f) => ({ ...f, typeVehicule: v as typeof f.typeVehicule }))}
          >
            <SelectTrigger id="livVeh">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moto">Moto</SelectItem>
              <SelectItem value="voiture">Voiture</SelectItem>
              <SelectItem value="velo">Vélo</SelectItem>
              <SelectItem value="pied">À pied</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="livMdp">Mot de passe app mobile * (min. 6)</Label>
          <Input
            id="livMdp"
            type="password"
            autoComplete="new-password"
            value={form.motDePasse}
            onChange={(ev) => setForm((f) => ({ ...f, motDePasse: ev.target.value }))}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="livPlaque">Plaque (optionnel)</Label>
          <Input
            id="livPlaque"
            value={form.plaqueImmatriculation}
            onChange={(ev) => setForm((f) => ({ ...f, plaqueImmatriculation: ev.target.value }))}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Le livreur utilisera ce téléphone et ce mot de passe sur l&apos;application mobile GoLivra.
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