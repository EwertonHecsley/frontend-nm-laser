"use client";

import { ClipboardList, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAppointmentStatusLabel } from "@/features/appointments/utils";
import {
  SESSION_STATUS_BADGE_VARIANTS,
  SESSION_STATUS_OPTIONS,
  getSessionStatusLabel,
  isSignatureImage,
  shortId,
} from "@/features/sessions/utils";
import { formatDateTime } from "@/lib/format/date";
import type { Appointment, SessionOverviewItem, SessionStatus } from "@/types";

interface TechItemProps {
  label: string;
  value: string | null;
}

function TechItem({ label, value }: TechItemProps) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value?.trim() || "—"}</dd>
    </div>
  );
}

export function SessionCard({
  session,
  appointment,
  canWrite,
  canDelete = false,
  isUpdating,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  session: SessionOverviewItem;
  appointment?: Appointment;
  canWrite: boolean;
  canDelete?: boolean;
  isUpdating: boolean;
  onEdit: (session: SessionOverviewItem) => void;
  onStatusChange: (status: SessionStatus) => void;
  onDelete?: (session: SessionOverviewItem) => void;
}) {
  const sessionStatus = session.status ?? "completed";
  const normalizedStatus: SessionStatus =
    sessionStatus === "in_progress" || sessionStatus === "cancelled"
      ? sessionStatus
      : "completed";
  const badgeVariant =
    SESSION_STATUS_BADGE_VARIANTS[normalizedStatus] ?? "default";
  const statusLabel = getSessionStatusLabel(normalizedStatus);

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <ClipboardList className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base">
                {session.patient.fullName}
              </CardTitle>
              <CardDescription>
                Sessão {session.sessionNumber} ·{" "}
                {formatDateTime(session.performedAt)}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canWrite ? (
              <Select
                value={normalizedStatus}
                onValueChange={(value) =>
                  onStatusChange(value as SessionStatus)
                }
                disabled={isUpdating}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full min-w-36"
                  aria-label={`Alterar status da sessão ${session.sessionNumber}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            )}
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(session)}
                className="h-8 gap-1.5"
              >
                <Pencil className="size-3.5" />
                <span>Editar</span>
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(session)}
                className="h-8 gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                <span>Excluir</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TechItem label="Potência" value={session.potency} />
          <TechItem label="Frequência" value={session.frequency} />
          <TechItem label="Técnica" value={session.technique} />
          <TechItem
            label="Energia acumulada"
            value={session.energyAccumulated}
          />
        </dl>

        {(session.packageName || session.areas.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Pacote contratado
            </p>
            <p className="text-sm">
              {session.packageName ?? "Pacote não identificado"}
            </p>
            {session.areas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {session.areas.map((area) => (
                  <Badge key={area.id} variant="secondary">
                    {area.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {session.observations && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Observações
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {session.observations}
            </p>
          </div>
        )}

        {session.signature && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Assinatura
            </p>
            {isSignatureImage(session.signature) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.signature}
                alt={`Assinatura da sessão ${session.sessionNumber}`}
                className="h-24 w-full max-w-md rounded-lg border bg-background object-contain p-2"
              />
            ) : (
              <p className="line-clamp-3 break-all whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                {session.signature}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Agendamento:{" "}
            {appointment ? (
              <span className="font-mono">
                {shortId(appointment.id)} (
                {getAppointmentStatusLabel(appointment.status)})
              </span>
            ) : (
              <span className="font-mono">{shortId(session.appointmentId)}</span>
            )}
          </span>
          <span>
            Aplicador:{" "}
            <span className="font-mono">{shortId(session.applicatorId)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
