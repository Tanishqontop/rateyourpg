import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  ShieldCheck, 
  Clock, 
  CircleDollarSign,
  Star,
  UserCheck,
  LayoutGrid,
  Zap,
  type LucideIcon 
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { getDemoPgBySlug } from "@/lib/demoData";
import { getReviewerLabel } from "@/lib/reviewDisplay";
import type { PgRow, ReviewRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { ReviewModal } from "@/components/review/ReviewModal"; 

type ReviewWithMeta = ReviewRow & { author_email?: string | null };

// =========================
// HELPER COMPONENTS
// =========================

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-black text-stone-800">{value > 0 ? value.toFixed(1) : "N/A"}</span>
        {value > 0 && (
          <div className="h-1 w-12 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500" style={{ width: `${(value / 5) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
      <div className="flex items-center gap-3 text-stone-500 font-bold uppercase text-[10px] tracking-widest">
        <Icon size={18} className="text-teal-600" /> <span>{label}</span>
      </div>
      <span className="font-black text-stone-900 text-sm text-right">{value}</span>
    </div>
  );
}

function ImageModal({ images, index, onClose, onNext, onPrev }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white"><X size={32} /></button>
      <button onClick={onPrev} className="absolute left-4 p-4 text-white/50 hover:text-white"><ChevronLeft size={48} /></button>
      <div className="max-w-5xl w-full flex flex-col items-center">
        <img src={images[index]} className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl" alt="Gallery" />
        <p className="text-white/50 mt-6 font-mono text-sm tracking-widest">{index + 1} / {images.length}</p>
      </div>
      <button onClick={onNext} className="absolute right-4 p-4 text-white/50 hover:text-white"><ChevronRight size={48} /></button>
    </div>
  );
}

// =========================
// MAIN PAGE COMPONENT
// =========================

export function PGDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pg, setPg] = useState<any | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!slug) return;
      const sb = getSupabase();
      if (!sb) {
        setPg(getDemoPgBySlug(slug) ?? null);
        return;
      }

      // Fetching from your 'pg_with_ratings' table/view
      const { data: row } = await sb.from("pgs").select("*").eq("slug", slug).maybeSingle();
      setPg(row ?? null);

      if (!row) return;

      const { data: revs } = await sb
        .from("reviews")
        .select("*")
        .eq("pg_id", row.id)
        .order("created_at", { ascending: false });

      const list = (revs as ReviewRow[]) ?? [];
      const userIds = [...new Set(list.map((r) => r.user_id))];
      const { data: profs } = await sb.from("profiles").select("id,email").in("id", userIds);
      const emailMap = new Map(profs?.map((p) => [p.id, p.email]) ?? []);
      setReviews(list.map((r) => ({ ...r, author_email: emailMap.get(r.user_id) ?? null })));
    })();
  }, [slug]);

  const aggregates = useMemo(() => {
    if (!reviews.length) return { overall: 0, food: 0, clean: 0, safety: 0, summary: "No reviews yet." };
    const avg = (k: keyof ReviewRow) => reviews.reduce((s, r) => s + Number(r[k] || 0), 0) / reviews.length;
    return {
      overall: Number(avg("rating").toFixed(1)),
      food: Number(avg("food_rating").toFixed(1)),
      clean: Number(avg("cleanliness_rating").toFixed(1)),
      safety: Number(avg("safety_rating").toFixed(1)),
      summary: reviews.find((r) => r.ai_summary)?.ai_summary ?? "Honest reviews from the community.",
    };
  }, [reviews]);

  const allGalleryImages = useMemo(() => {
    if (!pg) return [];
    const reviewImages = reviews.flatMap((r) => (r.media_urls as string[]) || []);
    return [pg.cover_image_url, ...reviewImages].filter(Boolean);
  }, [pg, reviews]);

  if (!pg) return <div className="py-20 text-center font-bold text-stone-400 animate-pulse">LOADING PG DATA...</div>;

  return (
    <>
      <Helmet><title>{pg.name} | RateYourPG</title></Helmet>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-stone-900 tracking-tight">{pg.name}</h1>
            <div className="flex items-center gap-2 text-stone-500 mt-2 font-medium">
              <MapPin size={18} className="text-teal-500" />
              <span>{pg.area}, {pg.city}</span> {/* Area & City from DB */}
            </div>
          </div>
          <div className="bg-stone-900 text-white px-6 py-3 rounded-2xl shadow-lg">
            <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Starting Price</p>
            <p className="text-2xl font-black text-teal-400">{pg.price_range}</p>
          </div>
        </div>

        {/* GALLERY */}
        <div className="mb-12 h-[450px] rounded-3xl overflow-hidden border border-stone-200 grid grid-cols-4 gap-3">
          <div className="col-span-4 md:col-span-2 relative group cursor-pointer overflow-hidden" onClick={() => setActiveImageIndex(0)}>
            <img src={allGalleryImages[0]} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt="Main" />
          </div>
          {allGalleryImages.slice(1, 4).map((url, i) => (
            <div key={i} className="hidden md:block relative cursor-pointer overflow-hidden group" onClick={() => setActiveImageIndex(i+1)}>
              <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition" alt="Sub" />
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-10">
            {/* Resident Vibe Check */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-px rounded-3xl shadow-xl shadow-teal-100/50">
              <div className="bg-white p-8 rounded-[23px]">
                <h3 className="font-black text-teal-600 mb-3 flex items-center gap-2 tracking-tight">
                  <Info size={20} /> RESIDENT VIBE CHECK
                </h3>
                <p className="text-stone-700 text-lg leading-relaxed font-medium italic">"{aggregates.summary}"</p>
              </div>
            </div>

            {/* Description Section */}
            {pg.description && (
              <section>
                <h2 className="text-2xl font-black mb-4">About this PG</h2>
                <p className="text-stone-600 leading-relaxed font-medium whitespace-pre-line bg-stone-50 p-6 rounded-2xl border border-stone-100">
                  {pg.description}
                </p>
              </section>
            )}

            {/* Amenities Section */}
            <section>
              <h2 className="text-2xl font-black mb-6">Amenities</h2>
              <div className="flex flex-wrap gap-3">
                {pg.amenities?.map((amenity: string) => (
                  <div key={amenity} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 shadow-sm">
                    <Zap size={16} className="text-teal-500" />
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Rating Snapshot */}
            <Card className="p-8 border-stone-100 shadow-sm">
              <h3 className="font-black text-xl mb-8 tracking-tight">Rating Snapshot</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                <Metric label="Overall" value={aggregates.overall} />
                <Metric label="Food" value={aggregates.food} />
                <Metric label="Clean" value={aggregates.clean} />
                <Metric label="Safety" value={aggregates.safety} />
              </div>
            </Card>

            {/* Reviews */}
            <section>
              <h2 className="text-2xl font-black mb-8">Detailed Reviews</h2>
              <div className="space-y-6">
                {reviews.map((r) => (
                  <Card key={r.id} className="p-6 border-stone-100 shadow-none bg-stone-50/40">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-stone-900">{getReviewerLabel(r, r.author_email)}</p>
                        <StarRating value={Number(r.rating)} label={Number(r.rating).toFixed(1)} />
                      </div>
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed font-medium">"{r.review_text}"</p>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* SIDEBAR: QUICK FACTS */}
          <aside className="space-y-6">
            <div className="sticky top-10">
              <Card className="p-8 border-2 border-stone-900 rounded-[2.5rem] shadow-2xl bg-white overflow-hidden">
                <h3 className="font-black text-2xl mb-6 tracking-tight">Quick Facts</h3>
                
                <div className="space-y-1 mb-10">
                  <SidebarItem icon={MapPin} label="Area" value={pg.area} />
                  <SidebarItem icon={UserCheck} label="Gender" value={pg.gender_type || "Any"} />
                  <SidebarItem icon={LayoutGrid} label="Rooms" value={Array.isArray(pg.room_types) ? pg.room_types.join(", ") : pg.room_types} />
                  <SidebarItem icon={Clock} label="Curfew" value={pg.curfew || "No Curfew"} />
                  <SidebarItem icon={ShieldCheck} label="Verified" value={pg.is_verified ? "Yes" : "No"} />
                  <SidebarItem icon={CircleDollarSign} label="Deposit" value={pg.deposit ? `₹${pg.deposit.toLocaleString('en-IN')}` : "Not Set"} />
                  <SidebarItem icon={UserCheck} label="Visitors" value={pg.visitor_allowed ? "Allowed" : "Not Allowed"} />
                </div>
                
                <Button 
                  className="w-full bg-teal-600 hover:bg-stone-900 h-16 rounded-2xl font-black text-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
                  onClick={() => setIsReviewModalOpen(true)}
                >
                  <Star size={20} fill="currentColor" />
                  RATE THIS PG
                </Button>
              </Card>

              <div className="mt-8 p-4 flex gap-3 text-stone-400 bg-stone-50 rounded-2xl border border-stone-100">
                <AlertTriangle size={20} className="shrink-0 text-amber-500" />
                <p className="text-[11px] leading-tight font-medium">
                  RateYourPG prioritizes resident safety. Always verify amenities and legal documents in person before making any payment.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ReviewModal open={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} preselectedPg={pg} />
      {activeImageIndex !== null && (
        <ImageModal images={allGalleryImages} index={activeImageIndex} onClose={() => setActiveImageIndex(null)} onNext={() => setActiveImageIndex((prev) => (prev! + 1) % allGalleryImages.length)} onPrev={() => setActiveImageIndex((prev) => (prev! - 1 + allGalleryImages.length) % allGalleryImages.length)} />
      )}
    </>
  );
}