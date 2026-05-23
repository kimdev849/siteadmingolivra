import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  estDisponible?: boolean;
  compteActif?: boolean;
};

/** Disponibilité course : distincte du compte actif/suspendu. */
export function CourierAvailabilityBadge({ estDisponible, compteActif = true }: Props) {
  if (!compteActif) {
    return <Badge variant="destructive">Compte suspendu</Badge>;
  }

  if (estDisponible) {
    return <Badge variant="default">Disponible</Badge>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-help">
            Hors ligne
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          Normal après création : le livreur doit passer « disponible » sur l&apos;application
          mobile GoLivra pour recevoir des courses. Vous pouvez aussi l&apos;activer depuis sa fiche
          détail.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
