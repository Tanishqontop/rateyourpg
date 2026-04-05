import type { LocationRow } from "@/types/database";

const KEY = "rateyourpg_prefill_location";

/** Minimal row for ReviewModal step 3 */
export type PrefillLocation = Pick<
  LocationRow,
  "id" | "slug" | "name" | "city"
> & {
  type?: string | null;
  created_at?: string;
};

export function setReviewPrefillLocation(loc: PrefillLocation): void {
  sessionStorage.setItem(KEY, JSON.stringify(loc));
}

export function clearReviewPrefillLocation(): void {
  sessionStorage.removeItem(KEY);
}

export function peekReviewPrefillLocation(): PrefillLocation | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrefillLocation;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}

export function consumeReviewPrefillLocation(): PrefillLocation | null {
  const v = peekReviewPrefillLocation();
  if (v) sessionStorage.removeItem(KEY);
  return v;
}
