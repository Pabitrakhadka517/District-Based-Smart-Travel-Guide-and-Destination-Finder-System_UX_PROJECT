import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { District } from "../models/District";
import { Destination } from "../models/Destination";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { AuditLog } from "../models/AuditLog";
import { TripPlan } from "../models/TripPlan";

// GET /api/dashboard/activity  (requireAuth)
export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as Request & { auth?: { sub: string } }).auth!.sub;

  const [plans, reviews] = await Promise.all([
    TripPlan.find({ userId }).sort({ startDate: -1 }).limit(20).lean(),
    Review.find({ userId }).sort({ date: -1 }).limit(10).lean(),
  ]);

  // Resolve destination names for reviews
  const reviewDestIds = [...new Set(reviews.map((r) => r.destinationId as string))];
  const destDocs = reviewDestIds.length
    ? await Destination.find({ id: { $in: reviewDestIds } }).select("id name slug").lean()
    : [];
  const destMap = new Map(
    (destDocs as Array<{ id: string; name: string; slug: string }>).map((d) => [
      d.id,
      { name: d.name, slug: d.slug },
    ])
  );

  type EventType = "trip_planned" | "trip_ongoing" | "trip_completed" | "review_written";

  interface ActivityEvent {
    type: EventType;
    date: string;
    tripTitle?: string;
    destinationCount?: number;
    destinationName?: string;
    destinationSlug?: string;
    rating?: number;
  }

  const events: ActivityEvent[] = [];

  for (const p of plans) {
    const status = p.status as string;
    const date = status === "completed" ? (p.endDate as string) : (p.startDate as string);
    if (!date) continue;
    events.push({
      type:
        status === "completed"
          ? "trip_completed"
          : status === "ongoing"
          ? "trip_ongoing"
          : "trip_planned",
      date,
      tripTitle: p.title as string,
      destinationCount: ((p.destinationIds as string[]) ?? []).length,
    });
  }

  for (const r of reviews) {
    const dest = destMap.get(r.destinationId as string);
    events.push({
      type: "review_written",
      date: r.date as string,
      destinationName: dest?.name ?? "a destination",
      destinationSlug: dest?.slug,
      rating: r.rating as number,
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));

  ok(res, events.slice(0, 15));
});

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACTION_LABELS: Record<string, string> = {
  login: "signed in",
  register: "joined the platform",
  login_failed: "had a failed login attempt",
  logout: "logged out",
  logout_all: "logged out from all devices",
  profile_update: "updated their profile",
  password_change: "changed their password",
  forgot_password: "requested a password reset",
  password_reset: "reset their password"
};

// GET /api/stats  (public)
export const getPublicStats = asyncHandler(async (_req: Request, res: Response) => {
  const [destinations, districts, reviews, users, ratingResult] = await Promise.all([
    Destination.countDocuments(),
    District.countDocuments(),
    Review.countDocuments({ status: "approved" }),
    User.countDocuments({ isActive: true }),
    Review.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, avg: { $avg: "$rating" } } }
    ])
  ]);

  const avgRating = ratingResult[0]?.avg
    ? Math.round((ratingResult[0].avg as number) * 10) / 10
    : 0;

  ok(res, { destinations, districts, reviews, users, avgRating });
});

// GET /api/admin/analytics  (requireAdmin)
export const getAdminAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers, totalDestinations, totalReviews, totalTrips, pendingReviews, ratingResult] =
    await Promise.all([
      User.countDocuments(),
      Destination.countDocuments(),
      Review.countDocuments(),
      TripPlan.countDocuments(),
      Review.countDocuments({ status: "pending" }),
      Review.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, avg: { $avg: "$rating" } } }
      ])
    ]);

  const avgRating = ratingResult[0]?.avg
    ? Math.round((ratingResult[0].avg as number) * 10) / 10
    : 0;

  // User growth for last 6 months (by joinedAt string "YYYY-MM-DD")
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[d.getMonth()]
    };
  });

  const growthRaw = await User.aggregate([
    { $match: { joinedAt: { $gte: months[0].key } } },
    { $group: { _id: { $substr: ["$joinedAt", 0, 7] }, count: { $sum: 1 } } }
  ]);
  const growthMap = new Map(
    (growthRaw as Array<{ _id: string; count: number }>).map((r) => [r._id, r.count])
  );
  const userGrowth = months.map(({ key, label }) => ({ label, value: growthMap.get(key) ?? 0 }));

  // Month-over-month growth percentage
  const thisMonth = growthMap.get(months[5].key) ?? 0;
  const lastMonth = growthMap.get(months[4].key) ?? 0;
  const userGrowthPct =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null;

  // Recent audit log activity with user name lookup
  const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(5).lean();
  const userIds = [...new Set(recentLogs.map((l) => l.userId))];
  const userList = await User.find({ id: { $in: userIds } }).select("id name").lean();
  const userMap = new Map(
    (userList as Array<{ id: string; name: string }>).map((u) => [u.id, u.name])
  );

  const recentActivity = recentLogs.map((log) => ({
    who: userMap.get(log.userId) ?? "User",
    action: ACTION_LABELS[log.action] ?? log.action,
    time: (log.createdAt as Date).toISOString()
  }));

  ok(res, {
    totalUsers,
    totalDestinations,
    totalReviews,
    totalTrips,
    pendingReviews,
    avgRating,
    userGrowthPct,
    userGrowth,
    recentActivity
  });
});
