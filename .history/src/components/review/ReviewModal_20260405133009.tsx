import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { REVIEW_TAG_OPTIONS } from "@/lib/constants";
import { DEMO_LOCATIONS, DEMO_PGS } from "@/lib/demoData";
import { generateReviewInsight } from "@/lib/reviewAi";
import { consumeReviewPrefillLocation, peekReviewPrefillLocation } from "@/lib/reviewPrefill";
import type { LocationRow, PgRow, ReviewTagId } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StarInput } from "@/components/ui/StarRating";
import { AddPgForm } from "@/components/review/AddPgForm";

type Step = 1 | 2 | 3 | "add" | 4;

export function ReviewModal({
  open,
  onClose,
  onGuestReviewSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onGuestReviewSubmitted?: () => void;
}) {
  const { user, profile, signInEmail, signUpEmail, signInGuest, loading } =
    useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);

  const [locQuery, setLocQuery] = useState("");
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<LocationRow | null>(null);

  const [pgQuery, setPgQuery] = useState("");
  const [pgs, setPgs] = useState<PgRow[]>([]);
  const [selectedPg, setSelectedPg] = useState<PgRow | null>(null);

  const [guestName, setGuestName] = useState("");
  const [rating, setRating] = useState(4);
  const [food, setFood] = useState(4);
  const [clean, setClean] = useState(4);
  const [safety, setSafety] = useState(4);
  const [value, setValue] = useState(4);
  const [owner, setOwner] = useState(4);
  const [reviewText, setReviewText] = useState("");
  const [tags, setTags] = useState<ReviewTagId[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sbConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!open) return;
    setAuthError(null);
    setFormError(null);

    const prefill = peekReviewPrefillLocation();

    if (prefill && user) {
      const loc: LocationRow = {
        ...prefill,
        created_at: prefill.created_at ?? new Date().toISOString(),
      };
      setSelectedLoc(loc);
      setSelectedPg(null);
      setLocQuery("");
      setPgQuery("");
      setStep(3);
      consumeReviewPrefillLocation();
      return;
    }

    setSelectedLoc(null);
    setSelectedPg(null);
    setLocQuery("");
    setPgQuery("");

    if (prefill && !user) {
      setStep(1);
      return;
    }

    setStep(user ? 2 : 1);
  }, [open, user]);

  useEffect(() => {
    if (!open || step !== 2) return;
    void (async () => {
      const q = locQuery.trim();
      const sb = getSupabase();
      if (!sb) {
        const filtered = DEMO_LOCATIONS.filter(
          (l: LocationRow) =>
            !q ||
            l.name.toLowerCase().includes(q.toLowerCase()) ||
            l.city.toLowerCase().includes(q.toLowerCase())
        );
        setLocations(filtered);
        return;
      }
      let locQueryBuilder = sb.from("locations").select("*").order("name").limit(24);
      if (q) {
        locQueryBuilder = locQueryBuilder.or(
          `name.ilike.%${q}%,city.ilike.%${q}%`
        );
      }
      const { data, error } = await locQueryBuilder;
      if (!error && data) setLocations(data as LocationRow[]);
      else setLocations([]);
    })();
  }, [open, step, locQuery]);

  useEffect(() => {
    if (!open || step !== 3 || !selectedLoc) return;
    void (async () => {
      const q = pgQuery.trim();
      const sb = getSupabase();
      if (!sb) {
        const filtered = DEMO_PGS.filter(
          (p: PgRow) =>
            p.location_id === selectedLoc.id &&
            (!q || p.name.toLowerCase().includes(q.toLowerCase()))
        );
        setPgs(filtered);
        return;
      }
      let query = sb
        .from("pgs")
        .select("*")
        .eq("location_id", selectedLoc.id)
        .order("name")
        .limit(40);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (!error && data) setPgs(data as PgRow[]);
      else setPgs([]);
    })();
  }, [open, step, selectedLoc, pgQuery]);

  const isGuest = Boolean(profile?.is_guest);

  useEffect(() => {
    if (isGuest) setIsAnonymous(true);
  }, [isGuest]);

  const toggleTag = (id: ReviewTagId) => {
    setTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const fn = authMode === "login" ? signInEmail : signUpEmail;
    const { error } = await fn(email.trim(), password);
    if (error) setAuthError(error);
    else setStep(2);
  };

  const handleGuest = async () => {
    setAuthError(null);
    const { error } = await signInGuest();
    if (error) setAuthError(error);
    else setStep(2);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const sb = getSupabase();
    if (!sb || !user || !selectedPg) {
      setFormError("Missing session or PG. Configure Supabase to submit.");
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const path = `${user.id}/reviews/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await sb.storage
          .from("pg-media")
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from("pg-media").getPublicUrl(path);
        mediaUrls.push(pub.publicUrl);
      }

      const insight = generateReviewInsight({
        rating,
        food_rating: food,
        cleanliness_rating: clean,
        safety_rating: safety,
        value_rating: value,
        owner_rating: owner,
        tags,
        review_text: reviewText,
      });

      const row = {
        user_id: user.id,
        pg_id: selectedPg.id,
        rating,
        food_rating: food,
        cleanliness_rating: clean,
        safety_rating: safety,
        value_rating: value,
        owner_rating: owner,
        review_text: reviewText.trim(),
        tags,
        guest_name: isGuest ? (guestName.trim() || null) : null,
        is_anonymous: isAnonymous,
        is_guest: isGuest,
        media_urls: mediaUrls,
        ai_pros: insight.pros,
        ai_cons: insight.cons,
        ai_summary: insight.summary,
      };

      const { error: insErr } = await sb.from("reviews").insert(row);
      if (insErr) throw insErr;

      onClose();
      if (isGuest) onGuestReviewSubmitted?.();
      else navigate(`/pg/${selectedPg.slug}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not post review.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = useMemo(() => {
    if (step === 1) return "Start your review";
    if (step === 2) return "Pick a college or area";
    if (step === 3) return "Choose a PG";
    if (step === "add") return "Add a PG";
    return "Write your review";
  }, [step]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-stone-50 sm:rounded-3xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                RateYourPG
              </p>
              <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {!sbConfigured ? (
              <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Add <code className="rounded bg-white px-1">VITE_SUPABASE_URL</code>{" "}
                and <code className="rounded bg-white px-1">VITE_SUPABASE_ANON_KEY</code>{" "}
                in <code className="rounded bg-white px-1">.env</code> to enable auth and
                submissions. Demo data still powers browsing.
              </Card>
            ) : null}

            {step === 1 && (
              <Card className="p-4 sm:p-6">
                {loading ? (
                  <p className="text-sm text-stone-600">Checking session…</p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          authMode === "login"
                            ? "bg-teal-600 text-white"
                            : "bg-stone-100 text-stone-700"
                        }`}
                        onClick={() => setAuthMode("login")}
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          authMode === "signup"
                            ? "bg-teal-600 text-white"
                            : "bg-stone-100 text-stone-700"
                        }`}
                        onClick={() => setAuthMode("signup")}
                      >
                        Sign up
                      </button>
                    </div>

                    <form className="mt-4 space-y-3" onSubmit={(e) => void handleAuth(e)}>
                      <div>
                        <label className="text-sm font-medium text-stone-700">
                          Email
                        </label>
                        <input
                          type="email"
                          autoComplete="email"
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-700">
                          Password
                        </label>
                        <input
                          type="password"
                          autoComplete={
                            authMode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                      {authError ? (
                        <p className="text-sm text-red-600">{authError}</p>
                      ) : null}
                      <Button type="submit" className="w-full sm:w-auto">
                        {authMode === "login" ? "Continue" : "Create account"}
                      </Button>
                    </form>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-stone-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-stone-500">Or</span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      className="w-full"
                      type="button"
                      onClick={() => void handleGuest()}
                    >
                      Continue as Guest
                    </Button>
                    <p className="mt-2 text-xs text-stone-500">
                      Guests can add PGs and post reviews. We’ll prompt you to save your
                      review with an email after you submit.
                    </p>
                  </>
                )}
              </Card>
            )}

            {step === 2 && (
              <Card className="p-4 sm:p-6">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                    size={18}
                  />
                  <input
                    className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none ring-teal-600/30 focus:ring-2"
                    placeholder="Search college, city, or area"
                    value={locQuery}
                    onChange={(e) => setLocQuery(e.target.value)}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setSelectedLoc(l);
                        setStep(3);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-left text-sm hover:border-teal-300"
                    >
                      <span>
                        <span className="font-semibold text-stone-900">{l.name}</span>
                        <span className="text-stone-500"> · {l.city}</span>
                      </span>
                      <span className="text-xs text-teal-700">Select</span>
                    </button>
                  ))}
                  {locations.length === 0 ? (
                    <p className="text-sm text-stone-500">No locations match.</p>
                  ) : null}
                </div>
              </Card>
            )}

            {step === 3 && selectedLoc && (
              <div className="space-y-3">
                <Card className="p-4 sm:p-6">
                  <p className="text-sm text-stone-600">
                    PGs near <strong>{selectedLoc.name}</strong>
                  </p>
                  <div className="relative mt-3">
                    <Search
                      className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                      size={18}
                    />
                    <input
                      className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-sm"
                      placeholder="Search PG by name"
                      value={pgQuery}
                      onChange={(e) => setPgQuery(e.target.value)}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {pgs.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPg(p);
                          setStep(4);
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3 text-left text-sm hover:border-teal-300"
                      >
                        <span>
                          <span className="font-semibold text-stone-900">{p.name}</span>
                          <span className="text-stone-500"> · {p.area}</span>
                        </span>
                        <span className="text-xs text-teal-700">Review</span>
                      </button>
                    ))}
                  </div>
                  {pgs.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">No PGs match this search.</p>
                  ) : null}
                </Card>

                <Card className="border-dashed border-teal-200 bg-teal-50/60 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    Can’t find your PG?
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Add it once — we’ll bring you back to write your review.
                  </p>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    type="button"
                    onClick={() => setStep("add")}
                  >
                    Add a PG
                  </Button>
                </Card>

                <Button variant="ghost" type="button" onClick={() => setStep(2)}>
                  ← Back
                </Button>
              </div>
            )}

            {step === "add" && selectedLoc && (
              <AddPgForm
                locationId={selectedLoc.id}
                locationName={selectedLoc.name}
                city={selectedLoc.city}
                onSuccess={(pg) => {
                  setSelectedPg(pg);
                  setStep(4);
                }}
                onCancel={() => setStep(3)}
              />
            )}

            {step === 4 && selectedPg && (
              <form className="space-y-4" onSubmit={(e) => void submitReview(e)}>
                <Card className="p-4 sm:p-6">
                  <p className="text-sm text-stone-600">
                    Reviewing <strong>{selectedPg.name}</strong> · {selectedPg.area}
                  </p>

                  {isGuest ? (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-stone-700">
                        Your name (optional)
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        placeholder="e.g., Rahul, Aditi"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-stone-500">
                        If empty, we’ll show “Anonymous” on your review.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    <StarInput label="Overall" value={rating} onChange={setRating} />
                    <StarInput label="Food" value={food} onChange={setFood} />
                    <StarInput label="Cleanliness" value={clean} onChange={setClean} />
                    <StarInput label="Safety" value={safety} onChange={setSafety} />
                    <StarInput label="Value for money" value={value} onChange={setValue} />
                    <StarInput label="Owner behaviour" value={owner} onChange={setOwner} />
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-stone-700">
                      Review
                    </label>
                    <textarea
                      className="mt-1 min-h-[120px] w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                      placeholder="Share what it’s really like to stay here…"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-stone-700">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {REVIEW_TAG_OPTIONS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTag(t.id as ReviewTagId)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            tags.includes(t.id as ReviewTagId)
                              ? "border-teal-600 bg-teal-50 text-teal-900"
                              : "border-stone-200 bg-white text-stone-600"
                          }`}
                        >
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-stone-700">
                      Photos / videos (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="mt-1 w-full text-sm"
                      onChange={(e) => setMediaFiles([...(e.target.files ?? [])])}
                    />
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    Post anonymously {isGuest ? "(recommended for guests)" : ""}
                  </label>

                  {formError ? (
                    <p className="mt-3 text-sm text-red-600">{formError}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Posting…" : "Post review"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep(3)}
                    >
                      Back
                    </Button>
                  </div>
                </Card>
              </form>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
