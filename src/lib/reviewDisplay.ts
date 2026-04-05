import type { ReviewRow } from "@/types/database";

export function getReviewerLabel(
  review: ReviewRow,
  emailHint?: string | null
): string {
  if (review.is_anonymous) return "Anonymous";
  if (review.is_guest) return review.guest_name?.trim() || "Anonymous";
  if (emailHint) return emailHint.split("@")[0] ?? "Member";
  return "Member";
}
