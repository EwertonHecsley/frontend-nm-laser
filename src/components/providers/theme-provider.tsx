"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Provedor de tema (claro/escuro) baseado em classe no <html>.
 * O padrão é claro e o tema do sistema é ignorado para garantir
 * previsibilidade da identidade visual da clínica. O <Toaster> do
 * sonner já sincroniza o tema internamente via useTheme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
