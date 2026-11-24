import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImageTarget } from "@/components/notepad/rich-editor";

interface PhotoLightboxProps {
  target: ImageTarget | null;
  onClose: () => void;
  onDelete: (target: ImageTarget) => void;
}

export function PhotoLightbox({ target, onClose, onDelete }: PhotoLightboxProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!target) {
      setConfirming(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirming) setConfirming(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [target, onClose, confirming]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm no-print"
      onClick={() => {
        if (confirming) setConfirming(false);
        else onClose();
      }}
      data-testid="photo-lightbox"
    >
      {/* Top action bar */}
      <div
        className="absolute top-3 left-3 right-3 flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setConfirming(true)}
          className="h-10 px-3 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center gap-1.5 text-white text-sm font-medium shadow-lg transition-colors"
          aria-label="Delete photo"
          data-testid="button-lightbox-delete"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors shadow-lg"
          aria-label="Close"
          data-testid="button-lightbox-close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <img
        src={target.src}
        alt=""
        className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Confirmation overlay */}
      {confirming && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20"
          onClick={() => setConfirming(false)}
          data-testid="photo-delete-confirm"
        >
          <div
            className="bg-background rounded-2xl shadow-xl p-5 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif font-semibold text-lg mb-3">Delete this photo?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              The photo will be removed from this note. Your text won't be touched.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirming(false)}
                data-testid="button-photo-delete-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  onDelete(target);
                  setConfirming(false);
                }}
                data-testid="button-photo-delete-confirm"
              >
                Delete photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
