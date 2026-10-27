"use client";

import {
  AlertTriangle,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Trash2,
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
import { formatDate } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { areasService } from "@/services";
import type { Area } from "@/types";
import { toast } from "sonner";

export function AreasView({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => areasService.list({ signal }),
    "areas",
  );

  const filteredAreas = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const list = data ?? [];

    return [...list]
      .filter((area) => area.name.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [data, deferredSearch]);

  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredAreas,
    { resetKey: deferredSearch },
  );

  async function handleDelete() {
    if (!areaToDelete) return;

    setIsDeleting(true);
    try {
      await areasService.remove(areaToDelete.id);
      toast.success(`Área "${areaToDelete.name}" excluída.`);
      setAreaToDelete(null);
      refetch();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  const createAction = canManage ? (
    <Button asChild>
      <Link href="/areas/new">
        <Plus className="size-4" />
        Nova área
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Áreas"
        description="Catálogo de regiões tratadas, usado nos pacotes e nas sessões."
        actions={createAction}
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Catálogo de áreas</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">{filteredAreas.length}</Badge>
              )}
            </div>
            <CardDescription>
              {canManage
                ? "Cadastre e edite as áreas disponíveis para os pacotes."
                : "Somente a gestora pode alterar o catálogo de áreas."}
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
              placeholder="Buscar área"
              aria-label="Buscar área"
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
              <AlertTitle>Não foi possível carregar as áreas</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredAreas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <ScanLine className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {search ? "Nenhuma área encontrada" : "Nenhuma área cadastrada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Tente outro termo de busca."
                    : "Cadastre a primeira área para montar os pacotes."}
                </p>
              </div>
              {canManage && !search && (
                <Button asChild size="sm">
                  <Link href="/areas/new">
                    <Plus className="size-4" />
                    Nova área
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
                      <TableHead>Área</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell className="font-medium">
                          {area.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(area.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            {canManage ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  asChild
                                  aria-label={`Editar ${area.name}`}
                                >
                                  <Link href={`/areas/${area.id}/edit`}>
                                    <Pencil className="size-4" />
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Excluir ${area.name}`}
                                  onClick={() => setAreaToDelete(area)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Somente leitura
                              </span>
                            )}
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
        open={Boolean(areaToDelete)}
        onOpenChange={(open) => {
          if (!open) setAreaToDelete(null);
        }}
        title="Excluir área?"
        description={
          <>
            A área{" "}
            <strong className="font-medium text-foreground">
              {areaToDelete?.name}
            </strong>{" "}
            será removida permanentemente. Áreas vinculadas a pacotes ou
            sessões não podem ser excluídas.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
