import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConversionModal({
  open,
  onClose,
  onSignUp,
}: {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1 text-stone-500 hover:bg-stone-100"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h3 className="pr-8 text-lg font-bold text-stone-900">
          Save your review permanently
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          Create a free account with email so your review stays linked to you and
          helps others trust your experience — even if you posted as a guest.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
          <Button onClick={onSignUp}>Sign up with email</Button>
        </div>
      </div>
    </div>
  );
}
