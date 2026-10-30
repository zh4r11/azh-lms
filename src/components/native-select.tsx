import { cn } from "@/lib/utils";

/** Native select for plain GET filter forms, styled to match the shadcn inputs. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
