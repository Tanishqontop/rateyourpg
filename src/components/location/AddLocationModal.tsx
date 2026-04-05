import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { makeUniqueSlug } from "@/lib/slug";
import type { LocationRow } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type LocType = "college" | "area";

export function AddLocationModal({
  open,
  onClose,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onCreated: (loc: LocationRow) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState("Bangalore");
  const [locType, setLocType] = useState<LocType>("college");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setError(null);
    }
  }, [open, defaultName]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const c = city.trim();
    if (!n) {
      setError("Name is required.");
      return;
    }
    if (!c) {
      setError("City is required.");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const slug = makeUniqueSlug(n, crypto.randomUUID().slice(0, 8));
      const { data, error: insErr } = await sb
        .from("locations")
        .insert({
          name: n,
          slug,
          city: c,
          type: locType,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      const row = data as LocationRow;
      onCreated(row);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add location.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="relative w-full max-w-md p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1 text-stone-500 hover:bg-stone-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h2 className="pr-8 text-lg font-bold text-stone-900">Add a college or area</h2>
        <p className="mt-1 text-sm text-stone-600">
          We’ll open the review flow so you can add a PG and post the first review.
        </p>

        <form className="mt-4 space-y-3" onSubmit={(e) => void submit(e)}>
          <div>
            <label className="text-sm font-medium text-stone-700">Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acharya College"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">City</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Type</label>
            <select
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={locType}
              onChange={(e) => setLocType(e.target.value as LocType)}
            >
              <option value="college">College / university</option>
              <option value="area">Area / neighbourhood</option>
            </select>
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save & add PG"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
