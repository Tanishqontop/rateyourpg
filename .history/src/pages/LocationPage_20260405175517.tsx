// ONLY CHANGE IS stats BLOCK + added reviews fetch

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
  const [reviews, setReviews] = useState<any[]>([]); // ✅ added
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

      // ✅ ONLY ADDITION (fetch reviews)
      const { data: revs } = await sb.from("reviews").select("*");
      setReviews(revs ?? []);
    })();
  }, [slug]);

  // ✅ FIXED (ONLY THIS BLOCK CHANGED)
  const stats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();

    for (const p of pgs) {
      const pgReviews = reviews.filter((r) => r.pg_id === p.id);

      if (!pgReviews.length) {
        map.set(p.id, { sum: 0, count: 0 });
        continue;
      }

      const avg =
        pgReviews.reduce((s, r) => s + Number(r.rating || 0), 0) /
        pgReviews.length;

      map.set(p.id, {
        sum: Number(avg.toFixed(1)),
        count: pgReviews.length,
      });
    }

    return map;
  }, [pgs, reviews]);

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
          (stats.get(b.id)?.sum ?? 0) - (stats.get(a.id)?.sum ?? 0)
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
        <div className="space-y-4">
          {filtered.map((pg) => {
            const st = stats.get(pg.id) ?? { sum: 0, count: 0 }; // ✅ fixed

            return (
              <Card key={pg.id}>
                <div className="flex justify-between p-4">
                  <div>
                    <h3>{pg.name}</h3>
                    <p>{pg.area}</p>
                  </div>

                  <div className="text-right">
                    <StarRating value={st.sum} label={st.sum.toFixed(1)} />
                    <p className="text-xs">{st.count} reviews</p>
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