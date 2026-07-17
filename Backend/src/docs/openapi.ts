import { env } from "../config/env";

// ─── Primitive helpers ────────────────────────────────────────────────────────

/** Reference to a named component schema */
const $ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** Array of a referenced schema */
const arrayOf = (name: string) => ({ type: "array", items: { $ref: `#/components/schemas/${name}` } });

/** Standard { success, data } response envelope */
const envelope = (dataSchema: object) => ({
  type: "object",
  required: ["success", "data"],
  properties: { success: { type: "boolean", example: true }, data: dataSchema }
});

/**
 * Paginated { success, data, total, page, limit } response envelope — used by
 * every list endpoint that calls `okPaginated()` on the backend. `data` stays
 * a plain array (so callers that only read `.data` still work); `total`,
 * `page` and `limit` are additive.
 */
const paginatedEnvelope = (itemsSchemaName: string) => ({
  type: "object",
  required: ["success", "data", "total", "page", "limit"],
  properties: {
    success: { type: "boolean", example: true },
    data: arrayOf(itemsSchemaName),
    total: { type: "integer", example: 42, description: "Total matching documents across all pages" },
    page:  { type: "integer", example: 1,  description: "Current 1-indexed page number" },
    limit: { type: "integer", example: 24, description: "Page size actually applied (capped server-side)" }
  }
});

/** Short-hand for a 200/201 application/json response */
const jsonResponse = (description: string, dataSchema: object, status = 200) => ({
  [status]: { description, content: { "application/json": { schema: envelope(dataSchema) } } }
});

/** Short-hand for a paginated 200 application/json response */
const jsonResponsePaginated = (description: string, itemsSchemaName: string) => ({
  200: { description, content: { "application/json": { schema: paginatedEnvelope(itemsSchemaName) } } }
});

/** Reusable $ref response short-hands */
const r400 = { $ref: "#/components/responses/BadRequest" } as const;
const r401 = { $ref: "#/components/responses/Unauthorized" } as const;
const r403 = { $ref: "#/components/responses/Forbidden" } as const;
const r404 = { $ref: "#/components/responses/NotFound" } as const;
const r409 = { $ref: "#/components/responses/Conflict" } as const;
const r500 = { $ref: "#/components/responses/InternalError" } as const;
const r502 = { $ref: "#/components/responses/BadGateway" } as const;

/** Bearer-JWT security requirement */
const bearerSec = [{ bearerAuth: [] }];

/** Path parameter short-hand */
const pathParam = (name: string, description: string, example: string) => ({
  name, in: "path", required: true,
  description,
  schema: { type: "string" },
  example
});

/** Reusable `page`/`limit` query parameters, shared by every paginated list endpoint. */
const pageParam = {
  name: "page", in: "query",
  description: "1-indexed page number.",
  schema: { type: "integer", minimum: 1, default: 1 },
  example: 1
};
const limitParam = (defaultLimit: number, maxLimit = 500) => ({
  name: "limit", in: "query",
  description: `Items per page (capped server-side at ${maxLimit}). Defaults to ${defaultLimit} when omitted, so existing callers that never paginate keep getting the full collection.`,
  schema: { type: "integer", minimum: 1, maximum: maxLimit, default: defaultLimit },
  example: defaultLimit
});
const paginationParams = (defaultLimit: number, maxLimit = 500) => [pageParam, limitParam(defaultLimit, maxLimit)];

// ─── Enum constants ───────────────────────────────────────────────────────────

const ENUM_CATEGORY = ["Heritage", "Adventure", "Nature", "Trekking", "Religious", "Wildlife", "Cultural", "Lake", "City"];
const ENUM_SEASON   = ["Spring", "Summer", "Autumn", "Winter"];
const ENUM_DIFFICULTY = ["Easy", "Moderate", "Challenging", "Strenuous"];
const ENUM_ATTRACTION_CATEGORY = [
  "Religious Sites", "Historical Sites", "Natural Attractions", "Lakes & Rivers",
  "Mountains & Trekking Routes", "Adventure Activities", "Cultural Heritage Sites",
  "Viewpoints", "National Parks & Wildlife", "Local Experiences"
];
const ENUM_REVIEW_STATUS  = ["approved", "pending", "rejected"];
const ENUM_TRIP_STATUS    = ["draft", "planned", "ready", "ongoing", "completed", "cancelled"];
const ENUM_TRAVEL_TYPE    = ["Adventure", "Trekking", "Cultural", "Religious", "Family", "Wildlife", "Luxury", "Budget"];
const ENUM_ROLE           = ["user", "admin"];
const ENUM_GUIDE_CATEGORY = ["Tips", "Itineraries", "Culture", "Food", "Trekking"];
const ENUM_FESTIVAL_TYPE  = ["Religious", "Cultural", "Harvest", "National"];
const ENUM_BOOKING_STATUS = ["pending", "confirmed", "cancelled"];
const ENUM_ACCOMMODATION  = ["Budget", "Standard", "Luxury"];
const ENUM_TRANSPORT      = ["Local Bus", "Private Jeep", "Domestic Flight"];
const ENUM_SEARCH_SORT    = ["rating", "reviews", "price-low", "price-high", "alphabetical", "newest"];
const ENUM_ALERT_LEVEL    = ["Info", "Advisory", "Warning"];
const ENUM_UPLOAD_TYPE = [
  "district", "city", "destination-cover", "destination-gallery",
  "attraction-cover", "attraction-gallery", "trek-cover", "trek-gallery",
  "festival", "guide-cover", "guide-avatar", "avatar", "review", "planner"
];

// ─── OpenAPI document ─────────────────────────────────────────────────────────

export const openapiSpec = {
  openapi: "3.0.3",

  // ── Info ──────────────────────────────────────────────────────────────────
  info: {
    title: "NepalYatra API",
    version: "1.0.0",
    description: [
      "## NepalYatra — District-Based Smart Travel Guide API",
      "",
      "Complete REST API for the NepalYatra travel platform.",
      "",
      "### Response envelopes",
      "Every endpoint returns `{ success: boolean, data: T }`. On error the shape is `{ success: false, error: string }` — there is no separate field-level validation error shape; every 400/401/403/404/409 uses this same `error` string.",
      "",
      "List endpoints backed by `okPaginated()` (marked in their description below) return an additive envelope: `{ success: true, data: T[], total, page, limit }`. `data` is still a plain array, so a caller that only reads `.data` works unchanged whether or not it passes `page`/`limit`.",
      "",
      "### Images",
      "Every image field (`heroImage`, `image`, `cover`, `avatar`, `gallery`, `photos`, …) is a structured object — see the `Image` schema — not a plain URL string. `publicId` is `null` for legacy/external images that were never uploaded through this app's own Cloudinary account (so they're never sent to Cloudinary's destroy API by mistake).",
      "",
      "### Authentication",
      "1. Call `POST /api/auth/login` to receive a short-lived **access token** (15 min by default) plus an `httpOnly` refresh token cookie.",
      "2. Pass the access token as `Authorization: Bearer <token>` on protected routes.",
      "3. When the access token expires call `POST /api/auth/refresh` (cookie is sent automatically) to get a new pair.",
      "",
      "### Role levels",
      "| Level | Description |",
      "|-------|-------------|",
      "| Public | No auth required |",
      "| User | Valid Bearer token |",
      "| Admin | Bearer token with `role: admin` |"
    ].join("\n"),
    contact: {
      name: "NepalYatra Dev Team",
      email: "dev@nepalyatra.com",
      url: "https://nepalyatra.com"
    },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" }
  },

  // ── Servers ───────────────────────────────────────────────────────────────
  servers: [
    { url: `http://localhost:${env.port}/api`, description: "Development server" },
    { url: "https://api.nepayatra.com/api",     description: "Production server" }
  ],

  // ── Tags (section order in Swagger UI) ───────────────────────────────────
  tags: [
    { name: "Auth",         description: "Registration, login, session management & password flows" },
    { name: "Districts",    description: "Nepal's 77 administrative districts" },
    { name: "Cities",       description: "Cities and urban centres within districts" },
    { name: "Attractions",  description: "Tourist attractions grouped by district and category" },
    { name: "Destinations", description: "Curated travel destinations with rich details" },
    { name: "Treks",        description: "Multi-day trekking routes with itineraries" },
    { name: "Festivals",    description: "Cultural and religious festivals" },
    { name: "Guides",       description: "Curated travel guide articles" },
    { name: "Reviews",      description: "Traveller reviews for destinations" },
    { name: "Search",       description: "Cross-content full-text search with filters, sorting and pagination" },
    { name: "Recommendations", description: "Personalized, similar-item and trending destination recommendations" },
    { name: "Contact",      description: "Public contact form submission" },
    { name: "Travel Alerts",description: "Admin-managed travel advisories shown on the weather page" },
    { name: "Checklists",   description: "Admin-managed packing checklists, one per destination category" },
    { name: "Planner",      description: "Personal trip planner (requires auth)" },
    { name: "Bookings",     description: "Destination bookings with cost estimates (requires auth); admin oversight endpoints included" },
    { name: "Wishlist",     description: "Personal wishlist (requires auth)" },
    { name: "Media",        description: "Cloudinary image upload/delete used by admin forms and user-generated content (reviews, trip photos, avatars)" },
    { name: "Dashboard",    description: "The authenticated user's own activity feed" },
    { name: "Admin",        description: "Admin-only: analytics, user management, content moderation" },
    { name: "Stats",        description: "Public platform statistics" }
  ],

  // ── Reusable components ───────────────────────────────────────────────────
  components: {

    // -- Security schemes ----------------------------------------------------
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the access token obtained from `/auth/login` or `/auth/refresh`."
      }
    },

    // -- Reusable schemas ----------------------------------------------------
    schemas: {

      // ---- Error shapes ----
      Error: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Resource not found" }
        }
      },

      DeleteResult: {
        type: "object",
        properties: {
          id: { type: "string", example: "p1" },
          deleted: { type: "boolean", example: true }
        }
      },

      // ---- Shared primitives ----
      Coordinates: {
        type: "object",
        required: ["lat", "lng"],
        properties: {
          lat: { type: "number", format: "double", example: 27.7172 },
          lng: { type: "number", format: "double", example: 85.3240 }
        }
      },

      Image: {
        type: "object",
        description: "Structured image metadata backing every image field in the API. `publicId` is null for images not owned by this app's Cloudinary account (never sent to the destroy API).",
        required: ["url", "publicId", "alt"],
        properties: {
          url:         { type: "string", format: "uri", example: "https://res.cloudinary.com/your-cloud-name/image/upload/v1/nepalyatra/destinations/example.jpg" },
          publicId:    { type: "string", nullable: true, example: "nepalyatra/destinations/example" },
          alt:         { type: "string", example: "Sunrise over Phewa Lake" },
          width:       { type: "integer", example: 1600 },
          height:      { type: "integer", example: 1067 },
          blurDataUrl: { type: "string", description: "Tiny base64 blur placeholder for progressive image loading", example: "data:image/jpeg;base64,/9j/4AAQ…" }
        }
      },

      EntryFee: {
        type: "object",
        description: "Admission prices in NPR (Nepali Rupees) for different visitor categories",
        properties: {
          nepali:   { type: "integer", example: 0,    description: "Price for Nepali citizens" },
          saarc:    { type: "integer", example: 250,  description: "Price for SAARC-nation passport holders" },
          foreigner:{ type: "integer", example: 1000, description: "Price for all other foreign visitors" },
          currency: { type: "string",  example: "NPR" }
        }
      },

      NearbyHotel: {
        type: "object",
        properties: {
          name:       { type: "string", example: "Hyatt Regency Kathmandu" },
          stars:      { type: "integer", minimum: 1, maximum: 5, example: 5 },
          priceRange: { type: "string", example: "$$$" }
        }
      },

      NearbyRestaurant: {
        type: "object",
        properties: {
          name:       { type: "string", example: "Krishnarpan" },
          cuisine:    { type: "string", example: "Nepali" },
          priceRange: { type: "string", example: "$$$" }
        }
      },

      BudgetEstimate: {
        type: "object",
        description: "Per-day cost ranges in NPR (Nepali Rupees)",
        properties: {
          budget:   { type: "number", example: 2000  },
          midRange: { type: "number", example: 6000  },
          luxury:   { type: "number", example: 16000 },
          currency: { type: "string", example: "NPR" }
        }
      },

      WeatherInsight: {
        type: "object",
        description: "Live weather (Open-Meteo) blended with season-based visiting advice. Falls back to season-only advice if the weather API is unreachable (5s timeout).",
        properties: {
          condition:     { type: "string", enum: ["Sunny", "Clear", "Cloudy", "Rain", "Snow"], example: "Clear" },
          currentTemp:   { type: "integer", example: 18, description: "Degrees Celsius; 0 if the weather API call failed" },
          isIdealSeason: { type: "boolean", example: true },
          visitAdvice:   { type: "string", enum: ["Go now", "Good time", "Off-season", "Avoid"], example: "Go now" },
          message:       { type: "string", example: "Autumn is one of the best times to visit. Clear skies and comfortable temperatures." },
          bestMonths:    { type: "array", items: { type: "string" }, example: ["September", "October", "November"] }
        }
      },

      RatingBreakdownItem: {
        type: "object",
        properties: {
          star:  { type: "integer", minimum: 1, maximum: 5, example: 5 },
          count: { type: "integer", example: 812 },
          pct:   { type: "integer", example: 57, description: "Percentage of all approved reviews at this star rating" }
        }
      },

      // ---- Domain schemas ----
      District: {
        type: "object",
        description: "One of Nepal's 77 administrative districts",
        properties: {
          id:               { type: "string", example: "d1" },
          slug:             { type: "string", example: "kathmandu" },
          name:             { type: "string", example: "Kathmandu" },
          province:         { type: "string", example: "Bagmati" },
          description:      { type: "string", example: "Nepal's vibrant capital district…" },
          heroImage:        $ref("Image"),
          coordinates:      $ref("Coordinates"),
          cityCount:        { type: "integer", example: 2 },
          destinationCount: { type: "integer", example: 3 },
          attractionCount:  { type: "integer", example: 10 },
          popularFor:       { type: "array", items: { type: "string" }, example: ["Heritage", "Temples"] },
          rating:           { type: "number", example: 4.8 },
          bestSeason:       { type: "string", example: "Autumn" }
        }
      },

      City: {
        type: "object",
        properties: {
          id:              { type: "string", example: "c1" },
          slug:            { type: "string", example: "kathmandu-city" },
          districtId:      { type: "string", example: "d1" },
          name:            { type: "string", example: "Kathmandu" },
          description:     { type: "string" },
          image:           $ref("Image"),
          coordinates:     $ref("Coordinates"),
          categories:      { type: "array", items: { type: "string", enum: ENUM_CATEGORY } },
          rating:          { type: "number", example: 4.7 },
          destinationCount:{ type: "integer", example: 4 },
          altitude:        { type: "integer", example: 1400, description: "Metres above sea level" }
        }
      },

      TouristAttraction: {
        type: "object",
        description: "A tourist attraction — temple, viewpoint, lake, park, cultural site, etc.",
        properties: {
          id:                { type: "string", example: "a1" },
          slug:              { type: "string", example: "pashupatinath-temple" },
          districtId:        { type: "string", example: "d1" },
          name:              { type: "string", example: "Pashupatinath Temple" },
          category:          { type: "string", enum: ENUM_ATTRACTION_CATEGORY, example: "Religious Sites" },
          tagline:           { type: "string", example: "Nepal's holiest Hindu shrine on the Bagmati" },
          description:       { type: "string" },
          history:           { type: "string" },
          heroImage:         $ref("Image"),
          gallery:           arrayOf("Image"),
          coordinates:       $ref("Coordinates"),
          rating:            { type: "number", example: 4.9 },
          reviewCount:       { type: "integer", example: 2341 },
          openingHours:      { type: "string", example: "4:00 AM – 9:00 PM" },
          entryFee:          $ref("EntryFee"),
          bestTimeToVisit:   { type: "array", items: { type: "string", enum: ENUM_SEASON } },
          activities:        { type: "array", items: { type: "string" } },
          localFoods:        { type: "array", items: { type: "string" } },
          travelTips:        { type: "array", items: { type: "string" } },
          nearbyAttractions: { type: "array", items: { type: "string" }, description: "Attraction IDs" },
          nearbyHotels:      { type: "array", items: $ref("NearbyHotel") },
          nearbyRestaurants: { type: "array", items: $ref("NearbyRestaurant") },
          featured:          { type: "boolean", example: true },
          trending:          { type: "boolean", example: true }
        }
      },

      AttractionBundle: {
        type: "object",
        description: "Single-attraction response with resolved nearby attractions",
        required: ["attraction", "nearby"],
        properties: {
          attraction: $ref("TouristAttraction"),
          nearby:     arrayOf("TouristAttraction")
        }
      },

      AttractionSubItem: {
        type: "object",
        description: "Brief attraction highlight embedded within a Destination document",
        properties: {
          name:        { type: "string", example: "Boudhanath Stupa" },
          description: { type: "string", example: "One of the largest stupas in the world." }
        }
      },

      Restaurant: {
        type: "object",
        properties: {
          name:       { type: "string", example: "Krishnarpan" },
          cuisine:    { type: "string", example: "Nepali fine dining" },
          priceRange: { type: "string", example: "$$$" }
        }
      },

      Destination: {
        type: "object",
        properties: {
          id:              { type: "string", example: "p1" },
          slug:            { type: "string", example: "swayambhunath" },
          cityId:          { type: "string", example: "c1" },
          districtId:      { type: "string", example: "d1" },
          name:            { type: "string", example: "Swayambhunath" },
          tagline:         { type: "string" },
          description:     { type: "string" },
          category:        { type: "string", enum: ENUM_CATEGORY, example: "Religious" },
          tags:            { type: "array", items: { type: "string" }, example: ["UNESCO", "Buddhist"] },
          heroImage:       $ref("Image"),
          gallery:         arrayOf("Image"),
          coordinates:     $ref("Coordinates"),
          rating:          { type: "number", example: 4.7 },
          reviewCount:     { type: "integer", example: 1542 },
          bestTimeToVisit: { type: "array", items: { type: "string", enum: ENUM_SEASON } },
          budget:          $ref("BudgetEstimate"),
          attractions:     { type: "array", items: $ref("AttractionSubItem") },
          activities:      { type: "array", items: { type: "string" } },
          restaurants:     { type: "array", items: $ref("Restaurant") },
          localFoods:      { type: "array", items: { type: "string" } },
          travelTips:      { type: "array", items: { type: "string" } },
          pros:            { type: "array", items: { type: "string" } },
          cons:            { type: "array", items: { type: "string" } },
          nearby:          { type: "array", items: { type: "string" }, description: "Destination IDs" },
          featured:        { type: "boolean" },
          trending:        { type: "boolean" },
          difficulty:      { type: "string", enum: ENUM_DIFFICULTY, nullable: true, description: "Only set for trek-like destinations" },
          recommendedDuration: { type: "string", nullable: true, example: "2-3 days" }
        }
      },

      DestinationSummary: {
        type: "object",
        description: "Reduced Destination projection returned by the recommendation endpoints (id/slug/name/tagline/heroImage/category/tags/districtId/difficulty/rating/reviewCount/budget/trending only).",
        properties: {
          id:           { type: "string", example: "p1" },
          slug:         { type: "string", example: "swayambhunath" },
          name:         { type: "string", example: "Swayambhunath" },
          tagline:      { type: "string" },
          heroImage:    $ref("Image"),
          category:     { type: "string", enum: ENUM_CATEGORY },
          tags:         { type: "array", items: { type: "string" } },
          districtId:   { type: "string", example: "d1" },
          difficulty:   { type: "string", enum: ENUM_DIFFICULTY, nullable: true },
          rating:       { type: "number", example: 4.7 },
          reviewCount:  { type: "integer", example: 1542 },
          budget:       $ref("BudgetEstimate"),
          trending:     { type: "boolean" }
        }
      },

      DestinationBundle: {
        type: "object",
        description: "Full destination detail page payload",
        required: ["destination", "reviews", "nearby", "ratingBreakdown", "similar", "nearbyAttractions"],
        properties: {
          destination:       $ref("Destination"),
          reviews:           arrayOf("Review"),
          nearby:            arrayOf("Destination"),
          ratingBreakdown:   { type: "array", items: $ref("RatingBreakdownItem"), description: "Approved-review count and percentage per star rating (1-5)" },
          similar:           arrayOf("Destination"),
          nearbyAttractions: arrayOf("TouristAttraction")
        }
      },

      DistrictDetail: {
        type: "object",
        description: "Full district tourism-hub payload — every piece of content scoped to this district in a single response.",
        properties: {
          district:        $ref("District"),
          cities:          arrayOf("City"),
          destinations:    arrayOf("Destination"),
          attractions:     arrayOf("TouristAttraction"),
          treks:           arrayOf("Trek"),
          festivals:       arrayOf("Festival"),
          guides:          arrayOf("GuideArticle"),
          reviews:         arrayOf("Review"),
          weather:         $ref("WeatherInsight"),
          nearbyDistricts: arrayOf("District"),
          recommended:     { ...arrayOf("Destination"), description: "Fallback destinations from same-province districts, only populated when this district has zero of its own" },
          counts: {
            type: "object",
            properties: {
              cityCount:        { type: "integer", example: 2 },
              destinationCount: { type: "integer", example: 3 },
              attractionCount:  { type: "integer", example: 10 }
            }
          }
        }
      },

      Review: {
        type: "object",
        properties: {
          id:               { type: "string", example: "r1" },
          destinationId:    { type: "string", example: "p1" },
          userId:           { type: "string", nullable: true, description: "Authenticated user who submitted the review; absent on legacy seed reviews", example: "u1" },
          author:           { type: "string", example: "Anisha Gurung" },
          avatar:           $ref("Image"),
          rating:           { type: "integer", minimum: 1, maximum: 5, example: 5 },
          title:            { type: "string", example: "Magical at sunrise" },
          body:             { type: "string" },
          date:             { type: "string", format: "date", example: "2026-03-12" },
          helpful:          { type: "integer", example: 42 },
          status:           { type: "string", enum: ENUM_REVIEW_STATUS, example: "approved" },
          photos:           { type: "array", items: $ref("Image"), maxItems: 5 },
          verifiedTraveler: { type: "boolean", example: true, description: "True when the reviewer had this destination in one of their trip plans (required to submit)" }
        }
      },

      TrekDay: {
        type: "object",
        properties: {
          day:      { type: "integer", example: 1 },
          title:    { type: "string", example: "Lukla to Phakding" },
          detail:   { type: "string" },
          altitude: { type: "integer", example: 2610, description: "Metres above sea level" },
          hours:    { type: "string", example: "3–4h" }
        }
      },

      Trek: {
        type: "object",
        properties: {
          id:           { type: "string", example: "tk1" },
          slug:         { type: "string", example: "everest-base-camp" },
          name:         { type: "string", example: "Everest Base Camp" },
          region:       { type: "string", example: "Khumbu" },
          districtIds:  { type: "array", items: { type: "string" }, description: "Districts this trek passes through", example: ["d3"] },
          tagline:      { type: "string" },
          description:  { type: "string" },
          heroImage:    $ref("Image"),
          gallery:      arrayOf("Image"),
          difficulty:   { type: "string", enum: ENUM_DIFFICULTY, example: "Challenging" },
          durationDays: { type: "integer", example: 14 },
          maxAltitude:  { type: "integer", example: 5364, description: "Metres above sea level" },
          distanceKm:   { type: "integer", example: 130 },
          bestSeasons:  { type: "array", items: { type: "string", enum: ENUM_SEASON } },
          permits:      { type: "array", items: { type: "string" } },
          highlights:   { type: "array", items: { type: "string" } },
          itinerary:    { type: "array", items: $ref("TrekDay") },
          coordinates:  $ref("Coordinates"),
          rating:       { type: "number", example: 4.9 },
          priceFrom:    { type: "number", example: 800, description: "USD per person" },
          featured:     { type: "boolean" }
        }
      },

      Festival: {
        type: "object",
        properties: {
          id:           { type: "string", example: "f1" },
          slug:         { type: "string", example: "dashain" },
          name:         { type: "string", example: "Dashain" },
          month:        { type: "string", example: "Sep–Oct" },
          season:       { type: "string", enum: ENUM_SEASON, example: "Autumn" },
          type:         { type: "string", enum: ENUM_FESTIVAL_TYPE, example: "Religious" },
          description:  { type: "string" },
          image:        $ref("Image"),
          where:        { type: "string", example: "Nationwide" },
          districtId:   { type: "string", nullable: true, description: "Absent/undefined when isNationwide is true", example: "d1" },
          isNationwide: { type: "boolean", example: true },
          duration:     { type: "string", example: "15 days" },
          coordinates:  $ref("Coordinates")
        }
      },

      TravelAlert: {
        type: "object",
        properties: {
          id:         { type: "string", example: "al1" },
          level:      { type: "string", enum: ENUM_ALERT_LEVEL, example: "Advisory" },
          text:       { type: "string", example: "Monsoon landslides can disrupt highland roads from June to August." },
          districtId: { type: "string", nullable: true, example: "d3" },
          isActive:   { type: "boolean", example: true }
        }
      },

      PackingChecklist: {
        type: "object",
        properties: {
          id:       { type: "string", example: "chk1" },
          category: { type: "string", enum: ENUM_CATEGORY, example: "Trekking" },
          items:    { type: "array", items: { type: "string" }, example: ["Sturdy trekking boots", "Trekking poles"] }
        }
      },

      GuideArticle: {
        type: "object",
        properties: {
          id:           { type: "string", example: "g1" },
          slug:         { type: "string", example: "altitude-sickness" },
          title:        { type: "string", example: "Surviving Altitude Sickness in Nepal" },
          excerpt:      { type: "string" },
          category:     { type: "string", enum: ENUM_GUIDE_CATEGORY, example: "Tips" },
          cover:        $ref("Image"),
          author:       { type: "string", example: "Emma Wilson" },
          authorAvatar: $ref("Image"),
          date:         { type: "string", format: "date", example: "2026-01-15" },
          readMinutes:  { type: "integer", example: 7 },
          tags:         { type: "array", items: { type: "string" } },
          body:         { type: "array", items: { type: "string" }, description: "Paragraphs of the article body" },
          featured:     { type: "boolean" },
          coordinates:  $ref("Coordinates"),
          districtId:   { type: "string", nullable: true, description: "Absent for general tips not tied to one place", example: "d1" }
        }
      },

      User: {
        type: "object",
        description: "Public-safe user object (password, refresh tokens and reset tokens never returned)",
        properties: {
          id:            { type: "string", example: "u1" },
          name:          { type: "string", example: "Pabitra Khadka" },
          email:         { type: "string", format: "email", example: "user@example.com" },
          avatar:        $ref("Image"),
          role:          { type: "string", enum: ENUM_ROLE, example: "user" },
          joinedAt:      { type: "string", format: "date", example: "2025-09-01" },
          lastLogin:     { type: "string", format: "date", example: "2026-06-01" },
          isActive:      { type: "boolean", example: true },
          wishlist:      { type: "array", items: { type: "string" }, description: "Wishlist destination IDs" }
        }
      },

      BudgetBreakdown: {
        type: "object",
        description: "Planned spend by category, in the trip's currency (informational — not validated against `budget`)",
        properties: {
          accommodation:  { type: "number", example: 150 },
          food:           { type: "number", example: 60  },
          transportation: { type: "number", example: 80  },
          activities:     { type: "number", example: 100 },
          other:          { type: "number", example: 20  }
        }
      },

      TripActivity: {
        type: "object",
        properties: {
          id:            { type: "string", example: "act1" },
          time:          { type: "string", example: "09:00" },
          title:         { type: "string", example: "Sunrise at Sarangkot" },
          type:          { type: "string", enum: ["destination", "attraction", "custom"], example: "destination" },
          destinationId: { type: "string", example: "p1" },
          notes:         { type: "string" }
        }
      },

      TripDay: {
        type: "object",
        properties: {
          id:         { type: "string", example: "day1" },
          day:        { type: "integer", example: 1 },
          date:       { type: "string", format: "date", example: "2026-08-01" },
          title:      { type: "string", example: "Arrival & Boudhanath" },
          activities: { type: "array", items: $ref("TripActivity") }
        }
      },

      ChecklistItem: {
        type: "object",
        properties: {
          id:        { type: "string", example: "chk-item-1" },
          text:      { type: "string", example: "Passport & visa copies" },
          completed: { type: "boolean", example: false },
          category:  { type: "string", example: "Documents" }
        }
      },

      TripPlan: {
        type: "object",
        properties: {
          id:              { type: "string", example: "t1" },
          userId:          { type: "string", example: "u1" },
          title:           { type: "string", example: "Kathmandu Heritage Weekend" },
          travelType:      { type: "string", enum: ENUM_TRAVEL_TYPE, example: "Cultural" },
          travelers:       { type: "integer", minimum: 1, example: 2 },
          destinationIds:  { type: "array", items: { type: "string" }, example: ["p1", "p2"] },
          startDate:       { type: "string", format: "date", example: "2026-08-01" },
          endDate:         { type: "string", format: "date", example: "2026-08-03" },
          budget:          { type: "number", example: 450, description: "Total budget in USD" },
          budgetBreakdown: $ref("BudgetBreakdown"),
          status:          { type: "string", enum: ENUM_TRIP_STATUS, example: "planned" },
          notes:           { type: "string", example: "Focus on UNESCO sites. Hire a guide for day 1." },
          itinerary:       { type: "array", items: $ref("TripDay") },
          checklist:       { type: "array", items: $ref("ChecklistItem") },
          photos:          { type: "array", items: $ref("Image"), maxItems: 20 }
        }
      },

      Booking: {
        type: "object",
        properties: {
          id:                   { type: "string", example: "bk1" },
          userId:                { type: "string", example: "u1" },
          destinationId:         { type: "string", example: "p1" },
          travelDate:            { type: "string", format: "date", example: "2026-09-15" },
          travelers:             { type: "integer", example: 2, minimum: 1 },
          budget:                { type: "number", example: 60000, description: "Traveller's stated budget in NPR" },
          accommodationType:     { type: "string", enum: ENUM_ACCOMMODATION, example: "Standard" },
          transportPreference:   { type: "string", enum: ENUM_TRANSPORT, example: "Private Jeep" },
          estimatedCost:         { type: "number", example: 20000, description: "Server-computed estimate (NPR), based on travelers × per-person accommodation and transport rates" },
          status:                { type: "string", enum: ENUM_BOOKING_STATUS, example: "pending" },
          notes:                 { type: "string", example: "Prefer a window seat if flying." },
          createdAt:             { type: "string", format: "date-time" },
          updatedAt:             { type: "string", format: "date-time" }
        }
      },

      AuthTokens: {
        type: "object",
        description: "Tokens returned after successful login or registration",
        required: ["token", "user"],
        properties: {
          token: {
            type: "string",
            description: "Short-lived JWT access token (default 15 min). Use as `Authorization: Bearer <token>`.",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
          },
          user: $ref("User")
        }
      },

      PublicStats: {
        type: "object",
        description: "Aggregate platform statistics visible to all visitors",
        properties: {
          destinations: { type: "integer", example: 10  },
          districts:    { type: "integer", example: 77  },
          reviews:      { type: "integer", example: 860 },
          users:        { type: "integer", example: 320 },
          avgRating:    { type: "number",  example: 4.7 }
        }
      },

      AdminAnalytics: {
        type: "object",
        description: "Admin dashboard analytics data",
        properties: {
          totalUsers:       { type: "integer", example: 320  },
          totalDestinations:{ type: "integer", example: 10   },
          totalReviews:     { type: "integer", example: 860  },
          totalTrips:       { type: "integer", example: 145  },
          pendingReviews:   { type: "integer", example: 12   },
          avgRating:        { type: "number",  example: 4.7  },
          userGrowthPct:    { type: "number",  nullable: true, example: 12.5, description: "MoM growth %; null if last month had 0 users" },
          userGrowth: {
            type: "array",
            description: "New users per month for the last 6 months",
            items: {
              type: "object",
              properties: {
                label: { type: "string", example: "Jan" },
                value: { type: "integer", example: 45 }
              }
            }
          },
          recentActivity: {
            type: "array",
            description: "Last 5 audit-log events",
            items: {
              type: "object",
              properties: {
                who:    { type: "string",  example: "Pabitra Khadka" },
                action: { type: "string",  example: "signed in" },
                time:   { type: "string",  format: "date-time" }
              }
            }
          }
        }
      },

      UserActivityEvent: {
        type: "object",
        description: "One entry in the authenticated user's activity feed — either a trip-plan milestone or a review they wrote",
        properties: {
          type:             { type: "string", enum: ["trip_planned", "trip_ongoing", "trip_completed", "review_written"], example: "review_written" },
          date:             { type: "string", format: "date", example: "2026-06-20" },
          tripTitle:        { type: "string", nullable: true, example: "Kathmandu Heritage Weekend" },
          destinationCount: { type: "integer", nullable: true, example: 3 },
          destinationName:  { type: "string", nullable: true, example: "Swayambhunath" },
          destinationSlug:  { type: "string", nullable: true, example: "swayambhunath" },
          rating:           { type: "integer", nullable: true, minimum: 1, maximum: 5, example: 5 }
        }
      },

      WishlistResponse: {
        type: "object",
        description: "`ids` can reference either Destinations or Attractions — both are resolved and returned separately.",
        properties: {
          ids:          { type: "array", items: { type: "string" }, example: ["p1", "a3"] },
          destinations: arrayOf("Destination"),
          attractions:  arrayOf("TouristAttraction")
        }
      },

      WishlistIds: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" }, example: ["p1", "p5"] }
        }
      },

      SearchResults: {
        type: "object",
        description: "Cross-content search results. Destinations are the primary, real-paginated section; the others are secondary preview lists capped comfortably above current collection sizes.",
        properties: {
          destinations:      arrayOf("Destination"),
          destinationsTotal: { type: "integer", example: 41, description: "Total matching destinations across all pages (independent of the other sections' counts)" },
          destinationsPage:  { type: "integer", example: 1 },
          destinationsLimit: { type: "integer", example: 24 },
          districts:         arrayOf("District"),
          attractions:       arrayOf("TouristAttraction"),
          treks:             arrayOf("Trek"),
          festivals:         arrayOf("Festival"),
          guides:            arrayOf("GuideArticle"),
          total:             { type: "integer", example: 63, description: "destinationsTotal + attractions.length + treks.length + festivals.length + guides.length" }
        }
      },

      CityBundle: {
        type: "object",
        description: "Single-city response with parent district and its destinations",
        properties: {
          city:         $ref("City"),
          district:     $ref("District"),
          destinations: arrayOf("Destination")
        }
      },

      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Operation completed successfully." }
        }
      }
    },

    // -- Reusable responses --------------------------------------------------
    responses: {
      BadRequest: {
        description: "400 Bad Request — missing or invalid input",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "email is required" } } }
      },
      Unauthorized: {
        description: "401 Unauthorized — missing, invalid or expired Bearer token",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Unauthorized" } } }
      },
      Forbidden: {
        description: "403 Forbidden — authenticated but insufficient role/ownership (admin required, or acting on another user's resource)",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Forbidden" } } }
      },
      NotFound: {
        description: "404 Not Found — the requested resource does not exist",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Resource not found" } } }
      },
      Conflict: {
        description: "409 Conflict — resource already exists (e.g. duplicate email, duplicate review, duplicate booking)",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "An account with that email already exists" } } }
      },
      InternalError: {
        description: "500 Internal Server Error",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Internal server error" } } }
      },
      BadGateway: {
        description: "502 Bad Gateway — the upstream Cloudinary upload service failed or timed out",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Image upload service is temporarily unavailable. Please try again shortly." } } }
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Paths
  // ─────────────────────────────────────────────────────────────────────────
  paths: {

    // ══════════════════════════════════════════════════════════════════════
    // STATS
    // ══════════════════════════════════════════════════════════════════════

    "/stats": {
      get: {
        tags: ["Stats"],
        summary: "Public platform statistics",
        description: "Returns aggregate counts shown in the hero section of the homepage: total destinations, districts, approved reviews, active users and average rating.",
        operationId: "getPublicStats",
        responses: {
          ...jsonResponse("Platform statistics", $ref("PublicStats")),
          500: r500
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // AUTH
    // ══════════════════════════════════════════════════════════════════════

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account",
        description: [
          "Creates a new user account with role `user` and immediately issues an access token + sets an `httpOnly` refresh token cookie.",
          "",
          "**Validation rules:**",
          "- `name` — required, minimum 2 characters",
          "- `email` — required, valid email format, must be unique",
          "- `password` — required, minimum 8 characters, plus at least one of: uppercase letter, number, symbol"
        ].join("\n"),
        operationId: "register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name:     { type: "string", minLength: 2,  example: "Pabitra Khadka" },
                  email:    { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", minLength: 8,  example: "SecurePass1!" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Account created. Access token and user returned.", $ref("AuthTokens"), 201),
          400: r400,
          409: r409,
          500: r500
        }
      }
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and receive a JWT access token",
        description: [
          "Authenticates the user and returns a **short-lived access token** (15 min) in the response body.",
          "A long-lived refresh token is set in an `httpOnly` cookie (`nepalyatra_rt`) and rotated on every call to `/auth/refresh`.",
          "",
          "The account is **temporarily locked** for 15 minutes after 5 consecutive failed login attempts.",
          "",
          "**Demo credentials:**",
          "- Admin: `admin@nepayatra.com` / `admin12345`",
          "- User: `aarav@example.com` / `password123`"
        ].join("\n"),
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email:      { type: "string", format: "email", example: "admin@nepayatra.com" },
                  password:   { type: "string", example: "admin12345" },
                  rememberMe: { type: "boolean", default: false, description: "Extends refresh token TTL from 7 days to 30 days." }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Login successful.", $ref("AuthTokens")),
          400: r400,
          401: r401,
          403: {
            description: "403 Forbidden — account has been deactivated",
            content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Your account has been deactivated. Contact support." } } }
          },
          423: {
            description: "423 Locked — account temporarily locked after too many failed attempts",
            content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Account temporarily locked. Try again in 14 minute(s)." } } }
          },
          500: r500
        }
      }
    },

    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new access token",
        description: [
          "The browser/client must send the `nepalyatra_rt` cookie (set automatically by the login response).",
          "The old refresh token is invalidated and a new one is issued — **token rotation** prevents replay attacks.",
          "Replaying an already-rotated token is treated as a signal of theft: every refresh token for that account is revoked, forcing a fresh login everywhere.",
          "Returns a fresh access token and updated user object."
        ].join("\n"),
        operationId: "refresh",
        responses: {
          ...jsonResponse("New access token issued.", $ref("AuthTokens")),
          401: r401,
          500: r500
        }
      }
    },

    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out — invalidate current session",
        description: "Clears the `nepalyatra_rt` cookie and removes the matching refresh token from the database, purely by cookie value — no valid (non-expired) access token is required, so a user with an expired access token can still log out cleanly.",
        operationId: "logout",
        responses: {
          ...jsonResponse("Logged out successfully.", $ref("MessageResponse")),
          500: r500
        }
      }
    },

    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Log out from all devices",
        description: "Invalidates **every** refresh token for the authenticated user, effectively terminating all active sessions on all devices.",
        operationId: "logoutAll",
        security: bearerSec,
        responses: {
          ...jsonResponse("Logged out from all devices.", $ref("MessageResponse")),
          401: r401,
          500: r500
        }
      }
    },

    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the currently authenticated user",
        description: "Returns the full user profile for the authenticated token. Useful for client-side hydration after page reload.",
        operationId: "getMe",
        security: bearerSec,
        responses: {
          ...jsonResponse("Current user profile.", $ref("User")),
          401: r401,
          404: r404
        }
      }
    },

    "/auth/profile": {
      patch: {
        tags: ["Auth"],
        summary: "Update display name and/or avatar",
        description: "Updates `name` and/or `avatar` for the authenticated user. At least one field must be provided. Replacing the avatar best-effort deletes the previous Cloudinary asset.",
        operationId: "updateProfile",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:   { type: "string", minLength: 2, example: "Pabitra Khadka" },
                  avatar: $ref("Image")
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Profile updated.", $ref("User")),
          400: r400,
          401: r401,
          404: r404
        }
      }
    },

    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password for the authenticated user",
        description: [
          "Verifies `currentPassword`, then replaces it with `newPassword`.",
          "**Side effect:** All refresh tokens (including the caller's own) are invalidated — the user is logged out everywhere and must log in again.",
          "",
          "**Rules:** `newPassword` must be at least 8 characters, plus at least one of: uppercase letter, number, symbol."
        ].join("\n"),
        operationId: "changePassword",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", example: "OldSecure1!" },
                  newPassword:     { type: "string", minLength: 8, example: "NewSecure2@" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Password changed. Please log in again.", $ref("MessageResponse")),
          400: r400,
          401: r401
        }
      }
    },

    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password-reset link",
        description: [
          "Sends a password-reset email to the provided address if an account exists (30-minute token expiry).",
          "The response is always the same message whether or not the email is found — this prevents email enumeration."
        ].join("\n"),
        operationId: "forgotPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email", example: "user@example.com" } }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Reset link sent (if email exists).", $ref("MessageResponse")),
          400: r400,
          500: r500
        }
      }
    },

    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using a reset token",
        description: "Consumes the one-time reset token (valid 30 min) obtained from the reset email. On success all existing sessions are terminated. `password` must be at least 8 characters, plus at least one of: uppercase letter, number, symbol.",
        operationId: "resetPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token:    { type: "string", example: "a3f8e…" },
                  password: { type: "string", minLength: 8, example: "FreshPass99!" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Password reset. You can now log in.", $ref("MessageResponse")),
          400: r400,
          500: r500
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // DISTRICTS
    // ══════════════════════════════════════════════════════════════════════

    "/districts": {
      get: {
        tags: ["Districts"],
        summary: "List all 77 districts (paginated)",
        description: "Returns Nepal districts sorted by province then name. `okPaginated` response — pass `page`/`limit` for real pagination, or omit both to receive the full collection (default limit comfortably covers all 77).",
        operationId: "listDistricts",
        parameters: paginationParams(100),
        responses: {
          ...jsonResponsePaginated("Page of districts.", "District"),
          500: r500
        }
      },
      post: {
        tags: ["Districts"],
        summary: "Create a district *(admin)*",
        operationId: "createDistrict",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $ref("District"),
              example: {
                id: "d99", slug: "test-district", name: "Test District", province: "Bagmati",
                description: "A test district.",
                heroImage: { url: "https://res.cloudinary.com/your-cloud-name/image/upload/v1/nepalyatra/districts/example.jpg", publicId: "nepalyatra/districts/example", alt: "Test District landscape" },
                coordinates: { lat: 27.7, lng: 85.3 }, cityCount: 0, destinationCount: 0,
                popularFor: [], rating: 0, bestSeason: "Autumn", attractionCount: 0
              }
            }
          }
        },
        responses: {
          ...jsonResponse("District created.", $ref("District"), 201),
          401: r401, 403: r403, 500: r500
        }
      }
    },

    "/districts/{slug}": {
      get: {
        tags: ["Districts"],
        summary: "Get a district's full tourism-hub payload",
        description: "Single-call aggregator: the district itself plus every destination/attraction/trek/festival/guide/review scoped to it, a live weather insight, same-province neighbouring districts, and (only when this district has no destinations of its own) a same-province recommended fallback list.",
        operationId: "getDistrict",
        parameters: [pathParam("slug", "District slug (kebab-case name)", "kathmandu")],
        responses: {
          ...jsonResponse("Full district detail payload.", $ref("DistrictDetail")),
          404: r404, 500: r500
        }
      }
    },

    "/districts/{id}": {
      put: {
        tags: ["Districts"],
        summary: "Update a district *(admin)*",
        description: "Replacing `slug` 409s if another district already uses it. Replacing `heroImage` best-effort deletes the previous Cloudinary asset.",
        operationId: "updateDistrict",
        security: bearerSec,
        parameters: [pathParam("id", "District ID", "d1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("District") } } },
        responses: {
          ...jsonResponse("Updated district.", $ref("District")),
          401: r401, 403: r403, 404: r404, 409: r409
        }
      },
      delete: {
        tags: ["Districts"],
        summary: "Delete a district *(admin)*",
        description: "Cascades: also deletes/detaches every city, destination, attraction, festival, guide, review, booking, wishlist entry and trip-plan reference scoped to this district, plus their Cloudinary images, since nothing in this schema uses ObjectId refs/populate.",
        operationId: "deleteDistrict",
        security: bearerSec,
        parameters: [pathParam("id", "District ID", "d1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // CITIES
    // ══════════════════════════════════════════════════════════════════════

    "/cities": {
      get: {
        tags: ["Cities"],
        summary: "List cities — filtered, single-city bundle, or all (paginated)",
        description: [
          "Behaviour depends on which query parameter is provided (checked in this order):",
          "1. `?city=<slug>` → returns `{ city, district, destinations }` for that city (plain envelope, not paginated)",
          "2. `?district=<slug>` → returns `City[]` for that district (plain envelope, not paginated)",
          "3. *(no params)* → returns a paginated page of all cities via `okPaginated`"
        ].join("\n"),
        operationId: "listCities",
        parameters: [
          { name: "district", in: "query", schema: { type: "string" }, example: "kathmandu", description: "Filter by district slug — returns City[]" },
          { name: "city",     in: "query", schema: { type: "string" }, example: "bhaktapur",  description: "Return single-city bundle" },
          ...paginationParams(300)
        ],
        responses: {
          200: {
            description: "City[] (filtered), a single-city bundle, or a paginated page of all cities.",
            content: {
              "application/json": {
                schema: { oneOf: [paginatedEnvelope("City"), envelope(arrayOf("City")), envelope($ref("CityBundle"))] }
              }
            }
          },
          404: r404
        }
      },
      post: {
        tags: ["Cities"],
        summary: "Create a city *(admin)*",
        operationId: "createCity",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("City") } } },
        responses: {
          ...jsonResponse("City created.", $ref("City"), 201),
          401: r401, 403: r403, 409: r409
        }
      }
    },

    "/cities/{id}": {
      put: {
        tags: ["Cities"],
        summary: "Update a city *(admin)*",
        operationId: "updateCity",
        security: bearerSec,
        parameters: [pathParam("id", "City ID", "c1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("City") } } },
        responses: {
          ...jsonResponse("Updated city.", $ref("City")),
          401: r401, 403: r403, 404: r404, 409: r409
        }
      },
      delete: {
        tags: ["Cities"],
        summary: "Delete a city *(admin)*",
        operationId: "deleteCity",
        security: bearerSec,
        parameters: [pathParam("id", "City ID", "c1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // ATTRACTIONS
    // ══════════════════════════════════════════════════════════════════════

    "/districts/{slug}/attractions": {
      get: {
        tags: ["Attractions"],
        summary: "List attractions for a specific district (paginated)",
        description: "Returns all tourist attractions that belong to the given district, sorted by rating descending. Supports optional category and text filters, plus pagination.",
        operationId: "listDistrictAttractions",
        parameters: [
          pathParam("slug", "District slug", "kathmandu"),
          { name: "category", in: "query", schema: { type: "string", enum: ENUM_ATTRACTION_CATEGORY }, description: "Filter by attraction category" },
          { name: "q",        in: "query", schema: { type: "string" }, example: "temple", description: "Case-insensitive name search" },
          ...paginationParams(350)
        ],
        responses: {
          ...jsonResponsePaginated("Page of attractions in the district, sorted by rating.", "TouristAttraction"),
          404: r404, 500: r500
        }
      }
    },

    "/attractions": {
      get: {
        tags: ["Attractions"],
        summary: "List attractions — filtered or all (paginated)",
        description: "Returns attractions with optional filters, sorted by rating descending.",
        operationId: "listAttractions",
        parameters: [
          { name: "district",  in: "query", schema: { type: "string" }, example: "d1", description: "Filter by districtId" },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_ATTRACTION_CATEGORY } },
          { name: "featured",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to featured only" },
          { name: "trending",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to trending only" },
          { name: "q",         in: "query", schema: { type: "string" }, example: "stupa", description: "Case-insensitive name search" },
          ...paginationParams(350)
        ],
        responses: {
          ...jsonResponsePaginated("Page of filtered attractions.", "TouristAttraction"),
          500: r500
        }
      },
      post: {
        tags: ["Attractions"],
        summary: "Create an attraction *(admin)*",
        operationId: "createAttraction",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $ref("TouristAttraction"),
              example: {
                slug: "pashupatinath-temple", districtId: "d1",
                name: "Pashupatinath Temple", category: "Religious Sites",
                tagline: "Nepal's holiest Hindu shrine",
                description: "One of the most sacred Hindu temples in Asia…",
                history: "The temple dates to at least the 5th century…",
                heroImage: { url: "https://res.cloudinary.com/your-cloud-name/image/upload/v1/nepalyatra/attractions/example.jpg", publicId: "nepalyatra/attractions/example", alt: "Pashupatinath Temple" },
                gallery: [], coordinates: { lat: 27.7109, lng: 85.3487 },
                openingHours: "4:00 AM – 9:00 PM",
                entryFee: { nepali: 0, saarc: 250, foreigner: 1000, currency: "NPR" },
                bestTimeToVisit: ["Autumn", "Winter"], activities: ["Temple worship", "Aarti ceremony"],
                localFoods: ["Sel roti", "Yomari"], travelTips: ["Non-Hindus cannot enter the main temple"],
                nearbyAttractions: [], nearbyHotels: [], nearbyRestaurants: [],
                featured: true, trending: true
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Attraction created.", $ref("TouristAttraction"), 201),
          401: r401, 403: r403
        }
      }
    },

    "/attractions/{slug}": {
      get: {
        tags: ["Attractions"],
        summary: "Get a single attraction with nearby attractions",
        description: "Returns the full attraction document plus a list of nearby attractions (resolved from `nearbyAttractions` ID array). Not paginated — a single document lookup.",
        operationId: "getAttraction",
        parameters: [pathParam("slug", "Attraction slug", "pashupatinath-temple")],
        responses: {
          ...jsonResponse("Attraction detail with nearby attractions.", $ref("AttractionBundle")),
          404: r404
        }
      }
    },

    "/attractions/{id}": {
      put: {
        tags: ["Attractions"],
        summary: "Update an attraction *(admin)*",
        operationId: "updateAttraction",
        security: bearerSec,
        parameters: [pathParam("id", "Attraction ID", "a1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("TouristAttraction") } } },
        responses: {
          ...jsonResponse("Updated attraction.", $ref("TouristAttraction")),
          401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Attractions"],
        summary: "Delete an attraction *(admin)*",
        operationId: "deleteAttraction",
        security: bearerSec,
        parameters: [pathParam("id", "Attraction ID", "a1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // DESTINATIONS
    // ══════════════════════════════════════════════════════════════════════

    "/destinations": {
      get: {
        tags: ["Destinations"],
        summary: "List destinations — filtered or all (paginated)",
        operationId: "listDestinations",
        parameters: [
          { name: "featured",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to featured only" },
          { name: "trending",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to trending only" },
          { name: "city",      in: "query", schema: { type: "string" }, example: "c1",       description: "Filter by cityId" },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_CATEGORY },  description: "Filter by category" },
          { name: "ids",       in: "query", schema: { type: "string" }, example: "p1,p2,p5", description: "Comma-separated destination IDs (used for nearby / wishlist resolution)" },
          ...paginationParams(200)
        ],
        responses: {
          ...jsonResponsePaginated("Page of destinations, sorted by rating.", "Destination"),
          500: r500
        }
      },
      post: {
        tags: ["Destinations"],
        summary: "Create a destination *(admin)*",
        operationId: "createDestination",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("Destination") } } },
        responses: {
          ...jsonResponse("Destination created.", $ref("Destination"), 201),
          401: r401, 403: r403
        }
      }
    },

    "/destinations/{slug}": {
      get: {
        tags: ["Destinations"],
        summary: "Get a destination's full detail-page payload",
        description: "Returns the destination plus its approved reviews, resolved nearby destinations, a star-rating breakdown, same-category similar destinations, and nearby attractions from the same district.",
        operationId: "getDestination",
        parameters: [pathParam("slug", "Destination slug", "swayambhunath")],
        responses: {
          ...jsonResponse("Destination detail bundle.", $ref("DestinationBundle")),
          404: r404
        }
      }
    },

    "/destinations/{slug}/weather-insight": {
      get: {
        tags: ["Destinations"],
        summary: "Live weather + best-time-to-visit advice for a destination",
        description: "Combines a live Open-Meteo current-conditions call (5s timeout, degrades gracefully to season-only advice if unreachable) with the destination's `bestTimeToVisit` seasons to produce a plain-language visiting recommendation.",
        operationId: "getDestinationWeatherInsight",
        parameters: [pathParam("slug", "Destination slug", "swayambhunath")],
        responses: {
          ...jsonResponse("Weather insight for this destination.", $ref("WeatherInsight")),
          404: r404
        }
      }
    },

    "/destinations/{id}": {
      put: {
        tags: ["Destinations"],
        summary: "Update a destination *(admin)*",
        operationId: "updateDestination",
        security: bearerSec,
        parameters: [pathParam("id", "Destination ID", "p1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("Destination") } } },
        responses: {
          ...jsonResponse("Updated destination.", $ref("Destination")),
          401: r401, 403: r403, 404: r404, 409: r409
        }
      },
      delete: {
        tags: ["Destinations"],
        summary: "Delete a destination *(admin)*",
        description: "Cascades: also cleans up reviews/bookings for this destination and removes it from any wishlist/trip-plan arrays that reference it.",
        operationId: "deleteDestination",
        security: bearerSec,
        parameters: [pathParam("id", "Destination ID", "p1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // TREKS
    // ══════════════════════════════════════════════════════════════════════

    "/treks": {
      get: {
        tags: ["Treks"],
        summary: "List treks — filtered or all (paginated)",
        operationId: "listTreks",
        parameters: [
          { name: "featured",   in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ENUM_DIFFICULTY } },
          ...paginationParams(100)
        ],
        responses: { ...jsonResponsePaginated("Page of treks.", "Trek"), 400: r400, 500: r500 }
      },
      post: {
        tags: ["Treks"],
        summary: "Create a trek *(admin)*",
        operationId: "createTrek",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("Trek") } } },
        responses: { ...jsonResponse("Trek created.", $ref("Trek"), 201), 401: r401, 403: r403, 409: r409 }
      }
    },

    "/treks/{slug}": {
      get: {
        tags: ["Treks"],
        summary: "Get a trek by slug",
        operationId: "getTrek",
        parameters: [pathParam("slug", "Trek slug", "everest-base-camp")],
        responses: { ...jsonResponse("Trek detail.", $ref("Trek")), 404: r404 }
      }
    },

    "/treks/{id}": {
      put: {
        tags: ["Treks"],
        summary: "Update a trek *(admin)*",
        operationId: "updateTrek",
        security: bearerSec,
        parameters: [pathParam("id", "Trek ID", "tk1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("Trek") } } },
        responses: { ...jsonResponse("Updated trek.", $ref("Trek")), 401: r401, 403: r403, 404: r404, 409: r409 }
      },
      delete: {
        tags: ["Treks"],
        summary: "Delete a trek *(admin)*",
        operationId: "deleteTrek",
        security: bearerSec,
        parameters: [pathParam("id", "Trek ID", "tk1")],
        responses: { ...jsonResponse("Deleted.", $ref("DeleteResult")), 401: r401, 403: r403, 404: r404 }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // FESTIVALS
    // ══════════════════════════════════════════════════════════════════════

    "/festivals": {
      get: {
        tags: ["Festivals"],
        summary: "List all festivals (paginated)",
        operationId: "listFestivals",
        parameters: paginationParams(100),
        responses: { ...jsonResponsePaginated("Page of festivals.", "Festival"), 500: r500 }
      },
      post: {
        tags: ["Festivals"],
        summary: "Create a festival *(admin)*",
        operationId: "createFestival",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("Festival") } } },
        responses: { ...jsonResponse("Festival created.", $ref("Festival"), 201), 401: r401, 403: r403 }
      }
    },

    "/festivals/{slug}": {
      get: {
        tags: ["Festivals"],
        summary: "Get a festival by slug",
        operationId: "getFestival",
        parameters: [pathParam("slug", "Festival slug", "dashain")],
        responses: { ...jsonResponse("Festival detail.", $ref("Festival")), 404: r404 }
      }
    },

    "/festivals/{id}": {
      put: {
        tags: ["Festivals"],
        summary: "Update a festival *(admin)*",
        operationId: "updateFestival",
        security: bearerSec,
        parameters: [pathParam("id", "Festival ID", "f1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("Festival") } } },
        responses: { ...jsonResponse("Updated.", $ref("Festival")), 401: r401, 403: r403, 404: r404 }
      },
      delete: {
        tags: ["Festivals"],
        summary: "Delete a festival *(admin)*",
        operationId: "deleteFestival",
        security: bearerSec,
        parameters: [pathParam("id", "Festival ID", "f1")],
        responses: { ...jsonResponse("Deleted.", $ref("DeleteResult")), 401: r401, 403: r403, 404: r404 }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // GUIDES
    // ══════════════════════════════════════════════════════════════════════

    "/guides": {
      get: {
        tags: ["Guides"],
        summary: "List guide articles — filtered or all (paginated)",
        operationId: "listGuides",
        parameters: [
          { name: "featured",  in: "query", schema: { type: "string" } },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_GUIDE_CATEGORY } },
          ...paginationParams(100)
        ],
        responses: { ...jsonResponsePaginated("Page of guide articles.", "GuideArticle"), 400: r400, 500: r500 }
      },
      post: {
        tags: ["Guides"],
        summary: "Create a guide article *(admin)*",
        operationId: "createGuide",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("GuideArticle") } } },
        responses: { ...jsonResponse("Guide created.", $ref("GuideArticle"), 201), 401: r401, 403: r403 }
      }
    },

    "/guides/{slug}": {
      get: {
        tags: ["Guides"],
        summary: "Get a guide article by slug",
        operationId: "getGuide",
        parameters: [pathParam("slug", "Guide slug", "altitude-sickness")],
        responses: { ...jsonResponse("Guide article.", $ref("GuideArticle")), 404: r404 }
      }
    },

    "/guides/{id}": {
      put: {
        tags: ["Guides"],
        summary: "Update a guide article *(admin)*",
        operationId: "updateGuide",
        security: bearerSec,
        parameters: [pathParam("id", "Guide ID", "g1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("GuideArticle") } } },
        responses: { ...jsonResponse("Updated.", $ref("GuideArticle")), 401: r401, 403: r403, 404: r404 }
      },
      delete: {
        tags: ["Guides"],
        summary: "Delete a guide article *(admin)*",
        operationId: "deleteGuide",
        security: bearerSec,
        parameters: [pathParam("id", "Guide ID", "g1")],
        responses: { ...jsonResponse("Deleted.", $ref("DeleteResult")), 401: r401, 403: r403, 404: r404 }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // REVIEWS
    // ══════════════════════════════════════════════════════════════════════

    "/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "List reviews — optionally filtered (paginated)",
        description: [
          "Visibility rules:",
          "- `?user=<yourOwnUserId>` (while authenticated as that user) → your own reviews at **any** status",
          "- Authenticated as **admin** → all reviews; optionally narrowed with `?status=`",
          "- Everyone else (including anonymous) → only `status: approved` reviews, regardless of `?status=`"
        ].join("\n"),
        operationId: "listReviews",
        parameters: [
          { name: "destination", in: "query", schema: { type: "string" }, example: "p1", description: "Filter by destinationId" },
          { name: "status",      in: "query", schema: { type: "string", enum: ENUM_REVIEW_STATUS }, description: "Admin-only filter; ignored for non-admin callers" },
          { name: "user",        in: "query", schema: { type: "string" }, example: "u1", description: "Return this user's own reviews at any status (only honoured when it matches the authenticated caller)" },
          ...paginationParams(200)
        ],
        responses: { ...jsonResponsePaginated("Page of reviews.", "Review"), 400: r400, 500: r500 }
      },
      post: {
        tags: ["Reviews"],
        summary: "Submit a traveller review",
        description: [
          "Saved with `status: pending` and must be approved by an admin before appearing publicly.",
          "",
          "**Rules:**",
          "- You may only review a destination that appears in one of your own trip plans (403 otherwise).",
          "- Only one review per user per destination (409 on a second attempt).",
          "- `author`/`avatar` are always taken from the authenticated user's profile — any client-supplied values are ignored."
        ].join("\n"),
        operationId: "createReview",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["destinationId", "rating"],
                properties: {
                  destinationId: { type: "string", example: "p1" },
                  rating:        { type: "integer", minimum: 1, maximum: 5, example: 5 },
                  title:         { type: "string", maxLength: 200,  example: "Magical at sunrise" },
                  body:          { type: "string", maxLength: 5000, example: "We climbed up before dawn and watched the valley wake up." },
                  photos:        { type: "array", items: $ref("Image"), maxItems: 5, description: "Already-uploaded images, e.g. via POST /upload/gallery with type=review" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Review submitted (pending approval).", $ref("Review"), 201),
          400: r400, 401: r401,
          403: {
            description: "403 Forbidden — destination is not part of any of your trip plans",
            content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "You can only review destinations that are part of one of your trip plans" } } }
          },
          409: r409
        }
      }
    },

    "/reviews/{id}/status": {
      patch: {
        tags: ["Reviews"],
        summary: "Moderate a review *(admin)*",
        description: "Approving or un-approving a review recalculates the parent destination's aggregate `rating` and `reviewCount` from all currently-approved reviews.",
        operationId: "moderateReview",
        security: bearerSec,
        parameters: [pathParam("id", "Review ID", "r1")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ENUM_REVIEW_STATUS } }
              },
              example: { status: "approved" }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated review.", $ref("Review")),
          400: r400, 401: r401, 403: r403, 404: r404
        }
      }
    },

    "/reviews/{id}": {
      patch: {
        tags: ["Reviews"],
        summary: "Edit your own review",
        description: "Author only (403 otherwise). Editing content resets `status` back to `pending` so the updated review is re-moderated before it's shown publicly again; also recalculates the parent destination's aggregate rating.",
        operationId: "updateReview",
        security: bearerSec,
        parameters: [pathParam("id", "Review ID", "r1")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
                  title:  { type: "string", maxLength: 200, example: "Updated: still great, but crowded in peak season" },
                  body:   { type: "string", maxLength: 5000 },
                  photos: { type: "array", items: $ref("Image"), maxItems: 5 }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated review (now pending re-approval).", $ref("Review")),
          400: r400, 401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Reviews"],
        summary: "Delete a review *(author or admin)*",
        description: "Also recalculates the parent destination's aggregate rating and reviewCount.",
        operationId: "deleteReview",
        security: bearerSec,
        parameters: [pathParam("id", "Review ID", "r1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    "/reviews/{id}/helpful": {
      post: {
        tags: ["Reviews"],
        summary: "Upvote a review as helpful",
        description: "Atomically increments the review's `helpful` counter by 1 — one vote per authenticated user, enforced server-side (a repeat call from the same user is a no-op that just returns the current count).",
        operationId: "voteHelpful",
        security: bearerSec,
        parameters: [pathParam("id", "Review ID", "r1")],
        responses: {
          ...jsonResponse("Updated helpful count.", {
            type: "object",
            properties: { helpful: { type: "integer", example: 43 } }
          }),
          401: r401, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // SEARCH
    // ══════════════════════════════════════════════════════════════════════

    "/search": {
      get: {
        tags: ["Search"],
        summary: "Cross-content full-text search",
        description: [
          "Searches destinations, districts, attractions, treks, festivals and guides simultaneously (case-insensitive regex on name/tagline/description/tags). All filters are optional and combinable; only `destinations` is truly paginated (`page`/`limit`) — the other sections are capped preview lists.",
          "",
          "A filter alone (no `q`) is enough to trigger a section's query where it makes sense — e.g. `categories=Trekking` or `difficulty=Easy` alone still searches treks."
        ].join("\n"),
        operationId: "search",
        parameters: [
          { name: "q",          in: "query", schema: { type: "string" },  example: "lake", description: "Full-text search term" },
          { name: "categories", in: "query", schema: { type: "string" },  example: "Adventure,Nature", description: "Comma-separated list of categories (legacy singular `category` param also accepted)" },
          { name: "district",   in: "query", schema: { type: "string" },  example: "d2", description: "Filter by districtId (applies to destinations and attractions)" },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ENUM_DIFFICULTY }, description: "Applies to destinations and treks" },
          { name: "season",     in: "query", schema: { type: "string", enum: ENUM_SEASON }, description: "Matches bestTimeToVisit/bestSeasons array membership; applies to destinations and treks" },
          { name: "minRating",  in: "query", schema: { type: "number" },  example: 4.0, description: "Applies to destinations and attractions" },
          { name: "maxBudget",  in: "query", schema: { type: "number" },  example: 5000, description: "Max destination budget/day in NPR" },
          { name: "sort",       in: "query", schema: { type: "string", enum: ENUM_SEARCH_SORT, default: "rating" } },
          ...paginationParams(24)
        ],
        responses: {
          ...jsonResponse("Search results across all content types.", $ref("SearchResults")),
          500: r500
        }
      }
    },

    "/search/popular": {
      get: {
        tags: ["Search"],
        summary: "Trending search suggestions",
        description: "Top destination, trek and district names derived from ratings/trending flags/popularity — powers the search page's suggestion chips. Deduplicated across content types.",
        operationId: "getPopularSearches",
        responses: {
          ...jsonResponse("List of trending names.", { type: "array", items: { type: "string" }, example: ["Everest Base Camp Trek", "Phewa Lake", "Kaski"] }),
          500: r500
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // RECOMMENDATIONS
    // ══════════════════════════════════════════════════════════════════════

    "/recommendations": {
      get: {
        tags: ["Recommendations"],
        summary: "Personalized destination recommendations",
        description: "Scores every destination not already wishlisted using a weighted blend of the user's wishlisted categories/tags/districts (35/20/20%), planned-trip and reviewed-destination signals (10/5%), and general popularity (10%). Results are cached in-memory per user for 5 minutes.",
        operationId: "getPersonalized",
        security: bearerSec,
        parameters: [
          { name: "viewed", in: "query", schema: { type: "string" }, example: "p3,p7", description: "Comma-separated recently-viewed destination IDs from client-side history (max 10), used to lightly boost district affinity" }
        ],
        responses: {
          ...jsonResponse("Up to 12 recommended destinations.", arrayOf("DestinationSummary")),
          401: r401, 404: r404
        }
      }
    },

    "/recommendations/similar/{slug}": {
      get: {
        tags: ["Recommendations"],
        summary: "Destinations similar to a given one",
        description: "Scores every other destination by shared category (40%), tag overlap (35%), same district (15%) and same difficulty (10%). Cached in-memory for 10 minutes per slug.",
        operationId: "getSimilar",
        parameters: [pathParam("slug", "Destination slug", "swayambhunath")],
        responses: {
          ...jsonResponse("Up to 6 similar destinations.", arrayOf("DestinationSummary")),
          404: r404
        }
      }
    },

    "/recommendations/trending": {
      get: {
        tags: ["Recommendations"],
        summary: "Currently trending destinations",
        description: "Destinations flagged `trending: true` or rated ≥ 4, ranked by rating weighted with review-count volume (`rating × log(reviewCount + 1)`). Cached in-memory for 15 minutes.",
        operationId: "getTrending",
        responses: {
          ...jsonResponse("Up to 8 trending destinations.", arrayOf("DestinationSummary")),
          500: r500
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // TRAVEL ALERTS
    // ══════════════════════════════════════════════════════════════════════

    "/contact": {
      post: {
        tags: ["Contact"],
        summary: "Submit a contact form message",
        description: "Public endpoint. The message is stored and a best-effort notification email is sent to the site's configured contact address.",
        operationId: "submitContactMessage",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "subject", "message"],
                properties: {
                  name: { type: "string", example: "Aayusha Rai" },
                  email: { type: "string", format: "email", example: "aayusha@example.com" },
                  subject: { type: "string", example: "Question about the Everest trek" },
                  message: { type: "string", example: "Hi, I'd like to know the best season to..." }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Message received.", { type: "object", properties: { id: { type: "string", example: "cm1a2b3c4d5e6f7g8" } } }, 201),
          400: r400,
          500: r500
        }
      }
    },

    "/travel-alerts": {
      get: {
        tags: ["Travel Alerts"],
        summary: "List travel alerts",
        description: "Public callers receive only active alerts; admins receive all by default (optionally filtered with `?active=true|false`).",
        operationId: "listTravelAlerts",
        parameters: [
          { name: "active", in: "query", schema: { type: "boolean" }, description: "Admin-only filter; ignored for non-admin callers" }
        ],
        responses: { ...jsonResponse("Travel alerts list, sorted by level.", arrayOf("TravelAlert")), 500: r500 }
      },
      post: {
        tags: ["Travel Alerts"],
        summary: "Create a travel alert *(admin)*",
        operationId: "createTravelAlert",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("TravelAlert") } } },
        responses: { ...jsonResponse("Alert created.", $ref("TravelAlert"), 201), 401: r401, 403: r403 }
      }
    },

    "/travel-alerts/{id}": {
      put: {
        tags: ["Travel Alerts"],
        summary: "Update a travel alert *(admin)*",
        operationId: "updateTravelAlert",
        security: bearerSec,
        parameters: [pathParam("id", "Travel alert ID", "al1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("TravelAlert") } } },
        responses: { ...jsonResponse("Updated.", $ref("TravelAlert")), 401: r401, 403: r403, 404: r404 }
      },
      delete: {
        tags: ["Travel Alerts"],
        summary: "Delete a travel alert *(admin)*",
        operationId: "deleteTravelAlert",
        security: bearerSec,
        parameters: [pathParam("id", "Travel alert ID", "al1")],
        responses: { ...jsonResponse("Deleted.", $ref("DeleteResult")), 401: r401, 403: r403, 404: r404 }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // CHECKLISTS
    // ══════════════════════════════════════════════════════════════════════

    "/checklists": {
      get: {
        tags: ["Checklists"],
        summary: "List all packing checklists",
        description: "One checklist per destination Category (e.g. Trekking, Cultural). Not paginated — the collection is inherently small (one per category).",
        operationId: "listPackingChecklists",
        responses: { ...jsonResponse("Checklists list.", arrayOf("PackingChecklist")), 500: r500 }
      },
      post: {
        tags: ["Checklists"],
        summary: "Create a packing checklist *(admin)*",
        operationId: "createPackingChecklist",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("PackingChecklist") } } },
        responses: { ...jsonResponse("Checklist created.", $ref("PackingChecklist"), 201), 401: r401, 403: r403 }
      }
    },

    "/checklists/{category}": {
      get: {
        tags: ["Checklists"],
        summary: "Get a packing checklist by category",
        operationId: "getPackingChecklist",
        parameters: [pathParam("category", "Destination category", "Trekking")],
        responses: { ...jsonResponse("Checklist detail.", $ref("PackingChecklist")), 404: r404 }
      }
    },

    "/checklists/{id}": {
      put: {
        tags: ["Checklists"],
        summary: "Update a packing checklist *(admin)*",
        operationId: "updatePackingChecklist",
        security: bearerSec,
        parameters: [pathParam("id", "Checklist ID", "chk1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("PackingChecklist") } } },
        responses: { ...jsonResponse("Updated.", $ref("PackingChecklist")), 401: r401, 403: r403, 404: r404 }
      },
      delete: {
        tags: ["Checklists"],
        summary: "Delete a packing checklist *(admin)*",
        operationId: "deletePackingChecklist",
        security: bearerSec,
        parameters: [pathParam("id", "Checklist ID", "chk1")],
        responses: { ...jsonResponse("Deleted.", $ref("DeleteResult")), 401: r401, 403: r403, 404: r404 }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // PLANNER
    // ══════════════════════════════════════════════════════════════════════

    "/planner": {
      get: {
        tags: ["Planner"],
        summary: "Get the authenticated user's trip plans",
        description: "Not paginated — scoped to the caller's own trips only, sorted by start date ascending.",
        operationId: "listTrips",
        security: bearerSec,
        responses: {
          ...jsonResponse("List of trip plans.", arrayOf("TripPlan")),
          401: r401
        }
      },
      post: {
        tags: ["Planner"],
        summary: "Create a trip plan",
        operationId: "createTrip",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title:           { type: "string", example: "Kathmandu Heritage Weekend" },
                  travelType:      { type: "string", enum: ENUM_TRAVEL_TYPE, default: "Adventure" },
                  travelers:       { type: "integer", minimum: 1, default: 1 },
                  destinationIds:  { type: "array", items: { type: "string" }, example: ["p1", "p2", "p4"] },
                  startDate:       { type: "string", format: "date", example: "2026-08-01" },
                  endDate:         { type: "string", format: "date", example: "2026-08-03" },
                  budget:          { type: "number", example: 450, description: "Total budget in USD" },
                  budgetBreakdown: $ref("BudgetBreakdown"),
                  status:          { type: "string", enum: ENUM_TRIP_STATUS, default: "draft" },
                  notes:           { type: "string", example: "Focus on UNESCO sites. Hire a guide for day 1." },
                  itinerary:       { type: "array", items: $ref("TripDay") },
                  checklist:       { type: "array", items: $ref("ChecklistItem") },
                  photos:          { type: "array", items: $ref("Image"), maxItems: 20 }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Trip plan created.", $ref("TripPlan"), 201),
          400: r400, 401: r401
        }
      }
    },

    "/planner/{id}": {
      put: {
        tags: ["Planner"],
        summary: "Update a trip plan",
        description: "Scoped to the caller's own trip (a mismatched id/owner 404s, never leaks another user's trip). Replacing `photos` best-effort deletes any Cloudinary assets no longer referenced.",
        operationId: "updateTrip",
        security: bearerSec,
        parameters: [pathParam("id", "Trip plan ID", "t1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("TripPlan") } } },
        responses: {
          ...jsonResponse("Updated trip plan.", $ref("TripPlan")),
          400: r400, 401: r401, 404: r404
        }
      },
      delete: {
        tags: ["Planner"],
        summary: "Delete a trip plan",
        description: "Best-effort deletes any Cloudinary assets referenced by the trip's `photos`.",
        operationId: "deleteTrip",
        security: bearerSec,
        parameters: [pathParam("id", "Trip plan ID", "t1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // BOOKINGS
    // ══════════════════════════════════════════════════════════════════════

    "/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "Get the authenticated user's bookings (paginated)",
        operationId: "listBookings",
        security: bearerSec,
        parameters: paginationParams(100),
        responses: {
          ...jsonResponsePaginated("Page of the caller's own bookings, sorted by travel date.", "Booking"),
          401: r401
        }
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a booking",
        description: "`estimatedCost` is always computed server-side as `travelers × (accommodation rate + transport rate)` — any client-supplied value is ignored. `travelDate` must be today or later. A second non-cancelled booking for the same destination within 7 days of an existing one is rejected (409) — edit or cancel the existing booking instead.",
        operationId: "createBooking",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["destinationId", "travelDate"],
                properties: {
                  destinationId:        { type: "string", example: "p1" },
                  travelDate:           { type: "string", format: "date", example: "2026-09-15" },
                  travelers:            { type: "integer", example: 2, minimum: 1, default: 1 },
                  budget:               { type: "number", example: 60000, description: "Traveller's stated budget in NPR — informational only, does not affect estimatedCost" },
                  accommodationType:    { type: "string", enum: ENUM_ACCOMMODATION, default: "Standard" },
                  transportPreference:  { type: "string", enum: ENUM_TRANSPORT, default: "Local Bus" },
                  notes:                { type: "string", maxLength: 500, example: "Prefer a window seat if flying." }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Booking created with status 'pending'.", $ref("Booking"), 201),
          400: r400, 401: r401, 404: r404,
          409: {
            description: "409 Conflict — you already have a non-cancelled booking for this destination within 7 days of this travel date",
            content: { "application/json": { schema: $ref("Error") } }
          }
        }
      }
    },

    "/bookings/{id}": {
      patch: {
        tags: ["Bookings"],
        summary: "Cancel your own booking",
        description: "Self-service: a user may only set `status` to `cancelled` on their **own** booking (403 for any other status — moving a booking to `confirmed` is admin-only via `PATCH /admin/bookings/{id}`).",
        operationId: "updateBookingStatus",
        security: bearerSec,
        parameters: [pathParam("id", "Booking ID", "bk1")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["cancelled"], example: "cancelled" } }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated booking.", $ref("Booking")),
          401: r401, 404: r404,
          403: {
            description: "403 Forbidden — users may only cancel their own booking, not set any other status",
            content: { "application/json": { schema: $ref("Error"), example: { success: false, error: 'You can only cancel your own booking (status must be "cancelled")' } } }
          }
        }
      },
      delete: {
        tags: ["Bookings"],
        summary: "Delete your own booking",
        operationId: "deleteBooking",
        security: bearerSec,
        parameters: [pathParam("id", "Booking ID", "bk1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 404: r404
        }
      }
    },

    "/admin/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List every user's bookings *(admin)*",
        description: "Admin oversight endpoint — without this, users could self-confirm their own bookings with no review. Optional `status` filter.",
        operationId: "adminListBookings",
        security: bearerSec,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ENUM_BOOKING_STATUS } },
          ...paginationParams(50)
        ],
        responses: {
          ...jsonResponsePaginated("Page of all bookings across all users, sorted by travel date.", "Booking"),
          400: r400, 401: r401, 403: r403
        }
      }
    },

    "/admin/bookings/{id}": {
      patch: {
        tags: ["Bookings"],
        summary: "Update any booking's status *(admin)*",
        description: "The only way a booking can be moved to `confirmed`. Transitioning to `confirmed` or `cancelled` sends the traveler a best-effort notification email.",
        operationId: "adminUpdateBookingStatus",
        security: bearerSec,
        parameters: [pathParam("id", "Booking ID", "bk1")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ENUM_BOOKING_STATUS, example: "confirmed" } }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated booking.", $ref("Booking")),
          400: r400, 401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Bookings"],
        summary: "Delete any user's booking *(admin)*",
        operationId: "adminDeleteBooking",
        security: bearerSec,
        parameters: [pathParam("id", "Booking ID", "bk1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // WISHLIST
    // ══════════════════════════════════════════════════════════════════════

    "/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Get the authenticated user's wishlist",
        description: "Items can be Destinations or Attractions. Self-heals: if a wishlisted item was since deleted, its id is silently dropped from the stored list on read.",
        operationId: "getWishlist",
        security: bearerSec,
        responses: {
          ...jsonResponse("Wishlist with resolved destination and attraction objects.", $ref("WishlistResponse")),
          401: r401
        }
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add a destination or attraction to the wishlist",
        description: "`destinationId` accepts either a Destination or an Attraction id (field name kept for backward compatibility). Uses MongoDB `$addToSet` — duplicate additions are silently ignored. Capped at 500 items per user.",
        operationId: "addToWishlist",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["destinationId"],
                properties: { destinationId: { type: "string", example: "p1", description: "A Destination or Attraction id" } }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated wishlist IDs.", $ref("WishlistIds")),
          400: r400, 401: r401, 404: r404
        }
      }
    },

    "/wishlist/{destinationId}": {
      delete: {
        tags: ["Wishlist"],
        summary: "Remove a destination or attraction from the wishlist",
        operationId: "removeFromWishlist",
        security: bearerSec,
        parameters: [pathParam("destinationId", "Destination ID to remove", "p1")],
        responses: {
          ...jsonResponse("Updated wishlist IDs.", $ref("WishlistIds")),
          401: r401, 404: r404
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // MEDIA (uploads)
    // ══════════════════════════════════════════════════════════════════════

    "/upload/image": {
      post: {
        tags: ["Media"],
        summary: "Upload a single image to Cloudinary",
        description: [
          "Accepts `multipart/form-data` with one file field named `image` (JPG/PNG/WEBP only, size-limited by `MAX_UPLOAD_SIZE_MB`).",
          "",
          `\`type\` selects the destination Cloudinary folder and must be one of: ${ENUM_UPLOAD_TYPE.join(", ")}.`,
          "Content-management types (district/city/destination-*/attraction-*/trek-*/festival/guide-*) require **admin**; `avatar`/`review`/`planner` are open to any authenticated user."
        ].join("\n"),
        operationId: "uploadSingleImage",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image", "type"],
                properties: {
                  image: { type: "string", format: "binary" },
                  type:  { type: "string", enum: ENUM_UPLOAD_TYPE, example: "review" },
                  alt:   { type: "string", maxLength: 200, example: "Sunrise over Phewa Lake" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Uploaded image metadata.", $ref("Image"), 201),
          400: r400, 401: r401, 403: r403, 502: r502
        }
      },
      delete: {
        tags: ["Media"],
        summary: "Delete an uploaded image from Cloudinary *(admin)*",
        operationId: "deleteUploadedImage",
        security: bearerSec,
        parameters: [
          { name: "publicId", in: "query", required: true, schema: { type: "string" }, example: "nepalyatra/reviews/abc123", description: "The Cloudinary publicId to destroy" }
        ],
        responses: {
          ...jsonResponse("Deletion confirmation.", {
            type: "object",
            properties: { publicId: { type: "string" }, deleted: { type: "boolean", example: true } }
          }),
          400: r400, 401: r401, 403: r403
        }
      }
    },

    "/upload/gallery": {
      post: {
        tags: ["Media"],
        summary: "Upload multiple images to Cloudinary",
        description: "Accepts `multipart/form-data` with up to 8 files under the field name `images`. Same `type` permission rules as `POST /upload/image`.",
        operationId: "uploadGalleryImages",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["images", "type"],
                properties: {
                  images: { type: "array", items: { type: "string", format: "binary" }, maxItems: 8 },
                  type:   { type: "string", enum: ENUM_UPLOAD_TYPE, example: "destination-gallery" },
                  alt:    { type: "string", maxLength: 200, description: "Applied to every uploaded image in this batch" }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Uploaded image metadata for each file.", arrayOf("Image"), 201),
          400: r400, 401: r401, 403: r403, 502: r502
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ══════════════════════════════════════════════════════════════════════

    "/dashboard/activity": {
      get: {
        tags: ["Dashboard"],
        summary: "The authenticated user's recent activity feed",
        description: "Merges their last 20 trip-plan milestones (planned/ongoing/completed) with their last 10 reviews into a single feed, sorted by date descending and capped to 15 entries.",
        operationId: "getUserActivity",
        security: bearerSec,
        responses: {
          ...jsonResponse("Up to 15 recent activity events.", arrayOf("UserActivityEvent")),
          401: r401
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // ADMIN
    // ══════════════════════════════════════════════════════════════════════

    "/admin/analytics": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard analytics *(admin)*",
        description: [
          "Returns a comprehensive analytics snapshot for the admin dashboard:",
          "- Aggregate counts (users, destinations, reviews, trips)",
          "- Pending review count for moderation queue",
          "- 6-month user growth trend",
          "- Month-over-month growth percentage",
          "- Last 5 audit log events with human-readable descriptions"
        ].join("\n"),
        operationId: "getAdminAnalytics",
        security: bearerSec,
        responses: {
          ...jsonResponse("Admin analytics.", $ref("AdminAnalytics")),
          401: r401, 403: r403
        }
      }
    },

    "/users": {
      get: {
        tags: ["Admin"],
        summary: "List all users *(admin)*",
        description: "Returns user accounts sorted by join date descending. `okPaginated` response.",
        operationId: "listUsers",
        security: bearerSec,
        parameters: paginationParams(500),
        responses: {
          ...jsonResponsePaginated("Page of users.", "User"),
          401: r401, 403: r403
        }
      }
    },

    "/users/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get a user by ID *(admin)*",
        operationId: "getUser",
        security: bearerSec,
        parameters: [pathParam("id", "User ID", "u1")],
        responses: {
          ...jsonResponse("User profile.", $ref("User")),
          401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a user *(admin)*",
        description: "An admin cannot delete their own account through this endpoint (400).",
        operationId: "deleteUser",
        security: bearerSec,
        parameters: [pathParam("id", "User ID", "u1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          400: r400, 401: r401, 403: r403, 404: r404
        }
      }
    },

    "/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Change a user's role *(admin)*",
        description: "Promotes a user to `admin` or demotes an admin to `user`. You cannot change your own role (400).",
        operationId: "updateUserRole",
        security: bearerSec,
        parameters: [pathParam("id", "User ID", "u1")],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: { role: { type: "string", enum: ENUM_ROLE } }
              },
              example: { role: "admin" }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated user.", $ref("User")),
          400: r400, 401: r401, 403: r403, 404: r404
        }
      }
    }
  }
} as const;
