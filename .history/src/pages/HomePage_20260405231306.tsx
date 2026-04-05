import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, MapPin, School } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { DEMO_LOCATIONS } from "@/lib/demoData";
import type { LocationRow, PgRow } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PgCard } from "@/components/pg/PgCard";
import { AddLocationModal } from "@/components/location/AddLocationModal";

interface PgWithRatings extends PgRow {
  average_rating: number;
  total_reviews: number;
}

function scoreLocationMatch(loc: LocationRow, queryLower: string): number {
  const name = loc.name.toLowerCase();
  const city = loc.city.toLowerCase();
  if (name === queryLower) return 100;
  if (name.startsWith(queryLower)) return 88;
  if (name.includes(queryLower)) return 72;
  if (city.includes(queryLower)) return 48;
  return 0;
}

export function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  
  // Suggestion State
  const [suggestions, setSuggestions] = useState<LocationRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Categorized State
  const [colleges, setColleges] = useState<LocationRow[]>([]);
  const [areas, setAreas] = useState<LocationRow[]>([]);
  const [realTopPgs, setRealTopPgs] = useState<PgWithRatings[]>([]);
  
  const [exploring, setExploring] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);

  // 1. Initial Data Fetch (Colleges, Areas, Top PGs)
  useEffect(() => {
    void (async () => {
      const sb = getSupabase();
      if (!sb) {
        setColleges(DEMO_LOCATIONS.filter(l => l.type === 'college'));
        return;
      }

      const { data: colData } = await sb.from("locations").select("*").eq("type", "college").order("name").limit(12);
      const { data: areaData } = await sb.from("locations").select("*").eq("type", "area").order("name").limit(12);
      
      if (colData) setColleges(colData as LocationRow[]);
      if (areaData) setAreas(areaData as LocationRow[]);

      const { data: pgData } = await sb.from("pg_with_ratings").select("*").gt("total_reviews", 0).order("average_rating", { ascending: false }).limit(3);
      if (pgData) setRealTopPgs(pgData as PgWithRatings[]);
    })();
  }, []);

  // 2. Real-time Fuzzy Search Logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      const query = q.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      const sb = getSupabase();
      if (!sb) return;

      // Calling the RPC function we created in SQL
      const { data, error } = await sb.rpc('search_locations', { 
        search_query: query 
      });

      if (!error && data) {
        setSuggestions(data as LocationRow[]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 150); // Debounce
    return () => clearTimeout(timer);
  }, [q]);

  const runExplore = useCallback(async () => {
    const raw = q.trim();
    if (!raw) return;

    if (suggestions.length > 0) {
      navigate(`/location/${suggestions[0].slug}`);
      return;
    }

    setExploring(true);
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data: locRows } = await sb.from("locations").select("*").or(`name.ilike.%${raw}%,city.ilike.%${raw}%`).limit(1);

      if (locRows?.length) {
        navigate(`/location/${locRows[0].slug}`);
      } else {
        setAddLocationOpen(true);
      }
    } finally {
      setExploring(false);
    }
  }, [q, suggestions, navigate]);

  return (
    <>
      <Helmet>
        <title>RateYourPG — Honest PG Reviews in Bangalore & India</title>
      </Helmet>

      {/* HERO SECTION */}
      <section className="border-b border-stone-200 bg-linear-to-b from-teal-50/50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-900">
            100% User Verified
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-stone-900 sm:text-6xl">
            Find a PG you’ll actually <span className="text-teal-600">love.</span>
          </h1>
          
          <div className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
            {/* SEARCH INPUT WITH DROPDOWN */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-stone-400" size={20} />
              <input
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && void runExplore()}
                className="h-14 w-full rounded-2xl border border-stone-200 bg-white pl-12 pr-4 text-base shadow-sm outline-none ring-teal-600/20 transition focus:border-teal-600 focus:ring-4"
                placeholder="Search by college (e.g. BTM, RVCE, Whitefield)"
              />

              {/* DROPDOWN UI */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl backdrop-blur-sm">
                   <div className="max-h-[320px] overflow-y-auto py-2">
                    {suggestions.map((loc) => (
                      <button
                        key={loc.id}
                        onMouseDown={() => navigate(`/location/${loc.slug}`)}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-teal-50"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            loc.type === 'college' ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {loc.type === 'college' ? <School size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-bold text-stone-900">{loc.name}</p>
                          <p className="text-xs text-stone-500">{loc.city} • {loc.type}</p>
                        </div>
                      </button>
                    ))}
                   </div>
                </div>
              )}
            </div>

            <Button className="h-14 px-8 text-base" disabled={exploring} onClick={() => void runExplore()}>
              {exploring ? "Searching..." : "Explore"}
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* COLLEGES SECTION */}
        {colleges.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-2">
              <School className="text-teal-600" size={24} />
              <h2 className="text-2xl font-bold text-stone-900">Popular Colleges</h2>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {colleges.map((l) => (
                <Link key={l.id} to={`/location/${l.slug}`} className="shrink-0 snap-start">
                  <Card className="w-64 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="h-32 bg-linear-to-br from-teal-500/10 to-amber-500/10 flex items-center justify-center">
                       <School className="text-stone-300" size={40} />
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-stone-900 line-clamp-1">{l.name}</p>
                      <p className="text-sm text-stone-500">{l.city}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AREAS SECTION */}
        {areas.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-2">
              <MapPin className="text-teal-600" size={24} />
              <h2 className="text-2xl font-bold text-stone-900">Explore by Area</h2>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 snap-x snap-mandatory">
              {areas.map((a) => (
                <Link key={a.id} to={`/location/${a.slug}`} className="shrink-0 snap-start">
                  <div className="group relative h-44 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm transition-all hover:shadow-md">
                    <img 
                      src={a.image_url || "https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=600"} 
                      alt={a.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-stone-900/80 via-stone-900/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-xl font-bold">{a.name}</p>
                      <div className="flex items-center gap-1 text-xs opacity-90">
                        <MapPin size={12} />
                        <span>{a.city}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* TOP RATED SECTION */}
        <section>
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Highest Rated PGs</h2>
              <p className="text-stone-500 text-sm">Real feedback from actual residents</p>
            </div>
            <Link to="/explore" className="text-sm font-bold text-teal-600 hover:text-teal-700">
              View all PGs →
            </Link>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {realTopPgs.length > 0 ? (
              realTopPgs.map((pg) => (
                <PgCard
                  key={pg.id}
                  pg={pg}
                  rating={pg.average_rating}
                  reviewCount={pg.total_reviews}
                  tags={["High Trust", "Clean Rooms"]}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border-2 border-dashed border-stone-200 py-12 text-center">
                <p className="text-stone-500">No rated PGs found in this area yet.</p>
                <Button variant="ghost" className="mt-2 text-teal-600" onClick={() => navigate("/?write=1")}>
                  Be the first to write a review
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <AddLocationModal
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        defaultName={q.trim()}
        onCreated={(loc) => {
          if (loc.type === 'college') setColleges(prev => [loc, ...prev]);
          else setAreas(prev => [loc, ...prev]);
          navigate(`/location/${loc.slug}?write=1`);
        }}
      />
    </>
  );
}