"use client";
import { useState, useMemo } from "react";
import { X, Star } from "lucide-react";
import type { Trek } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { apiDelete } from "@/services/api-client";
import { TrekForm } from "./trek-form";

type SortKey = "name" | "rating" | "price";

export function TreksAdmin({ treks: initial, total }: { treks: Trek[]; total: number }) {
  const [rows,  setRows]  = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<Trek | null>(null);

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: Trek) => { setEditing(t); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: Trek) => {
    setRows((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  const handleDelete = async (trek: Trek) => {
    setError(null);
    try {
      await apiDelete(`/treks/${trek.id}`);
      setRows((prev) => prev.filter((t) => t.id !== trek.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete trek");
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.region.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "name":   list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "price":  list.sort((a, b) => a.priceFrom - b.priceFrom); break;
    }
    return list;
  }, [rows, search, sortBy]);

  const columns: Column<Trek>[] = [
    { key: "name", label: "Trek", render: (t) => <div><p className="font-medium text-brand-600">{t.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{t.region}</p></div> },
    { key: "difficulty", label: "Difficulty", render: (t) => <Badge variant="secondary">{t.difficulty}</Badge> },
    { key: "rating", label: "Rating", render: (t) => <span className="flex items-center gap-1 text-sm font-medium"><Star size={12} className="fill-accent text-accent" /> {t.rating.toFixed(1)}</span> },
    { key: "priceFrom", label: "From", render: (t) => <span className="text-sm">{formatCurrency(t.priceFrom)}</span> },
    { key: "featured", label: "Featured", render: (t) => t.featured ? <Badge variant="success">Featured</Badge> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  const showCount = filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : String(rows.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 text-brand-600">Trek management</h1>
        <p className="lead mt-1">Create, edit and remove treks.</p>
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
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total treks.
          Narrow your search to find older ones.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort treks"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="name">A – Z</option>
          <option value="rating">Highest rated</option>
          <option value="price">Lowest price</option>
        </select>
      </div>

      <AdminTable<Trek>
        title={`Treks (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or region…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={search ? "No treks match your search." : "No treks found."}
      />

      {formOpen && (
        <TrekForm trek={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
