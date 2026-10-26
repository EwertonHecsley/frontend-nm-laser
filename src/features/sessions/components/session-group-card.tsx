"use client";

import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Layers,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format/date";
import type { SessionGroupSummary } from "@/types";

function GroupMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <span className={`grid size-8 place-items-center rounded-md ${tone}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function SessionGroupCard({ group }: { group: SessionGroupSummary }) {
  const completionRate =
    group.total > 0 ? Math.round((group.completed / group.total) * 100) : 0;

  return (
    <Link
      href={`/sessions/${encodeURIComponent(group.id)}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition group-hover:ring-primary/40 group-focus-visible:ring-2">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                <Layers className="size-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-mono text-base">
                    {group.code}
                  </CardTitle>
                  <Badge variant="outline">{group.patient.fullName}</Badge>
                </div>
                <CardDescription>
                  {group.packageName ?? "Sem pacote vinculado"} ·{" "}
                  {group.total}{" "}
                  {group.total === 1 ? "sessão individual" : "sessões individuais"}
                </CardDescription>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm text-muted-foreground transition group-hover:text-foreground">
              Ver sessões
              <ChevronRight className="size-4" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <GroupMetric
              icon={CircleCheck}
              label="Concluídas"
              value={group.completed}
              tone="bg-emerald-600/10 text-emerald-700"
            />
            <GroupMetric
              icon={Clock}
              label="Em andamento"
              value={group.inProgress}
              tone="bg-amber-500/10 text-amber-700"
            />
            <GroupMetric
              icon={CircleX}
              label="Canceladas"
              value={group.cancelled}
              tone="bg-rose-600/10 text-rose-700"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{completionRate}% concluído</span>
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                Última sessão:{" "}
                {group.lastPerformedAt
                  ? formatDateTime(group.lastPerformedAt)
                  : "—"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
