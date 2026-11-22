/** Title block shared by every desk page. */
export function DeskPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-tf-serif text-[36px] leading-[1.05] sm:text-[44px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** Placeholder for a module that a later phase fills in. */
export function DeskSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <DeskPageHeader title={title} />
      <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
        {description}
      </p>
    </>
  );
}
