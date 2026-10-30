import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Page title with the highlighter motif. `mark` is the key word that gets the swash;
 * it must appear inside `title`.
 */
export function PageHeader({
  title,
  mark,
  description,
  back,
  actions,
}: {
  title: string;
  mark?: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  const parts = mark && title.includes(mark) ? title.split(mark) : null;
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-0"
          >
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          {parts ? (
            <>
              {parts[0]}
              <span className="highlight-mark">{mark}</span>
              {parts.slice(1).join(mark)}
            </>
          ) : (
            title
          )}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn("rule-double mb-4 text-xl font-semibold", className)}>{children}</h2>;
}

/** Empty state that names the reason and the next step, per antislop R-27. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
      <p className="font-heading text-lg font-semibold">{title}</p>
      {children ? (
        <div className="mx-auto mt-1 max-w-md text-pretty text-muted-foreground">{children}</div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Tables scroll inside their own box on small screens so the page never overflows. */
export function TableBox({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border bg-card">{children}</div>;
}
