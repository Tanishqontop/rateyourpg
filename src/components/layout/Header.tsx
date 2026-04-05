import { Link, useNavigate } from "react-router-dom";
import { LogOut, PenLine, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/useAuth";

export function Header({ onWriteReview }: { onWriteReview: () => void }) {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
            RY
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-stone-900">
              RateYourPG
            </p>
            <p className="hidden text-xs text-stone-500 sm:block">
              Honest PG reviews · India
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="secondary" className="sm:inline-flex" onClick={onWriteReview}>
            <PenLine size={18} />
            <span className="hidden sm:inline">Write Review</span>
            <span className="sm:hidden">Review</span>
          </Button>
          {!loading && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[140px] truncate text-sm text-stone-600 sm:inline">
                {profile?.is_guest
                  ? "Guest"
                  : profile?.email ?? user.email ?? "Account"}
              </span>
              <Button variant="ghost" className="!px-2" onClick={() => void signOut()}>
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => navigate("/login")}>
              <UserRound size={18} />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
