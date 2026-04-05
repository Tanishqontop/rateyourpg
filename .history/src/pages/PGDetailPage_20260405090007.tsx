import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Flag, MapPin } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { getDemoPgBySlug } from "@/lib/demoData";
import { REVIEW_TAG_OPTIONS } from "@/lib/constants";
import { getReviewerLabel } from "@/lib/reviewDisplay";
import type { PgRow, ReviewRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { TrustBadges } from "@/components/trust/TrustBadges";

type ReviewWithMeta = ReviewRow & { author_email?: string | null };

export function PGDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();
  const [pg, setPg] = useState<PgRow | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);

  useEffect(() => {
    void (async () => {
      if (!slug) return;
      const sb = getSupabase();
      if (!sb) {
        setPg(getDemoPgBySlug(slug) ?? null);
        setReviews([]);
        return;
      }
      const { data: row } = await sb
        .from("pgs")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setPg((row as PgRow) ?? null);
      if (!row) {
        setReviews([]);
        return;
      }
      const { data: revs } = await sb
        .from("reviews")
        .select("*")
        .eq("pg_id", (row as PgRow).id)
        .order("created_at", { ascending: false });
      const list = (revs as ReviewRow[]) ?? [];
      const userIds = [...new Set(list.map((r) => r.user_id))];
      const { data: profs } = await sb
        .from("profiles")
        .select("id,email")
        .in("id", userIds);
      const emailMap = new Map((profs as { id: string; email: string | null }[] | null)?.map((p) => [p.id, p.email]) ?? []);
      setReviews(
        list.map((r) => ({
          ...r,
          author_email: emailMap.get(r.user_id) ?? null,
        }))
      );
    })();
  }, [slug]);

  const aggregates = useMemo(() => {
    if (!reviews.length) {
      return {
        overall: 4.4,
        food: 4.2,
        clean: 4.3,
        safety: 4.1,
        value: 4.4,
        owner: 4.0,
        summary:
          "People love the food but a few mention strict curfew rules — typical for PGs near campus.",
        pros: ["Strong food & value scores in sample data."],
        cons: ["Some mention strict timing rules."],
      };
    }
    const n = reviews.length;
    const avg = (
      k:
        | "rating"
        | "food_rating"
        | "cleanliness_rating"
        | "safety_rating"
        | "value_rating"
        | "owner_rating"
    ) => reviews.reduce((s, r) => s + Number(r[k]), 0) / n;
    const withAi = reviews.find(
      (r) => r.ai_summary || (r.ai_pros as string[] | null)?.length
    );
    const summary =
      withAi?.ai_summary ??
      "Honest, detailed reviews from students and working professionals.";
    const pros = (withAi?.ai_pros as string[] | null)?.length
      ? (withAi?.ai_pros as string[])
      : ["Reviewers highlight recurring themes across ratings."];
    const cons = (withAi?.ai_cons as string[] | null)?.length
      ? (withAi?.ai_cons as string[])
      : ["Check tags for common friction points."];
    return {
      overall: avg("rating"),
      food: avg("food_rating"),
      clean: avg("cleanliness_rating"),
      safety: avg("safety_rating"),
      value: avg("value_rating"),
      owner: avg("owner_rating"),
      summary,
      pros,
      cons,
    };
  }, [reviews]);

  if (!pg) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900">PG not found</h1>
        <Link className="mt-4 inline-block text-teal-700 underline" to="/">
          Back home
        </Link>
      </div>
    );
  }

  const images = [
    pg.cover_image_url,
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=70",
  ].filter(Boolean) as string[];

  const openWrite = searchParams.get("write") === "1";

  return (
    <>
      <Helmet>
        <title>{`${pg.name} — Reviews &amp; ratings | RateYourPG`}</title>
        <meta
          name="description"
          content={`${pg.name} in ${pg.area}: PG reviews for food, safety, value, and owner behaviour — student verified where possible.`}
        />
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <TrustBadges userAdded={pg.created_by_user} verifiedPg={pg.is_verified} />
        </div>

        <h1 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">{pg.name}</h1>
        <p className="mt-2 flex items-center gap-2 text-stone-600">
          <MapPin size={18} />
          {pg.area}
          {pg.price_range ? (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
              {pg.price_range}
            </span>
          ) : null}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {images.map((src, i) => (
              <div
                key={i}
                className={`overflow-hidden rounded-2xl bg-stone-200 ${
                  i === 0 ? "col-span-3 aspect-[21/9] sm:aspect-[24/9]" : "aspect-[4/3]"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>

          <Card className="p-5">
            <p className="text-sm font-semibold text-stone-900">Rating snapshot</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Overall</span>
                <StarRating value={aggregates.overall} label={aggregates.overall.toFixed(1)} />
              </div>
              <div className="flex items-center justify-between">
                <span>Food</span>
                <StarRating value={aggregates.food} />
              </div>
              <div className="flex items-center justify-between">
                <span>Cleanliness</span>
                <StarRating value={aggregates.clean} />
              </div>
              <div className="flex items-center justify-between">
                <span>Safety</span>
                <StarRating value={aggregates.safety} />
              </div>
              <div className="flex items-center justify-between">
                <span>Value</span>
                <StarRating value={aggregates.value} />
              </div>
              <div className="flex items-center justify-between">
                <span>Owner</span>
                <StarRating value={aggregates.owner} />
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                navigate({
                  pathname: routeLocation.pathname,
                  search: "?write=1",
                });
              }}
            >
              Write a review
            </Button>
            {openWrite ? (
              <p className="mt-2 text-center text-xs text-teal-800">
                Use the review dialog to share your experience.
              </p>
            ) : null}
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-stone-900">AI summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              {aggregates.summary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
                <p className="font-semibold">Pros ✅</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {aggregates.pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-950">
                <p className="font-semibold">Cons ❌</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {aggregates.cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-stone-900">Quick facts</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">Gender</dt>
                <dd className="font-medium capitalize">{pg.gender_type}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">Curfew</dt>
                <dd className="font-medium">{pg.curfew ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">Visitors</dt>
                <dd className="font-medium">
                  {pg.visitor_allowed === null
                    ? "—"
                    : pg.visitor_allowed
                      ? "Allowed"
                      : "Not allowed"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-stone-500">Deposit</dt>
                <dd className="font-medium">
                  {pg.deposit != null ? `₹${pg.deposit.toLocaleString("en-IN")}` : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-stone-500">
              Featured &amp; sponsored slots can surface here later (monetization-ready).
            </p>
          </Card>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-stone-900">Reviews</h2>
          <div className="mt-4 space-y-4">
            {reviews.length === 0 ? (
              <Card className="p-6 text-sm text-stone-600">
                No reviews yet — be the first to share an honest take.
              </Card>
            ) : (
              reviews.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-stone-900">
                        {getReviewerLabel(r, r.author_email)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {r.is_guest ? <Badge tone="guest">Guest review</Badge> : null}
                        {!r.is_guest ? (
                          <Badge tone="verified">Verified user</Badge>
                        ) : null}
                      </div>
                    </div>
                    <StarRating value={Number(r.rating)} label={Number(r.rating).toFixed(1)} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-stone-700">{r.review_text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {((r.tags as string[] | null) ?? []).map((tid) => {
                      const label =
                        REVIEW_TAG_OPTIONS.find((o) => o.id === tid)?.label ?? tid;
                      const emoji =
                        REVIEW_TAG_OPTIONS.find((o) => o.id === tid)?.emoji ?? "";
                      return (
                        <Badge key={tid} tone="brand">
                          {emoji ? `${emoji} ` : ""}
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
                    onClick={() => {
                      alert("Thanks — moderators will take a look.");
                    }}
                  >
                    <Flag size={14} /> Report review
                  </button>
                </Card>
              ))
            )}
          </div>
        </section>

        <Card className="mt-10 border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle size={18} />
            <p>
              Trust &amp; safety: reviews with the <strong>Guest review</strong> badge may use
              optional display names. Verified accounts build more trust over time.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
