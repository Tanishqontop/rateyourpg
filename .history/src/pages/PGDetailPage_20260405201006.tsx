import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { getDemoPgBySlug } from "@/lib/demoData";
import { getReviewerLabel } from "@/lib/reviewDisplay";
import type { PgRow, ReviewRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";

type ReviewWithMeta = ReviewRow & { author_email?: string | null };

export function PGDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();

  const [pg, setPg] = useState<PgRow | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);

  // =========================
  // FETCH DATA
  // =========================
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

      const emailMap = new Map(
        (profs as { id: string; email: string | null }[] | null)?.map((p) => [
          p.id,
          p.email,
        ]) ?? []
      );

      setReviews(
        list.map((r) => ({
          ...r,
          author_email: emailMap.get(r.user_id) ?? null,
        }))
      );
    })();
  }, [slug]);

  // =========================
  // AGGREGATES
  // =========================
  const aggregates = useMemo(() => {
    if (!reviews.length) {
      return {
        overall: 0,
        food: 0,
        clean: 0,
        safety: 0,
        value: 0,
        owner: 0,
        summary: "No reviews yet.",
        pros: [],
        cons: [],
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
    ) =>
      reviews.reduce((s, r) => s + Number(r[k] || 0), 0) / n;

    const withAi = reviews.find(
      (r) => r.ai_summary || (r.ai_pros as string[] | null)?.length
    );

    return {
      overall: Number(avg("rating").toFixed(1)),
      food: Number(avg("food_rating").toFixed(1)),
      clean: Number(avg("cleanliness_rating").toFixed(1)),
      safety: Number(avg("safety_rating").toFixed(1)),
      value: Number(avg("value_rating").toFixed(1)),
      owner: Number(avg("owner_rating").toFixed(1)),
      summary:
        withAi?.ai_summary ??
        "Honest, detailed reviews from students and working professionals.",
      pros:
        (withAi?.ai_pros as string[] | null)?.length
          ? (withAi?.ai_pros as string[])
          : [],
      cons:
        (withAi?.ai_cons as string[] | null)?.length
          ? (withAi?.ai_cons as string[])
          : [],
    };
  }, [reviews]);

  // =========================
  // UI
  // =========================
  if (!pg) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">PG not found</h1>
        <Link to="/" className="text-teal-600 underline">
          Back home
        </Link>
      </div>
    );
  }

  const openWrite = searchParams.get("write") === "1";

  return (
    <>
      <Helmet>
        <title>{pg.name} — Reviews</title>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">{pg.name}</h1>

        <Card className="mt-6 p-5">
          <p className="font-semibold">Rating snapshot</p>

          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span>Overall</span>

              {aggregates.overall > 0 ? (
                <StarRating
                  value={aggregates.overall}
                  label={aggregates.overall.toFixed(1)}
                />
              ) : (
                <span className="text-sm text-stone-500">
                  No ratings yet
                </span>
              )}
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() =>
              navigate({
                pathname: routeLocation.pathname,
                search: "?write=1",
              })
            }
          >
            Write a review
          </Button>

          {openWrite && (
            <p className="mt-2 text-xs text-teal-600 text-center">
              Use the review dialog
            </p>
          )}
        </Card>

        <section className="mt-10">
          <h2 className="text-xl font-bold">Reviews</h2>

          {reviews.length === 0 ? (
            <Card className="p-6 text-sm mt-4">
              No reviews yet — be the first.
            </Card>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} className="p-5 mt-4">
                <div className="flex justify-between">
                  <p className="font-semibold text-stone-900">
                    {getReviewerLabel(r, r.author_email)}
                  </p>

                  <StarRating
                    value={Number(r.rating)}
                    label={Number(r.rating).toFixed(1)}
                  />
                </div>

                <p className="mt-3 text-stone-700 leading-relaxed">
                  {r.review_text}
                </p>
              </Card>
            ))
          )}
        </section>

        <Card className="mt-10 p-4 text-sm bg-stone-50 border-stone-200">
          <div className="flex gap-2 text-stone-600">
            <AlertTriangle size={18} className="shrink-0" />
            <p>
              Reviews marked as guest may be anonymous. Community safety is our priority.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}