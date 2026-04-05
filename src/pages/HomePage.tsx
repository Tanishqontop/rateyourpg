import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, Compass, PenLine, Search } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { setReviewPrefillLocation } from "@/lib/reviewPrefill";
import { DEMO_LOCATIONS, DEMO_PGS } from "@/lib/demoData";
import { POPULAR_AREAS } from "@/lib/constants";
import type { LocationRow, PgRow } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PgCard } from "@/components/pg/PgCard";
import { AddLocationModal } from "@/components/location/AddLocationModal";

function scoreLocationMatch(loc: LocationRow, queryLower: string): number {
  const name = loc.name.toLowerCase();
  const city = loc.city.toLowerCase();
  const slug = (loc.slug ?? "").toLowerCase();
  const typ = String(loc.type ?? "").toLowerCase();
  if (name === queryLower) return 100;
  if (name.startsWith(queryLower)) return 88;
  if (name.includes(queryLower)) return 72;
  const hyphen = queryLower.replace(/\s+/g, "-");
  if (slug.includes(hyphen) || slug.includes(queryLower.replace(/\s+/g, "")))
    return 68;
  if (city.includes(queryLower)) return 48;
  if (typ.includes(queryLower)) return 42;
  return 0;
}

export function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>(DEMO_LOCATIONS);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);
  const [suggestAddLocation, setSuggestAddLocation] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const sb = getSupabase();
      if (!sb) {
        setLocations(DEMO_LOCATIONS);
        return;
      }
      const { data } = await sb.from("locations").select("*").order("name").limit(40);
      if (data && data.length) setLocations(data as LocationRow[]);
      else setLocations(DEMO_LOCATIONS);
    })();
  }, []);

  const runExplore = useCallback(async () => {
    setSearchHint(null);
    setSuggestAddLocation(false);
    const raw = q.trim();
    const s = raw.toLowerCase();

    if (!raw) {
      const first = locations[0];
      if (first) navigate(`/location/${first.slug}`);
      else setSearchHint("No locations to explore yet.");
      return;
    }

    const pickBestLocation = (rows: LocationRow[]): LocationRow | null => {
      const ranked = [...rows]
        .map((l) => ({ l, score: scoreLocationMatch(l, s) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      return ranked[0]?.l ?? null;
    };

    const localBest = pickBestLocation(locations);
    if (localBest) {
      navigate(`/location/${localBest.slug}`);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setSearchHint(
        `No match for “${raw}” in offline demo data. Connect Supabase to add new places, or pick a college below.`
      );
      return;
    }

    const safe = raw.replace(/[%_,]/g, " ").slice(0, 80);
    setExploring(true);
    try {
      const { data: locRows, error: locErr } = await sb
        .from("locations")
        .select("*")
        .or(`name.ilike.%${safe}%,city.ilike.%${safe}%,slug.ilike.%${safe}%`)
        .limit(24);

      if (!locErr && locRows?.length) {
        const rows = locRows as LocationRow[];
        const best = pickBestLocation(rows) ?? rows[0];
        if (best?.slug) {
          navigate(`/location/${best.slug}`);
          return;
        }
      }

      const { data: pgByName, error: pgNameErr } = await sb
        .from("pgs")
        .select("slug")
        .ilike("name", `%${safe}%`)
        .limit(10);

      if (!pgNameErr && pgByName?.[0]) {
        navigate(`/pg/${(pgByName[0] as { slug: string }).slug}`);
        return;
      }

      const { data: pgByArea, error: pgAreaErr } = await sb
        .from("pgs")
        .select("slug")
        .ilike("area", `%${safe}%`)
        .limit(10);

      if (!pgAreaErr && pgByArea?.[0]) {
        navigate(`/pg/${(pgByArea[0] as { slug: string }).slug}`);
        return;
      }

      setSearchHint(
        `Nothing matched “${raw}”. Add it as a new college or area, then list your PG and review it.`
      );
      setSuggestAddLocation(true);
    } finally {
      setExploring(false);
    }
  }, [q, locations, navigate]);

  const topPgs = useMemo(() => DEMO_PGS.slice(0, 3), []);

  return (
    <>
      <Helmet>
        <title>RateYourPG — Best PG in Bangalore &amp; India | Reviews</title>
        <meta
          name="description"
          content="Discover PGs near your college, read honest reviews, and find food, safety, and value ratings — built for students across India."
        />
      </Helmet>

      <section className="border-b border-stone-200 bg-gradient-to-b from-teal-50/80 to-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Community · India
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Find a PG you’ll actually enjoy coming home to.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Search PGs by city, area, or college — the Zomato-style companion for
            student housing in India.
          </p>

          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 text-stone-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchHint(null);
                  setSuggestAddLocation(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runExplore();
                  }
                }}
                className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-3 text-sm shadow-sm outline-none ring-teal-600/20 focus:ring-2"
                placeholder="Search PGs by city, area, or college"
                aria-label="Search colleges, areas, or cities"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
              <Button
                className="w-full sm:w-auto"
                disabled={exploring}
                onClick={() => void runExplore()}
              >
                <Compass size={18} />
                {exploring ? "Searching…" : "Explore"}
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  navigate("/?write=1");
                }}
              >
                <PenLine size={18} />
                Write Review
              </Button>
              </div>
              {searchHint ? (
                <div
                  className="flex flex-col gap-2 sm:ml-1 sm:max-w-lg"
                  role="status"
                >
                  <p className="text-sm text-amber-900">{searchHint}</p>
                  {suggestAddLocation && isSupabaseConfigured() ? (
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      type="button"
                      onClick={() => setAddLocationOpen(true)}
                    >
                      Add “{q.trim()}” as a new place
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Popular colleges</h2>
            <span className="text-sm text-stone-500">Swipe →</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {locations.map((l) => (
              <Link key={l.id} to={`/location/${l.slug}`} className="shrink-0">
                <Card className="w-64 overflow-hidden transition hover:-translate-y-0.5">
                  <div className="h-28 bg-gradient-to-br from-teal-100 to-amber-50" />
                  <div className="p-4">
                    <p className="font-semibold text-stone-900">{l.name}</p>
                    <p className="text-xs text-stone-500">{l.city}</p>
                    <p className="mt-2 text-xs font-medium text-teal-800">
                      View PGs <ChevronRight className="inline" size={14} />
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-stone-900">Popular areas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_AREAS.map((a) => (
              <Card
                key={a.name}
                className="flex items-center justify-between p-4 text-sm font-semibold text-stone-800"
              >
                <span>{a.name}</span>
                <span className="text-xs font-normal text-stone-500">{a.city}</span>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Top rated PGs</h2>
            <p className="text-sm text-stone-500">Curated from community reviews</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {topPgs.map((pg: PgRow) => (
              <PgCard
                key={pg.id}
                pg={pg}
                rating={4.6}
                reviewCount={42}
                tags={["Good food", "Strict rules", "Metro nearby"]}
              />
            ))}
          </div>
        </section>
      </div>

      <AddLocationModal
        open={addLocationOpen}
        onClose={() => setAddLocationOpen(false)}
        defaultName={q.trim()}
        onCreated={(loc) => {
          setLocations((prev) =>
            [...prev, loc].sort((a, b) => a.name.localeCompare(b.name))
          );
          setSuggestAddLocation(false);
          setSearchHint(null);
          setReviewPrefillLocation({
            id: loc.id,
            slug: loc.slug,
            name: loc.name,
            city: loc.city,
            type: loc.type,
            created_at: loc.created_at,
          });
          navigate("/?write=1");
        }}
      />
    </>
  );
}
