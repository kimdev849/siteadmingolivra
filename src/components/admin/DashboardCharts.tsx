import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminCharts } from "@/lib/admin-api";

function formatDayLabel(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export function DashboardCharts() {
  const chartsQuery = useQuery({
    queryKey: ["admin", "charts", 30],
    queryFn: () => fetchAdminCharts(30),
  });

  const ordersData =
    chartsQuery.data?.orders_by_day.map((d) => ({
      label: formatDayLabel(d.date),
      commandes: d.count ?? 0,
    })) ?? [];

  const commissionsData =
    chartsQuery.data?.commissions_by_day.map((d) => ({
      label: formatDayLabel(d.date),
      commission: d.amount_fcfa ?? 0,
    })) ?? [];

  if (chartsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Chargement des graphiques…</CardContent>
        </Card>
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Chargement des graphiques…</CardContent>
        </Card>
      </div>
    );
  }

  if (chartsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger les graphiques. Vérifiez que le backend est à jour.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Commandes (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ordersData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="commandes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Commissions GoLivra (30 jours)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={commissionsData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => [`${Number(v).toLocaleString("fr-FR")} FCFA`, "Commission"]}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
