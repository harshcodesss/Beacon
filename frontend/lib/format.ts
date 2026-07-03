export function formatWhen(iso: string): string {
  const date = new Date(iso);
  const deltaMs = Date.now() - date.getTime();
  const hours = Math.floor(deltaMs / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(deltaMs / 60_000))}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Shared button recipes for the light monochromatic theme: near-black
 *  primary CTAs whose hover/focus states are the orange accent. */
export const primaryButton =
  "rounded-md bg-zinc-900 text-sm font-semibold text-white transition-colors " +
  "hover:bg-beacon hover:text-black focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-beacon disabled:pointer-events-none " +
  "disabled:opacity-50";

export const secondaryButton =
  "rounded-md border border-edge bg-white text-zinc-600 transition-colors " +
  "hover:border-zinc-400 hover:text-zinc-900 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-beacon disabled:pointer-events-none " +
  "disabled:opacity-50";
