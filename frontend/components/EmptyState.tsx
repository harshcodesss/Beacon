export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-surface-raised/60 px-6 py-14 text-center">
      <div className="text-2xl text-zinc-400">⌁</div>
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      {action}
    </div>
  );
}
