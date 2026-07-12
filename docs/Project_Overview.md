# Project Overview

## NepaYatra — District-Based Smart Travel Guide and Destination Finder System

---

## 1. Introduction

**NepaYatra** ("Nepal Journey") is a full-stack web platform for discovering and planning travel across Nepal, organised around the country's **77 administrative districts** as the primary unit of navigation. Instead of treating Nepal as a single, undifferentiated destination (as most global travel platforms do), NepaYatra structures every piece of tourism content — destinations, attractions, treks, festivals, and local guides — under the district it belongs to, and layers practical planning tools (interactive map, live weather, travel alerts, packing checklists, trip planner, wishlist, and guide booking) on top.

The system is built as two independent applications in one repository:

- **`Backend/`** — a REST API (Node.js, Express, MongoDB/Mongoose, JWT auth, Cloudinary, Swagger/OpenAPI docs)
- **`Frontend/`** — a Next.js 15 / React 19 client application

---

## 2. Problem Statement

1. **Fragmentation** — Nepal tourism information is scattered across blogs, outdated government pages, and social media, with no single structured source organised at district granularity.
2. **Poor discoverability of local expertise** — licensed local guides and district-specific festivals/treks are hard to find and rarely presented alongside the destinations they serve.
3. **Disconnected planning** — existing resources are read-only; they don't connect discovery (browsing) to action (planning, saving, booking, checking live conditions).

## 3. Target Users

- International and domestic leisure tourists planning trips to Nepal
- Trekkers needing route-, season-, and district-specific information
- Local tour guides seeking visibility within their home district
- Platform administrators / tourism content managers curating the catalogue

---

## 4. Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 4 |
| Database | MongoDB (Mongoose 8 ODM) |
| Auth | JWT (access + refresh tokens), bcryptjs password hashing |
| File storage | Cloudinary (images) via Multer uploads |
| Email | Nodemailer (verification, password reset) |
| Validation | Zod schemas |
| Security | Helmet, CORS, express-rate-limit, cookie-parser |
| Docs | Swagger UI / OpenAPI (`swagger-ui-express`) |
| Testing | Vitest + Supertest + mongodb-memory-server |

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS (custom Nepal-tourism brand palette) |
| State | Zustand (auth, wishlist, UI, settings stores) |
| Data fetching | TanStack React Query |
| Forms | react-hook-form + zod resolvers |
| Maps | Leaflet, react-leaflet, react-leaflet-cluster, leaflet.heat |
| Animation | Framer Motion |
| Icons | lucide-react |
| Testing | Vitest + Testing Library (React) |

---

## 5. System Architecture

```
┌─────────────────────────┐        REST API (JSON)        ┌──────────────────────────┐
│   Frontend (Next.js)     │  <───────────────────────────▶ │   Backend (Express API)  │
│  App Router, Zustand,    │        JWT (access/refresh      │  Controllers → Services  │
│  React Query, Leaflet    │        via httpOnly cookies)    │  → Mongoose Models       │
└─────────────────────────┘                                  └───────────┬──────────────┘
                                                                          │
                                              ┌───────────────────────────┼───────────────────────┐
                                              ▼                          ▼                       ▼
                                        MongoDB Atlas              Cloudinary                Open-Meteo
                                     (districts, users,          (image storage/           (live weather
                                    destinations, treks, …)       CDN delivery)                 API)
```

Route groups in the frontend use Next.js **route groups** to separate concerns without affecting the URL:

- `(public)` — home, districts, destinations, attractions, treks, festivals, guides, search, map, weather, FAQ, about, contact
- `(auth)` — login, register, forgot/reset password
- `(user)` — dashboard, wishlist, trip planner, booking, profile, settings, tracking
- `(admin)` — CRUD dashboards for every content type, booking oversight, users, review moderation

---

## 6. Core Domain Model

| Model | Purpose |
|---|---|
| **District** | 77 districts — id, slug, province, coordinates, popular-for tags, rating, best season |
| **City** | Cities/towns within a district |
| **Destination** | Named places to visit, linked to a district |
| **Attraction** | Points of interest linked to a district |
| **Trek** | Trekking routes, linked to a district (with `coordinates`) |
| **Festival** | District-specific cultural festivals (with `coordinates`) |
| **Guide** | Verified local tour guides, linked to a district (with `coordinates`) |
| **Review** | User-submitted ratings/reviews on content items |
| **Booking** | Guide booking requests and their lifecycle (pending/confirmed/cancelled) |
| **TripPlan** | User-assembled multi-day itineraries |
| **TravelAlert** | Admin-managed safety/travel notices |
| **PackingChecklist** | Admin-managed seasonal/category packing lists |
| **User** | Accounts — traveller, guide, or admin roles |
| **AuditLog** | Tracks administrative actions for accountability |

All content models that represent a physical place carry a `coordinates` field so they can be rendered on the interactive map.

---

## 7. Key Features

### Discovery
- District-first browsing: province → district → destinations/attractions/treks/festivals/guides, aggregated into one district page
- Global search across all content types, with popular-searches derived from real usage data
- Interactive Leaflet map: marker clustering, category filters, heatmap toggle, province overlay layer

### Planning
- Trip planner for assembling multi-day itineraries
- Wishlist (save-for-later) with authenticated sync across devices
- Live weather (Open-Meteo integration) per destination
- Admin-managed travel alerts and seasonal packing checklists

### Trust & Transactions
- Verified local guide profiles, tied to their home district
- Guide booking flow with status tracking (pending → confirmed/cancelled)
- Real user reviews and ratings surfaced as testimonials

### Accounts & Security
- JWT access + refresh token authentication with rotation
- Email verification and password reset via Nodemailer
- Brute-force protection via rate limiting on auth endpoints
- Role-based route guards (traveller / guide / admin)

### Admin Panel
- Full CRUD across all six content types (destinations, treks, festivals, guides, attractions, districts) via a shared CRUD factory pattern
- Booking oversight dashboard, review moderation, user management
- Public stats and analytics (real data, not mocked)

---

## 8. API Design

The backend exposes a versioned REST API documented via **Swagger/OpenAPI** (served at a `/api-docs` style endpoint). Endpoints are grouped as:

- **Public reads** — `/districts`, `/destinations`, `/attractions`, `/treks`, `/festivals`, `/guides`, `/reviews`, `/search`, `/travel-alerts`, `/checklists`, `/recommendations`, `/stats` — protected only by a generous public rate limiter (sized to survive a full static-site build of 600+ pages)
- **Auth** — `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/profile`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password` — protected by a strict rate limiter
- **Authenticated actions** — reviews creation, wishlist, trip planner, personalised recommendations, bookings
- **Admin-only** — content CRUD, upload, user management, moderation

Cross-cutting middleware: `requireAuth`, `requireAdmin`, `optionalAuth` (auth.ts), centralised error handling (error.ts), and file-upload handling via Multer (upload.ts).

---

## 9. Data & Content Operations

- Static seed data for all 77 districts (each with unique, verified imagery) loadable via `npm run seed`
- All content images migrated to **Cloudinary** (upload/replace/delete), removing all external image dependencies
- Cascading deletes handled via a dedicated `cascade.service.ts` so removing a district/parent entity cleans up dependent records
- A district aggregation endpoint returns destinations, treks, festivals, guides, and weather for a district in a single call, reducing client-side round trips

---

## 10. Testing & Quality

- **Backend**: Vitest + Supertest against an in-memory MongoDB (`mongodb-memory-server`); covers auth and destinations flows
- **Frontend**: Vitest + React Testing Library; covers booking client flow and review-writing flow
- **Type safety**: strict TypeScript on both frontend and backend (`typecheck` script in both)
- **Production build**: verified to complete cleanly across 650/650 static pages after fixing ESLint and null-safety issues

---

## 11. Design System

A bespoke Nepal-tourism brand palette replaces generic "travel-app blue":

- **Everest Blue** — primary, trust/stability
- **Mountain Sky** — secondary, openness
- **Himalayan Sunrise** — warm accent
- **Temple Gold** — high-emphasis call-to-action (e.g., "Book Now", "Save")

A supporting **category-colour system** assigns one consistent colour per content type (destination, trek, festival, guide, review) so users can recognise content type by colour alone. Shared UI components (cards, filter chips, badges, modals, form fields) ensure consistent presentation across all content types.

---

## 12. Development Methodology

The project followed an **Agile Scrum** process, with requirements evolving from iterative user research and testing rather than a fixed upfront specification. Representative sprint themes:

1. Core authentication and district data modelling
2. Destination/trek/festival/guide catalogue and search
3. Interactive map
4. Wishlist, trip planner, and booking flows
5. Admin CRUD and analytics dashboard
6. Production-readiness pass (Cloudinary migration, accessibility/build fixes, first automated test suites)

Tooling: **Trello** (sprint board), **GitHub** (version control), **Figma/FigJam** (UI design and research artefacts).

*(See `docs/UX_Design_Report.md` for the full UX research, competitor analysis, heuristic evaluation, and UX-laws mapping.)*

---

## 13. Notable Engineering Decisions & Fixes

- Consolidated per-district content into a single aggregated API/view instead of separate tabs, cutting navigation cost
- Added verified-guide badges and review counts after user testing showed hesitation to book without trust signals
- Fixed a cross-account localStorage leak in the wishlist feature (stale hearts on other devices, toggle race conditions)
- Fixed shared `ImageUploader` component destructively deleting Cloudinary images on replace/remove before Save/Cancel
- Replaced all static/hardcoded frontend data with live API-backed data (stats, weather, analytics, reviews-as-testimonials)

---

## 14. Future Improvements

- Undo affordances for destructive actions (e.g., wishlist removal)
- First-use onboarding tooltips for the map and trip planner
- Expanded accessibility testing
- Personalised recommendations based on wishlist and booking history as real usage data accumulates
