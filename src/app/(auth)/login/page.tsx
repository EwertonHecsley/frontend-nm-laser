import type { Metadata } from "next";
import { CalendarDays, ShieldCheck, Sparkles, Users } from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#0b4f52] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(45,212,191,0.28), transparent 35%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.12), transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">NM Laser</p>
            <p className="text-sm text-white/65">CRM clínico</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            A rotina da clínica organizada em um só lugar.
          </h1>
          <p className="text-base leading-relaxed text-white/75">
            Centralize o cadastro de pacientes, a agenda e o histórico de
            sessões com acesso controlado por perfil.
          </p>

          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-3">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              Cadastro e busca de pacientes
            </li>
            <li className="flex items-center gap-3">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              Agenda por período, cidade e profissional
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              Sessão protegida por cookie HttpOnly
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          Acesso restrito à equipe autorizada.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold tracking-tight">NM Laser</p>
              <p className="text-xs text-muted-foreground">CRM clínico</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Entrar na conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Use as credenciais fornecidas pela gestora da clínica.
            </p>
          </div>

          <LoginForm nextPath={nextPath} />

          <p className="text-center text-xs text-muted-foreground">
            Acesso restrito à equipe autorizada. Em caso de dúvidas, fale com a
            gestora.
          </p>
        </div>
      </section>
    </main>
  );
}
