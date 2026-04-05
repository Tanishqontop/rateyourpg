export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function makeUniqueSlug(base: string, suffix: string): string {
  const s = slugify(base);
  const suf = slugify(suffix).slice(0, 8) || suffix.replace(/-/g, "").slice(0, 8);
  return s ? `${s}-${suf}` : `pg-${suf}`;
}
