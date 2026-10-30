import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,28rem)]">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <p className="font-heading text-lg">SMA Negeri Prabsky 02 Konoha</p>
        <div className="max-w-lg">
          <h1 className="text-5xl leading-[1.05] font-semibold">
            Jadwal, absensi, dan rapor dalam satu buku kerja.
          </h1>
          <p className="mt-4 text-lg opacity-90">
            Masuk dengan akun yang dibuat oleh admin sekolah.
          </p>
        </div>
        <p className="text-sm opacity-80">Learning Management System</p>
      </section>

      <section className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-heading text-lg lg:hidden">SMA Negeri Prabsky 02 Konoha</p>
          <h2 className="mt-6 text-3xl font-semibold lg:mt-0">
            <span className="highlight-mark">Masuk</span>
          </h2>
          <p className="mt-2 mb-8 text-muted-foreground">
            Lupa password? Minta admin sekolah mengatur ulang akun Anda.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
