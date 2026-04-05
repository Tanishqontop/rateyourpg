import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { makeUniqueSlug } from "@/lib/slug";
import { AMENITY_OPTIONS } from "@/lib/constants";
import type { GenderType, PgRow } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Props = {
  locationId: string;
  locationName: string;
  city: string;
  onSuccess: (pg: PgRow) => void;
  onCancel: () => void;
};

export function AddPgForm({
  locationId,
  locationName,
  city,
  onSuccess,
  onCancel,
}: Props) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [gender, setGender] = useState<GenderType>("coliving");
  const [priceRange, setPriceRange] = useState("");
  const [roomTypes, setRoomTypes] = useState<string[]>(["Single"]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [curfew, setCurfew] = useState("");
  const [visitorAllowed, setVisitorAllowed] = useState<boolean | null>(true);
  const [deposit, setDeposit] = useState<string>("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRoom = (r: string) => {
    setRoomTypes((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("PG name is required.");
      return;
    }
    if (files.length < 1) {
      setError("Please upload at least one image.");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError("Supabase is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const slug = makeUniqueSlug(name, crypto.randomUUID().slice(0, 8));
      const folder = `${user.id}/${Date.now()}`;
      const urls: string[] = [];

      for (const file of files) {
        const path = `${folder}/${file.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await sb.storage
          .from("pg-media")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from("pg-media").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const row = {
        name: name.trim(),
        slug,
        location_id: locationId,
        area: area.trim() || city,
        price_range: priceRange.trim() || null,
        gender_type: gender,
        room_types: roomTypes.length ? roomTypes : ["Single"],
        amenities,
        curfew: curfew.trim() || null,
        visitor_allowed: visitorAllowed,
        deposit: deposit ? Number(deposit) : null,
        description: description.trim() || null,
        created_by_user: true,
        is_verified: false,
        cover_image_url: urls[0] ?? null,
      };

      const { data: inserted, error: insErr } = await sb
        .from("pgs")
        .insert(row)
        .select()
        .single();

      if (insErr) throw insErr;

      onSuccess(inserted as PgRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add PG.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-lg font-bold text-stone-900">Add your PG</h3>
      <p className="mt-1 text-sm text-stone-600">
        Near <span className="font-medium text-stone-800">{locationName}</span> ·{" "}
        {city}
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-stone-700">PG name *</label>
          <input
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none ring-teal-600/30 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., GreenNest PG"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-stone-700">Area</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g., Koramangala 5th Block"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Gender</label>
            <select
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderType)}
            >
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
              <option value="coliving">Coliving / Mixed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Price range</label>
          <input
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            placeholder="e.g., ₹12k – ₹18k"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Room types</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Single", "Double", "Triple"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRoom(r)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  roomTypes.includes(r)
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Amenities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAmenity(a.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  amenities.includes(a.id)
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                {"emoji" in a && a.emoji ? `${a.emoji} ` : ""}
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-stone-700">Curfew</label>
            <input
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={curfew}
              onChange={(e) => setCurfew(e.target.value)}
              placeholder="e.g., 10 PM on weekdays"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Visitors allowed</label>
            <select
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={visitorAllowed === null ? "unknown" : visitorAllowed ? "yes" : "no"}
              onChange={(e) => {
                const v = e.target.value;
                setVisitorAllowed(
                  v === "unknown" ? null : v === "yes"
                );
              }}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unknown">Not sure</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Deposit (₹)</label>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="e.g., 15000"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Images * (at least 1)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 w-full text-sm"
            onChange={(e) => setFiles([...(e.target.files ?? [])])}
          />
          <p className="mt-1 text-xs text-stone-500">
            Uploads go to the <code className="rounded bg-stone-100 px-1">pg-media</code>{" "}
            bucket (configure in Supabase).
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Short description</label>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should people know?"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Add PG & continue review"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back
          </Button>
        </div>
      </form>
    </Card>
  );
}
