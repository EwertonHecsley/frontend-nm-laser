"use client";

import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiQuery } from "@/hooks";
import { formatDate } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { citiesService } from "@/services";
import type { City } from "@/types";

function CityActions({
  city,
  onDelete,
}: {
  city: City;
  onDelete: (city: City) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        asChild
        aria-label={`Editar ${city.name}`}
      >
        <Link href={`/cities/${city.id}/edit`}>
          <Pencil className="size-4" />
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(city)}
        aria-label={`Excluir ${city.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CitiesView({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => citiesService.list({ signal }),
    "cities",
  );

  const filteredCities = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const cities = data ?? [];

    if (!term) {
      return [...cities].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      );
    }

    return cities
      .filter((city) => city.name.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [data, deferredSearch]);

  async function handleDelete() {
    if (!cityToDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await citiesService.remove(cityToDelete.id);
      toast.success(`Cidade "${cityToDelete.name}" excluída.`);
      setCityToDelete(null);
      refetch();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  const createAction = canManage ? (
    <Button asChild>
      <Link href="/cities/new">
        <Plus className="size-4" />
        Nova cidade
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cidades"
        description="Cidades atendidas pela clínica. A criação, edição e exclusão são exclusivas da gestora."
        actions={createAction}
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Lista de cidades</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">
                  {filteredCities.length}
                </Badge>
              )}
            </div>
            <CardDescription>
              {canManage
                ? "Selecione uma cidade para editar ou excluir."
                : "Somente a gestora pode alterar o cadastro de cidades."}
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
              placeholder="Buscar cidade"
              aria-label="Buscar cidade"
              className="h-10 pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && !data ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar as cidades</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredCities.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                {search ? (
                  <Search className="size-6" aria-hidden="true" />
                ) : (
                  <Building2 className="size-6" aria-hidden="true" />
                )}
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {search
                    ? "Nenhuma cidade encontrada"
                    : "Nenhuma cidade cadastrada"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Tente outro termo de busca."
                    : canManage
                      ? "Cadastre a primeira cidade para começar."
                      : "A gestora ainda não cadastrou cidades."}
                </p>
              </div>
              {search ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                >
                  Limpar busca
                </Button>
              ) : canManage ? (
                <Button asChild size="sm">
                  <Link href="/cities/new">
                    <Plus className="size-4" />
                    Nova cidade
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
                      <TableHead>Cidade</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Cadastrada em
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Atualizada em
                      </TableHead>
                      {canManage && (
                        <TableHead className="w-[1%] text-right">
                          Ações
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCities.map((city) => (
                      <TableRow key={city.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                              <MapPin
                                className="size-4"
                                aria-hidden="true"
                              />
                            </span>
                            <span className="font-medium">{city.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDate(city.createdAt)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDate(city.updatedAt)}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <CityActions
                              city={city}
                              onDelete={setCityToDelete}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredCities.map((city) => (
                  <Card key={city.id} size="sm">
                    <CardContent className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                          <MapPin className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">{city.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Atualizada em {formatDate(city.updatedAt)}
                          </p>
                        </div>
                      </div>
                      {canManage && (
                        <CityActions
                          city={city}
                          onDelete={setCityToDelete}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(cityToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setCityToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A cidade{" "}
              <strong className="font-medium text-foreground">
                {cityToDelete?.name}
              </strong>{" "}
              será removida permanentemente. Esta ação não pode ser desfeita.
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
