import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
