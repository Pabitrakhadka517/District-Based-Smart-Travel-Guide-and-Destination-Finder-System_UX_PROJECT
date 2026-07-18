"use client";
import { useEffect, useState, useMemo } from "react";
import { Trash2, ShieldCheck, ShieldOff, X, UserCheck, UserX } from "lucide-react";
import { AdminTable, type Column } from "@/components/dashboard/admin-table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { cn } from "@/lib/utils";
import { isDefaultAvatar } from "@/lib/cloudinary";
import { apiGetPaginated, apiPatch, apiDelete } from "@/services/api-client";
import type { CloudinaryImage as CloudinaryImageType } from "@/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  joinedAt: string;
  avatar?: CloudinaryImageType;
  isActive?: boolean;
}

type RoleFilter = "all" | "user" | "admin";
type SortKey    = "newest" | "oldest" | "az";

export function UsersAdmin() {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState<RoleFilter>("all");
  const [sortBy,      setSortBy]      = useState<SortKey>("newest");

  useEffect(() => {
    apiGetPaginated<UserRow>("/users?limit=500", true)
      .then(({ data, total }) => { setUsers(data); setTotal(total); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const toggleRole = async (u: UserRow) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await apiPatch(`/users/${u.id}/role`, { role: newRole });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const toggleStatus = async (u: UserRow) => {
    const newActive = u.isActive === false;
    try {
      await apiPatch(`/users/${u.id}/status`, { isActive: newActive });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: newActive } : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update account status");
    }
  };

  const removeUser = async (u: UserRow) => {
    try {
      await apiDelete(`/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  const bulkDelete = async (ids: string[]) => {
    setError(null);
    const results = await Promise.allSettled(ids.map((id) => apiDelete(`/users/${id}`)));
    const succeeded = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    if (succeeded.size > 0) setUsers((prev) => prev.filter((u) => !succeeded.has(u.id)));
    const failed = ids.length - succeeded.size;
    if (failed > 0) {
      setError(
        succeeded.size > 0
          ? `Deleted ${succeeded.size} of ${ids.length} users — ${failed} failed. Select the rest and try again.`
          : `Failed to delete the selected user${ids.length > 1 ? "s" : ""}.`
      );
    }
  };

  const bulkPromote = async (ids: string[]) => {
    setError(null);
    const results = await Promise.allSettled(ids.map((id) => apiPatch(`/users/${id}/role`, { role: "admin" })));
    const succeeded = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    if (succeeded.size > 0) {
      setUsers((prev) => prev.map((u) => succeeded.has(u.id) ? { ...u, role: "admin" as const } : u));
    }
    const failed = ids.length - succeeded.size;
    if (failed > 0) {
      setError(
        succeeded.size > 0
          ? `Promoted ${succeeded.size} of ${ids.length} users — ${failed} failed. Select the rest and try again.`
          : `Failed to promote the selected user${ids.length > 1 ? "s" : ""}.`
      );
    }
  };

  const roleCounts = useMemo(() => ({
    all:   users.length,
    user:  users.filter((u) => u.role === "user").length,
    admin: users.filter((u) => u.role === "admin").length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = [...users];
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "newest": list.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()); break;
      case "oldest": list.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()); break;
      case "az":     list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [users, search, roleFilter, sortBy]);

  const columns: Column<UserRow>[] = [
    {
      key: "name", label: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          {u.avatar?.url && !isDefaultAvatar(u.avatar)
            ? <CloudinaryImage image={u.avatar} alt="" width={32} height={32} className="shrink-0 rounded-full" />
            : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {u.name[0]?.toUpperCase() ?? "?"}
              </span>
            )
          }
          <span className="font-medium text-brand-600">{u.name}</span>
        </div>
      ),
    },
    {
      key: "email", label: "Email",
      render: (u) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: "role", label: "Role",
      render: (u) => (
        <button
          onClick={() => toggleRole(u)}
          title={`Click to make ${u.role === "admin" ? "regular user" : "admin"}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          <Badge variant={u.role === "admin" ? "accent" : "secondary"} className="cursor-pointer capitalize">
            {u.role === "admin" ? <ShieldCheck size={10} className="mr-1" /> : <ShieldOff size={10} className="mr-1" />}
            {u.role}
          </Badge>
        </button>
      ),
    },
    {
      key: "isActive", label: "Status",
      render: (u) => (
        <button
          onClick={() => toggleStatus(u)}
          title={u.isActive === false ? "Click to reactivate this account" : "Click to deactivate this account"}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          <Badge variant={u.isActive === false ? "outline" : "success"} className="cursor-pointer">
            {u.isActive === false ? <UserX size={10} className="mr-1" /> : <UserCheck size={10} className="mr-1" />}
            {u.isActive === false ? "Deactivated" : "Active"}
          </Badge>
        </button>
      ),
    },
    {
      key: "joinedAt", label: "Joined",
      render: (u) => (
        <span className="text-sm text-muted-foreground">
          {new Date(u.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </span>
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

  const showCount = filtered.length !== users.length
    ? `${filtered.length} of ${users.length}`
    : String(users.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h2 text-brand-600">User management</h1>
          <p className="lead mt-1">View, manage roles, and moderate accounts.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{users.length} total</span>
          <span aria-hidden="true">·</span>
          <span>{roleCounts.admin} admin{roleCounts.admin !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <Alert variant="error" icon={false}>
          <div className="flex w-full items-center justify-between gap-2">
            {error}
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="rounded text-destructive/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={14} />
            </button>
          </div>
        </Alert>
      )}

      {total > users.length && (
        <Alert variant="warning">
          Showing the most recent {users.length.toLocaleString()} of {total.toLocaleString()} total users.
          Narrow your search to find older ones.
        </Alert>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role tabs */}
        <div role="group" aria-label="Filter by role" className="flex overflow-hidden rounded-xl border border-border bg-white">
          {(["all", "user", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              aria-pressed={roleFilter === r}
              className={cn(
                "px-3.5 py-2 text-xs font-medium transition-colors",
                roleFilter === r
                  ? "bg-brand-600 text-white"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {r === "all" ? "All" : r === "admin" ? "Admins" : "Users"}
              <span className={cn("ml-1.5 opacity-70", roleFilter === r && "opacity-100")}>
                ({roleCounts[r]})
              </span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          aria-label="Sort users"
          className="h-9 rounded-xl border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">A – Z</option>
        </select>
      </div>

      <AdminTable<UserRow>
        title={`Users (${showCount})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        rows={filtered}
        columns={columns}
        onDelete={removeUser}
        bulkActions={[
          {
            label: "Promote to admin",
            icon:  ShieldCheck,
            onClick: bulkPromote,
          },
          {
            label: "Delete selected",
            icon:  Trash2,
            variant: "danger",
            confirmMessage: "Permanently delete the selected users? This cannot be undone.",
            onClick: bulkDelete,
          },
        ]}
        emptyMessage={
          search || roleFilter !== "all"
            ? "No users match your filters."
            : "No users found."
        }
      />
    </div>
  );
}
