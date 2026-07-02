import type { LucideIcon } from "lucide-react";
import {
  Globe,
  LayoutDashboard,
  Store,
  Truck,
  ShoppingBag,
  Percent,
  BarChart3,
  MapPin,
  Settings,
  Users,
  Wallet,
  Receipt,
  Package,
  AlertTriangle,
  Activity,
  Bell,
  Megaphone,
} from "lucide-react";

/** Rafraîchissement auto des écrans admin (commandes, livraisons, dashboard). */
export const ADMIN_LIVE_REFETCH_MS = 15_000;

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/marchands", label: "Restaurants & Boutiques", icon: Store },
  { to: "/admin/comptes", label: "Comptes en attente", icon: Users },
  { to: "/admin/transporteurs", label: "Entreprises de livraison", icon: Truck },
  { to: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { to: "/admin/livraisons", label: "Livraisons", icon: Package },
  { to: "/admin/observabilite", label: "Observabilité", icon: AlertTriangle },
  { to: "/admin/sante-endpoints", label: "Santé plateforme", icon: Activity },
  { to: "/admin/alertes", label: "Alertes", icon: Bell },
  { to: "/admin/portefeuille", label: "Portefeuille GoLivra", icon: Wallet },
  { to: "/admin/commissions", label: "Commissions livraison", icon: Percent },
  { to: "/admin/pays", label: "Pays & Villes", icon: Globe },
  { to: "/admin/zones", label: "Zones livraison", icon: MapPin },
  { to: "/admin/retraits", label: "Retraits", icon: Receipt },
  { to: "/admin/campagnes", label: "Campagnes", icon: Megaphone },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];
