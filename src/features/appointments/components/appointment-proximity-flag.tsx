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
    "border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  tomorrow:
    "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  today:
    "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300",
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
