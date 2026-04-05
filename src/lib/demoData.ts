import type { LocationRow, PgRow } from "@/types/database";

/** Static demo content when Supabase is not configured or tables are empty */
export const DEMO_LOCATIONS: LocationRow[] = [
  {
    id: "demo-loc-christ",
    name: "Christ University",
    slug: "christ-university-bangalore",
    city: "Bangalore",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-loc-pesu",
    name: "PES University",
    slug: "pes-university-bangalore",
    city: "Bangalore",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-loc-nmims",
    name: "NMIMS Mumbai",
    slug: "nmims-mumbai",
    city: "Mumbai",
    created_at: new Date().toISOString(),
  },
];

const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=70`;

export const DEMO_PGS: PgRow[] = [
  {
    id: "demo-pg-1",
    name: "GreenNest PG",
    slug: "greennest-pg-koramangala",
    location_id: "demo-loc-christ",
    area: "Koramangala",
    price_range: "₹12k – ₹18k",
    gender_type: "boys",
    room_types: ["Single", "Double"],
    amenities: ["wifi", "food", "security", "power_backup"],
    curfew: "11:00 PM weekdays",
    visitor_allowed: true,
    deposit: 15000,
    description: "Walkable to Christ. Homely food and strict but fair rules.",
    created_by_user: false,
    is_verified: true,
    cover_image_url: img("1560448204-e02f11c3d0e2"),
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-pg-2",
    name: "UrbanStay Indiranagar",
    slug: "urbanstay-indiranagar",
    location_id: "demo-loc-christ",
    area: "Indiranagar",
    price_range: "₹15k – ₹22k",
    gender_type: "coliving",
    room_types: ["Single", "Triple"],
    amenities: ["wifi", "ac", "laundry", "parking"],
    curfew: "No strict curfew",
    visitor_allowed: false,
    deposit: 20000,
    description: "Modern rooms, metro nearby. Food is optional add-on.",
    created_by_user: false,
    is_verified: true,
    cover_image_url: img("1522708323594-ddb0e442672d"),
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-pg-3",
    name: "Scholar’s Inn Whitefield",
    slug: "scholars-inn-whitefield",
    location_id: "demo-loc-pesu",
    area: "Whitefield",
    price_range: "₹9k – ₹14k",
    gender_type: "girls",
    room_types: ["Double", "Triple"],
    amenities: ["wifi", "food", "security"],
    curfew: "9:30 PM",
    visitor_allowed: false,
    deposit: 10000,
    description: "Budget-friendly; food is a highlight but rules are tight.",
    created_by_user: true,
    is_verified: false,
    cover_image_url: img("1580582932707-520aed937b7b"),
    created_at: new Date().toISOString(),
  },
];

export function getDemoLocationBySlug(slug: string): LocationRow | undefined {
  return DEMO_LOCATIONS.find((l) => l.slug === slug);
}

export function getDemoPgsForLocation(locationId: string): PgRow[] {
  return DEMO_PGS.filter((p) => p.location_id === locationId);
}

export function getDemoPgBySlug(slug: string): PgRow | undefined {
  return DEMO_PGS.find((p) => p.slug === slug);
}
