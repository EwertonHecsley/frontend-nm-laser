"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EditSessionDialog } from "@/features/sessions/components/edit-session-dialog";
import { SessionCard } from "@/features/sessions/components/session-card";
import { sortSessionsByNumber } from "@/features/sessions/utils";
import { useApiQuery, usePagination } from "@/hooks";
import { formatDateTime } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import {
  appointmentsService,
  salesService,
  sessionsService,
} from "@/services";
import type { SessionOverviewItem, SessionStatus } from "@/types";

function GroupStats({
  completed,
  inProgress,
  cancelled,
}: {
  completed: number;
  inProgress: number;
  cancelled: number;
}) {
  const items = [
    {
      label: "Concluídas",
      value: completed,
      icon: CircleCheck,
      tone: "bg-emerald-600/10 text-emerald-700",
    },
    {
      label: "Em andamento",
      value: inProgress,
      icon: Clock,
      tone: "bg-amber-500/10 text-amber-700",
    },
    {
      label: "Canceladas",
      value: cancelled,
      icon: CircleX,
      tone: "bg-rose-600/10 text-rose-700",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} size="sm">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
            </div>
            <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function SessionGroupDetailView({
  groupId,
  canWrite,
  canDelete = false,
  canCreateSale = false,
}: {
  groupId: string;
  canWrite: boolean;
  canDelete?: boolean;
  canCreateSale?: boolean;
}) {
  const [editingSession, setEditingSession] =
    useState<SessionOverviewItem | null>(null);
  const [sessionToDelete, setSessionToDelete] =
    useState<SessionOverviewItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => sessionsService.getGroup(groupId, { signal }),
    `session-group:${groupId}`,
  );

  const {
    data: appointments,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useApiQuery(
    (signal) => appointmentsService.list({}, { signal }),
    "session-group-appointments",
  );

  const patientId = data?.group.patientId ?? "";
  const {
    data: sales,
    error: salesError,
    isLoading: salesLoading,
    refetch: refetchSales,
  } = useApiQuery(
    (signal) => salesService.listByPatient(patientId, { signal }),
    `session-group-sales:${patientId}`,
    { enabled: Boolean(patientId) },
  );

  const sessions = useMemo(
    () => sortSessionsByNumber(data?.sessions ?? []),
    [data],
  );
  const appointmentsById = useMemo(
    () =>
      new Map(
        (appointments ?? []).map((appointment) => [
          appointment.id,
          appointment,
        ]),
      ),
    [appointments],
  );
  const editingAppointments = useMemo(
    () =>
      (appointments ?? []).filter(
        (appointment) =>
          appointment.patientId === (editingSession?.patientId ?? ""),
      ),
    [appointments, editingSession?.patientId],
  );
  const { pageItems, page, totalItems, setPage } = usePagination(sessions, {
    resetKey: groupId,
  });

  function retry() {
    refetch();
    refetchAppointments();
    refetchSales();
  }

  async function handleStatusChange(
    session: SessionOverviewItem,
    nextStatus: SessionStatus,
  ) {
    const currentStatus =
      session.status === "in_progress" || session.status === "cancelled"
        ? session.status
        : "completed";

    if (currentStatus === nextStatus) return;

    setUpdatingId(session.id);
    const toastId = toast.loading("Atualizando status da sessão…");
    try {
      await sessionsService.update(session.id, { status: nextStatus });
      toast.success("Status da sessão atualizado.", { id: toastId });
      refetch();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError), { id: toastId });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      const wasLastSession = sessions.length <= 1;
      await sessionsService.remove(sessionToDelete.id);
      toast.success("Sessão excluída.");
      setSessionToDelete(null);
      if (wasLastSession) {
        router.push("/sessions");
      } else {
        refetch();
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  const group = data?.group;
  const newSessionHref = group
    ? `/sessions/new?patientId=${encodeURIComponent(group.patientId)}${group.saleId ? `&saleId=${encodeURIComponent(group.saleId)}` : ""}&groupId=${encodeURIComponent(group.id)}`
    : "/sessions/new";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          group ? `Tratamento pessoal ${group.code}` : "Tratamento pessoal"
        }
        description={
          group
            ? `${group.patient.fullName} · ${group.packageName ?? "Sem pacote vinculado"}`
            : "Sessões individuais vinculadas ao cliente."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/sessions">
                <ArrowLeft className="size-4" />
                Voltar
              </Link>
            </Button>
            {canWrite && (
              <Button asChild>
                <Link href={newSessionHref}>
                  <Plus className="size-4" />
                  Nova sessão individual
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {isLoading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            Não foi possível carregar o tratamento pessoal
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={retry}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : group && data ? (
        <>
          <Card size="sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    Informações do tratamento pessoal
                  </CardTitle>
                  <CardDescription>
                    Código único do atendimento do cliente.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-sm">
                  {group.code}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Paciente
                </p>
                <p className="text-sm">{group.patient.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pacote
                </p>
                <p className="text-sm">
                  {group.packageName ?? "Sem pacote vinculado"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Sessões individuais
                </p>
                <p className="text-sm tabular-nums">{data.stats.total}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Próxima numeração
                </p>
                <p className="text-sm tabular-nums">
                  {data.nextSessionNumber}
                </p>
              </div>
            </CardContent>
          </Card>

          <GroupStats
            completed={data.stats.completed}
            inProgress={data.stats.inProgress}
            cancelled={data.stats.cancelled}
          />

          <section aria-labelledby="group-sessions" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 id="group-sessions" className="text-lg font-semibold">
                  Sessões individuais
                </h2>
                <p className="text-sm text-muted-foreground">
                  Atualize o status de cada sessão ou edite os detalhes do
                  atendimento.
                </p>
              </div>
              <Badge variant="secondary">
                {sessions.length}{" "}
                {sessions.length === 1 ? "sessão" : "sessões"}
              </Badge>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <ClipboardList className="size-6" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">
                    Nenhuma sessão individual registrada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Registre a primeira sessão individual deste tratamento
                    pessoal.
                  </p>
                </div>
                {canWrite && (
                  <Button asChild size="sm">
                    <Link href={newSessionHref}>
                      <Plus className="size-4" />
                      Nova sessão individual
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {pageItems.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    appointment={
                      session.appointmentId
                        ? appointmentsById.get(session.appointmentId)
                        : undefined
                    }
                    canWrite={canWrite}
                    canDelete={canDelete}
                    isUpdating={updatingId === session.id}
                    onEdit={setEditingSession}
                    onDelete={setSessionToDelete}
                    onStatusChange={(nextStatus) =>
                      handleStatusChange(session, nextStatus)
                    }
                  />
                ))}
                <Pagination
                  page={page}
                  totalItems={totalItems}
                  onPageChange={setPage}
                />
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Criada em {formatDateTime(group.createdAt)} · Atualizada em{" "}
            {formatDateTime(group.updatedAt)}
          </p>
        </>
      ) : null}

      <EditSessionDialog
        session={editingSession}
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
        appointments={editingAppointments}
        sales={sales ?? []}
        isLoadingAppointments={appointmentsLoading}
        isLoadingSales={salesLoading}
        salesError={salesError}
        canCreateSale={canCreateSale}
        newSaleHref={
          patientId
            ? `/sales/new?patientId=${encodeURIComponent(patientId)}`
            : undefined
        }
        onRetrySales={refetchSales}
        onSuccess={() => {
          setEditingSession(null);
          retry();
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
        title="Excluir sessão?"
        description={
          <>
            A sessão {sessionToDelete?.sessionNumber} de{" "}
            <strong className="font-medium text-foreground">
              {sessionToDelete?.patient.fullName}
            </strong>{" "}
            será removida permanentemente. Se ela estiver concluída, o saldo
            do pacote será recalculado.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
