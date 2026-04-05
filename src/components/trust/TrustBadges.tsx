import { Badge } from "@/components/ui/Badge";

export function TrustBadges({
  guestReview,
  verifiedUser,
  userAdded,
  verifiedPg,
}: {
  guestReview?: boolean;
  verifiedUser?: boolean;
  userAdded?: boolean;
  verifiedPg?: boolean;
}) {
  return (
    <>
      {guestReview ? <Badge tone="guest">Guest review</Badge> : null}
      {verifiedUser ? <Badge tone="verified">Verified user</Badge> : null}
      {userAdded ? <Badge tone="warn">User added PG</Badge> : null}
      {verifiedPg ? <Badge tone="verified">Verified listing</Badge> : null}
    </>
  );
}
