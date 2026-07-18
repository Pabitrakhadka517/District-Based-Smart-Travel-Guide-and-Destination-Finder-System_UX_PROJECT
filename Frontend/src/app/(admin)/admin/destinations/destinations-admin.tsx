"use client";
import { useState, useMemo } from "react";
import { Star, X } from "lucide-react";
import type { Destination } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { apiDelete, apiPatch } from "@/services/api-client";
import { DestinationForm } from "./destination-form";

type FeaturedFilter = "all" | "featured" | "not-featured";
type SortKey        = "rating" | "reviews" | "name" | "budget";

const CATEGORIES = [
  "All", "Heritage", "Adventure", "Nature", "Trekking",
  "Religious", "Wildlife", "Cultural", "Lake", "City",
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

export function DestinationsAdmin({ destinations: initial, total }: { destinations: Destination[]; total: number }) {
  const [rows,   setRows]   = useState(initial);
  const [error,  setError]  = useState<string | null>(null);
  const [search,          setSearch]          = useState("");
  const [categoryFilter,  setCategoryFilter]  = useState<CategoryFilter>("All");
  const [featuredFilter,  setFeaturedFilter]  = useState<FeaturedFilter>("all");
  const [sortBy,          setSortBy]          = useState<SortKey>("rating");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<Destination | null>(null);

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (d: Destination) => { setEditing(d); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: Destination) => {
    setRows((prev) => {
      const exists = prev.some((d) => d.id === saved.id);
      return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  const handleDelete = async (dest: Destination) => {
    setError(null);
    try {
      await apiDelete(`/destinations/${dest.id}`);
      setRows((prev) => prev.filter((d) => d.id !== dest.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete destination");
    }
  };

  const toggleFeatured = async (dest: Destination) => {
    const newVal = !dest.featured;
    setRows((prev) => prev.map((d) => d.id === dest.id ? { ...d, featured: newVal } : d));
    try {
      await apiPatch(`/destinations/${dest.id}`, { featured: newVal });
    } catch (e) {
      setRows((prev) => prev.map((d) => d.id === dest.id ? { ...d, featured: dest.featured } : d));
      setError(e instanceof Error ? e.message : "Failed to update featured status");
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];

    if (categoryFilter !== "All") list = list.filter((d) => d.category === categoryFilter);
    if (featuredFilter === "featured")     list = list.filter((d) => d.featured);
    if (featuredFilter === "not-featured") list = list.filter((d) => !d.featured);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.tagline.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "rating":  list.sort((a, b) => b.rating - a.rating); break;
      case "reviews": list.sort((a, b) => b.reviewCount - a.reviewCount); break;
      case "name":    list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "budget":  list.sort((a, b) => a.budget.budget - b.budget.budget); break;
    }

    return list;
  }, [rows, search, categoryFilter, featuredFilter, sortBy]);

  const featuredCounts = useMemo(() => ({
    all:         rows.length,
    featured:    rows.filter((d) => d.featured).length,
    "not-featured": rows.filter((d) => !d.featured).length,
  }), [rows]);

  const columns: Column<Destination>[] = [
    {
      key: "name", label: "Destination",
      render: (d) => (
        <div>
          <p className="font-medium text-brand-600">{d.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{d.tagline}</p>
        </div>
      ),
    },
    {
      key: "category", label: "Category",
      render: (d) => <Badge variant="accent" className="whitespace-nowrap">{d.category}</Badge>,
    },
    {
      key: "rating", label: "Rating",
      render: (d) => (
        <span className="flex items-center gap-1 text-sm font-medium">
          <Star size={12} className="fill-accent text-accent" aria-hidden="true" />
          {d.rating.toFixed(1)}
          <span className="text-xs text-muted-foreground">({d.reviewCount})</span>
        </span>
      ),
    },
    {
      key: "budget", label: "From",
      render: (d) => <span className="text-sm">{formatCurrency(d.budget.budget)}</span>,
    },
    {
      key: "featured", label: "Featured",
      render: (d) => (
        <button
          onClick={() => toggleFeatured(d)}
          aria-label={d.featured ? "Remove from featured" : "Mark as featured"}
          title={d.featured ? "Click to unfeature" : "Click to feature"}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            d.featured
              ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
          )}
        >
          {d.featured ? "✓ Featured" : "Not featured"}
        </button>
      ),
    },
  ];

  const showCount = filtered.length !== rows.length
    ? `${filtered.length} of ${rows.length}`
    : String(rows.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="h2 text-brand-600">Destination management</h1>
        <p className="lead mt-1">Manage travel guides, galleries, categories, tags and SEO.</p>
      </div>

      {/* Error */}
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

      {total > rows.length && (
        <Alert variant="warning">
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total destinations.
          Narrow your search to find older ones.
        </Alert>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          aria-label="Filter by category"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>
          ))}
        </select>

        {/* Featured filter */}
        <div role="group" aria-label="Filter by featured status" className="flex overflow-hidden rounded-xl border border-border bg-white">
          {(["all", "featured", "not-featured"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFeaturedFilter(f)}
              aria-pressed={featuredFilter === f}
              className={cn(
                "px-3 py-2 text-xs font-medium capitalize transition-colors whitespace-nowrap",
                featuredFilter === f
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {f === "all" ? `All (${featuredCounts.all})` : f === "featured" ? `Featured (${featuredCounts.featured})` : `Unfeatured (${featuredCounts["not-featured"]})`}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort destinations"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="rating">Highest rated</option>
          <option value="reviews">Most reviewed</option>
          <option value="name">A – Z</option>
          <option value="budget">Lowest budget</option>
        </select>
      </div>

      <AdminTable<Destination>
        title={`Destinations (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or tagline…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={
          search || categoryFilter !== "All" || featuredFilter !== "all"
            ? "No destinations match your filters."
            : "No destinations found."
        }
      />

      {formOpen && (
        <DestinationForm destination={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
