import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/providers/theme-toggle";

describe("ThemeToggle dark mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    vi.clearAllMocks();
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );

  it("deve alternar de claro para escuro ao clicar na lua", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />, { wrapper: Wrapper });

    // Inicialmente claro (defaultTheme="light" é aplicado como classe)
    expect(document.documentElement.className).toBe("light");

    const button = screen.getByRole("button", {
      name: /alternar para tema escuro/i,
    });
    expect(button.getAttribute("aria-label")).toBe("Alternar para tema escuro");

    await user.click(button);

    // Após clicar, deve aplicar a classe "dark" no <html>
    expect(document.documentElement.className).toContain("dark");
    expect(button.getAttribute("aria-label")).toBe("Alternar para tema claro");
  });

  it("deve persistir tema escuro após re-renderização (via localStorage)", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />, { wrapper: Wrapper });

    const button = screen.getByRole("button", {
      name: /alternar para tema escuro/i,
    });
    await user.click(button);
    expect(document.documentElement.className).toContain("dark");

    // localStorage deve ter sido gravado pelo next-themes
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});
