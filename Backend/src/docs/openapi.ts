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

/** Short-hand for a 200/201 application/json response */
const jsonResponse = (description: string, dataSchema: object, status = 200) => ({
  [status]: { description, content: { "application/json": { schema: envelope(dataSchema) } } }
});

/** Reusable $ref response short-hands */
const r400 = { $ref: "#/components/responses/BadRequest" } as const;
const r401 = { $ref: "#/components/responses/Unauthorized" } as const;
const r403 = { $ref: "#/components/responses/Forbidden" } as const;
const r404 = { $ref: "#/components/responses/NotFound" } as const;
const r409 = { $ref: "#/components/responses/Conflict" } as const;
const r500 = { $ref: "#/components/responses/InternalError" } as const;

/** Bearer-JWT security requirement */
const bearerSec = [{ bearerAuth: [] }];

/** Path parameter short-hand */
const pathParam = (name: string, description: string, example: string) => ({
  name, in: "path", required: true,
  description,
  schema: { type: "string" },
  example
});

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
const ENUM_TRIP_STATUS    = ["planned", "ongoing", "completed"];
const ENUM_ROLE           = ["user", "admin"];
const ENUM_GUIDE_CATEGORY = ["Tips", "Itineraries", "Culture", "Food", "Trekking"];
const ENUM_FESTIVAL_TYPE  = ["Religious", "Cultural", "Harvest", "National"];

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
      "### Response envelope",
      "Every endpoint returns `{ success: boolean, data: T }`. On error the shape is `{ success: false, error: string }`.",
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
    { name: "Search",       description: "Cross-content full-text search" },
    { name: "Planner",      description: "Personal trip planner (requires auth)" },
    { name: "Wishlist",     description: "Personal wishlist (requires auth)" },
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

      ValidationError: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Validation failed" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Invalid email address" }
              }
            }
          }
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

      // ---- Domain schemas ----
      District: {
        type: "object",
        description: "One of Nepal's 77 administrative districts",
        properties: {
          id:             { type: "string", example: "d1" },
          slug:           { type: "string", example: "kathmandu" },
          name:           { type: "string", example: "Kathmandu" },
          province:       { type: "string", example: "Bagmati" },
          description:    { type: "string", example: "Nepal's vibrant capital district…" },
          heroImage:      { type: "string", format: "uri", example: "https://images.unsplash.com/photo-xxx" },
          coordinates:    $ref("Coordinates"),
          cityCount:      { type: "integer", example: 2 },
          destinationCount:{ type: "integer", example: 3 },
          attractionCount:{ type: "integer", example: 10 },
          popularFor:     { type: "array", items: { type: "string" }, example: ["Heritage", "Temples"] },
          rating:         { type: "number", example: 4.8 },
          bestSeason:     { type: "string", example: "Autumn" }
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
          image:           { type: "string", format: "uri" },
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
          heroImage:         { type: "string", format: "uri" },
          gallery:           { type: "array", items: { type: "string", format: "uri" } },
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
          heroImage:       { type: "string", format: "uri" },
          gallery:         { type: "array", items: { type: "string", format: "uri" } },
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
          trending:        { type: "boolean" }
        }
      },

      DestinationBundle: {
        type: "object",
        description: "Full destination detail with reviews and nearby destinations",
        required: ["destination", "reviews", "nearby"],
        properties: {
          destination: $ref("Destination"),
          reviews:     arrayOf("Review"),
          nearby:      arrayOf("Destination")
        }
      },

      Review: {
        type: "object",
        properties: {
          id:            { type: "string", example: "r1" },
          destinationId: { type: "string", example: "p1" },
          author:        { type: "string", example: "Anisha Gurung" },
          avatar:        { type: "string", format: "uri" },
          rating:        { type: "integer", minimum: 1, maximum: 5, example: 5 },
          title:         { type: "string", example: "Magical at sunrise" },
          body:          { type: "string" },
          date:          { type: "string", format: "date", example: "2026-03-12" },
          helpful:       { type: "integer", example: 42 },
          status:        { type: "string", enum: ENUM_REVIEW_STATUS, example: "approved" }
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
          tagline:      { type: "string" },
          description:  { type: "string" },
          heroImage:    { type: "string", format: "uri" },
          gallery:      { type: "array", items: { type: "string", format: "uri" } },
          difficulty:   { type: "string", enum: ENUM_DIFFICULTY, example: "Challenging" },
          durationDays: { type: "integer", example: 14 },
          maxAltitude:  { type: "integer", example: 5364, description: "Metres above sea level" },
          distanceKm:   { type: "integer", example: 130 },
          bestSeasons:  { type: "array", items: { type: "string", enum: ENUM_SEASON } },
          permits:      { type: "array", items: { type: "string" } },
          highlights:   { type: "array", items: { type: "string" } },
          itinerary:    { type: "array", items: $ref("TrekDay") },
          rating:       { type: "number", example: 4.9 },
          priceFrom:    { type: "number", example: 800, description: "USD per person" },
          featured:     { type: "boolean" }
        }
      },

      Festival: {
        type: "object",
        properties: {
          id:          { type: "string", example: "f1" },
          slug:        { type: "string", example: "dashain" },
          name:        { type: "string", example: "Dashain" },
          month:       { type: "string", example: "Sep–Oct" },
          season:      { type: "string", enum: ENUM_SEASON, example: "Autumn" },
          type:        { type: "string", enum: ENUM_FESTIVAL_TYPE, example: "Religious" },
          description: { type: "string" },
          image:       { type: "string", format: "uri" },
          where:       { type: "string", example: "Nationwide" },
          duration:    { type: "string", example: "15 days" }
        }
      },

      GuideArticle: {
        type: "object",
        properties: {
          id:          { type: "string", example: "g1" },
          slug:        { type: "string", example: "altitude-sickness" },
          title:       { type: "string", example: "Surviving Altitude Sickness in Nepal" },
          excerpt:     { type: "string" },
          category:    { type: "string", enum: ENUM_GUIDE_CATEGORY, example: "Tips" },
          cover:       { type: "string", format: "uri" },
          author:      { type: "string", example: "Emma Wilson" },
          authorAvatar:{ type: "string", format: "uri" },
          date:        { type: "string", format: "date", example: "2026-01-15" },
          readMinutes: { type: "integer", example: 7 },
          tags:        { type: "array", items: { type: "string" } },
          body:        { type: "array", items: { type: "string" }, description: "Paragraphs of the article body" },
          featured:    { type: "boolean" }
        }
      },

      User: {
        type: "object",
        description: "Public-safe user object (password never returned)",
        properties: {
          id:            { type: "string", example: "u1" },
          name:          { type: "string", example: "Pabitra Khadka" },
          email:         { type: "string", format: "email", example: "user@example.com" },
          avatar:        { type: "string", format: "uri" },
          role:          { type: "string", enum: ENUM_ROLE, example: "user" },
          joinedAt:      { type: "string", format: "date", example: "2025-09-01" },
          lastLogin:     { type: "string", format: "date", example: "2026-06-01" },
          emailVerified: { type: "boolean", example: true },
          isActive:      { type: "boolean", example: true },
          wishlist:      { type: "array", items: { type: "string" }, description: "Wishlist destination IDs" }
        }
      },

      TripPlan: {
        type: "object",
        properties: {
          id:             { type: "string", example: "t1" },
          userId:         { type: "string", example: "u1" },
          title:          { type: "string", example: "Kathmandu Heritage Weekend" },
          destinationIds: { type: "array", items: { type: "string" }, example: ["p1", "p2"] },
          startDate:      { type: "string", format: "date", example: "2026-08-01" },
          endDate:        { type: "string", format: "date", example: "2026-08-03" },
          budget:         { type: "number", example: 450, description: "Total budget in USD" },
          status:         { type: "string", enum: ENUM_TRIP_STATUS, example: "planned" },
          notes:          { type: "string", example: "Focus on UNESCO sites. Hire a guide for day 1." }
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

      WishlistResponse: {
        type: "object",
        properties: {
          ids:          { type: "array", items: { type: "string" }, example: ["p1", "p5"] },
          destinations: arrayOf("Destination")
        }
      },

      WishlistIds: {
        type: "object",
        properties: {
          destinationIds: { type: "array", items: { type: "string" }, example: ["p1", "p5"] }
        }
      },

      SearchResults: {
        type: "object",
        properties: {
          destinations: arrayOf("Destination"),
          districts:    arrayOf("District"),
          cities:       arrayOf("City"),
          total:        { type: "integer", example: 7 }
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

      DistrictBundle: {
        type: "object",
        description: "Single-district response with its cities",
        properties: {
          district: $ref("District"),
          cities:   arrayOf("City")
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
        content: { "application/json": { schema: $ref("ValidationError") } }
      },
      Unauthorized: {
        description: "401 Unauthorized — missing, invalid or expired Bearer token",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Unauthorized" } } }
      },
      Forbidden: {
        description: "403 Forbidden — authenticated but insufficient role (admin required)",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Forbidden" } } }
      },
      NotFound: {
        description: "404 Not Found — the requested resource does not exist",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Resource not found" } } }
      },
      Conflict: {
        description: "409 Conflict — resource already exists (e.g. duplicate email)",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "An account with that email already exists" } } }
      },
      InternalError: {
        description: "500 Internal Server Error",
        content: { "application/json": { schema: $ref("Error"), example: { success: false, error: "Internal server error" } } }
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
          "- `password` — required, minimum 8 characters"
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
          "A long-lived refresh token is set in an `httpOnly` cookie (`nepayatra_rt`) and rotated on every call to `/auth/refresh`.",
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
          "The browser/client must send the `nepayatra_rt` cookie (set automatically by the login response).",
          "The old refresh token is invalidated and a new one is issued — **token rotation** prevents replay attacks.",
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
        description: "Clears the `nepayatra_rt` cookie and removes the current refresh token from the database. The access token remains valid until expiry (by design — keep TTL short).",
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
        description: "Updates `name` and/or `avatar` for the authenticated user. At least one field must be provided.",
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
                  avatar: { type: "string", format: "uri", example: "https://i.pravatar.cc/150?img=25" }
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
          "**Side effect:** All other refresh tokens are invalidated — the user is logged out on all other devices.",
          "",
          "**Rules:** `newPassword` must be at least 8 characters."
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
          "Sends a password-reset email to the provided address if an account exists.",
          "The response is always the same message whether or not the email is found — this prevents email enumeration.",
          "",
          "In non-production environments the `devResetToken` field is included in the response for easy testing."
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
          ...jsonResponse("Reset link sent (if email exists).", {
            type: "object",
            properties: {
              message: { type: "string", example: "If that email exists, a password reset link has been sent." },
              devResetToken: { type: "string", description: "Only present in non-production. Use in /auth/reset-password." }
            }
          }),
          400: r400,
          500: r500
        }
      }
    },

    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using a reset token",
        description: "Consumes the one-time reset token (valid 30 min) obtained from the reset email. On success all existing sessions are terminated.",
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
        summary: "List all 77 districts",
        description: "Returns all Nepal districts sorted by province and name. No filters — use the search endpoint for filtering.",
        operationId: "listDistricts",
        responses: {
          ...jsonResponse("Array of all districts.", arrayOf("District")),
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
                description: "A test district.", heroImage: "https://images.unsplash.com/photo-xxx",
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
        summary: "Get a district with its cities",
        operationId: "getDistrict",
        parameters: [pathParam("slug", "District slug (kebab-case name)", "kathmandu")],
        responses: {
          ...jsonResponse("District and its cities.", $ref("DistrictBundle")),
          404: r404, 500: r500
        }
      }
    },

    "/districts/{id}": {
      put: {
        tags: ["Districts"],
        summary: "Update a district *(admin)*",
        operationId: "updateDistrict",
        security: bearerSec,
        parameters: [pathParam("id", "District ID", "d1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("District") } } },
        responses: {
          ...jsonResponse("Updated district.", $ref("District")),
          401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Districts"],
        summary: "Delete a district *(admin)*",
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
        summary: "List cities — filtered or all",
        description: [
          "Behaviour depends on which query parameter is provided:",
          "- `?city=<slug>` → returns `{ city, district, destinations }` for that city",
          "- `?district=<slug>` → returns `City[]` for that district",
          "- *(no params)* → returns all cities"
        ].join("\n"),
        operationId: "listCities",
        parameters: [
          { name: "district", in: "query", schema: { type: "string" }, example: "kathmandu", description: "Filter by district slug" },
          { name: "city",     in: "query", schema: { type: "string" }, example: "bhaktapur",  description: "Return single-city bundle" }
        ],
        responses: {
          ...jsonResponse("City[] or single-city bundle.", {
            oneOf: [arrayOf("City"), $ref("CityBundle")]
          }),
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
          401: r401, 403: r403
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
          401: r401, 403: r403, 404: r404
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
        summary: "List attractions for a specific district",
        description: "Returns all tourist attractions that belong to the given district, sorted by rating descending. Supports optional category and text filters.",
        operationId: "listDistrictAttractions",
        parameters: [
          pathParam("slug", "District slug", "kathmandu"),
          { name: "category", in: "query", schema: { type: "string", enum: ENUM_ATTRACTION_CATEGORY }, description: "Filter by attraction category" },
          { name: "q",        in: "query", schema: { type: "string" }, example: "temple", description: "Case-insensitive name search" }
        ],
        responses: {
          ...jsonResponse("Attractions in the district sorted by rating.", arrayOf("TouristAttraction")),
          404: r404, 500: r500
        }
      }
    },

    "/attractions": {
      get: {
        tags: ["Attractions"],
        summary: "List attractions — filtered or all",
        description: "Returns attractions with optional filters. Results sorted by rating descending.",
        operationId: "listAttractions",
        parameters: [
          { name: "district",  in: "query", schema: { type: "string" }, example: "d1", description: "Filter by districtId" },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_ATTRACTION_CATEGORY } },
          { name: "featured",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to featured only" },
          { name: "trending",  in: "query", schema: { type: "string" }, description: "Any truthy value to filter to trending only" },
          { name: "q",         in: "query", schema: { type: "string" }, example: "stupa", description: "Case-insensitive name search" }
        ],
        responses: {
          ...jsonResponse("Filtered list of attractions.", arrayOf("TouristAttraction")),
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
                heroImage: "https://images.unsplash.com/photo-xxx",
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
        description: "Returns the full attraction document plus a list of nearby attractions (resolved from `nearbyAttractions` ID array).",
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
        summary: "List destinations — filtered or all",
        operationId: "listDestinations",
        parameters: [
          { name: "featured",  in: "query", schema: { type: "string" }, description: "Return only featured destinations" },
          { name: "trending",  in: "query", schema: { type: "string" }, description: "Return only trending destinations" },
          { name: "city",      in: "query", schema: { type: "string" }, example: "c1",       description: "Filter by cityId" },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_CATEGORY },  description: "Filter by category" },
          { name: "ids",       in: "query", schema: { type: "string" }, example: "p1,p2,p5", description: "Comma-separated destination IDs (used for nearby / wishlist resolution)" }
        ],
        responses: {
          ...jsonResponse("Destinations list.", arrayOf("Destination")),
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
        summary: "Get a destination with approved reviews and nearby places",
        operationId: "getDestination",
        parameters: [pathParam("slug", "Destination slug", "swayambhunath")],
        responses: {
          ...jsonResponse("Destination detail bundle.", $ref("DestinationBundle")),
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
          401: r401, 403: r403, 404: r404
        }
      },
      delete: {
        tags: ["Destinations"],
        summary: "Delete a destination *(admin)*",
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
        summary: "List treks — filtered or all",
        operationId: "listTreks",
        parameters: [
          { name: "featured",   in: "query", schema: { type: "string" } },
          { name: "difficulty", in: "query", schema: { type: "string", enum: ENUM_DIFFICULTY } }
        ],
        responses: { ...jsonResponse("Treks list.", arrayOf("Trek")), 500: r500 }
      },
      post: {
        tags: ["Treks"],
        summary: "Create a trek *(admin)*",
        operationId: "createTrek",
        security: bearerSec,
        requestBody: { required: true, content: { "application/json": { schema: $ref("Trek") } } },
        responses: { ...jsonResponse("Trek created.", $ref("Trek"), 201), 401: r401, 403: r403 }
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
        responses: { ...jsonResponse("Updated trek.", $ref("Trek")), 401: r401, 403: r403, 404: r404 }
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
        summary: "List all festivals",
        operationId: "listFestivals",
        responses: { ...jsonResponse("Festivals list.", arrayOf("Festival")), 500: r500 }
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
        summary: "List guide articles — filtered or all",
        operationId: "listGuides",
        parameters: [
          { name: "featured",  in: "query", schema: { type: "string" } },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_GUIDE_CATEGORY } }
        ],
        responses: { ...jsonResponse("Guide articles.", arrayOf("GuideArticle")), 500: r500 }
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
        summary: "List reviews — optionally filtered",
        operationId: "listReviews",
        parameters: [
          { name: "destination", in: "query", schema: { type: "string" }, example: "p1",        description: "Filter by destinationId" },
          { name: "status",      in: "query", schema: { type: "string", enum: ENUM_REVIEW_STATUS }, description: "Filter by moderation status" }
        ],
        responses: { ...jsonResponse("Reviews list.", arrayOf("Review")), 500: r500 }
      },
      post: {
        tags: ["Reviews"],
        summary: "Submit a traveller review",
        description: "Anyone can submit a review. It is saved with `status: pending` and must be approved by an admin before appearing publicly.",
        operationId: "createReview",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["destinationId"],
                properties: {
                  destinationId: { type: "string", example: "p1" },
                  author:        { type: "string", example: "Emma Wilson" },
                  avatar:        { type: "string", format: "uri" },
                  rating:        { type: "integer", minimum: 1, maximum: 5, example: 5 },
                  title:         { type: "string", example: "Magical at sunrise" },
                  body:          { type: "string", example: "We climbed up before dawn and watched the valley wake up." }
                }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Review submitted (pending approval).", $ref("Review"), 201),
          400: r400, 401: r401
        }
      }
    },

    "/reviews/{id}/status": {
      patch: {
        tags: ["Reviews"],
        summary: "Moderate a review *(admin)*",
        description: "Approving a review recalculates the parent destination's aggregate rating and `reviewCount`.",
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
      delete: {
        tags: ["Reviews"],
        summary: "Delete a review *(admin)*",
        operationId: "deleteReview",
        security: bearerSec,
        parameters: [pathParam("id", "Review ID", "r1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
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
        description: "Searches destinations, districts and cities simultaneously. All filters are optional and combinable.",
        operationId: "search",
        parameters: [
          { name: "q",         in: "query", schema: { type: "string" },  example: "lake", description: "Full-text search term" },
          { name: "category",  in: "query", schema: { type: "string", enum: ENUM_CATEGORY } },
          { name: "district",  in: "query", schema: { type: "string" },  example: "d2", description: "Filter by districtId" },
          { name: "minRating", in: "query", schema: { type: "number" },  example: 4.0 },
          { name: "maxBudget", in: "query", schema: { type: "number" },  example: 50,  description: "Max budget/day in USD" },
          { name: "sort",      in: "query", schema: { type: "string", enum: ["rating", "reviews", "price-low", "price-high"] } }
        ],
        responses: {
          ...jsonResponse("Search results across all content types.", $ref("SearchResults")),
          500: r500
        }
      }
    },

    // ══════════════════════════════════════════════════════════════════════
    // PLANNER
    // ══════════════════════════════════════════════════════════════════════

    "/planner": {
      get: {
        tags: ["Planner"],
        summary: "Get the authenticated user's trip plans",
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
              schema: $ref("TripPlan"),
              example: {
                title: "Kathmandu Heritage Weekend",
                destinationIds: ["p1", "p2", "p4"],
                startDate: "2026-08-01", endDate: "2026-08-03",
                budget: 450, status: "planned",
                notes: "Focus on UNESCO sites. Hire a guide for day 1."
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Trip plan created.", $ref("TripPlan"), 201),
          401: r401
        }
      }
    },

    "/planner/{id}": {
      put: {
        tags: ["Planner"],
        summary: "Update a trip plan",
        operationId: "updateTrip",
        security: bearerSec,
        parameters: [pathParam("id", "Trip plan ID", "t1")],
        requestBody: { required: true, content: { "application/json": { schema: $ref("TripPlan") } } },
        responses: {
          ...jsonResponse("Updated trip plan.", $ref("TripPlan")),
          401: r401, 404: r404
        }
      },
      delete: {
        tags: ["Planner"],
        summary: "Delete a trip plan",
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
    // WISHLIST
    // ══════════════════════════════════════════════════════════════════════

    "/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "Get the authenticated user's wishlist",
        operationId: "getWishlist",
        security: bearerSec,
        responses: {
          ...jsonResponse("Wishlist with resolved destination objects.", $ref("WishlistResponse")),
          401: r401
        }
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add a destination to the wishlist",
        description: "Uses MongoDB `$addToSet` — duplicate additions are silently ignored.",
        operationId: "addToWishlist",
        security: bearerSec,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["destinationId"],
                properties: { destinationId: { type: "string", example: "p1" } }
              }
            }
          }
        },
        responses: {
          ...jsonResponse("Updated wishlist IDs.", $ref("WishlistIds")),
          400: r400, 401: r401
        }
      }
    },

    "/wishlist/{destinationId}": {
      delete: {
        tags: ["Wishlist"],
        summary: "Remove a destination from the wishlist",
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
        description: "Returns all user accounts sorted by join date descending.",
        operationId: "listUsers",
        security: bearerSec,
        responses: {
          ...jsonResponse("All users.", arrayOf("User")),
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
        operationId: "deleteUser",
        security: bearerSec,
        parameters: [pathParam("id", "User ID", "u1")],
        responses: {
          ...jsonResponse("Delete confirmation.", $ref("DeleteResult")),
          401: r401, 403: r403, 404: r404
        }
      }
    },

    "/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Change a user's role *(admin)*",
        description: "Promotes a user to `admin` or demotes an admin to `user`. You cannot change your own role.",
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
