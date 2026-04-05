import { Star } from "lucide-react";

export function StarRating({
  value,
  size = 18,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1" title={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < full
              ? "fill-amber-400 text-amber-400"
              : "fill-stone-200 text-stone-200"
          }
        />
      ))}
      {label ? (
        <span className="ml-1 text-sm font-semibold text-stone-800">{label}</span>
      ) : null}
    </div>
  );
}

export function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="rounded-md p-0.5 transition hover:bg-amber-50"
            aria-label={`${n} stars`}
          >
            <Star
              size={28}
              className={
                n <= value
                  ? "fill-amber-400 text-amber-400"
                  : "fill-stone-200 text-stone-200"
              }
            />
          </button>
        ))}
        <span className="ml-2 self-center text-sm text-stone-500">{value}/5</span>
      </div>
    </div>
  );
}
