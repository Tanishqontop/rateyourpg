import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, Plus, Search } from "lucide-react"; // Removed Filter and SlidersHorizontal

import { getSupabase } from "@/lib/supabase";
import { DISCUSSION_LINKS } from "@/lib/constants";
import { getDemoLocationBySlug, getDemoPgsForLocation } from "@/lib/demoData";
import type { GenderType, LocationRow, PgRow } from "@/types/database";

import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
// Removed Badge import
import { Button } from "@/components/ui/Button";
import { TrustBadges } from "@/components/trust/TrustBadges";
import { AddPgForm } from "@/components/review/AddPgForm";

type SortKey = "reviews" | "rating";

interface PgWithRatings extends PgRow {
  average_rating: number;
  total_reviews: number;
}

export function LocationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // Data State
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [pgs, setPgs] = useState<PgWithRatings[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI & Filter State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("reviews");
  const [budget, setBudget] = useState<string>("any");
  const [gender, setGender] = useState<GenderType | "any">("any");

  useEffect(() => {
    async function fetchData() {
      if (!slug) return;
      setLoading(true);
      
      const sb = getSupabase();
      if (!sb) {
        const loc = getDemoLocationBySlug(slug);
        setLocation(loc ?? null);
        setPgs((loc ? getDemoPgsForLocation(loc.id) : []) as unknown as PgWithRatings[]);
        setLoading(false);
        return;
      }

      const { data: loc } = await sb
        .from("locations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!loc) {
        setLocation(null);
        setLoading(false);
        return;
      }

      setLocation(loc as LocationRow);

      const { data: plist } = await sb
        .from("pg_with_ratings")
        .select("*")
        .eq("location_id", loc.id);

      setPgs((plist as PgWithRatings[]) ?? []);
      setLoading(false);
    }
    
    void fetchData();
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

  if (loading) {
    return <div className="p-20 text-center text-stone-500">Loading PGs...</div>;
  }

  if (!location) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">Location not found</h1>
        <p className="mt-2 text-stone-600">We couldn't find the area you're looking for.</p>
        <Link className="mt-4 inline-block text-teal-700 underline" to="/">Back home</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Best PG near ${location.name}, ${location.city} | RateYourPG`}</title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">{location.city}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              PGs near {location.name}
            </h1>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} />
            Add a PG
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                className="w-full rounded-2xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-teal-600/20"
                placeholder="Search by PG name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium outline-none"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="reviews">Most Reviewed</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-stone-600"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            >
              <option value="any">Any Budget</option>
              <option value="low">Under ₹12k</option>
              <option value="mid">₹12k–₹18k</option>
            </select>
            <select
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase text-stone-600"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderType | "any")}
            >
              <option value="any">Any Gender</option>
              <option value="boys">Boys Only</option>
              <option value="girls">Girls Only</option>
              <option value="coliving">Coliving</option>
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {filtered.length > 0 ? (
              filtered.map((pg) => {
                const avgRating = Number(pg.average_rating) || 0;
                return (
                  <Card key={pg.id} className="group overflow-hidden transition-all hover:shadow-md">
                    <div className="grid sm:grid-cols-[240px_1fr]">
                      <div className="h-48 overflow-hidden bg-stone-100 sm:h-full">
                        <img 
                          src={pg.cover_image_url || "/placeholder-pg.jpg"} 
                          alt={pg.name} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                      <div className="flex flex-col p-5">
                        <div className="flex items-center justify-between">
                          <TrustBadges userAdded={pg.created_by_user} verifiedPg={pg.is_verified} />
                          <StarRating value={avgRating} label={avgRating.toFixed(1)} />
                        </div>
                        <div className="mt-3">
                          <Link to={`/pg/${pg.slug}`} className="text-xl font-bold text-stone-900 hover:text-teal-700">
                            {pg.name}
                          </Link>
                          <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                            <MapPin size={14} /> {pg.area}
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-6 flex items-center justify-between">
                          <div className="text-sm font-bold text-stone-700">
                            {pg.price_range || "Price on request"}
                          </div>
                          <Link
                            to={`/pg/${pg.slug}`}
                            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-200 py-16 text-center">
                <div className="mb-4 rounded-full bg-stone-100 p-4">
                  <MapPin className="text-stone-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-stone-900">No PGs found here yet</h3>
                <p className="mt-1 text-stone-500">Know a PG near {location.name}? Help others by adding it!</p>
                <Button className="mt-6" onClick={() => setIsAddModalOpen(true)}>
                  Add the first PG
                </Button>
              </div>
            )}
          </div>

          <aside className="hidden space-y-6 lg:block">
            <Card className="p-5 bg-teal-50/50 border-teal-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-teal-900">Quick Links</h2>
              <ul className="mt-4 space-y-3">
                {DISCUSSION_LINKS.map((link) => (
                  <li key={link.q}>
                    <a href={link.href} className="text-sm font-medium text-teal-800 hover:underline">
                      {link.q}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <AddPgForm
              locationId={location.id}
              locationName={location.name}
              city={location.city}
              onSuccess={(newPg) => {
                setIsAddModalOpen(false);
                navigate(`/pg/${newPg.slug}`);
              }}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}