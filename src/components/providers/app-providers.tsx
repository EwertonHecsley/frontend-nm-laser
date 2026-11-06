"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";

/**
 * Escuta falhas de autenticação (401 após tentativa de renovação) e
 * redireciona para o login preservando o destino original.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    function handleUnauthorized(event: Event) {
      if (redirecting.current) {
        return;
      }

      // Renovação não é possível (ex.: acessando a página de login).
      if ("detail" in event) {
        const { canRefresh } = (event as CustomEvent<{ canRefresh?: boolean }>)
          .detail ?? { canRefresh: true };

        if (canRefresh) {
          return;
        }
      }

      redirecting.current = true;
      useAppStore.getState().clearSession();

      const nextPath = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      router.refresh();

      window.setTimeout(() => {
        redirecting.current = false;
      }, 1_500);
    }

    window.addEventListener("nm:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("nm:unauthorized", handleUnauthorized);
    };
  }, [router]);

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
