"use client";
import { useEffect } from "react";
import { Heart, Trash2 } from "lucide-react";
import type { Destination, TouristAttraction } from "@/types";
import { useWishlist } from "@/store/wishlist-store";
import { useAuth } from "@/store/auth-store";
import { DestinationCard } from "@/components/cards/destination-card";
import { AttractionCard } from "@/components/cards/attraction-card";
import { AddToTripButton } from "@/components/shared/add-to-trip-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { apiDelete } from "@/services/api-client";
import { wishlistService } from "@/services/wishlistService";

export function WishlistClient({
  allDestinations,
  allAttractions,
}: {
  allDestinations: Destination[];
  allAttractions: TouristAttraction[];
}) {
  const { ids, clear, merge } = useWishlist();
  // Use a stable boolean selector to avoid re-running the effect on every render
  const loggedIn = useAuth((s) => !!s.user);

  useEffect(() => {
    if (!loggedIn) return;
    wishlistService.get().then(({ ids: serverIds }) => merge(serverIds)).catch(() => {});
  }, [loggedIn, merge]);

  const savedDestinations = allDestinations.filter((d) => ids.includes(d.id));
  const savedAttractions = allAttractions.filter((a) => ids.includes(a.id));
  const total = savedDestinations.length + savedAttractions.length;

  const clearAll = async () => {
    const removedIds = ids;
    clear();
    if (loggedIn) {
      await Promise.allSettled(removedIds.map((id) => apiDelete(`/wishlist/${id}`)));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h2 text-brand-600">Your wishlist</h1>
          <p className="lead mt-1">{total} saved {total === 1 ? "item" : "items"}.</p>
        </div>
        {total > 0 && (
          <Button variant="outline" onClick={clearAll}><Trash2 size={16} /> Clear all</Button>
        )}
      </div>
      {total ? (
        <div className="space-y-10">
          {savedDestinations.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-brand-600">
                Destinations <span className="font-normal text-muted-foreground">({savedDestinations.length})</span>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {savedDestinations.map((d) => (
                  <div key={d.id} className="space-y-2">
                    <DestinationCard destination={d} />
                    <AddToTripButton destinationId={d.id} />
                  </div>
                ))}
              </div>
            </section>
          )}
          {savedAttractions.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-brand-600">
                Attractions <span className="font-normal text-muted-foreground">({savedAttractions.length})</span>
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {savedAttractions.map((a) => <AttractionCard key={a.id} attraction={a} />)}
              </div>
            </section>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any destination or attraction to save it here for later."
          action={{ label: "Discover destinations", href: "/search" }}
        />
      )}
    </div>
  );
}
