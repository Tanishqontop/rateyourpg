import type { ReviewTagId } from "@/types/database";

export type AiInsight = {
  pros: string[];
  cons: string[];
  summary: string;
};

const tagLabels: Record<ReviewTagId, string> = {
  good_food: "praised the food",
  strict_rules: "mentioned strict rules or curfew",
  friendly_owner: "liked the owner or management",
  budget_friendly: "found it value-for-money",
  unsafe: "raised safety concerns",
};

export function generateReviewInsight(input: {
  rating: number;
  food_rating: number;
  cleanliness_rating: number;
  safety_rating: number;
  value_rating: number;
  owner_rating: number;
  tags: ReviewTagId[];
  review_text: string;
}): AiInsight {
  const pros: string[] = [];
  const cons: string[] = [];

  const dims = [
    { key: "food", label: "food", val: input.food_rating },
    { key: "clean", label: "cleanliness", val: input.cleanliness_rating },
    { key: "safe", label: "safety", val: input.safety_rating },
    { key: "value", label: "value for money", val: input.value_rating },
    { key: "owner", label: "owner behaviour", val: input.owner_rating },
  ];

  const best = [...dims].sort((a, b) => b.val - a.val)[0];
  const worst = [...dims].sort((a, b) => a.val - b.val)[0];

  if (best.val >= 4) pros.push(`Strong ${best.label} (${best.val}/5).`);
  if (worst.val <= 2.5 && worst.key !== best.key)
    cons.push(`Lower scores for ${worst.label} (${worst.val}/5).`);

  for (const t of input.tags) {
    if (t === "unsafe") cons.push("Safety flagged in tags.");
    if (t === "strict_rules") cons.push("Rules/curfew felt strict.");
    if (t === "good_food") pros.push("Food called out positively.");
    if (t === "friendly_owner") pros.push("Owner/management described positively.");
    if (t === "budget_friendly") pros.push("Seen as budget-friendly.");
  }

  if (input.rating >= 4.2) pros.push(`Solid overall rating (${input.rating.toFixed(1)}/5).`);
  if (input.rating <= 2.5) cons.push(`Overall experience rated lower (${input.rating.toFixed(1)}/5).`);

  const snippet = input.review_text.trim().slice(0, 120);
  if (snippet.length > 20) {
    pros.push(`Review highlights: “${snippet}${input.review_text.length > 120 ? "…" : ""}”`);
  }

  const summaryParts: string[] = [];
  if (input.food_rating >= input.safety_rating && input.food_rating >= 4)
    summaryParts.push("People love the food");
  if (input.tags.includes("strict_rules"))
    summaryParts.push("some complain about strict rules or curfew");
  if (input.tags.includes("good_food") && input.tags.includes("strict_rules"))
    summaryParts.length = 0;
  if (summaryParts.length === 0) {
    summaryParts.push(
      `${best.label} scores highest; watch ${worst.label} based on this review.`
    );
  }

  let summary = summaryParts.join(" — ");
  if (input.tags.includes("good_food") && input.tags.includes("strict_rules")) {
    summary =
      "People love the food but some mention strict rules or curfew — typical trade-off in busy PGs.";
  }

  return {
    pros: dedupe(pros).slice(0, 5),
    cons: dedupe(cons).slice(0, 5),
    summary,
  };
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

export function tagIdsToLabels(ids: string[]): string[] {
  return ids
    .map((id) => tagLabels[id as ReviewTagId] ?? id)
    .filter(Boolean);
}
