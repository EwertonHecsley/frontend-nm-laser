import { Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getAppointmentProximity,
  type AppointmentProximity,
} from "@/features/appointments/utils";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const PROXIMITY_LABELS: Record<AppointmentProximity, string> = {
  normal: "Em breve",
  tomorrow: "Amanhã",
  today: "Hoje",
};

const PROXIMITY_CLASSES: Record<AppointmentProximity, string> = {
  normal:
    "border-primary/30 bg-primary/10 text-primary dark:text-pink-300",
  tomorrow:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  today:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function AppointmentProximityBadge({
  proximity,
}: {
  proximity: AppointmentProximity;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", PROXIMITY_CLASSES[proximity])}
    >
      <Flag className="size-3" aria-hidden="true" />
      {PROXIMITY_LABELS[proximity]}
    </Badge>
  );
}

export function AppointmentProximityFlag({
  scheduledAt,
  status,
}: {
  scheduledAt: string;
  status: AppointmentStatus;
}) {
  const proximity = getAppointmentProximity(scheduledAt, status);

  if (!proximity) {
    return null;
  }

  return <AppointmentProximityBadge proximity={proximity} />;
}

export function AppointmentProximityFilter({
  proximity,
  active,
  onClick,
}: {
  proximity: AppointmentProximity;
  active: boolean;
  onClick: () => void;
}) {
  const label = PROXIMITY_LABELS[proximity];

  return (
    <Badge
      asChild
      variant="outline"
      className={cn(
        "gap-1 font-medium transition",
        PROXIMITY_CLASSES[proximity],
        active
          ? "ring-2 ring-foreground/40 ring-offset-1 ring-offset-background"
          : "opacity-70 hover:opacity-100",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        title={active ? `Remover filtro "${label}"` : `Filtrar por "${label}"`}
        className="cursor-pointer"
      >
        <Flag className="size-3" aria-hidden="true" />
        {label}
      </button>
    </Badge>
  );
}
