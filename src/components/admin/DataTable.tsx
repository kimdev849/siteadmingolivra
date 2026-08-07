import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

interface DataTableProps {
  columns: string[];
  rows?: ReactNode[][];
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (index: number) => void;
}

export function DataTable({ columns, rows, emptyTitle, emptyDescription, onRowClick }: DataTableProps) {
  const hasRows = rows && rows.length > 0;

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasRows ? (
            rows.map((row, i) => {
              const handleRowClick = onRowClick
                ? (e: ReactMouseEvent<HTMLTableRowElement>) => {
                    // Les éléments interactifs (liens, boutons, champs) gèrent
                    // leur propre clic : on laisse la navigation au Link/Button
                    // et on évite le double déclenchement.
                    const target = e.target as HTMLElement | null;
                    if (target?.closest?.("a, button, input, select, textarea")) return;
                    onRowClick(i);
                  }
                : undefined;
              return (
                <TableRow
                  key={i}
                  onClick={handleRowClick}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                >
                  {row.map((cell, j) => (
                    <TableCell key={j} className="text-sm">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
