import { StubCard } from "@/components/portal/stub-card";

/** Standard page shell for sidebar routes built in later phases. */
export function PlaceholderScreen({
  kicker,
  title,
  desc,
  icon,
}: {
  kicker: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm uppercase tracking-widest text-primary">{kicker}</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          {title}
        </h1>
      </header>
      <section className="mt-10 max-w-md">
        <StubCard icon={icon} title={title} desc={desc} />
      </section>
    </main>
  );
}
