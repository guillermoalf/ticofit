import { Badge } from "@/components/ui/badge";

/** "Próximamente" placeholder card for sections built in later phases. */
export function StubCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface/60 p-6">
      <div className="flex items-center justify-between">
        <Icon size={22} className="text-primary" />
        <Badge tone="muted">Próximamente</Badge>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{desc}</p>
    </div>
  );
}
