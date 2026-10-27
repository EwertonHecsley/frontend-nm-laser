"use client";

import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpf, formatPhone } from "@/features/patients/utils";
import { useApiQuery, useDebouncedValue } from "@/hooks";
import { formatDateOnly } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { citiesService, patientsService } from "@/services";
import type { Patient } from "@/types";

const PAGE_SIZE = 5;

function PatientActions({
  patient,
  canWrite,
  canDelete,
  canViewHistory,
  onDelete,
}: {
  patient: Patient;
  canWrite: boolean;
  canDelete: boolean;
  canViewHistory: boolean;
  onDelete: (patient: Patient) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        asChild
        aria-label={
          canViewHistory
            ? `Ver histórico completo de ${patient.fullName}`
            : `Ver histórico de sessões de ${patient.fullName}`
        }
      >
        <Link
          href={
            canViewHistory
              ? `/patients/${patient.id}/history`
              : `/sessions?patientId=${patient.id}`
          }
        >
          <ClipboardList className="size-4" />
        </Link>
      </Button>
      {canWrite && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          asChild
          aria-label={`Editar ${patient.fullName}`}
        >
          <Link href={`/patients/${patient.id}/edit`}>
            <Pencil className="size-4" />
          </Link>
        </Button>
      )}
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(patient)}
          aria-label={`Excluir ${patient.fullName}`}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

function PatientIdentity({
  patient,
  cityName,
  canViewHistory,
  showCity = false,
}: {
  patient: Patient;
  cityName: string | null;
  canViewHistory: boolean;
  showCity?: boolean;
}) {
  const details = (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium">{patient.fullName}</p>
      <p className="text-xs text-muted-foreground">
        CPF {formatCpf(patient.cpf)}
      </p>
      {showCity && (
        <p className="text-xs text-muted-foreground">
          {cityName ?? "Cidade não encontrada"}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={
        showCity
          ? "flex min-w-0 items-start gap-3"
          : "flex items-center gap-2"
      }
    >
      <span
        className={`grid ${
          showCity ? "size-9" : "size-8"
        } shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground`}
      >
        <UserRound className="size-4" aria-hidden="true" />
      </span>
      {canViewHistory ? (
        <Link
          href={`/patients/${patient.id}/history`}
          className="min-w-0 cursor-pointer rounded-md transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {details}
        </Link>
      ) : (
        details
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function PatientsView({
  canWrite,
  canDelete,
  canViewHistory,
}: {
  canWrite: boolean;
  canDelete: boolean;
  canViewHistory: boolean;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) =>
      patientsService.list(
        {
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch.trim() || undefined,
        },
        { signal },
      ),
    `patients:${page}:${debouncedSearch.trim()}`,
  );

  const { data: cities } = useApiQuery(
    (signal) => citiesService.list({ signal }),
    "cities",
  );

  const cityNames = useMemo(
    () => new Map((cities ?? []).map((city) => [city.id, city.name])),
    [cities],
  );

  const patients = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleDelete() {
    if (!patientToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await patientsService.remove(patientToDelete.id);
      toast.success(`Paciente "${patientToDelete.fullName}" excluído.`);
      setPatientToDelete(null);

      if (patients.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        refetch();
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  const createAction = canWrite ? (
    <Button asChild>
      <Link href="/patients/new">
        <Plus className="size-4" />
        Novo paciente
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Consulte o cadastro por nome ou CPF. A edição é permitida para gestora e vendas; a exclusão é exclusiva da gestora."
        actions={createAction}
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Lista de pacientes</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">{total}</Badge>
              )}
            </div>
            <CardDescription>
              {debouncedSearch
                ? `Resultados para "${debouncedSearch}".`
                : "Pacientes cadastrados na clínica."}
            </CardDescription>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Buscar por nome ou CPF"
              aria-label="Buscar por nome ou CPF"
              className="h-10 pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar os pacientes</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                {debouncedSearch ? (
                  <Search className="size-6" aria-hidden="true" />
                ) : (
                  <Users className="size-6" aria-hidden="true" />
                )}
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {debouncedSearch
                    ? "Nenhum paciente encontrado"
                    : "Nenhum paciente cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {debouncedSearch
                    ? "Tente buscar por outro nome ou CPF."
                    : canWrite
                      ? "Cadastre o primeiro paciente para começar."
                      : "Ainda não há pacientes cadastrados."}
                </p>
              </div>
              {debouncedSearch ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearchChange("")}
                >
                  Limpar busca
                </Button>
              ) : canWrite ? (
                <Button asChild size="sm">
                  <Link href="/patients/new">
                    <Plus className="size-4" />
                    Novo paciente
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Nascimento
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        WhatsApp
                      </TableHead>
                      <TableHead className="w-[1%] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <PatientIdentity
                            patient={patient}
                            cityName={cityNames.get(patient.cityId) ?? null}
                            canViewHistory={canViewHistory}
                          />
                        </TableCell>
                        <TableCell>
                          {cityNames.get(patient.cityId) ?? "—"}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDateOnly(patient.birthDate)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground xl:table-cell">
                          {formatPhone(patient.whatsapp)}
                        </TableCell>
                        <TableCell className="text-right">
                          <PatientActions
                            patient={patient}
                            canWrite={canWrite}
                            canDelete={canDelete}
                            canViewHistory={canViewHistory}
                            onDelete={setPatientToDelete}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {patients.map((patient) => (
                  <Card key={patient.id} size="sm">
                    <CardContent className="flex items-start justify-between gap-3">
                      <PatientIdentity
                        patient={patient}
                        cityName={cityNames.get(patient.cityId) ?? null}
                        canViewHistory={canViewHistory}
                        showCity
                      />
                      <PatientActions
                        patient={patient}
                        canWrite={canWrite}
                        canDelete={canDelete}
                        canViewHistory={canViewHistory}
                        onDelete={setPatientToDelete}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!isLoading && !error && (
            <Pagination
              page={page}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(patientToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPatientToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              O paciente{" "}
              <strong className="font-medium text-foreground">
                {patientToDelete?.fullName}
              </strong>{" "}
              será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
