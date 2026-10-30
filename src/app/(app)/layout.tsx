import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { navFor } from "@/lib/access";
import { ROLE_LABEL } from "@/lib/labels";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireRole();
  return (
    <AppShell
      user={{ name: user.name, email: user.email, roleLabel: ROLE_LABEL[user.role] }}
      groups={navFor(user.role)}
    >
      {children}
    </AppShell>
  );
}
