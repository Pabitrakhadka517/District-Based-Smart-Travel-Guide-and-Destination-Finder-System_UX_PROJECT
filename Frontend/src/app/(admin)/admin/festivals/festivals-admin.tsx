"use client";
import { useState, useMemo } from "react";
import { X } from "lucide-react";
import type { Festival } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { apiDelete } from "@/services/api-client";
import { FestivalForm } from "./festival-form";

type SortKey = "name" | "month";

export function FestivalsAdmin({ festivals: initial, total }: { festivals: Festival[]; total: number }) {
  const [rows,  setRows]  = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<Festival | null>(null);

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (f: Festival) => { setEditing(f); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: Festival) => {
    setRows((prev) => {
      const exists = prev.some((f) => f.id === saved.id);
      return exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  const handleDelete = async (festival: Festival) => {
    setError(null);
    try {
      await apiDelete(`/festivals/${festival.id}`);
      setRows((prev) => prev.filter((f) => f.id !== festival.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete festival");
    }
  };

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.where.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "name":  list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "month": list.sort((a, b) => a.month.localeCompare(b.month)); break;
    }
    return list;
  }, [rows, search, sortBy]);

  const columns: Column<Festival>[] = [
    { key: "name", label: "Festival", render: (f) => <span className="font-medium text-brand-600">{f.name}</span> },
    { key: "month", label: "When", render: (f) => <span className="text-sm text-muted-foreground">{f.month} · {f.season}</span> },
    { key: "type", label: "Type", render: (f) => <Badge variant="secondary">{f.type}</Badge> },
    { key: "where", label: "Where", render: (f) => <span className="text-sm">{f.where}</span> },
  ];

  const showCount = filtered.length !== rows.length ? `${filtered.length} of ${rows.length}` : String(rows.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 text-brand-600">Festival management</h1>
        <p className="lead mt-1">Create, edit and remove Nepal&apos;s cultural festivals.</p>
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
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total festivals.
          Narrow your search to find older ones.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort festivals"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="name">A – Z</option>
          <option value="month">By month</option>
        </select>
      </div>

      <AdminTable<Festival>
        title={`Festivals (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or location…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={search ? "No festivals match your search." : "No festivals found."}
      />

      {formOpen && (
        <FestivalForm festival={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
