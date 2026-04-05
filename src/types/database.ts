export type GenderType = "boys" | "girls" | "coliving";

export type ReviewTagId =
  | "good_food"
  | "strict_rules"
  | "friendly_owner"
  | "budget_friendly"
  | "unsafe";

export type LocationRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  type?: string | null;
  image_url?: string | null;
  created_at: string;
};

export type PgRow = {
  id: string;
  name: string;
  slug: string;
  location_id: string;
  area: string;
  price_range: string | null;
  gender_type: GenderType;
  room_types: unknown;
  amenities: unknown;
  curfew: string | null;
  visitor_allowed: boolean | null;
  deposit: number | null;
  description: string | null;
  created_by_user: boolean;
  is_verified: boolean;
  cover_image_url: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  user_id: string;
  pg_id: string;
  rating: number;
  food_rating: number;
  cleanliness_rating: number;
  safety_rating: number;
  value_rating: number;
  owner_rating: number;
  review_text: string;
  tags: unknown;
  guest_name: string | null;
  is_anonymous: boolean;
  is_guest: boolean;
  media_urls: unknown;
  ai_pros: unknown;
  ai_cons: unknown;
  ai_summary: string | null;
  reported_count: number;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  is_guest: boolean;
  display_name: string | null;
  created_at: string;
};
