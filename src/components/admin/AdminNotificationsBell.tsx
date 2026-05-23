import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  formatDateTimeFr,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/admin-api";

function notificationLink(n: AppNotification): string | null {
  const action = n.data?.action;
  if (action === "review_enterprise" && n.data?.enterprise_id) {
    return `/admin/marchands/${String(n.data.enterprise_id)}`;
  }
  if (action === "open_delivery" && n.data?.livraison_id) {
    return `/admin/livraisons/${String(n.data.livraison_id)}`;
  }
  if (n.type === "commerce_en_attente") return "/admin/marchands";
  if (n.type === "compte_marchand_en_attente") return "/admin/comptes";
  if (n.type === "livraison_externe" && n.data?.livraison_id) {
    return `/admin/livraisons/${String(n.data.livraison_id)}`;
  }
  if (n.type === "retard_livraison") return "/admin/livraisons";
  return null;
}

export function AdminNotificationsBell() {
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 30_000,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  const unread = countQuery.data ?? 0;
  const items = listQuery.data ?? [];

  const onOpenChange = (open: boolean) => {
    if (open) void listQuery.refetch();
  };

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unread > 0 ? (
            <button type="button" className="text-xs font-medium text-primary" onClick={() => void markAll()}>
              Tout marquer lu
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Aucune notification.</p>
        ) : (
          items.slice(0, 12).map((n) => {
            const href = notificationLink(n);
            const inner = (
              <div className="flex flex-col gap-0.5 py-0.5">
                <span className={`text-sm ${n.est_lue ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                  {n.titre}
                </span>
                {n.corps ? <span className="text-xs text-muted-foreground line-clamp-2">{n.corps}</span> : null}
                <span className="text-[10px] text-muted-foreground">{formatDateTimeFr(n.created_at)}</span>
              </div>
            );
            return (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer items-start"
                onClick={() => {
                  if (!n.est_lue) void markRead(n.id);
                }}
                asChild={Boolean(href)}>
                {href ? <Link to={href}>{inner}</Link> : inner}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
