"use client";
import { useEffect, useState, useMemo } from "react";
import { Check, X, Trash2, Search, CheckCheck, XCircle } from "lucide-react";
import type { Review } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Rating } from "@/components/ui/rating";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn } from "@/lib/utils";
import { apiGetPaginated, apiPatch, apiDelete } from "@/services/api-client";

type StatusFilter = "all" | Review["status"];
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type SortKey      = "newest" | "oldest" | "rating-desc" | "rating-asc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortBy,       setSortBy]       = useState<SortKey>("newest");
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // No server-side pager UI here (filtering is client-side by status tab),
    // so request a high ceiling in one shot and keep `total` around so a
    // genuine overflow past 500 is surfaced, not silently truncated.
    apiGetPaginated<Review>("/reviews?limit=500", true)
      .then(({ data, total }) => { setReviews(data); setTotal(total); })
      .catch(() => setError("Failed to load reviews. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (id: string, status: Review["status"]) => {
    setError(null);
    try {
      await apiPatch(`/reviews/${id}/status`, { status });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update review status");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await apiDelete(`/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete review");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const bulkSetStatus = async (status: Review["status"]) => {
    const ids = Array.from(selected);
    setError(null);
    const results = await Promise.allSettled(ids.map((id) => apiPatch(`/reviews/${id}/status`, { status })));
    const succeeded = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    if (succeeded.size > 0) {
      setReviews((prev) => prev.map((r) => succeeded.has(r.id) ? { ...r, status } : r));
    }
    setSelected((prev) => new Set([...prev].filter((id) => !succeeded.has(id))));
    const failed = ids.length - succeeded.size;
    if (failed > 0) {
      setError(
        succeeded.size > 0
          ? `Updated ${succeeded.size} of ${ids.length} reviews — ${failed} failed. Still-selected reviews can be retried.`
          : `Failed to update the selected review${ids.length > 1 ? "s" : ""}.`
      );
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(shown.length > 0 && shown.every((r) => selected.has(r.id))
      ? new Set()
      : new Set(shown.map((r) => r.id))
    );

  /* ── counts per status ── */
  const counts = useMemo(() => ({
    all:      reviews.length,
    pending:  reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  }), [reviews]);

  /* ── filtered + sorted list ── */
  const shown = useMemo(() => {
    let list = [...reviews];

    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (ratingFilter !== "all") list = list.filter((r) => r.rating === Number(ratingFilter));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.author.toLowerCase().includes(q)
          || r.title.toLowerCase().includes(q)
          || r.body.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "newest":      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
      case "oldest":      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case "rating-desc": list.sort((a, b) => b.rating - a.rating); break;
      case "rating-asc":  list.sort((a, b) => a.rating - b.rating); break;
    }

    return list;
  }, [reviews, statusFilter, ratingFilter, search, sortBy]);

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const someSelected     = selected.size > 0;

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "pending",  label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  const STATUS_BADGE: Record<Review["status"], string> = {
    approved: "success",
    pending:  "accent",
    rejected: "outline",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="h2 text-brand-600">Review moderation</h1>
        <p className="lead mt-1">Approve, reject or delete user reviews.</p>
      </div>

      {/* Error banner */}
      {error && (
        <Alert variant="error" icon={false}>
          <div className="flex w-full items-center justify-between gap-2">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-destructive/60 hover:text-destructive">
              <X size={14} />
            </button>
          </div>
        </Alert>
      )}

      {total > reviews.length && (
        <Alert variant="warning">
          Showing the most recent {reviews.length.toLocaleString()} of {total.toLocaleString()} total reviews.
          Narrow your search or status filter to find older ones.
        </Alert>
      )}

      {/* Status filter tabs with count badges */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {STATUS_TABS.map(({ key, label }) => {
          const count = counts[key];
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              aria-pressed={statusFilter === key}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors",
                statusFilter === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                statusFilter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + rating filter + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by author, title or content…"
            className="h-9 w-full rounded-xl border border-border bg-white pl-8 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
          aria-label="Filter by rating"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={String(r)}>{r} ★</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort reviews"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating-desc">Highest rating</option>
          <option value="rating-asc">Lowest rating</option>
        </select>
      </div>

      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-brand-50 px-4 py-2.5">
          <span className="text-xs font-medium text-brand-600">{selected.size} selected</span>
          <Button
            size="sm" variant="outline"
            className="h-7 border-success/30 text-xs text-success hover:bg-success/10"
            onClick={() => bulkSetStatus("approved")}
          >
            <CheckCheck size={12} /> Approve all
          </Button>
          <Button
            size="sm" variant="outline"
            className="h-7 border-destructive/20 text-xs text-destructive hover:bg-destructive/5"
            onClick={() => bulkSetStatus("rejected")}
          >
            <XCircle size={12} /> Reject all
          </Button>
          <Button
            variant="ghost" size="sm"
            className="ml-auto h-7 text-xs text-muted-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Results summary */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {shown.length} review{shown.length !== 1 ? "s" : ""}
          {shown.length !== reviews.length && ` (filtered from ${reviews.length})`}
        </p>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && shown.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <p className="text-sm font-medium text-foreground">No reviews found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search || statusFilter !== "all" || ratingFilter !== "all"
              ? "Try adjusting your filters."
              : "Reviews will appear here when users submit them."}
          </p>
        </div>
      )}

      {/* Review cards */}
      {!loading && shown.length > 0 && (
        <div className="space-y-3">
          {/* Select-all row */}
          <label className="flex cursor-pointer items-center gap-2 px-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allShownSelected}
              onChange={toggleAll}
              className="accent-secondary"
            />
            Select all visible
          </label>

          {shown.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-soft transition-colors sm:flex-row sm:items-start",
                selected.has(r.id) ? "border-secondary/40 bg-secondary/5" : "border-border"
              )}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggleSelect(r.id)}
                aria-label={`Select review by ${r.author}`}
                className="mt-1 shrink-0 accent-secondary"
              />

              {/* Avatar */}
              <CloudinaryImage
                image={r.avatar} alt=""
                width={44} height={44}
                className="shrink-0 rounded-full"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-brand-600">{r.author}</p>
                  {r.verifiedTraveler && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      ✓ Verified
                    </span>
                  )}
                  <Rating value={r.rating} />
                  <Badge variant={STATUS_BADGE[r.status] as "success" | "accent" | "outline"}>
                    {r.status}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.date)}</span>
                </div>
                {r.title && (
                  <p className="mt-1 text-sm font-semibold text-foreground">{r.title}</p>
                )}
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.body}</p>
              </div>

              {/* Actions */}
              {confirmDeleteId === r.id ? (
                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-destructive/5 px-2.5 py-1.5">
                  <span className="text-xs text-destructive">Delete?</span>
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => setStatus(r.id, "approved")}
                    aria-label={`Approve review by ${r.author}`}
                    disabled={r.status === "approved"}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success transition hover:bg-success/20 disabled:opacity-30"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setStatus(r.id, "rejected")}
                    aria-label={`Reject review by ${r.author}`}
                    disabled={r.status === "rejected"}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent transition hover:bg-accent/20 disabled:opacity-30"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(r.id)}
                    aria-label={`Delete review by ${r.author}`}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
