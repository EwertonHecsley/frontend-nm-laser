"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Alternador de tema claro/escuro.
 *
 * Renderiza SEMPRE o botão (sem `mounted`/`return null`), evitando que o
 * next-theimes fique sem alvo para aplicar `setTheme` no primeiro clique.
 * Quando `resolvedTheme` ainda é `undefined` (antes da hidratação),
 * `isDark` cai em `false` (light), mostrando o ícone da lua — o que está
 * correto, pois o `defaultTheme` é "light".
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
        >
          {isDark ? (
            <Sun className="size-5" aria-hidden="true" />
          ) : (
            <Moon className="size-5" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Tema claro" : "Tema escuro"}</TooltipContent>
    </Tooltip>
  );
}
