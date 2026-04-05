import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Filter, MapPin, SlidersHorizontal } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { setReviewPrefillLocation } from "@/lib/reviewPrefill";
import { DISCUSSION_LINKS, SEO_ARTICLES, AMENITY_OPTIONS } from "@/lib/constants";
import { getDemoLocationBySlug, getDemoPgsForLocation } from "@/lib/demoData";
import type { GenderType, LocationRow, PgRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { TrustBadges } from "@/components/trust/TrustBadges";
import { Button } from "@/components/ui/Button";

type SortKey = "reviews" | "rating";

export function LocationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [pgs, setPgs] = useState<PgRow[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("reviews");
  const [budget, setBudget] = useState<string>("any");
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [gender, setGender] = useState<GenderType | "any">("any");

  useEffect(() => {
    void (async () => {
      if (!slug) return;
      const sb = getSupabase();
      if (!sb) {
        const loc = getDemoLocationBySlug(slug);
        setLocation(loc ?? null);
        setPgs(loc ? getDemoPgsForLocation(loc.id) : []);
        return;
      }
      const { data: loc } = await sb
        .from("locations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!loc) {
        setLocation(null);
        setPgs([]);
        return;
      }
      setLocation(loc as LocationRow);
      const { data: plist } = await sb
        .from("pgs")
        .select("*")
        .eq("location_id", (loc as LocationRow).id);
      setPgs((plist as PgRow[]) ?? []);
    })();
  }, [slug]);

  const stats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    const seeds: Record<string, { sum: number; count: number }> = {
      "demo-pg-1": { sum: 4.7, count: 56 },
      "demo-pg-2": { sum: 4.4, count: 38 },
      "demo-pg-3": { sum: 4.1, count: 21 },
    };
    for (const p of pgs) {
      map.set(p.id, seeds[p.id] ?? { sum: 4.3, count: 24 });
    }
    return map;
  }, [pgs]);

  const filtered = useMemo(() => {
    let list = [...pgs];
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => p.name.toLowerCase().includes(s));
    if (gender !== "any") list = list.filter((p) => p.gender_type === gender);
    if (amenityFilter.length) {
      list = list.filter((p) => {
        const am = (p.amenities as string[] | null) ?? [];
        return amenityFilter.every((a) => am.includes(a));
      });
    }
    if (budget === "low") list = list.filter((p) => (p.price_range ?? "").includes("9"));
    if (budget === "mid") list = list.filter((p) => (p.price_range ?? "").includes("15"));
    if (sort === "rating") {
      list.sort(
        (a, b) =>
          (stats.get(b.id)?.sum ?? 4) - (stats.get(a.id)?.sum ?? 4)
      );
    } else {
      list.sort(
        (a, b) =>
          (stats.get(b.id)?.count ?? 0) - (stats.get(a.id)?.count ?? 0)
      );
    }
    return list;
  }, [pgs, q, sort, budget, gender, amenityFilter, stats]);

  if (!location) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Location not found</h1>
        <p className="mt-2 text-stone-600">
          Try searching from the homepage or add a PG from the review flow.
        </p>
        <Link className="mt-4 inline-block text-teal-700 underline" to="/">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Best PG near ${location.name} · ${location.city} | RateYourPG`}</title>
        <meta
          name="description"
          content={`Discover PGs near ${location.name} in ${location.city}. Filter by budget, amenities, and gender — with honest student reviews.`}
        />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
          {location.city}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          PGs near {location.name}
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Compare food, safety, and value scores — then leave a review to help the
          next student.
        </p>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm sm:max-w-xs"
              placeholder="Search PG"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-stone-500">
                <SlidersHorizontal size={14} /> Sort
              </span>
              <select
                className="rounded-xl border border-stone-200 px-2 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="reviews">Most reviewed</option>
                <option value="rating">Highest rated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-white p-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-stone-500">
            <Filter size={14} /> Filters
          </span>
          <select
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            <option value="any">Budget: Any</option>
            <option value="low">Budget: Under ₹12k</option>
            <option value="mid">Budget: ₹12k–₹18k</option>
          </select>
          <select
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value as GenderType | "any")}
          >
            <option value="any">Gender: Any</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
            <option value="coliving">Coliving</option>
          </select>
          <div className="flex flex-wrap gap-1">
            {AMENITY_OPTIONS.slice(0, 4).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setAmenityFilter((prev) =>
                    prev.includes(a.id)
                      ? prev.filter((x) => x !== a.id)
                      : [...prev, a.id]
                  )
                }
                className={`rounded-full px-2 py-0.5 text-xs ${
                  amenityFilter.includes(a.id)
                    ? "bg-teal-600 text-white"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {filtered.map((pg) => {
              const st = stats.get(pg.id) ?? { sum: 4.3, count: 24 };
              const tags = ["Good food 🍛", "Strict rules 🚫"].slice(
                0,
                pg.gender_type === "girls" ? 1 : 2
              );
              const img =
                pg.cover_image_url ??
                "https://images.unsplash.com/photo-1522708323594-ddb0e442672d?auto=format&fit=crop&w=800&q=70";
              return (
                <Card key={pg.id} className="overflow-hidden">
                  <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                    <div className="h-44 bg-stone-200 sm:h-full">
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col p-4">
                      <div className="flex flex-wrap gap-2">
                        <TrustBadges userAdded={pg.created_by_user} verifiedPg={pg.is_verified} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            to={`/pg/${pg.slug}`}
                            className="text-lg font-semibold text-stone-900 hover:underline"
                          >
                            {pg.name}
                          </Link>
                          <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                            <MapPin size={16} />
                            {pg.area}
                          </p>
                        </div>
                        <div className="text-right">
                          <StarRating value={st.sum} label={st.sum.toFixed(1)} />
                          <p className="mt-1 text-xs text-stone-500">{st.count} reviews</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <Badge key={t} tone="brand">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/pg/${pg.slug}?write=1`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 hover:bg-teal-700"
                        >
                          Leave a Review
                        </Link>
                        <Link
                          to={`/pg/${pg.slug}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {filtered.length === 0 ? (
              pgs.length === 0 ? (
                <Card className="border-dashed border-teal-200 bg-teal-50/50 p-6">
                  <p className="font-semibold text-stone-900">No PGs here yet</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Be the first to list a PG near {location.name}, then leave a review.
                  </p>
                  {isSupabaseConfigured() ? (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setReviewPrefillLocation({
                          id: location.id,
                          slug: location.slug,
                          name: location.name,
                          city: location.city,
                          type: location.type,
                          created_at: location.created_at,
                        });
                        navigate("/?write=1");
                      }}
                    >
                      Add a PG &amp; review
                    </Button>
                  ) : (
                    <p className="mt-3 text-xs text-stone-500">
                      Connect Supabase in <code className="rounded bg-white px-1">.env</code> to add listings.
                    </p>
                  )}
                </Card>
              ) : (
                <p className="text-sm text-stone-600">No PGs match these filters.</p>
              )
            ) : null}
          </div>

          <aside className="space-y-6">
            <Card className="p-4">
              <h2 className="font-semibold text-stone-900">Discussions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {DISCUSSION_LINKS.map((d) => (
                  <li key={d.q}>
                    <a className="text-teal-800 hover:underline" href={d.href}>
                      {d.q}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h2 className="font-semibold text-stone-900">Articles</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {SEO_ARTICLES.map((a) => (
                  <li key={a.title}>
                    <a className="text-stone-700 hover:underline" href={a.href}>
                      {a.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-dashed border-teal-200 bg-teal-50/50 p-4 text-sm text-stone-700">
              <p className="font-semibold text-stone-900">Maps (optional)</p>
              <p className="mt-1">
                Plug in <code className="rounded bg-white px-1">VITE_GOOGLE_MAPS_KEY</code>{" "}
                to embed maps on PG pages.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
