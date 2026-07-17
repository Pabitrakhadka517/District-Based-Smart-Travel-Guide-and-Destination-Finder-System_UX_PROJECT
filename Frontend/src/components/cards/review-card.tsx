"use client";
import { useState, useEffect } from "react";
import { ThumbsUp, ShieldCheck, Camera, MapPin, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Review } from "@/types";
import { Rating } from "@/components/ui/rating";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useVoteHelpful } from "@/hooks/use-content";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { Lightbox } from "@/components/shared/lightbox";
import { getImageUrl } from "@/lib/cloudinary";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const VOTED_KEY = "nepayatra_helpful_votes";

function getVotedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveVotedSet(s: Set<string>) {
  try { localStorage.setItem(VOTED_KEY, JSON.stringify([...s])); } catch { /* */ }
}

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0)   return "Today";
  if (days === 1)   return "Yesterday";
  if (days < 7)    return `${days} days ago`;
  if (days < 30)   return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  if (days < 365)  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
}

/* ── ReviewCard ──────────────────────────────────────────────────────────── */

interface ReviewCardProps {
  review: Review;
  /** When rendered on the global /reviews page, pass the destination name */
  destinationName?: string;
  /** Show a compact variant (no photos, truncated body) */
  compact?: boolean;
  /** Current user authored this review — shows Edit/Delete controls */
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
}

export function ReviewCard({ review: r, destinationName, compact = false, isOwner = false, onEdit, onDelete, deletePending = false }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(r.helpful);
  const [hasVoted, setHasVoted]         = useState(false);
  const [voteFlash, setVoteFlash]       = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mutate: vote, isPending }     = useVoteHelpful();

  useEffect(() => { setHasVoted(getVotedSet().has(r.id)); }, [r.id]);

  function handleVote() {
    if (hasVoted || isPending) return;
    vote(r.id, {
      onSuccess: ({ helpful }) => {
        setHelpfulCount(helpful);
        setHasVoted(true);
        setVoteFlash(true);
        setTimeout(() => setVoteFlash(false), 1800);
        const s = getVotedSet();
        s.add(r.id);
        saveVotedSet(s);
      },
    });
  }

  const photos = r.photos?.filter((p) => p?.url) ?? [];

  return (
    <>
      <article className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-soft">
        {/* ── Destination tag (global page only) ── */}
        {destinationName && (
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-brand-600">
            <MapPin size={11} />
            {destinationName}
          </div>
        )}

        {/* ── Author row ── */}
        <div className="flex items-start gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            <CloudinaryImage
              image={r.avatar}
              alt={r.author}
              fill
              sizes="44px"
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-foreground">{r.author}</p>
              {r.verifiedTraveler && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/20"
                  title="This reviewer confirmed they visited this destination"
                >
                  <ShieldCheck size={11} className="shrink-0" />
                  Verified Traveler
                </span>
              )}
              {isOwner && r.status !== "approved" && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground ring-1 ring-warning/20"
                  title="Only visible to you until an admin reviews it"
                >
                  {r.status === "pending" ? "Pending approval" : "Not approved"}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <time dateTime={r.date} title={formatDate(r.date)}>{relativeTime(r.date)}</time>
              <span aria-hidden>·</span>
              <span>{formatDate(r.date)}</span>
            </div>
          </div>

          <Rating value={r.rating} size={14} />
        </div>

        {/* ── Review body ── */}
        <h4 className="mt-4 font-display text-sm font-semibold text-brand-600">{r.title}</h4>
        <p className={cn(
          "mt-1 text-sm leading-relaxed text-muted-foreground",
          compact && "line-clamp-3"
        )}>
          {r.body}
        </p>

        {/* ── Photos ── */}
        {!compact && photos.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Camera size={11} /> {photos.length} photo{photos.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border transition hover:border-brand-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`View photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(photo)}
                    alt={photo.alt || `Review photo ${i + 1}`}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                  />
                  {i === 2 && photos.length > 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
                      +{photos.length - 3}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer: helpful vote + owner actions ── */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <button
            onClick={handleVote}
            disabled={hasVoted || isPending}
            aria-label={hasVoted ? "You marked this as helpful" : "Mark as helpful"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              hasVoted
                ? "bg-secondary/10 text-secondary cursor-default"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ThumbsUp
              size={13}
              className={cn("transition-transform", voteFlash && "scale-125", hasVoted && "fill-current")}
            />
            {hasVoted ? "Helpful" : "Helpful"}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              hasVoted ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
            )}>
              {helpfulCount}
            </span>
          </button>

          {photos.length > 0 && compact && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera size={11} /> {photos.length} photo{photos.length > 1 ? "s" : ""}
            </span>
          )}

          {isOwner && !confirmingDelete && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit your review"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete your review"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}

          {isOwner && confirmingDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Delete this review?</span>
              <button
                type="button"
                disabled={deletePending}
                onClick={onDelete}
                className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
              >
                {deletePending ? <Loader2 size={12} className="animate-spin" /> : null}
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Lightbox portal */}
      {lightboxIdx !== null && (
        <Lightbox
          images={photos}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onIndexChange={setLightboxIdx}
        />
      )}
    </>
  );
}
