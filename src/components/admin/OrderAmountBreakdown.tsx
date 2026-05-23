type OrderAmountBreakdownProps = {
  sousTotal: number;
  fraisLivraison: number;
  remise?: number;
  total: number;
  /** Une ligne pour les tableaux */
  inline?: boolean;
  /** Note commission livraison uniquement (défaut : oui sauf si inline) */
  showCommissionNote?: boolean;
};

function fmt(n: number): string {
  return `${Number(n).toLocaleString("fr-FR")} FCFA`;
}

/** Détail produits + livraison = total payé par le client (sans commission sur ventes). */
export function OrderAmountBreakdown({
  sousTotal,
  fraisLivraison,
  remise = 0,
  total,
  inline = false,
  showCommissionNote,
}: OrderAmountBreakdownProps) {
  const note = showCommissionNote ?? !inline;
  if (inline) {
    const parts = [fmt(sousTotal)];
    if (fraisLivraison > 0) parts.push(`+ ${fmt(fraisLivraison)} livr.`);
    if (remise > 0) parts.push(`− ${fmt(remise)}`);
    return (
      <span className="text-sm" title="Produits + livraison − remise = total client">
        {parts.join(" ")} = <strong>{fmt(total)}</strong>
      </span>
    );
  }

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <dt>Produits</dt>
        <dd>{fmt(sousTotal)}</dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <dt>Livraison</dt>
        <dd>{fmt(fraisLivraison)}</dd>
      </div>
      {remise > 0 ? (
        <div className="flex justify-between text-muted-foreground">
          <dt>Remise</dt>
          <dd>− {fmt(remise)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
        <dt>Total payé client</dt>
        <dd>{fmt(total)}</dd>
      </div>
      {note ? (
        <p className="text-xs text-muted-foreground">
          Aucune commission GoLivra sur les ventes — commission uniquement sur les frais de livraison.
        </p>
      ) : null}
    </dl>
  );
}
