"use client";

import { useEffect } from "react";

import { useAppStore } from "@/store";
import type { AuthUser } from "@/types";

/**
 * Mantém a sessão da UI sincronizada com a sessão HttpOnly lida no servidor.
 * O token nunca chega ao JavaScript do navegador.
 */
export function SessionHydrator({ user }: { user: AuthUser }) {
  const setSessionUser = useAppStore((state) => state.setSessionUser);

  useEffect(() => {
    setSessionUser(user);
  }, [setSessionUser, user]);

  return null;
}
