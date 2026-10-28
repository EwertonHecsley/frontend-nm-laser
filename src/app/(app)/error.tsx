"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Não foi possível carregar esta página</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" role="alert">
            <AlertTriangle className="size-4" />
            <AlertTitle>Ocorreu um erro inesperado</AlertTitle>
            <AlertDescription>
              Tente carregar novamente. Se o problema continuar, volte mais
              tarde.
            </AlertDescription>
          </Alert>
          <Button className="mt-4" type="button" onClick={retry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
