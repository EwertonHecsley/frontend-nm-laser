"use client";

import {
  AlertTriangle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

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
import { useApiQuery, usePagination } from "@/hooks";
import { getRoleLabel } from "@/lib/auth/role-labels";
import { formatDate } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { usersService } from "@/services";
import type { ManagedUser } from "@/types";
import { toast } from "sonner";

export function UsersView() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [memberToDelete, setMemberToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => usersService.list({ signal }),
    "users",
  );

  const filteredUsers = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const list = data ?? [];

    return [...list]
      .filter((member) => {
        const haystack = [
          member.name,
          member.email,
          getRoleLabel(member.role),
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR");

        return haystack.includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [data, deferredSearch]);

  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredUsers,
    { resetKey: deferredSearch },
  );

  async function handleDelete() {
    if (!memberToDelete) return;

    setIsDeleting(true);
    try {
      await usersService.remove(memberToDelete.id);
      toast.success(`Integrante "${memberToDelete.name}" excluído.`);
      setMemberToDelete(null);
      refetch();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Cadastre e gerencie aplicadoras, vendedores e demais subordinados."
        actions={
          <Button asChild>
            <Link href="/users/new">
              <Plus className="size-4" />
              Novo integrante
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Integrantes da equipe</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">{filteredUsers.length}</Badge>
              )}
            </div>
            <CardDescription>
              Perfis disponíveis para cadastro: vendas e aplicadora.
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail ou perfil"
              aria-label="Buscar integrante"
              className="h-10 pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar a equipe</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <UsersRound className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {search
                    ? "Nenhum integrante encontrado"
                    : "Nenhum integrante cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Tente outro termo de busca."
                    : "Cadastre a primeira aplicadora ou vendedor da equipe."}
                </p>
              </div>
              {!search && (
                <Button asChild size="sm">
                  <Link href="/users/new">
                    <Plus className="size-4" />
                    Novo integrante
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getRoleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(member.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`Editar ${member.name}`}
                            >
                              <Link href={`/users/${member.id}/edit`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Excluir ${member.name}`}
                              onClick={() => setMemberToDelete(member)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={page}
                totalItems={totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
        title="Excluir integrante?"
        description={
          <>
            O integrante{" "}
            <strong className="font-medium text-foreground">
              {memberToDelete?.name}
            </strong>{" "}
            será removido permanentemente. Integrantes com vendas,
            agendamentos ou sessões vinculados não podem ser excluídos.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
