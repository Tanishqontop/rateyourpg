import { useEffect, useMemo, useState } from "react";
import { X, Search, AlertCircle } from "lucide-react"; // Added AlertCircle for errors
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
  preselectedPg,
}: {
  open: boolean;
  onClose: () => void;
  onGuestReviewSubmitted?: () => void;
  preselectedPg?: PgRow | null;
}) {
  const { user, profile, signInEmail, signUpEmail, signInGuest, loading } = useAuth();
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
  const [value, setValue] = useState(4); // Now used
  const [owner, setOwner] = useState(4); // Now used
  const [reviewText, setReviewText] = useState("");
  const [tags, setTags] = useState<ReviewTagId[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Now used

  const sbConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!open) return;
    setAuthError(null);
    setFormError(null);

    if (preselectedPg) {
      setSelectedPg(preselectedPg);
      setStep(user ? 4 : 1);
      return;
    }

    const prefill = peekReviewPrefillLocation();
    if (prefill && user) {
      const loc: LocationRow = {
        ...prefill,
        created_at: prefill.created_at ?? new Date().toISOString(),
      };
      setSelectedLoc(loc);
      setSelectedPg(null);
      setStep(3);
      consumeReviewPrefillLocation();
      return;
    }

    setSelectedLoc(null);
    setSelectedPg(null);
    setStep(user ? 2 : 1);
  }, [open, user, preselectedPg]);

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
        locQueryBuilder = locQueryBuilder.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
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
    else setStep(preselectedPg ? 4 : 2);
  };

  const handleGuest = async () => {
    setAuthError(null);
    const { error } = await signInGuest();
    if (error) setAuthError(error);
    else setStep(preselectedPg ? 4 : 2);
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-stone-50 sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">RateYourPG</p>
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          </div>
          <button type="button" className="rounded-xl p-2 text-stone-500 hover:bg-stone-100" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {!sbConfigured && (
            <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Supabase environment variables missing. Data will be read-only.
            </Card>
          )}

          {step === 1 && (
            <Card className="p-4 sm:p-6">
              {loading ? <p className="text-sm text-stone-600">Checking session…</p> : (
                <>
                  <div className="flex gap-2">
                    <button type="button" className={`rounded-full px-3 py-1 text-sm font-semibold ${authMode === "login" ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-700"}`} onClick={() => setAuthMode("login")}>Login</button>
                    <button type="button" className={`rounded-full px-3 py-1 text-sm font-semibold ${authMode === "signup" ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-700"}`} onClick={() => setAuthMode("signup")}>Sign up</button>
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={(e) => void handleAuth(e)}>
                    <input type="email" placeholder="Email" className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                    {authError && <p className="text-sm text-red-600">{authError}</p>}
                    <Button type="submit" className="w-full">{authMode === "login" ? "Continue" : "Create account"}</Button>
                  </form>
                  <Button variant="secondary" className="w-full mt-4" onClick={() => void handleGuest()}>Continue as Guest</Button>
                </>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card className="p-4 sm:p-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-stone-400" size={18} />
                <input className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none" placeholder="Search area" value={locQuery} onChange={(e) => setLocQuery(e.target.value)} />
              </div>
              <div className="mt-4 space-y-2">
                {locations.map((l) => (
                  <button key={l.id} className="w-full p-3 text-left text-sm border rounded-xl hover:bg-stone-50" onClick={() => { setSelectedLoc(l); setStep(3); }}>
                    {l.name} · {l.city}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {step === 3 && selectedLoc && (
            <div className="space-y-3">
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-stone-600 mb-2">PGs in <strong>{selectedLoc.name}</strong></p>
                <input className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm mb-4" placeholder="Filter PGs" value={pgQuery} onChange={(e) => setPgQuery(e.target.value)} />
                {pgs.map((p) => (
                  <button key={p.id} className="w-full p-3 mb-2 text-left text-sm border rounded-xl hover:bg-stone-50" onClick={() => { setSelectedPg(p); setStep(4); }}>
                    {p.name}
                  </button>
                ))}
              </Card>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="secondary" className="ml-2" onClick={() => setStep("add")}>Add new PG</Button>
            </div>
          )}

          {step === "add" && selectedLoc && (
            <AddPgForm
              locationId={selectedLoc.id}
              locationName={selectedLoc.name}
              city={selectedLoc.city}
              onSuccess={(pg) => { setSelectedPg(pg); setStep(4); }}
              onCancel={() => setStep(3)}
            />
          )}

          {step === 4 && selectedPg && (
            <form className="space-y-4" onSubmit={(e) => void submitReview(e)}>
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-stone-600 mb-4">Rating <strong>{selectedPg.name}</strong></p>
                
                {formError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} />
                    <p>{formError}</p>
                  </div>
                )}

                {isGuest && <input placeholder="Name (optional)" className="w-full rounded-xl border px-3 py-2 text-sm mb-4" value={guestName} onChange={(e) => setGuestName(e.target.value)} />}
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <StarInput label="Overall" value={rating} onChange={setRating} />
                  <StarInput label="Food" value={food} onChange={setFood} />
                  <StarInput label="Cleanliness" value={clean} onChange={setClean} />
                  <StarInput label="Safety" value={safety} onChange={setSafety} />
                  {/* Added missing value and owner inputs */}
                  <StarInput label="Value" value={value} onChange={setValue} />
                  <StarInput label="Owner" value={owner} onChange={setOwner} />
                </div>

                <textarea className="w-full mt-4 rounded-xl border p-3 text-sm min-h-30" placeholder="Your experience..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {REVIEW_TAG_OPTIONS.map((t) => (
                    <button key={t.id} type="button" onClick={() => toggleTag(t.id as ReviewTagId)} className={`rounded-full border px-3 py-1 text-xs ${tags.includes(t.id as ReviewTagId) ? "bg-teal-50 border-teal-600" : "bg-white"}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
                <input type="file" multiple className="mt-4 text-xs" onChange={(e) => setMediaFiles([...(e.target.files ?? [])])} />
                <div className="mt-6 flex gap-2">
                  <Button type="submit" disabled={submitting}>{submitting ? "Posting..." : "Submit Review"}</Button>
                  {!preselectedPg && <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>}
                </div>
              </Card>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}