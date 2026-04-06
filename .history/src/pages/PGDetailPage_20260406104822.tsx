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
  UserCheck, // Added for Visitors
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
    <div className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
      <div className="flex items-center gap-3 text-stone-500 font-bold uppercase text-[10px] tracking-widest">
        <Icon size={18} className="text-teal-600" /> <span>{label}</span>
      </div>
      <span className="font-black text-stone-900 text-sm">{value}</span>
    </div>
  );
}

function ImageModal({ 
  images, 
  index, 
  onClose, 
  onNext, 
  onPrev 
}: { 
  images: string[], 
  index: number, 
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors">
        <X size={32} />
      </button>
      <button onClick={onPrev} className="absolute left-4 p-4 text-white/50 hover:text-white transition-colors">
        <ChevronLeft size={48} />
      </button>
      <div className="max-w-5xl w-full flex flex-col items-center">
        <img src={images[index]} className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl" alt="Gallery View" />
        <p className="text-white/50 mt-6 font-mono text-sm tracking-widest">
          {index + 1} / {images.length}
        </p>
      </div>
      <button onClick={onNext} className="absolute right-4 p-4 text-white/50 hover:text-white transition-colors">
        <ChevronRight size={48} />
      </button>
    </div>
  );
}

// =========================
// MAIN PAGE COMPONENT
// =========================

export function PGDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pg, setPg] = useState<PgRow | null>(null);
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!slug) return;
      const sb = getSupabase();

      if (!sb) {
        setPg(getDemoPgBySlug(slug) ?? null);
        setReviews([]);
        return;
      }

      const { data: row } = await sb.from("pgs").select("*").eq("slug", slug).maybeSingle();
      setPg((row as PgRow) ?? null);

      if (!row) return;

      const { data: revs } = await sb
        .from("reviews")
        .select("*")
        .eq("pg_id", (row as PgRow).id)
        .order("created_at", { ascending: false });

      const list = (revs as ReviewRow[]) ?? [];
      const userIds = [...new Set(list.map((r) => r.user_id))];

      const { data: profs } = await sb.from("profiles").select("id,email").in("id", userIds);
      const emailMap = new Map<string, string | null>(
        (profs as { id: string; email: string | null }[])?.map((p) => [p.id, p.email]) ?? []
      );

      setReviews(list.map((r) => ({ ...r, author_email: emailMap.get(r.user_id) ?? null })));
    })();
  }, [slug]);

  const aggregates = useMemo(() => {
    if (!reviews.length) return { overall: 0, food: 0, clean: 0, safety: 0, summary: "No reviews yet." };
    const n = reviews.length;
    const avg = (k: keyof ReviewRow) => reviews.reduce((s, r) => s + Number(r[k] || 0), 0) / n;
    const withAi = reviews.find((r) => r.ai_summary);

    return {
      overall: Number(avg("rating").toFixed(1)),
      food: Number(avg("food_rating").toFixed(1)),
      clean: Number(avg("cleanliness_rating").toFixed(1)),
      safety: Number(avg("safety_rating").toFixed(1)),
      summary: withAi?.ai_summary ?? "Honest reviews from the community.",
    };
  }, [reviews]);

  const allGalleryImages = useMemo(() => {
    if (!pg) return [];
    const reviewImages = reviews.flatMap((r) => (r.media_urls as string[]) || []);
    return [pg.cover_image_url, ...reviewImages].filter((url): url is string => !!url);
  }, [pg, reviews]);

  if (!pg) return <div className="py-20 text-center font-bold text-stone-400 font-mono animate-pulse">LOADING PG DATA...</div>;

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
              <span>{pg.area}</span>
            </div>
          </div>
          <div className="bg-stone-900 text-white px-6 py-3 rounded-2xl shadow-lg">
            <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Starting Price</p>
            <p className="text-2xl font-black text-teal-400">{pg.price_range}</p>
          </div>
        </div>

        {/* GALLERY GRID */}
        <div className="mb-12">
          {allGalleryImages.length === 0 ? (
            <div className="w-full h-80 rounded-3xl bg-stone-100 flex items-center justify-center border border-dashed border-stone-300">
              <Camera size={48} className="text-stone-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[450px] rounded-3xl overflow-hidden border border-stone-200">
               {/* Main image handles cases for 1, 2, 3, or more images dynamically based on height and span */}
               <div className={`${allGalleryImages.length === 1 ? 'col-span-4' : 'md:col-span-2'} relative group cursor-pointer overflow-hidden`} onClick={() => setActiveImageIndex(0)}>
                <img src={allGalleryImages[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Featured" />
              </div>
              
              {allGalleryImages.length > 1 && (
                <div className="hidden md:grid grid-rows-2 gap-3 col-span-1">
                  {allGalleryImages.slice(1, 3).map((url, i) => (
                    <img key={i} onClick={() => setActiveImageIndex(i + 1)} src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition" alt={`Sub ${i + 1}`} />
                  ))}
                </div>
              )}

              {allGalleryImages.length > 3 && (
                <div className="hidden md:block relative cursor-pointer overflow-hidden group" onClick={() => setActiveImageIndex(3)}>
                  <img src={allGalleryImages[3]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Sub 3" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center text-white">
                    <Camera size={28} className="mb-2" />
                    <span className="font-bold text-sm">{allGalleryImages.length} Photos</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 to-emerald-600 p-px rounded-3xl shadow-xl shadow-teal-100/50">
              <div className="bg-white p-8 rounded-[23px]">
                <h3 className="font-black text-teal-600 mb-3 flex items-center gap-2 tracking-tight">
                  <Info size={20} /> RESIDENT VIBE CHECK
                </h3>
                <p className="text-stone-700 text-lg leading-relaxed font-medium italic">"{aggregates.summary}"</p>
              </div>
            </div>

            <Card className="p-8 border-stone-100 shadow-sm">
              <h3 className="font-black text-xl mb-8 tracking-tight">Rating Snapshot</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                <Metric label="Overall" value={aggregates.overall} />
                <Metric label="Food" value={aggregates.food} />
                <Metric label="Cleanliness" value={aggregates.clean} />
                <Metric label="Safety" value={aggregates.safety} />
              </div>
            </Card>

            <section>
              <h2 className="text-2xl font-black mb-8">Detailed Reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-stone-400 font-medium italic">No reviews yet. Be the first to share your experience!</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((r) => (
                    <Card key={r.id} className="p-6 border-stone-100 shadow-none bg-stone-50/40">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-stone-900">{getReviewerLabel(r, r.author_email)}</p>
                          <StarRating value={Number(r.rating)} label={Number(r.rating).toFixed(1)} />
                        </div>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-stone-600 leading-relaxed font-medium">"{r.review_text}"</p>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-10">
              <Card className="p-8 border-2 border-stone-900 rounded-[2.5rem] shadow-2xl bg-white">
                <h3 className="font-black text-2xl mb-6 tracking-tight">Quick Facts</h3>
                
                <div className="space-y-1 mb-10">
                  {/* Curfew Item */}
                  <SidebarItem 
                    icon={Clock} 
                    label="Curfew" 
                    value={pg.curfew || "Flexible"} 
                  />
                  
                  {/* Verified Item */}
                  <SidebarItem 
                    icon={ShieldCheck} 
                    label="Verified" 
                    value={pg.is_verified ? "Yes" : "No"} 
                  />
                  
                  {/* Deposit Item - Formatted as Indian Rupees */}
                  <SidebarItem 
                    icon={CircleDollarSign} 
                    label="Deposit" 
                    value={pg.deposit ? `₹${pg.deposit.toLocaleString('en-IN')}` : "Not specified"} 
                  />

                  {/* Visitors Item - Mapping boolean to text */}
                  <SidebarItem 
                    icon={UserCheck} 
                    label="Visitors" 
                    value={pg.visitor_allowed ? "Allowed" : "Strictly No"} 
                  />
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

      <ReviewModal 
        open={isReviewModalOpen} 
        onClose={() => setIsReviewModalOpen(false)}
        preselectedPg={pg} 
      />

      {activeImageIndex !== null && (
        <ImageModal 
          images={allGalleryImages}
          index={activeImageIndex}
          onClose={() => setActiveImageIndex(null)}
          onNext={() => setActiveImageIndex((prev) => (prev! + 1) % allGalleryImages.length)}
          onPrev={() => setActiveImageIndex((prev) => (prev! - 1 + allGalleryImages.length) % allGalleryImages.length)}
        />
      )}
    </>
  );
}