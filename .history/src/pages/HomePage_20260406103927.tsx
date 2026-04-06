import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, MapPin, School, Heart, Github, Twitter } from "lucide-react";

import { getSupabase } from "@/lib/supabase";
import { DEMO_LOCATIONS } from "@/lib/demoData";
import type { LocationRow, PgRow } from "@/types/database";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PgCard } from "@/components/pg/PgCard";
import { AddLocationModal } from "@/components/location/AddLocationModal";

/**
 * Local interface for PGs joined with their rating metrics from the database view.
 */
interface PgWithRatings extends PgRow {
  average_rating: number;
  total_reviews: number;
  amenities: string[]; // Added to ensure dynamic tags are typed
}

function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-20 border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold">R</div>
              <span className="text-xl font-bold tracking-tight text-stone-900">RateYourPG</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-stone-500">
              India's first community-driven PG review platform. Helping students and professionals find safe, honest stays.
            </p>
            <div className="mt-6 flex gap-4">
              <Twitter size={20} className="text-stone-400 hover:text-teal-600 cursor-pointer transition" />
              <Github size={20} className="text-stone-400 hover:text-stone-900 cursor-pointer transition" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Explore</h3>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li><Link to="/explore" className="hover:text-teal-600">All Locations</Link></li>
              <li><Link to="/search?type=college" className="hover:text-teal-600">Top Colleges</Link></li>
              <li><Link to="/search?type=area" className="hover:text-teal-600">Popular Areas</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">Support</h3>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li><Link to="/about" className="hover:text-teal-600">About Us</Link></li>
              <li><Link to="/guidelines" className="hover:text-teal-600">Review Guidelines</Link></li>
              <li><Link to="/contact" className="hover:text-teal-600">Contact</Link></li>
            </ul>
          </div>

          <div className="rounded-2xl bg-teal-600 p-6 text-white shadow-lg shadow-teal-600/20">
            <h3 className="text-sm font-bold uppercase">Help the community</h3>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              Your honest review could save a student from a bad experience.
            </p>
            <Link 
              to="/?write=1" 
              className="mt-4 inline-block w-full rounded-xl bg-white px-4 py-2 text-center text-xs font-bold text-teal-600 hover:bg-stone-50 transition"
            >
              Write a Review
            </Link>
          </div>
        </div>

        <div className="mt-12 border-t border-stone-200 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-stone-400">© {currentYear} RateYourPG. Made for India.</p>
          <p className="flex items-center gap-1 text-xs text-stone-400">
            Made with <Heart size={12} className="text-red-500 fill-red-500" /> in Bengaluru
          </p>
        </div>
      </div>
    </footer>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<LocationRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);

  const [colleges, setColleges] = useState<LocationRow[]>([]);
  const [areas, setAreas] = useState<LocationRow[]>([]);
  const [realTopPgs, setRealTopPgs] = useState<PgWithRatings[]>([]);

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

  useEffect(() => {
    const fetchSuggestions = async () => {
      const query = q.trim();
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      const sb = getSupabase();
      if (!sb) return;
      const { data, error } = await sb.rpc('search_locations', { search_query: query });
      if (!error && data) setSuggestions(data as LocationRow[]);
    };

    const timer = setTimeout(fetchSuggestions, 150);
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
            Verified by Community
          </p>
          
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-stone-900 sm:text-6xl">
            Find a PG you’ll actually <span className="text-teal-600">love.</span>
          </h1>

          <p className="mt-3 text-lg font-medium text-stone-500 sm:text-xl italic">
            Made by Indians for Indians
          </p>
          
          <div className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
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
                placeholder="Search by area or college (e.g. BTM, RVCE)"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl backdrop-blur-sm">
                  <div className="max-h-80 overflow-y-auto py-2">
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
        {/* COLLEGES */}
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
                    <div className="h-32 bg-linear-to-br from-teal-500/10 to-amber-500/10 flex items-center justify-center text-stone-300">
                       <School size={40} />
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

        {/* AREAS */}
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

        {/* HIGHEST RATED PGS */}
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
                  // FIX: Passing actual database amenities instead of hardcoded strings
                  tags={pg.amenities || []}
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

      <Footer />

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