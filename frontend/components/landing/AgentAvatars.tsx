"use client";

/** One bot-character per agent, drawn in a shared geometric style.
 *
 * Color contract: primary strokes inherit the card's text color via
 * `currentColor`, accent parts are brand-orange. Pass `inverted` to render
 * the accent white (e.g. inside the orange overlay header).
 */

type AvatarProps = { className?: string; inverted?: boolean };

function accentCls(inverted?: boolean) {
  return inverted ? "text-white" : "text-beacon";
}

const base = "transition-colors";

/** Sift — the Collector. Funnel hat: log dashes pour in, one signal drop out. */
export function SiftAvatar({ className, inverted }: AvatarProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden>
      {/* falling log dashes */}
      <g className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.45">
        <path d="M30 8h8" />
        <path d="M46 5h10" />
        <path d="M62 9h7" />
      </g>
      {/* funnel */}
      <g className={base} stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M26 16h44l-16 14v6h-12v-6L26 16Z" />
      </g>
      {/* the one line that matters */}
      <circle cx="48" cy="42" r="3" className={accentCls(inverted)} fill="currentColor" />
      {/* head */}
      <rect x="24" y="48" width="48" height="36" rx="11" className={base} stroke="currentColor" strokeWidth="3" />
      <circle cx="39" cy="63" r="3.2" className={base} fill="currentColor" />
      <circle cx="57" cy="63" r="3.2" className={base} fill="currentColor" />
      <path d="M42 74h12" className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Hunch — the Generator. Branching idea antenna: three hypotheses, one lit. */
export function HunchAvatar({ className, inverted }: AvatarProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden>
      {/* branches */}
      <g className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M48 34V22" />
        <path d="M48 26c0-6-14-4-16-12" />
        <path d="M48 26c0-6 14-4 16-12" />
      </g>
      <circle cx="32" cy="12" r="4" className={base} stroke="currentColor" strokeWidth="2.5" />
      <circle cx="64" cy="12" r="4" className={base} stroke="currentColor" strokeWidth="2.5" />
      {/* the favoured hypothesis, lit */}
      <circle cx="48" cy="16" r="5" className={accentCls(inverted)} fill="currentColor" />
      <g className={accentCls(inverted)} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M41 9l-3-3" />
        <path d="M55 9l3-3" />
      </g>
      {/* head — wide curious eyes */}
      <rect x="24" y="38" width="48" height="40" rx="11" className={base} stroke="currentColor" strokeWidth="3" />
      <circle cx="39" cy="55" r="5" className={base} stroke="currentColor" strokeWidth="2.5" />
      <circle cx="57" cy="55" r="5" className={base} stroke="currentColor" strokeWidth="2.5" />
      <circle cx="39" cy="55" r="1.8" className={base} fill="currentColor" />
      <circle cx="57" cy="55" r="1.8" className={base} fill="currentColor" />
      <path d="M43 69c2 2 8 2 10 0" className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Sleuth — the Investigator. Magnifier over one eye, budget leash implied. */
export function SleuthAvatar({ className, inverted }: AvatarProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden>
      {/* detective brim */}
      <path d="M20 34h56" className={base} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 34c0-10 8-16 18-16s18 6 18 16" className={base} stroke="currentColor" strokeWidth="3" />
      {/* head */}
      <rect x="24" y="40" width="48" height="38" rx="11" className={base} stroke="currentColor" strokeWidth="3" />
      {/* magnified eye (orange rim) + handle */}
      <circle cx="39" cy="57" r="10" className={accentCls(inverted)} stroke="currentColor" strokeWidth="3" />
      <path d="M46 65l7 8" className={accentCls(inverted)} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="39" cy="57" r="3" className={base} fill="currentColor" />
      {/* the other eye, squinting */}
      <path d="M56 56h6" className={base} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 72h10" className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Scribe — the Reporter. Pencil antenna and a verified seal. */
export function ScribeAvatar({ className, inverted }: AvatarProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden>
      {/* pencil */}
      <g className={base} stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <path d="M60 6l10 10-24 24-12 2 2-12L60 6Z" />
      </g>
      <path d="M56 10l10 10" className={base} stroke="currentColor" strokeWidth="2.5" />
      {/* head */}
      <rect x="24" y="46" width="48" height="36" rx="11" className={base} stroke="currentColor" strokeWidth="3" />
      <circle cx="39" cy="61" r="3.2" className={base} fill="currentColor" />
      <circle cx="57" cy="61" r="3.2" className={base} fill="currentColor" />
      <path d="M42 72c2 2 10 2 12 0" className={base} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* verified seal */}
      <circle cx="70" cy="78" r="9" className={accentCls(inverted)} fill="currentColor" />
      <path
        d="M66 78l3 3 5-6"
        stroke={inverted ? "#ff7f11" : "#fff"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
