"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    function handleUnauthorized() {
      if (redirecting.current) {
        return;
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
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </TooltipProvider>
  );
}
