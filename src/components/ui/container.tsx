import { cn } from "@/lib/utils";

/** Centered content column with consistent horizontal padding. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6", className)}>
      {children}
    </div>
  );
}
