import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border-strong text-ink",
  accent: "border-primary text-ink shadow-glow-soft",
  muted: "border-border text-muted",
};

/** Small pill label — used for training-type / status badges. */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
