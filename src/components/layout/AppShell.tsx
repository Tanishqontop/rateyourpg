import { Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearReviewPrefillLocation } from "@/lib/reviewPrefill";
import { Header } from "@/components/layout/Header";
import { ReviewModal } from "@/components/review/ReviewModal";
import { ConversionModal } from "@/components/review/ConversionModal";

export function AppShell() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [guestConversionOpen, setGuestConversionOpen] = useState(false);

  useEffect(() => {
    if (params.get("write") === "1") {
      setReviewOpen(true);
    }
  }, [params]);

  const openReview = () => {
    setReviewOpen(true);
    const next = new URLSearchParams(params);
    next.set("write", "1");
    setParams(next, { replace: true });
  };

  const closeReview = () => {
    clearReviewPrefillLocation();
    setReviewOpen(false);
    const next = new URLSearchParams(params);
    next.delete("write");
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header onWriteReview={openReview} />
      <main>
        <Outlet />
      </main>
      <ReviewModal
        open={reviewOpen}
        onClose={closeReview}
        onGuestReviewSubmitted={() => setGuestConversionOpen(true)}
      />
      <ConversionModal
        open={guestConversionOpen}
        onClose={() => setGuestConversionOpen(false)}
        onSignUp={() => {
          setGuestConversionOpen(false);
          navigate("/login?mode=signup");
        }}
      />
    </div>
  );
}
