"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ListIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppNav } from "@/components/app-nav";
import type { NavGroup } from "@/lib/access";
import { logout } from "@/app/login/actions";

type ShellUser = { name: string; email: string; roleLabel: string };

function Wordmark() {
  return (
    <Link
      href="/"
      className="block rounded-md font-heading leading-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="block text-lg font-semibold">SMA Negeri Prabsky 02</span>
      <span className="block text-sm text-muted-foreground">Konoha · LMS</span>
    </Link>
  );
}

const noop = () => () => {};

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // false during SSR, true after hydration, without a setState-in-effect round trip.
  const mounted = React.useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Pakai tema terang" : "Pakai tema gelap"}
      title={dark ? "Tema terang" : "Tema gelap"}
    >
      {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </Button>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={`Menu akun ${user.name}`}>
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-secondary font-heading text-sm font-semibold"
          >
            {initials}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-40 truncate text-sm font-semibold">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{user.roleLabel}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-semibold">{user.name}</span>
          <span className="block truncate text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil">Profil dan password</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logout()}>Keluar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  groups,
  children,
}: {
  user: ShellUser;
  groups: NavGroup[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] print:block">
      <a
        href="#konten"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Lewati ke konten
      </a>

      <aside className="hidden border-r bg-sidebar lg:block print:hidden">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto px-3 py-6">
          <div className="px-3">
            <Wordmark />
          </div>
          <AppNav groups={groups} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background px-4 py-2 sm:px-6 print:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <ListIcon className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-80 overflow-y-auto bg-sidebar p-0">
              <SheetHeader className="px-6 pt-6">
                <SheetTitle asChild>
                  <div>
                    <Wordmark />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">Menu navigasi LMS</SheetDescription>
              </SheetHeader>
              <div className="px-3 pb-8">
                <AppNav groups={groups} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <span className="font-heading font-semibold">SMAN Prabsky 02</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>
        <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
