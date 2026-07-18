"use client";
import { useState, useMemo } from "react";
import { X } from "lucide-react";
import type { GuideArticle } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { apiDelete } from "@/services/api-client";
import { GuideForm } from "./guide-form";

type SortKey = "title" | "date";

export function GuidesAdmin({ guides: initial, total }: { guides: GuideArticle[]; total: number }) {
  const [rows,  setRows]  = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<GuideArticle | null>(null);

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g: GuideArticle) => { setEditing(g); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: GuideArticle) => {
    setRows((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  const handleDelete = async (guide: GuideArticle) => {
    setError(null);
    try {
      await apiDelete(`/guides/${guide.id}`);
      setRows((prev) => prev.filter((g) => g.id !== guide.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete guide");
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q) || g.author.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "title": list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "date":  list.sort((a, b) => b.date.localeCompare(a.date)); break;
    }
    return list;
  }, [rows, search, sortBy]);

  const columns: Column<GuideArticle>[] = [
    { key: "title", label: "Guide", render: (g) => <div><p className="font-medium text-brand-600 line-clamp-1">{g.title}</p><p className="mt-0.5 text-xs text-muted-foreground">by {g.author}</p></div> },
    { key: "category", label: "Category", render: (g) => <Badge variant="secondary">{g.category}</Badge> },
    { key: "readMinutes", label: "Read time", render: (g) => <span className="text-sm">{g.readMinutes} min</span> },
    { key: "featured", label: "Featured", render: (g) => g.featured ? <Badge variant="success">Featured</Badge> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  const showCount = filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : String(rows.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 text-brand-600">Guide management</h1>
        <p className="lead mt-1">Create, edit and remove travel guide articles.</p>
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
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total guides.
          Narrow your search to find older ones.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort guides"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="date">Most recent</option>
          <option value="title">A – Z</option>
        </select>
      </div>

      <AdminTable<GuideArticle>
        title={`Guides (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or author…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={search ? "No guides match your search." : "No guides found."}
      />

      {formOpen && (
        <GuideForm guide={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
