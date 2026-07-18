"use client";
import { useState, useMemo } from "react";
import { X, Star } from "lucide-react";
import type { TouristAttraction } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { apiDelete } from "@/services/api-client";
import { AttractionForm } from "./attraction-form";

type SortKey = "name" | "rating" | "category";

export function AttractionsAdmin({ attractions: initial, total }: { attractions: TouristAttraction[]; total: number }) {
  const [rows,  setRows]  = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<TouristAttraction | null>(null);

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: TouristAttraction) => { setEditing(a); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: TouristAttraction) => {
    setRows((prev) => {
      const exists = prev.some((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  const handleDelete = async (attraction: TouristAttraction) => {
    setError(null);
    try {
      await apiDelete(`/attractions/${attraction.id}`);
      setRows((prev) => prev.filter((a) => a.id !== attraction.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete attraction");
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "name":     list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "rating":   list.sort((a, b) => b.rating - a.rating); break;
      case "category": list.sort((a, b) => a.category.localeCompare(b.category)); break;
    }
    return list;
  }, [rows, search, sortBy]);

  const columns: Column<TouristAttraction>[] = [
    { key: "name", label: "Attraction", render: (a) => <span className="font-medium text-brand-600">{a.name}</span> },
    { key: "category", label: "Category", render: (a) => <Badge variant="accent" className="whitespace-nowrap">{a.category}</Badge> },
    {
      key: "rating", label: "Rating",
      render: (a) => (
        <span className="flex items-center gap-1 text-sm font-medium">
          <Star size={12} className="fill-accent text-accent" /> {a.rating.toFixed(1)}
        </span>
      ),
    },
    { key: "featured", label: "Featured", render: (a) => a.featured ? <Badge variant="success">Featured</Badge> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  const showCount = filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : String(rows.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 text-brand-600">Attraction management</h1>
        <p className="lead mt-1">Create, edit and remove tourist attractions.</p>
      </div>

      {error && (
        <Alert variant="error" icon={false}>
          <div className="flex w-full items-center justify-between gap-2">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-destructive/60 hover:text-destructive"><X size={14} /></button>
          </div>
        </Alert>
      )}

      {total > rows.length && (
        <Alert variant="warning">
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total attractions.
          Narrow your search to find older ones.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort attractions"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="name">A – Z</option>
          <option value="rating">Highest rated</option>
          <option value="category">By category</option>
        </select>
      </div>

      <AdminTable<TouristAttraction>
        title={`Attractions (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or category…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={search ? "No attractions match your search." : "No attractions found."}
      />

      {formOpen && (
        <AttractionForm attraction={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
