"use client";

import {
  AlertTriangle,
  Boxes,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks";
import { packagesService } from "@/services";

export function PackagesView({ canManage }: { canManage: boolean }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

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
        description="Pacotes comercializados e o saldo de sessões por área."
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
                ? "Cadastre pacotes e defina as áreas e sessões incluídas."
                : "Somente a gestora pode alterar o catálogo de pacotes."}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => (
                <Card key={pkg.id} size="sm" className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{pkg.name}</CardTitle>
                        <CardDescription>
                          {pkg.sessionsCount} sessões no total
                        </CardDescription>
                      </div>
                      {canManage && (
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
                            {item.areaName} · {item.sessionsCount}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
