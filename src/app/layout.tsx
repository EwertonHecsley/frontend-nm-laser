import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CRM NM Laser",
    template: "%s · CRM NM Laser",
  },
  description:
    "Gestão de pacientes, agendamentos e sessões da clínica NM Laser.",
  applicationName: "CRM NM Laser",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eae8" },
    { media: "(prefers-color-scheme: dark)", color: "#151010" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <head>
        {/* Sincroniza o tema salvo no localStorage antes da hidratação do React
           para evitar flash de tema incorreto (FOUC) e mismatch de hidratação
           entre servidor e cliente com next-themes (attribute="class"). */}
        <script
          id="theme-sync"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                    root.classList.remove('light');
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                  }
                } catch (e) {
                  // localStorage indisponível (ex.: modo privado); mantém o padrão.
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
