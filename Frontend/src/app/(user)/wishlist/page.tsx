import { WishlistClient } from "./wishlist-client";
import { getDestinations, getAttractions } from "@/services/content";

export default async function WishlistPage() {
  const [destinations, attractions] = await Promise.all([getDestinations(), getAttractions()]);
  return <WishlistClient allDestinations={destinations} allAttractions={attractions} />;
}
