import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
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
} from "@/@/lib/admin-api";

function notificationIcon(type: string) {
  if (type.includes("incident") || type.includes("anomalie") || type.includes("bloquee")) {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }
  if (type.includes("retard")) {
    return <Clock className="h-4 w-4 text-orange-500" />;
  }
  if (type.includes("resolu") || type.includes("livree")) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

function notificationLink(n: AppNotification): string | null {
  const action = n.data?.action;
  if (action === "open_delivery" && n.data?.livraison_id) {
    return `/entreprise/incidents/${String(n.data.livraison_id)}`;
  }
  if (action === "vendor_delivery" && n.data?.livraison_id) {
    return `/entreprise/incidents/${String(n.data.livraison_id)}`;
  }
  if (n.type.includes("incident") && n.data?.livraison_id) {
    return `/entreprise/incidents/${String(n.data.livraison_id)}`;
  }
  if (n.type.includes("retard") && n.data?.livraison_id) {
    return `/entreprise/incidents/${String(n.data.livraison_id)}`;
  }
  if (n.type.includes("livraison")) {
    return "/entreprise/livraisons";
  }
  return null;
}

function isCriticalNotification(n: AppNotification): boolean {
  return (
    n.type.includes("incident") ||
    n.type.includes("anomalie") ||
    n.type.includes("bloquee") ||
    n.type.includes("injoignable")
  );
}

export function EntrepriseNotificationsBell() {
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 15_000,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: fetchNotifications,
    refetchInterval: 15_000,
  });

  const unread = countQuery.data ?? 0;
  const items = listQuery.data ?? [];
  const criticalCount = items.filter(
    (n) => !n.est_lue && isCriticalNotification(n)
  ).length;

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
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                criticalCount > 0 ? "bg-red-600" : "bg-destructive"
              }`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs font-medium text-primary"
              onClick={() => void markAll()}
            >
              Tout marquer lu
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Aucune notification.
          </p>
        ) : (
          items.slice(0, 15).map((n) => {
            const href = notificationLink(n);
            const critical = isCriticalNotification(n);
            const inner = (
              <div className="flex items-start gap-2 py-1">
                <div className="mt-0.5 shrink-0">
                  {notificationIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      n.est_lue
                        ? "text-muted-foreground"
                        : critical
                          ? "font-semibold text-destructive"
                          : "font-semibold text-foreground"
                    }`}
                  >
                    {n.titre}
                  </p>
                  {n.corps ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.corps}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground">
                    {formatDateTimeFr(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer items-start"
                onClick={() => {
                  if (!n.est_lue) void markRead(n.id);
                }}
                asChild={Boolean(href)}
              >
                {href ? <Link to={href}>{inner}</Link> : inner}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
