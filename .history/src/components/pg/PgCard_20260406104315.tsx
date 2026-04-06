import { Link } from "react-router-dom";
import { MapPin, MessageSquare } from "lucide-react"; // Fixed import
import type { PgRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { TrustBadges } from "@/components/trust/TrustBadges";

export function PgCard({
  pg,
  rating,
  reviewCount,
  tags,
}: {
  pg: PgRow;
  rating: number;
  reviewCount: number;
  tags?: string[];
}) {
  const img =
    pg.cover_image_url ??
    "https://images.unsplash.com/photo-1522708323594-ddb0e442672d?auto=format&fit=crop&w=800&q=70";

  return (
    <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/pg/${pg.slug}`} className="block">
        <div className="aspect-[16/10] w-full overflow-hidden bg-stone-200">
          <img
            src={img}
            alt={pg.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadges
              userAdded={pg.created_by_user}
              verifiedPg={pg.is_verified}
            />
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-stone-900 line-clamp-1">{pg.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                <MapPin size={14} />
                {pg.area}
              </p>
            </div>
            <div className="text-right">
              <StarRating value={rating} label={rating.toFixed(1)} />
              <p className="mt-1 flex items-center justify-end gap-1 text-xs text-stone-500">
                <MessageSquare size={12} />
                {reviewCount} reviews
              </p>
            </div>
          </div>

          {/* Dynamic Amenities Section - Showing ALL amenities */}
          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} tone="success">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}

          {pg.price_range ? (
            <p className="text-sm font-bold text-stone-700">{pg.price_range}</p>
          ) : (
            <p className="text-xs text-stone-400 italic">Price on request</p>
          )}
        </div>
      </Link>
    </Card>
  );
}