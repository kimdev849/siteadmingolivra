import type { ActiveCourier } from "@/lib/admin-api";

/** Libellés d'état opérationnel d'un livreur. */
export const COURIER_STATUS_LABEL: Record<ActiveCourier["statut"], string> = {
  en_course: "En course",
  disponible: "Disponible",
  hors_ligne: "Hors ligne",
};

/** Libellés lisibles des statuts d'une course en cours. */
export const COURSE_STATUT_LABEL: Record<string, string> = {
  attribuee: "Livreur en route",
  en_collecte: "Vers le commerce",
  collectee: "Commande récupérée",
  en_route: "En livraison",
};
