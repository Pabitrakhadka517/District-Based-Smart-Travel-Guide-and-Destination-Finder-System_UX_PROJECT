"use client";
import { useState } from "react";
import Link from "next/link";
import { DEFAULT_AVATAR, isDefaultAvatar } from "@/lib/cloudinary";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
import {
  Mail, Calendar, MapPin, Star, Edit3, Save, X, Loader2,
  Heart, Route, CheckCircle2, MessageSquare, Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ReviewCard } from "@/components/cards/review-card";
import { DestinationCard } from "@/components/cards/destination-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CloudinaryImage } from "@/components/shared/cloudinary-image";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { uploadService } from "@/services/uploadService";
import { useAuth } from "@/store/auth-store";
import {
  usePlans, useWishlistApi, useUpdateProfile,
  useUserReviews, useDestinations,
} from "@/hooks/use-content";
import { formatDate } from "@/lib/utils";
import type { CloudinaryImage as CloudinaryImageType } from "@/types";

type Section = "trips" | "wishlist" | "reviews";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: plans = [] } = usePlans();
  const { data: wishlistData } = useWishlistApi();
  const { data: userReviews = [], isLoading: reviewsLoading } = useUserReviews(user?.id ?? "");
  const { data: allDestinations = [] } = useDestinations();
  const updateProfile = useUpdateProfile();

  const [activeSection, setActiveSection] = useState<Section>("trips");
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState(user?.name ?? "");
  const [editAvatar, setEditAvatar] = useState<CloudinaryImageType | null>(user?.avatar ?? null);
  const [editError, setEditError]   = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const wishlistIds     = wishlistData?.ids ?? [];
  const wishlistCount   = wishlistIds.length;
  const completed       = plans.filter((t) => t.status === "completed");
  const wishlistedDests = allDestinations.filter((d) => wishlistIds.includes(d.id));

  const startEdit = () => {
    setEditName(user?.name ?? "");
    setEditAvatar(user?.avatar ?? null);
    setEditError(null);
    setEditSuccess(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    setEditError(null);
    try {
      await updateProfile.mutateAsync({
        name: editName,
        avatar: editAvatar ?? { url: DEFAULT_AVATAR, publicId: null, alt: "" },
      });
      setEditSuccess(true);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const cancelEdit = () => {
    uploadService.discardUnsavedImages([user?.avatar], [editAvatar]);
    setEditing(false);
  };

  if (!user) return null;

  const NAV: { id: Section; label: string; count: number; icon: React.ElementType }[] = [
    { id: "trips",    label: "Trips",       count: plans.length,        icon: Route           },
    { id: "wishlist", label: "Wishlist",    count: wishlistCount,       icon: Heart           },
    { id: "reviews",  label: "Reviews",     count: userReviews.length,  icon: MessageSquare   },
  ];

  return (
    <div className="space-y-8">
      {/* Profile header card */}
      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-secondary" />
        <div className="flex flex-col items-start gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="relative -mt-12 shrink-0">
            {(() => {
              const avatar = editing ? editAvatar : user.avatar;
              const hasCustom = avatar?.url && !isDefaultAvatar(avatar);
              return hasCustom ? (
                <CloudinaryImage
                  image={avatar}
                  alt={user.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl border-4 border-white shadow-soft object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand-600 to-secondary shadow-soft">
                  <span className="font-display text-2xl font-bold text-white select-none">
                    {getInitials(user.name)}
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex-1 pb-1">
            {editing ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Display name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-9 max-w-xs" />
                </div>
                <div className="max-w-[160px]">
                  <Label className="text-xs">Avatar <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="mt-1">
                    <ImageUploader
                      type="avatar"
                      value={editAvatar?.url && !isDefaultAvatar(editAvatar) ? editAvatar : null}
                      onChange={(img) => setEditAvatar(img ?? { url: DEFAULT_AVATAR, publicId: null, alt: "" })}
                      alt={editName}
                      label=""
                      aspectClassName="aspect-square"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Leave empty to use your initials.</p>
                </div>
                {editError && <p className="text-xs text-destructive">{editError}</p>}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-brand-600">{user.name}</h1>
                  <Badge variant={user.role === "admin" ? "accent" : "secondary"} className="capitalize">{user.role}</Badge>
                </div>
                {editSuccess && <p className="mt-0.5 text-xs text-success">Profile updated.</p>}
                <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {user.email}
                  </span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> Joined {formatDate(user.joinedAt)}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} /> Nepal</span>
                </div>
              </div>
            )}
          </div>
          {editing ? (
            <div className="flex gap-2 pb-1">
              <Button variant="accent" onClick={saveEdit} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </Button>
              <Button variant="outline" onClick={cancelEdit}><X size={16} /> Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" className="pb-1 self-end" onClick={startEdit}><Edit3 size={16} /> Edit</Button>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
          {[
            { label: "Trips",     value: plans.length },
            { label: "Saved",     value: wishlistCount },
            { label: "Reviews",   value: userReviews.length },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 text-center">
              <p className="font-display text-xl font-bold text-brand-600">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-2xl border border-border bg-muted p-1">
        {NAV.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
              activeSection === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeSection === id ? "bg-brand-50 text-brand-600" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Trips */}
      {activeSection === "trips" && (
        <div>
          {plans.length === 0 ? (
            <EmptyState icon={Route} title="No trips yet" description="Create a trip plan and it will appear here." action={{ label: "Plan a trip", href: "/planner" }} />
          ) : (
            <div className="space-y-3">
              {[...plans].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-secondary shrink-0">
                      {t.status === "completed" ? <CheckCircle2 size={20} /> : <Route size={20} />}
                    </span>
                    <div>
                      <p className="font-medium text-brand-600">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.startDate)} – {formatDate(t.endDate)}
                        {t.destinationIds.length > 0 && ` · ${t.destinationIds.length} stop${t.destinationIds.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={t.status === "completed" ? "success" : t.status === "ongoing" ? "accent" : "secondary"} className="capitalize">
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wishlist */}
      {activeSection === "wishlist" && (
        <div>
          {wishlistedDests.length === 0 ? (
            <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any destination to save it here." action={{ label: "Explore destinations", href: "/search" }} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {wishlistedDests.map((d) => <DestinationCard key={d.id} destination={d} />)}
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {activeSection === "reviews" && (
        <div>
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : userReviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet" description="Share your experience — visit a destination page to write a review." action={{ label: "Browse destinations", href: "/search" }} />
          ) : (
            <div className="space-y-4">
              {userReviews.map((r) => (
                <div key={r.id}>
                  {/* Status banner above each review card */}
                  {r.status === "pending" && (
                    <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent">
                      <Clock size={12} className="shrink-0" />
                      Pending — an admin will review this shortly.
                    </div>
                  )}
                  {r.status === "rejected" && (
                    <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive">
                      <AlertCircle size={12} className="shrink-0" />
                      Not approved — this review was not published.
                    </div>
                  )}
                  {r.status === "approved" && (
                    <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-1.5 text-xs font-medium text-success">
                      <CheckCircle2 size={12} className="shrink-0" />
                      Published — visible to all travellers.
                    </div>
                  )}
                  <ReviewCard review={r} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account info */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h2 className="mb-4 font-display font-semibold text-brand-600 flex items-center gap-2">
          <Star size={18} className="fill-accent text-accent" /> Account info
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
          <div><dt className="text-muted-foreground">Member since</dt><dd className="font-medium">{formatDate(user.joinedAt)}</dd></div>
          {user.lastLogin && <div><dt className="text-muted-foreground">Last login</dt><dd className="font-medium">{formatDate(user.lastLogin)}</dd></div>}
          <div><dt className="text-muted-foreground">Trips completed</dt><dd className="font-medium">{completed.length}</dd></div>
          <div><dt className="text-muted-foreground">Destinations saved</dt><dd className="font-medium">{wishlistCount}</dd></div>
        </dl>
      </div>
    </div>
  );
}
