"use client";

import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import { getRoleLabel } from "@/lib/auth/role-labels";
import {
  selectSidebarCollapsed,
  selectMobileNavOpen,
  useAppStore,
} from "@/store";
import type { AuthUser } from "@/types";
import { cn } from "cn";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard },
  { label: "Cidades", href: "/cities", icon: MapPin },
  { label: "Áreas", href: "/areas", icon: ScanLine },
  { label: "Pacotes", href: "/packages", icon: Boxes },
  { label: "Pacientes", href: "/patients", icon: Users },
  { label: "Agendamentos", href: "/appointments", icon: CalendarDays },
  { label: "Sessões", href: "/sessions", icon: ClipboardList },
  {
    label: "Vendas",
    href: "/sales",
    icon: BadgeDollarSign,
    permission: "sales:read",
  },
  {
    label: "Equipe",
    href: "/users",
    icon: UsersRound,
    permission: "users:read",
  },
];

function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Visão geral";
  }

  if (pathname === "/cities/new") {
    return "Nova cidade";
  }

  if (/^\/cities\/[^/]+\/edit$/.test(pathname)) {
    return "Editar cidade";
  }

  if (pathname.startsWith("/cities")) {
    return "Cidades";
  }

  if (pathname === "/areas/new") {
    return "Nova área";
  }

  if (/^\/areas\/[^/]+\/edit$/.test(pathname)) {
    return "Editar área";
  }

  if (pathname.startsWith("/areas")) {
    return "Áreas";
  }

  if (pathname === "/packages/new") {
    return "Novo pacote";
  }

  if (/^\/packages\/[^/]+\/edit$/.test(pathname)) {
    return "Editar pacote";
  }

  if (pathname.startsWith("/packages")) {
    return "Pacotes";
  }

  if (pathname === "/patients/new") {
    return "Novo paciente";
  }

  if (/^\/patients\/[^/]+\/edit$/.test(pathname)) {
    return "Editar paciente";
  }

  if (pathname.startsWith("/patients")) {
    return "Pacientes";
  }

  if (pathname === "/appointments/new") {
    return "Novo agendamento";
  }

  if (/^\/appointments\/[^/]+\/edit$/.test(pathname)) {
    return "Editar agendamento";
  }

  if (pathname.startsWith("/appointments")) {
    return "Agendamentos";
  }

  if (pathname === "/sessions/new") {
    return "Nova sessão";
  }

  if (pathname.startsWith("/sessions")) {
    return "Sessões";
  }

  if (pathname === "/sales/new") {
    return "Nova venda";
  }

  if (/^\/sales\/[^/]+\/edit$/.test(pathname)) {
    return "Editar venda";
  }

  if (pathname.startsWith("/sales")) {
    return "Vendas";
  }

  if (pathname === "/users/new") {
    return "Novo integrante";
  }

  if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
    return "Editar integrante";
  }

  if (pathname.startsWith("/users")) {
    return "Equipe";
  }

  if (pathname.startsWith("/settings")) {
    return "Configurações";
  }

  if (pathname.startsWith("/forbidden")) {
    return "Acesso negado";
  }

  return "CRM NM Laser";
}

function getInitials(value: string): string {
  const localPart = value.split("@")[0] ?? "";
  const parts = localPart.split(/[.\s_-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase() || "NM";
}

interface SidebarContentProps {
  user: AuthUser;
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({
  user,
  collapsed,
  onNavigate,
  onLogout,
  isLoggingOut,
  onToggleCollapse,
  showCollapseButton = false,
}: SidebarContentProps) {
  const pathname = usePathname();
  const displayName = user.name.trim() || user.email;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-16 items-center gap-3 border-b px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">
                NM Laser
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                CRM clínico
              </span>
            </span>
          )}
        </Link>

        {showCollapseButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn("ml-auto", collapsed && "ml-0")}
                onClick={onToggleCollapse}
                aria-label={
                  collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
                }
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav
        className="flex-1 space-y-6 overflow-y-auto px-2 py-4"
        aria-label="Navegação principal"
      >
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground">
              Operação
            </p>
          )}
          {NAV_ITEMS.filter(
            (item) =>
              !item.permission ||
              hasPermission(user.role, item.permission),
          ).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t p-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2",
            collapsed && "flex-col gap-1 px-0",
          )}
        >
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(user.role)}
              </p>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onLogout}
                disabled={isLoggingOut}
                aria-label="Sair da conta"
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? "right" : "top"}>
              Sair
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function UserMenu({
  user,
  onLogout,
  isLoggingOut,
}: {
  user: AuthUser;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 gap-2 px-2"
          aria-label="Abrir menu do usuário"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:block">
            {user.name}
          </span>
          <Badge variant="secondary" className="hidden md:inline-flex">
            {getRoleLabel(user.role)}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate text-sm font-medium">
            {user.name}
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            Perfil: {getRoleLabel(user.role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            onLogout();
          }}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useAppStore(selectSidebarCollapsed);
  const mobileNavOpen = useAppStore(selectMobileNavOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setMobileNavOpen = useAppStore((state) => state.setMobileNavOpen);
  const logout = useAppStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <SidebarContent
          user={user}
          collapsed={collapsed}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          onToggleCollapse={toggleSidebar}
          showCollapseButton
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent
            user={user}
            collapsed={false}
            onNavigate={() => setMobileNavOpen(false)}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu de navegação"
          >
            <Menu className="size-5" />
          </Button>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
            {getPageTitle(pathname)}
          </p>

          <UserMenu
            user={user}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
