import type { Request, Response } from "express";
import { User } from "../models/User";
import { Destination } from "../models/Destination";
import { ok, fail } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";

const WISHLIST_LIMIT = 500;

// GET /api/wishlist (auth) -> { ids, destinations }
export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.auth!.sub });
  if (!user) return fail(res, "User not found", 404);

  const destinations = await Destination.find({ id: { $in: user.wishlist } });

  // Self-heal: drop ids left behind by a destination that was later deleted,
  // so they don't linger in the list (and toward the limit) forever.
  if (destinations.length !== user.wishlist.length) {
    const validIds = destinations.map((d) => d.id);
    await User.updateOne({ id: user.id }, { $set: { wishlist: validIds } });
    return ok(res, { ids: validIds, destinations });
  }

  ok(res, { ids: user.wishlist, destinations });
});

// POST /api/wishlist { destinationId } (auth) -> updated id list
export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const destinationId = typeof req.body?.destinationId === "string" ? req.body.destinationId : null;
  if (!destinationId) return fail(res, "destinationId is required", 400);

  const destinationExists = await Destination.exists({ id: destinationId });
  if (!destinationExists) return fail(res, "Destination not found", 404);

  // Atomic: only add if below limit and not already present
  const user = await User.findOneAndUpdate(
    {
      id: req.auth!.sub,
      $expr: { $lt: [{ $size: { $ifNull: ["$wishlist", []] } }, WISHLIST_LIMIT] }
    },
    { $addToSet: { wishlist: destinationId } },
    { new: true }
  );

  if (!user) {
    // Distinguish "not found" from "limit reached"
    const exists = await User.exists({ id: req.auth!.sub });
    return exists
      ? fail(res, `Wishlist limit of ${WISHLIST_LIMIT} destinations reached`, 400)
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
