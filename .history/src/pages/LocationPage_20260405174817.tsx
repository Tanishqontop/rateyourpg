import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Filter, MapPin, SlidersHorizontal } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { setReviewPrefillLocation } from "@/lib/reviewPrefill";
import { DISCUSSION_LINKS, SEO_ARTICLES, AMENITY_OPTIONS } from "@/lib/constants";
import { getDemoLocationBySlug, getDemoPgsForLocation } from "@/lib/demoData";
import type { GenderType, LocationRow, PgRow, ReviewRow } from "@/types/database";
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
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("reviews");
  const [budget, setBudget] = useState<string>("any");
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [gender, setGender] = useState<GenderType | "any">("any");

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    void (async () => {
      if (!slug) return;

      const sb = getSupabase();

      if (!sb) {
        const loc = getDemoLocationBySlug(slug);
        setLocation(loc ?? null);
        setPgs(loc ? getDemoPgsForLocation(loc.id) : []);
        setReviews([]);
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

      // ✅ FETCH REVIEWS
      const { data: revs } = await sb
        .from("reviews")
        .select("*");

      setReviews((revs as ReviewRow[]) ?? []);
    })();
  }, [slug]);

  // =========================
  // REAL RATING CALCULATION
  // =========================
  const stats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();

    for (const pg of pgs) {
      const pgReviews = reviews.filter((r) => r.pg_id === pg.id);

      if (!pgReviews.length) {
        map.set(pg.id, { sum: 0, count: 0 });
        continue;
      }

      const avg =
        pgReviews.reduce((s, r) => s + Number(r.rating || 0), 0) /
        pgReviews.length;

      map.set(pg.id, {
        sum: Number(avg.toFixed(1)),
        count: pgReviews.length,
      });
    }

    return map;
  }, [pgs, reviews]);

  // =========================
  // FILTER + SORT
  // =========================
  const filtered = useMemo(() => {
    let list = [...pgs];

    const s = q.trim().toLowerCase();
    if (s) list = list.filter((p) => p.name.toLowerCase().includes(s));

    if (gender !== "any") {
      list = list.filter((p) => p.gender_type === gender);
    }

    if (amenityFilter.length) {
      list = list.filter((p) => {
        const am = (p.amenities as string[] | null) ?? [];
        return amenityFilter.every((a) => am.includes(a));
      });
    }

    if (budget === "low") {
      list = list.filter((p) => (p.price_range ?? "").includes("9"));
    }

    if (budget === "mid") {
      list = list.filter((p) => (p.price_range ?? "").includes("15"));
    }

    if (sort === "rating") {
      list.sort(
        (a, b) =>
          (stats.get(b.id)?.sum ?? 0) -
          (stats.get(a.id)?.sum ?? 0)
      );
    } else {
      list.sort(
        (a, b) =>
          (stats.get(b.id)?.count ?? 0) -
          (stats.get(a.id)?.count ?? 0)
      );
    }

    return list;
  }, [pgs, q, sort, budget, gender, amenityFilter, stats]);

  // =========================
  // UI
  // =========================
  if (!location) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Location not found</h1>
        <Link to="/" className="text-teal-600 underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Best PG near ${location.name}`}</title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">
          PGs near {location.name}
        </h1>

        <div className="mt-8 space-y-4">
          {filtered.map((pg) => {
            const st = stats.get(pg.id) ?? { sum: 0, count: 0 };

            return (
              <Card key={pg.id} className="p-4">
                <div className="flex justify-between">
                  <div>
                    <Link to={`/pg/${pg.slug}`}>
                      <h2 className="font-semibold">{pg.name}</h2>
                    </Link>

                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin size={14} />
                      {pg.area}
                    </p>
                  </div>

                  <div className="text-right">
                    {st.count > 0 ? (
                      <StarRating
                        value={st.sum}
                        label={st.sum.toFixed(1)}
                      />
                    ) : (
                      <span className="text-sm text-gray-400">
                        New
                      </span>
                    )}

                    <p className="text-xs text-gray-500">
                      {st.count} reviews
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}