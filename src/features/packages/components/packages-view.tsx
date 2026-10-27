"use client";

import {
  AlertTriangle,
  Boxes,
  Pencil,
  Plus,
  RefreshCw,
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
import { useApiQuery, usePagination } from "@/hooks";
import { formatCurrency } from "@/lib/format/currency";
import { getErrorMessage } from "@/lib/http/errors";
import { packagesService } from "@/services";
import type { LaserPackage } from "@/types";
import { toast } from "sonner";

export function PackagesView({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [packageToDelete, setPackageToDelete] =
    useState<LaserPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => packagesService.list({ signal }),
    "packages",
  );

  const filteredPackages = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const list = data ?? [];

    return [...list]
      .filter((pkg) => pkg.name.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [data, deferredSearch]);

  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredPackages,
    { resetKey: deferredSearch },
  );

  async function handleDelete() {
    if (!packageToDelete) return;

    setIsDeleting(true);
    try {
      await packagesService.remove(packageToDelete.id);
      toast.success(`Pacote "${packageToDelete.name}" excluído.`);
      setPackageToDelete(null);
      refetch();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  const createAction = canManage ? (
    <Button asChild>
      <Link href="/packages/new">
        <Plus className="size-4" />
        Novo pacote
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacotes"
        description="Pacotes comercializados, preços por área e desconto máximo permitido."
        actions={createAction}
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Catálogo de pacotes</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">{filteredPackages.length}</Badge>
              )}
            </div>
            <CardDescription>
              {canManage
                ? "Cadastre pacotes, preços por área e o desconto máximo permitido."
                : "Somente a gestora pode alterar preços e o catálogo de pacotes."}
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
              placeholder="Buscar pacote"
              aria-label="Buscar pacote"
              className="h-10 pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-44 w-full" />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar os pacotes</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Boxes className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {search
                    ? "Nenhum pacote encontrado"
                    : "Nenhum pacote cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Tente outro termo de busca."
                    : "Cadastre um pacote para vinculá-lo às vendas."}
                </p>
              </div>
              {canManage && !search && (
                <Button asChild size="sm">
                  <Link href="/packages/new">
                    <Plus className="size-4" />
                    Novo pacote
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((pkg) => (
                  <Card key={pkg.id} size="sm" className="h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{pkg.name}</CardTitle>
                          <CardDescription>
                            {pkg.sessionsCount} sessões ·{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(pkg.price)}
                            </span>
                          </CardDescription>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              asChild
                              aria-label={`Editar ${pkg.name}`}
                            >
                              <Link href={`/packages/${pkg.id}/edit`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Excluir ${pkg.name}`}
                              onClick={() => setPackageToDelete(pkg)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {pkg.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Pacote sem áreas cadastradas.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.items.map((item) => (
                            <Badge key={item.areaId} variant="secondary">
                              {item.areaName} · {item.sessionsCount} ·{" "}
                              {formatCurrency(item.price)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                        <span>
                          Desconto máximo:{" "}
                          <span className="font-medium text-foreground">
                            {pkg.maxDiscountPercent.toLocaleString("pt-BR", {
                              maximumFractionDigits: 2,
                            })}
                            %
                          </span>
                        </span>
                        <span>
                          Total:{" "}
                          <span className="font-semibold text-foreground">
                            {formatCurrency(pkg.price)}
                          </span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
        open={Boolean(packageToDelete)}
        onOpenChange={(open) => {
          if (!open) setPackageToDelete(null);
        }}
        title="Excluir pacote?"
        description={
          <>
            O pacote{" "}
            <strong className="font-medium text-foreground">
              {packageToDelete?.name}
            </strong>{" "}
            será removido permanentemente. Pacotes já vendidos não podem ser
            excluídos.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
