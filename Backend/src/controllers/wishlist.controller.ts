import type { Request, Response } from "express";
import { User } from "../models/User";
import { Destination } from "../models/Destination";
import { Attraction } from "../models/Attraction";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";

const WISHLIST_LIMIT = 500;

// GET /api/wishlist (auth) -> { ids, destinations, attractions }
// Wishlist ids can belong to either collection — the heart button appears on
// both Destination and Attraction cards, so both need to resolve here.
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.auth!.sub }).lean();
  if (!user) return fail(res, "User not found", 404);

  const [destinations, attractions] = await Promise.all([
    Destination.find({ id: { $in: user.wishlist } }).lean(),
    Attraction.find({ id: { $in: user.wishlist } }).lean()
  ]);

  // Self-heal: drop ids left behind by an item that was later deleted, so
  // they don't linger in the list (and toward the limit) forever.
  const validIds = [...destinations.map((d) => d.id), ...attractions.map((a) => a.id)];
  if (validIds.length !== user.wishlist.length) {
    await User.updateOne({ id: user.id }, { $set: { wishlist: validIds } });
    return ok(res, { ids: validIds, destinations, attractions });
  }

  ok(res, { ids: user.wishlist, destinations, attractions });
});

// POST /api/wishlist { destinationId } (auth) -> updated id list
// Field is still named `destinationId` for frontend/API backward compatibility,
// but it accepts either a Destination or an Attraction id.
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const itemId = typeof req.body?.destinationId === "string" ? req.body.destinationId : null;
  if (!itemId) return fail(res, "destinationId is required", 400);

  const [isDestination, isAttraction] = await Promise.all([
    Destination.exists({ id: itemId }),
    Attraction.exists({ id: itemId })
  ]);
  if (!isDestination && !isAttraction) return fail(res, "Destination or attraction not found", 404);

  // Atomic: only add if below limit and not already present
  const user = await User.findOneAndUpdate(
    {
      id: req.auth!.sub,
      $expr: { $lt: [{ $size: { $ifNull: ["$wishlist", []] } }, WISHLIST_LIMIT] }
    },
    { $addToSet: { wishlist: itemId } },
    { new: true }
  );

  if (!user) {
    // Distinguish "not found" from "limit reached"
    const exists = await User.exists({ id: req.auth!.sub });
    return exists
      ? fail(res, `Wishlist limit of ${WISHLIST_LIMIT} items reached`, 400)
      : fail(res, "User not found", 404);
  }

  ok(res, { ids: user.wishlist });
});

// DELETE /api/wishlist/:destinationId (auth) -> updated id list
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOneAndUpdate(
    { id: req.auth!.sub },
    { $pull: { wishlist: req.params.destinationId } },
    { new: true }
  );
  if (!user) return fail(res, "User not found", 404);
  ok(res, { ids: user.wishlist });
});
