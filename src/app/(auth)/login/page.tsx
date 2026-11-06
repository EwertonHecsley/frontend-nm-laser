import type { Metadata } from "next";
import {
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

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
      <section
        className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #9d174d 0%, #be185d 40%, #ec4899 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(251,207,232,0.35), transparent 40%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.14), transparent 45%)",
          }}
        />
        <div
          className="pointer-events-none absolute left-0 top-[18%] h-px w-full -rotate-12 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute left-0 top-[62%] h-px w-full -rotate-12 opacity-25"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-[-6rem] size-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white/15 shadow-sm ring-1 ring-white/25">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-xl font-semibold tracking-tight">
              NM Laser
            </p>
            <p className="text-sm text-white/70">CRM clínico</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight xl:text-[2.75rem]">
            A rotina da clínica organizada em um só lugar.
          </h1>
          <p className="text-base leading-relaxed text-white/80">
            Centralize o cadastro de pacientes, a agenda e o histórico de
            sessões com acesso controlado por perfil.
          </p>

          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20">
                <Users className="size-3.5 shrink-0" aria-hidden="true" />
              </span>
              Cadastro e busca de pacientes
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              </span>
              Agenda por período, cidade e profissional
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/12 ring-1 ring-white/20">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
              </span>
              Sessão protegida por cookie HttpOnly
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          Acesso restrito à equipe autorizada.
        </p>
      </section>

      <section className="relative flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-60 lg:hidden"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, #ec4899, transparent)",
          }}
        />
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span
              className="grid size-10 place-items-center rounded-xl text-white shadow-sm shadow-primary/30"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              }}
            >
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-lg font-semibold tracking-tight">
                NM Laser
              </p>
              <p className="text-xs text-muted-foreground">CRM clínico</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
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
