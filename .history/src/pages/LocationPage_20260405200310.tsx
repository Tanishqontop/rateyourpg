import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Filter, MapPin, SlidersHorizontal } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DISCUSSION_LINKS } from "@/lib/constants";
import { getDemoLocationBySlug, getDemoPgsForLocation } from "@/lib/demoData";
import type { GenderType, LocationRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { TrustBadges } from "@/components/trust/TrustBadges";

type SortKey = "reviews" | "rating";

// Proper interface to avoid 'any' errors
interface PgWithRatings {
  id: string;
  name: string;
  slug: string;
  area: string;
  gender_type: GenderType;
  price_range: string | null;
  amenities: string[] | null;
  cover_image_url: string | null;
  created_by_user: boolean;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  location_id: string;
}

export function LocationPage() {
  const { slug } = useParams();
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [pgs, setPgs] = useState<PgWithRatings[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("reviews");
  const [budget, setBudget] = useState<string>("any");
  const [gender, setGender] = useState<GenderType | "any">("any");

  useEffect(() => {
    void (async () => {
      if (!slug) return;
      const sb = getSupabase();
      if (!sb) {
        const loc = getDemoLocationBySlug(slug);
        setLocation(loc ?? null);
        // Map demo data to match interface if necessary, or use as is
        setPgs((loc ? getDemoPgsForLocation(loc.id) : []) as unknown as PgWithRatings[]);
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
        .from("pg_with_ratings")
        .select("*")
        .eq("location_id", (loc as LocationRow).id);

      setPgs((plist as PgWithRatings[]) ?? []);
    })();
  }, [slug]);

  const filtered = useMemo(() => {
    let list = [...pgs];
    const s = q.trim().toLowerCase();
    
    if (s) list = list.filter((p) => p.name.toLowerCase().includes(s));
    if (gender !== "any") list = list.filter((p) => p.gender_type === gender);
    
    if (budget === "low") list = list.filter((p) => (p.price_range ?? "").includes("9"));
    if (budget === "mid") list = list.filter((p) => (p.price_range ?? "").includes("15"));

    if (sort === "rating") {
      list.sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0));
    } else {
      list.sort((a, b) => (Number(b.total_reviews) || 0) - (Number(a.total_reviews) || 0));
    }
    return list;
  }, [pgs, q, sort, budget, gender]);

  if (!location) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Location not found</h1>
        <p className="mt-2 text-stone-600">Try searching from the homepage.</p>
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
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
          {location.city}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          PGs near {location.name}
        </h1>
        
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
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {filtered.map((pg) => {
              const avgRating = Number(pg.average_rating) || 0;
              const reviewCount = Number(pg.total_reviews) || 0;
              const tags = ["Good food 🍛", "Strict rules 🚫"].slice(0, pg.gender_type === "girls" ? 1 : 2);
              const img = pg.cover_image_url ?? "https://images.unsplash.com/photo-1522708323594-ddb0e442672d?auto=format&fit=crop&w=800&q=70";

              return (
                <Card key={pg.id} className="overflow-hidden">
                  <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                    <div className="h-44 bg-stone-200 sm:h-full">
                      <img src={img} alt={pg.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col p-4">
                      <div className="flex flex-wrap gap-2">
                        <TrustBadges userAdded={pg.created_by_user} verifiedPg={pg.is_verified} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link to={`/pg/${pg.slug}`} className="text-lg font-semibold text-stone-900 hover:underline">
                            {pg.name}
                          </Link>
                          <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                            <MapPin size={16} /> {pg.area}
                          </p>
                        </div>
                        <div className="text-right">
                          <StarRating value={avgRating} label={avgRating.toFixed(1)} />
                          <p className="mt-1 text-xs text-stone-500">{reviewCount} reviews</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <Badge key={t} tone="brand">{t}</Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/pg/${pg.slug}?write=1`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
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
            
            {filtered.length === 0 && (
              <p className="text-sm text-stone-600">No PGs match these filters.</p>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="p-4">
              <h2 className="font-semibold text-stone-900">Discussions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {DISCUSSION_LINKS.map((d) => (
                  <li key={d.q}>
                    <a className="text-teal-800 hover:underline" href={d.href}>{d.q}</a>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}