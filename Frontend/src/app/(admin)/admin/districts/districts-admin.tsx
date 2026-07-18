"use client";
import { useState, useMemo } from "react";
import { X } from "lucide-react";
import type { District } from "@/types";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiDelete } from "@/services/api-client";
import { DistrictForm } from "./district-form";

type SortKey = "name" | "rating" | "destinations" | "attractions";

export function DistrictsAdmin({ districts: initial, total }: { districts: District[]; total: number }) {
  const [rows,  setRows]  = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [search,          setSearch]          = useState("");
  const [provinceFilter,  setProvinceFilter]  = useState("all");
  const [sortBy,          setSortBy]          = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing,  setEditing]  = useState<District | null>(null);

  const handleDelete = async (district: District) => {
    setError(null);
    try {
      await apiDelete(`/districts/${district.id}`);
      setRows((prev) => prev.filter((d) => d.id !== district.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete district");
    }
  };

  const openAdd  = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (d: District) => { setEditing(d); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);
  const handleSaved = (saved: District) => {
    setRows((prev) => {
      const exists = prev.some((d) => d.id === saved.id);
      return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev];
    });
    setFormOpen(false);
  };

  /* unique provinces for the filter dropdown */
  const provinces = useMemo(
    () => ["all", ...Array.from(new Set(initial.map((d) => d.province))).sort()],
    [initial]
  );

  const filtered = useMemo(() => {
    let list = [...rows];

    if (provinceFilter !== "all") list = list.filter((d) => d.province === provinceFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "name":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "rating":      list.sort((a, b) => b.rating - a.rating); break;
      case "destinations":list.sort((a, b) => (b.destinationCount ?? 0) - (a.destinationCount ?? 0)); break;
      case "attractions": list.sort((a, b) => (b.attractionCount ?? 0) - (a.attractionCount ?? 0)); break;
    }

    return list;
  }, [rows, search, provinceFilter, sortBy]);

  const provinceCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((d) => { map[d.province] = (map[d.province] ?? 0) + 1; });
    return map;
  }, [rows]);

  const columns: Column<District>[] = [
    {
      key: "name", label: "District",
      render: (d) => <span className="font-medium text-brand-600">{d.name}</span>,
    },
    {
      key: "province", label: "Province",
      render: (d) => <span className="text-sm text-muted-foreground">{d.province}</span>,
    },
    {
      key: "destinationCount", label: "Destinations",
      render: (d) => <span className="text-sm">{d.destinationCount ?? 0}</span>,
    },
    {
      key: "attractionCount", label: "Attractions",
      render: (d) => <span className="text-sm">{d.attractionCount ?? 0}</span>,
    },
    {
      key: "rating", label: "Rating",
      render: (d) => (
        <Badge variant={d.rating >= 4 ? "success" : d.rating >= 3 ? "secondary" : "outline"}>
          {d.rating.toFixed(1)} ★
        </Badge>
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
        <h1 className="h2 text-brand-600">District management</h1>
        <p className="lead mt-1">Create, edit and remove districts across Nepal&apos;s 7 provinces.</p>
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
          Showing the most recent {rows.length.toLocaleString()} of {total.toLocaleString()} total districts.
          Narrow your search to find older ones.
        </Alert>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Province filter */}
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          aria-label="Filter by province"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p === "all"
                ? `All provinces (${rows.length})`
                : `${p} (${provinceCounts[p] ?? 0})`}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort districts"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="name">A – Z</option>
          <option value="rating">Highest rated</option>
          <option value="destinations">Most destinations</option>
          <option value="attractions">Most attractions</option>
        </select>
      </div>

      <AdminTable<District>
        title={`Districts (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or province…"
        rows={filtered}
        columns={columns}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage={
          search || provinceFilter !== "all"
            ? "No districts match your filters."
            : "No districts found."
        }
      />

      {formOpen && (
        <DistrictForm district={editing} onClose={closeForm} onSaved={handleSaved} />
      )}
    </div>
  );
}
