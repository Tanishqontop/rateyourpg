import type { ReactNode } from "react";

const tones: Record<string, string> = {
  default: "bg-stone-100 text-stone-700",
  brand: "bg-teal-50 text-teal-800",
  warn: "bg-amber-50 text-amber-900",
  guest: "bg-violet-50 text-violet-800",
  verified: "bg-emerald-50 text-emerald-800",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] ?? tones.default} ${className}`}
    >
      {children}
    </span>
  );
}
