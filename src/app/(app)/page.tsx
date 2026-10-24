import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getRoleLabel } from "@/lib/auth/role-labels";
import { getServerSession } from "@/lib/auth/session";
import type { Role } from "@/types";

const ROLE_ABILITIES: Record<Role, string> = {
  gestora:
    "Gerencia cidades, pacientes, agendamentos e sessões realizadas.",
  vendas:
    "Cadastra e edita pacientes, além de gerenciar agendamentos.",
  aplicadora:
    "Gerencia a agenda e registra sessões realizadas.",
};

const AVAILABLE_MODULES = [
  {
    title: "Cidades",
    description:
      "Consulte as cidades atendidas. A gestão é exclusiva da gestora.",
    href: "/cities",
    icon: MapPin,
  },
  {
    title: "Pacientes",
    description:
      "Cadastro, busca por nome ou CPF e dados para contato.",
    href: "/patients",
    icon: Users,
  },
  {
    title: "Agendamentos",
    description:
      "Agenda por período, cidade e profissional, com status.",
    href: "/appointments",
    icon: CalendarDays,
  },
] as const;

const UPCOMING_MODULES = [
  {
    title: "Sessões",
    description: "Parâmetros técnicos, evolução e assinatura.",
    icon: ClipboardList,
  },
] as const;

export default async function DashboardPage() {
  const user = await getServerSession();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative bg-gradient-to-br from-[#155e63] via-[#0f766e] to-[#115e59] p-6 text-white md:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl space-y-3">
            <p className="text-sm text-white/75">Painel operacional</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Olá, equipe NM Laser
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              {ROLE_ABILITIES[user.role]}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge className="border-white/20 bg-white/15 text-white">
                {getRoleLabel(user.role)}
              </Badge>
              <span className="text-xs text-white/70">{user.email}</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-title" className="space-y-4">
        <div>
          <h2 id="modules-title" className="text-lg font-semibold">
            Módulos
          </h2>
          <p className="text-sm text-muted-foreground">
            Apenas os recursos com endpoints disponíveis no backend aparecem
            como ativos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {AVAILABLE_MODULES.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                href={module.href}
                className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full transition-colors group-hover:border-primary/30 group-hover:bg-accent/40">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <Badge>Disponível</Badge>
                    </div>
                    <CardTitle className="pt-2">{module.title}</CardTitle>
                    <CardDescription>
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Abrir módulo
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {UPCOMING_MODULES.map((module) => {
            const Icon = module.icon;

            return (
              <Card
                key={module.title}
                aria-disabled="true"
                className="h-full border-dashed bg-muted/30 opacity-80"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <Badge variant="outline" className="border-dashed">
                      Em preparação
                    </Badge>
                  </div>
                  <CardTitle className="pt-2">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground">
                    Estrutura de dados e serviços já preparada.
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <CardTitle>Sessão protegida</CardTitle>
            </div>
            <CardDescription>
              O token de acesso fica em cookie HttpOnly e não é acessível ao
              JavaScript da página.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            O navegador conversa apenas com o BFF same-origin do Next.js. A
            autorização efetiva de cada operação continua sendo feita pela API.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil de acesso</CardTitle>
            <CardDescription>
              {getRoleLabel(user.role)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ROLE_ABILITIES[user.role]} A interface esconde ações não permitidas
            como conveniência; o backend é a autoridade de segurança.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
