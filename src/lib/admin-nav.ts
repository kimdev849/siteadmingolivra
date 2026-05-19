import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  Truck,
  ShoppingBag,
  Percent,
  BarChart3,
  Settings,
  Users,
} from "lucide-react";

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
  { to: "/admin/commissions", label: "Commissions", icon: Percent },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];
