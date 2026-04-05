export const POPULAR_AREAS = [
  { name: "Koramangala", city: "Bangalore" },
  { name: "Indiranagar", city: "Bangalore" },
  { name: "Whitefield", city: "Bangalore" },
  { name: "Electronic City", city: "Bangalore" },
] as const;

export const AMENITY_OPTIONS = [
  { id: "wifi", label: "WiFi" },
  { id: "food", label: "Food", emoji: "🍛" },
  { id: "ac", label: "AC" },
  { id: "laundry", label: "Laundry" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "Security" },
  { id: "power_backup", label: "Power Backup" },
] as const;

export const REVIEW_TAG_OPTIONS = [
  { id: "good_food", label: "Good Food", emoji: "🍛" },
  { id: "strict_rules", label: "Strict Rules", emoji: "🚫" },
  { id: "friendly_owner", label: "Friendly Owner", emoji: "😊" },
  { id: "budget_friendly", label: "Budget Friendly", emoji: "💸" },
  { id: "unsafe", label: "Unsafe", emoji: "⚠️" },
] as const;

export const DISCUSSION_LINKS = [
  { q: "Best PG near Christ University?", href: "#" },
  { q: "Worst PG for food in Bangalore?", href: "#" },
  { q: "PGs with no curfew in Koramangala?", href: "#" },
];

export const SEO_ARTICLES = [
  { title: "Best PG in Bangalore — 2026 student guide", href: "#" },
  { title: "How to choose a safe PG in Indian cities", href: "#" },
  { title: "Deposit & visitor rules: what to ask", href: "#" },
];
