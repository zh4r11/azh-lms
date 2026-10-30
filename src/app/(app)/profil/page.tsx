import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { PageHeader, SectionTitle } from "@/components/page";
import { PasswordForm, ProfilForm } from "./profil-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilPage() {
  const user = await requireRole();
  return (
    <>
      <PageHeader
        title="Profil dan password"
        mark="Profil"
        description={`Anda masuk sebagai ${ROLE_LABEL[user.role]}. Peran hanya bisa diubah oleh admin.`}
      />
      <div className="grid max-w-3xl grid-cols-1 gap-12 md:grid-cols-2">
        <section aria-labelledby="h-profil">
          <SectionTitle>
            <span id="h-profil">Data akun</span>
          </SectionTitle>
          <ProfilForm name={user.name} email={user.email} />
        </section>
        <section aria-labelledby="h-password">
          <SectionTitle>
            <span id="h-password">Ganti password</span>
          </SectionTitle>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
