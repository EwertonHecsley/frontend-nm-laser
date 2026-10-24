import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="items-center">
          <span className="mb-2 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </span>
          <CardTitle className="text-xl">Acesso não permitido</CardTitle>
          <CardDescription>
            Seu perfil não tem permissão para acessar esta área. Se precisar
            desse acesso, fale com a gestora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Voltar para a visão geral</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
