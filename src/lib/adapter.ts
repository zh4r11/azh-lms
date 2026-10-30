import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The pg adapter for DATABASE_URL. A `?schema=` in the URL (production keeps its tables in the
 * "lms" schema of a shared Supabase project) is passed on, because the adapter does not read it
 * from the URL itself. Raw SQL relies on the database role's search_path instead.
 */
export function buatAdapter(max: number) {
  const url = process.env.DATABASE_URL;
  const schema = url ? (new URL(url).searchParams.get("schema") ?? undefined) : undefined;
  return new PrismaPg({ connectionString: url, max }, schema ? { schema } : undefined);
}
