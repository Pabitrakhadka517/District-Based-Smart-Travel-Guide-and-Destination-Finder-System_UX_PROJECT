"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Trash2, Ban } from "lucide-react";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch, apiDelete } from "@/services/api-client";
import { useDestinations } from "@/hooks/use-content";
import type { Booking } from "@/types";

type StatusFilter = "all" | Booking["status"];

interface BookingRow extends Booking {
  name: string; // destination display name, required by AdminTable's row shape
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_BADGE: Record<Booking["status"], "success" | "accent" | "outline"> = {
  confirmed: "success",
  pending: "accent",
  cancelled: "outline",
};

export function BookingsAdmin() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const { data: destinations = [] } = useDestinations();
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of destinations) map.set(d.id, d.name);
    return map;
  }, [destinations]);

  useEffect(() => {
    apiGet<Booking[]>("/admin/bookings", true)
      .then(setBookings)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (id: string, status: Booking["status"]) => {
    setError(null);
    try {
      await apiPatch(`/admin/bookings/${id}`, { status });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update booking status");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await apiDelete(`/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete booking");
    }
  };

  const statusCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  }), [bookings]);

  const rows: BookingRow[] = useMemo(() => {
    let list = bookings.map((b) => ({ ...b, name: nameById.get(b.destinationId) ?? b.destinationId }));
    if (statusFilter !== "all") list = list.filter((b) => b.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.userId?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, statusFilter, search, nameById]);

  const columns: Column<BookingRow>[] = [
    {
      key: "name", label: "Destination",
      render: (b) => <span className="font-medium text-brand-600">{b.name}</span>,
    },
    {
      key: "travelDate", label: "Travel date",
      render: (b) => <span className="text-muted-foreground">{b.travelDate}</span>,
    },
    { key: "travelers", label: "Travelers" },
    {
      key: "accommodationType", label: "Accommodation / Transport",
      render: (b) => (
        <span className="text-xs text-muted-foreground">{b.accommodationType} · {b.transportPreference}</span>
      ),
    },
    {
      key: "estimatedCost", label: "Est. cost",
      render: (b) => <span className="tabular-nums">NPR {b.estimatedCost.toLocaleString()}</span>,
    },
    {
      key: "status", label: "Status",
      render: (b) => <Badge variant={STATUS_BADGE[b.status]} className="capitalize">{b.status}</Badge>,
    },
    {
      key: "createdAt", label: "Booked",
      render: (b) => <span className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</span>,
    },
    {
      key: "id", label: "Review",
      render: (b) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setStatus(b.id, "confirmed")}
            aria-label="Confirm booking"
            disabled={b.status === "confirmed"}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg bg-success/10 text-success transition hover:bg-success/20",
              b.status === "confirmed" && "opacity-30"
            )}
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setStatus(b.id, "cancelled")}
            aria-label="Cancel booking"
            disabled={b.status === "cancelled"}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent transition hover:bg-accent/20",
              b.status === "cancelled" && "opacity-30"
            )}
          >
            <Ban size={14} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 text-brand-600">Bookings</h1>
        <p className="lead mt-1">
          Review pending trip bookings and confirm or cancel them. Travelers can only cancel their own
          bookings — moving a booking to “confirmed” is an admin-only action.
        </p>
      </div>

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

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {STATUS_TABS.map(({ key, label }) => (
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
              {statusCounts[key]}
            </span>
          </button>
        ))}
      </div>

      <AdminTable<BookingRow>
        title={`Bookings (${rows.length})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by destination or user…"
        rows={rows}
        columns={columns}
        onDelete={(row) => remove(row.id)}
        bulkActions={[
          {
            label: "Confirm selected",
            icon: Check,
            onClick: (ids) => ids.forEach((id) => setStatus(id, "confirmed")),
          },
          {
            label: "Cancel selected",
            icon: Ban,
            variant: "danger",
            confirmMessage: "Cancel the selected bookings?",
            onClick: (ids) => ids.forEach((id) => setStatus(id, "cancelled")),
          },
          {
            label: "Delete selected",
            icon: Trash2,
            variant: "danger",
            confirmMessage: "Permanently delete the selected bookings? This cannot be undone.",
            onClick: (ids) => ids.forEach((id) => remove(id)),
          },
        ]}
        emptyMessage={
          search || statusFilter !== "all"
            ? "No bookings match your filters."
            : "No bookings yet."
        }
      />
    </div>
  );
}
