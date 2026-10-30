"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BooksIcon,
  BookOpenTextIcon,
  BankIcon,
  GraduationCapIcon,
  CalendarBlankIcon,
  ChalkboardIcon,
  ChalkboardTeacherIcon,
  ClipboardTextIcon,
  DoorIcon,
  ExamIcon,
  HandHeartIcon,
  HouseIcon,
  ListChecksIcon,
  NotebookIcon,
  NotePencilIcon,
  PersonSimpleRunIcon,
  StudentIcon,
  TrophyIcon,
  UserCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { NavGroup, NavIcon } from "@/lib/access";
import { cn } from "@/lib/utils";

// Each glyph names the thing on the page (a door for a classroom, a chalkboard for teaching).
const ICONS: Record<NavIcon, Icon> = {
  beranda: HouseIcon,
  belajar: GraduationCapIcon,
  bahan: BookOpenTextIcon,
  bankSoal: BankIcon,
  ringkasan: ClipboardTextIcon,
  akun: UserCircleIcon,
  kelas: DoorIcon,
  siswa: StudentIcon,
  guru: ChalkboardTeacherIcon,
  pelajaran: BooksIcon,
  jadwal: CalendarBlankIcon,
  mengajar: ChalkboardIcon,
  absensi: ListChecksIcon,
  ujian: ExamIcon,
  nilai: NotePencilIcon,
  sikap: HandHeartIcon,
  ekskul: PersonSimpleRunIcon,
  prestasi: TrophyIcon,
  rapor: NotebookIcon,
};

// Pages that belong to a menu item without living under its path.
const JUGA: Record<string, string[]> = { "/belajar": ["/asesmen"] };

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return [href, ...(JUGA[href] ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

export function AppNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu utama" className="grid gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-sm font-semibold text-muted-foreground">{group.label}</p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const IconCmp = ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.95rem] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9",
                      active
                        ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <IconCmp className="size-5 shrink-0" weight={active ? "fill" : "regular"} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
