import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth";
import { uploadSingle, uploadGallery } from "../middleware/upload";

import * as districts    from "../controllers/districts.controller";
import * as cities       from "../controllers/cities.controller";
import * as destinations from "../controllers/destinations.controller";
import * as treks        from "../controllers/treks.controller";
import * as festivals    from "../controllers/festivals.controller";
import * as guides       from "../controllers/guides.controller";
import * as reviews      from "../controllers/reviews.controller";
import * as search       from "../controllers/search.controller";
import * as auth         from "../controllers/auth.controller";
import * as users        from "../controllers/users.controller";
import * as planner      from "../controllers/planner.controller";
import * as wishlist     from "../controllers/wishlist.controller";
import * as stats        from "../controllers/stats.controller";
import * as attractions  from "../controllers/attractions.controller";
import * as recs        from "../controllers/recommendations.controller";
import * as upload       from "../controllers/upload.controller";
import * as travelAlerts from "../controllers/travelAlerts.controller";
import * as checklists   from "../controllers/packingChecklists.controller";
import * as bookings     from "../controllers/booking.controller";
import * as contact      from "../controllers/contact.controller";
import * as newsletter   from "../controllers/newsletter.controller";
import * as notifications from "../controllers/notifications.controller";

const router = Router();

// Strict limiter: login / register / password flows
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again in 15 minutes." }
});

// Light limiter: read-only public endpoints. Generous on purpose — `next build`
// statically generates 600+ pages (districts/destinations/attractions/treks/
// guides), each firing 1-3 same-origin fetches in a tight window, so the cap
// has to comfortably clear a full production build, not just live traffic.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." }
});

/* ----------------------------- Public reads ----------------------------- */
router.get("/stats",                     publicLimiter, stats.getPublicStats);
router.get("/districts",                 publicLimiter, districts.listDistricts);
router.get("/districts/:slug/attractions", publicLimiter, attractions.listDistrictAttractions);
router.get("/districts/:slug",           publicLimiter, districts.getDistrict);

router.get("/cities",                    publicLimiter, cities.listCities);

router.get("/attractions",               publicLimiter, attractions.listAttractions);
router.get("/attractions/:slug",         publicLimiter, attractions.getAttraction);

router.get("/destinations",                          publicLimiter, destinations.listDestinations);
router.get("/destinations/:slug/weather-insight",    publicLimiter, destinations.getDestinationWeatherInsight);
router.get("/destinations/:slug",                    publicLimiter, destinations.getDestination);

router.get("/treks",                     publicLimiter, treks.listTreks);
router.get("/treks/:slug",               publicLimiter, treks.getTrek);

router.get("/festivals",                 publicLimiter, festivals.listFestivals);
router.get("/festivals/:slug",           publicLimiter, festivals.getFestival);

router.get("/guides",                    publicLimiter, guides.listGuides);
router.get("/guides/:slug",              publicLimiter, guides.getGuide);

router.get("/reviews",                   publicLimiter, optionalAuth, reviews.listReviews);
router.post("/reviews",                  requireAuth,   reviews.createReview);
router.patch("/reviews/:id",             requireAuth,   reviews.updateReview);   // author only (checked in controller)
router.delete("/reviews/:id",            requireAuth,   reviews.deleteReview);   // author or admin (checked in controller)
router.post("/reviews/:id/helpful",      requireAuth,   reviews.voteHelpful);

router.get("/search",                    publicLimiter, search.search);
router.get("/search/popular",            publicLimiter, search.getPopularSearches);

router.get("/travel-alerts",             publicLimiter, travelAlerts.listTravelAlerts);

router.get("/checklists",                publicLimiter, checklists.listPackingChecklists);
router.get("/checklists/:category",      publicLimiter, checklists.getPackingChecklist);

router.get("/recommendations",               requireAuth,   recs.getPersonalized);
router.get("/recommendations/similar/:slug", publicLimiter, recs.getSimilar);
router.get("/recommendations/trending",      publicLimiter, recs.getTrending);

// Unauthenticated write endpoints — kept as tight as the auth flows to resist spam/abuse.
router.post("/contact",     authLimiter, contact.submitContactMessage);
router.post("/newsletter",  authLimiter, newsletter.subscribe);

/* -------------------------------- Auth ---------------------------------- */
router.post("/auth/register",       authLimiter, auth.register);
router.post("/auth/login",          authLimiter, auth.login);
router.post("/auth/refresh",        authLimiter, auth.refresh);   // rate-limited to prevent token harvesting
router.post("/auth/logout",                      auth.logout);
router.post("/auth/logout-all",     requireAuth, auth.logoutAll);
router.get( "/auth/me",             requireAuth, auth.me);
router.patch("/auth/profile",       requireAuth, auth.updateProfile);
router.post("/auth/change-password",requireAuth, auth.changePassword);
router.post("/auth/forgot-password",      authLimiter,   auth.forgotPassword);
router.post("/auth/reset-password",       authLimiter,   auth.resetPassword);

/* ----------------------- Authenticated user areas ----------------------- */
router.get(   "/planner",     requireAuth, planner.listTrips);
router.post(  "/planner",     requireAuth, planner.createTrip);
router.put(   "/planner/:id", requireAuth, planner.updateTrip);
router.delete("/planner/:id", requireAuth, planner.deleteTrip);

router.get(   "/wishlist",                    requireAuth, wishlist.getWishlist);
router.post(  "/wishlist",                    requireAuth, wishlist.addToWishlist);
router.delete("/wishlist/:destinationId",     requireAuth, wishlist.removeFromWishlist);

router.get(   "/bookings",     requireAuth, bookings.listBookings);
router.post(  "/bookings",     requireAuth, bookings.createBooking);
router.patch( "/bookings/:id", requireAuth, bookings.updateBookingStatus);
router.delete("/bookings/:id", requireAuth, bookings.deleteBooking);

router.get(   "/notifications",          requireAuth, notifications.listNotifications);
router.patch( "/notifications/read-all", requireAuth, notifications.markAllRead);
router.patch( "/notifications/:id/read", requireAuth, notifications.markRead);

/* ------------------------------ Uploads ----------------------------------- */
// Rate-limited to slow down abuse of the (relatively expensive) Cloudinary upload path
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many uploads. Please try again in 15 minutes." }
});

router.post(  "/upload/image",   requireAuth, uploadLimiter, uploadSingle,  upload.uploadSingleImage);
router.post(  "/upload/gallery", requireAuth, uploadLimiter, uploadGallery, upload.uploadGalleryImages);
router.delete("/upload/image",   requireAdmin,               upload.deleteUploadedImage);

/* ------------------------------- Admin ----------------------------------- */
router.post(  "/districts",     requireAdmin, districts.createDistrict);
router.put(   "/districts/:id", requireAdmin, districts.updateDistrict);
router.delete("/districts/:id", requireAdmin, districts.deleteDistrict);

router.post(  "/cities",     requireAdmin, cities.createCity);
router.put(   "/cities/:id", requireAdmin, cities.updateCity);
router.delete("/cities/:id", requireAdmin, cities.deleteCity);

router.post(  "/attractions",     requireAdmin, attractions.createAttraction);
router.put(   "/attractions/:id", requireAdmin, attractions.updateAttraction);
router.delete("/attractions/:id", requireAdmin, attractions.deleteAttraction);

router.post(  "/destinations",     requireAdmin, destinations.createDestination);
router.put(   "/destinations/:id", requireAdmin, destinations.updateDestination);
router.delete("/destinations/:id", requireAdmin, destinations.deleteDestination);

router.post(  "/treks",     requireAdmin, treks.createTrek);
router.put(   "/treks/:id", requireAdmin, treks.updateTrek);
router.delete("/treks/:id", requireAdmin, treks.deleteTrek);

router.post(  "/festivals",     requireAdmin, festivals.createFestival);
router.put(   "/festivals/:id", requireAdmin, festivals.updateFestival);
router.delete("/festivals/:id", requireAdmin, festivals.deleteFestival);

router.post(  "/guides",     requireAdmin, guides.createGuide);
router.put(   "/guides/:id", requireAdmin, guides.updateGuide);
router.delete("/guides/:id", requireAdmin, guides.deleteGuide);

router.patch( "/reviews/:id/status", requireAdmin, reviews.moderateReview);

router.post(  "/travel-alerts",     requireAdmin, travelAlerts.createTravelAlert);
router.put(   "/travel-alerts/:id", requireAdmin, travelAlerts.updateTravelAlert);
router.delete("/travel-alerts/:id", requireAdmin, travelAlerts.deleteTravelAlert);

router.post(  "/checklists",     requireAdmin, checklists.createPackingChecklist);
router.put(   "/checklists/:id", requireAdmin, checklists.updatePackingChecklist);
router.delete("/checklists/:id", requireAdmin, checklists.deletePackingChecklist);

router.get("/dashboard/activity",  requireAuth,  stats.getUserActivity);
router.get("/admin/analytics",     requireAdmin, stats.getAdminAnalytics);
router.get(   "/admin/bookings",     requireAdmin, bookings.adminListBookings);
router.get(   "/admin/bookings/:id", requireAdmin, bookings.adminGetBookingDetail);
router.patch( "/admin/bookings/:id", requireAdmin, bookings.adminUpdateBookingStatus);
router.delete("/admin/bookings/:id", requireAdmin, bookings.adminDeleteBooking);

router.get(   "/admin/notifications",          requireAdmin, notifications.listAdminNotifications);
router.patch( "/admin/notifications/read-all", requireAdmin, notifications.markAllAdminRead);
router.patch( "/admin/notifications/:id/read", requireAdmin, notifications.markAdminRead);
router.get("/users",               requireAdmin, users.listUsers);
router.get("/users/:id",           requireAdmin, users.getUser);
router.patch("/users/:id/role",    requireAdmin, users.updateUserRole);
router.patch("/users/:id/status",  requireAdmin, users.updateUserStatus);
router.delete("/users/:id",        requireAdmin, users.deleteUser);

export default router;
