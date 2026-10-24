"use client";

import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { shortId, sortSessionsByPerformedAt } from "@/features/sessions/utils";
import { useApiQuery } from "@/hooks";
import { formatDateTime } from "@/lib/format/date";
import { sessionsService } from "@/services";
import type { SessionRecord } from "@/types";

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

function SessionCard({ session }: { session: SessionRecord }) {
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
                Sessão {session.sessionNumber}
              </CardTitle>
              <CardDescription>
                {formatDateTime(session.performedAt)}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono">
            #{session.sessionNumber}
          </Badge>
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
            <p className="line-clamp-3 break-all whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-xs">
              {session.signature}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Agendamento:{" "}
            <span className="font-mono">{shortId(session.appointmentId)}</span>
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

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full" />
      ))}
    </div>
  );
}

export function SessionsView({
  initialPatientId,
  canWrite,
}: {
  initialPatientId: string;
  canWrite: boolean;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => sessionsService.listByPatient(patientId, { signal }),
    `sessions:${patientId}`,
    { enabled: Boolean(patientId) },
  );

  const sessions = sortSessionsByPerformedAt(data ?? []);

  const createAction = canWrite ? (
    <Button asChild>
      <Link
        href={
          patientId
            ? `/sessions/new?patientId=${encodeURIComponent(patientId)}`
            : "/sessions/new"
        }
      >
        <Plus className="size-4" />
        Nova sessão
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões"
        description="Consulte o histórico de sessões e os parâmetros técnicos registrados por paciente."
        actions={createAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente</CardTitle>
          <CardDescription>
            Selecione a paciente para visualizar o histórico de sessões.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <Field>
            <FieldLabel htmlFor="session-patient">Paciente</FieldLabel>
            <PatientCombobox
              id="session-patient"
              value={patientId}
              onChange={setPatientId}
            />
          </Field>
        </CardContent>
      </Card>

      {!patientId ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Selecione uma paciente</p>
            <p className="text-sm text-muted-foreground">
              O histórico de sessões é exibido por paciente.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar as sessões</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetch}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarClock className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Nenhuma sessão registrada</p>
            <p className="text-sm text-muted-foreground">
              {canWrite
                ? "Registre a primeira sessão desta paciente."
                : "Ainda não há sessões registradas para esta paciente."}
            </p>
          </div>
          {canWrite && (
            <Button asChild size="sm">
              <Link
                href={`/sessions/new?patientId=${encodeURIComponent(patientId)}`}
              >
                <Plus className="size-4" />
                Nova sessão
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
