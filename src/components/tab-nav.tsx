"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Section tabs as plain links: each tab is its own URL, so back and refresh keep the place. */
export function TabNav({ label, tabs }: { label: string; tabs: { href: string; label: string; exact?: boolean; juga?: string[] }[] }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 mb-8 overflow-x-auto overflow-y-hidden border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const cocok = (h: string) => path === h || path.startsWith(`${h}/`);
          const on = (t.exact ? path === t.href : cocok(t.href)) || (t.juga ?? []).some(cocok);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
