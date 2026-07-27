# 🏔️ NepaYatra — District-Based Smart Travel Guide & Destination Finder

A production-ready Nepal tourism platform built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Zustand** and **TanStack Query**. NepaYatra lets travellers explore Nepal through a clean hierarchy — **District → City → Destination** — with travel guides, trip planning, wishlists, reviews, weather, an interactive map, a user dashboard and a full admin panel.

> Design inspired by Airbnb, Google Travel, Booking.com and TripAdvisor — premium, spacious and investor-ready.

---

## ✨ Features

**Public**
- Immersive landing page (hero, smart search, featured districts, trending destinations, categories, seasonal guide, testimonials, stats, newsletter, CTAs)
- District listing + district detail (→ cities)
- City listing (search / filter / sort / grid–list toggle) + city detail (→ destinations)
- **Destination Travel Guide** (the flagship page): gallery slider, overview, best time, budget tiers, attractions, activities, restaurants, local foods, travel tips, pros & cons, weather widget, mini-map, reviews preview, save & share, nearby destinations
- Global search with filters (category, district, rating, budget) and sorting
- Interactive Map Explorer with destination markers + sidebar
- Reviews page with rating breakdown and a create-review form
- Editorial "About Nepal" page, Weather & Seasonal guide, and a mock Booking preview

**Auth** — Split-layout login, registration (with password-strength meter), forgot password (OTP concept), reset password (success states)

**User dashboard** — Welcome banner, analytics, trips, quick actions, recently viewed · Wishlist (collections, persisted) · Notion-style Trip Planner (day-wise itinerary, budget, notes) · Travel Tracking timeline · Profile · Settings (tabbed)

**Admin panel** — Separate layout with analytics dashboard (stat cards, user-growth chart, popular destinations, activity log) and CRUD management for Districts, Cities, Destinations, plus Review moderation and User management

**System states** — Empty states, skeleton loaders, 404, 500 and loading screens throughout

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom design system |
| UI | Shadcn-style primitives (Button, Card, Badge, Input, …) |
| Animation | Framer Motion |
| Icons | lucide-react |
| State | Zustand (wishlist, UI) — persisted |
| Data fetching | TanStack Query + typed API client |
| Forms | React Hook Form + Zod |
| Backend | Next.js API Routes (JSON) |
| Deploy | Vercel · Docker-ready |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary | `#1E3A5F` |
| Secondary | `#4DA8DA` |
| Accent | `#FF914D` |
| Success | `#3FA34D` |
| Background | `#F8FAFC` |
| Text | `#1F2937` |
| Fonts | Inter (body), Poppins (display) |

Glassmorphism, soft shadows, rounded corners, sticky nav, smooth scroll and scroll-reveal animations are applied throughout.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (public)/        landing, districts, cities, destinations, search, map, reviews, about, weather, booking
│   ├── (auth)/          login, register, forgot-password, reset-password
│   ├── (user)/          dashboard, wishlist, planner, tracking, profile, settings
│   ├── (admin)/         admin dashboard + districts/cities/destinations/reviews/users
│   ├── api/             districts, cities, destinations, reviews, search (REST routes)
│   ├── layout.tsx · globals.css · loading.tsx · error.tsx · not-found.tsx
├── components/  ui · shared · cards · forms · maps · dashboard · providers
├── features/    (route-group feature folders)
├── data/        seed data (districts, cities, destinations, reviews, weather, users)
├── services/    api-client + content services
├── hooks/       React Query hooks
├── store/       Zustand stores
├── types/       domain types
└── lib/         utils + api helpers
```

---


## 🆕 Production Enhancement Pass

**Refined editorial design system** — Himalayan topographic line motif (`TopoLines`), mountain-range section dividers, a prayer-flag accent, gradient-mesh section backgrounds (`mesh-light` / `mesh-brand`), a larger editorial type scale and a `.kicker` eyebrow style. Cards, navbar (with an Explore mega-menu) and footer were all re-polished.

**Curated imagery** — all photography is centralised in `src/data/images.ts` and assigned per destination/district/city with topically-accurate, varied shots and per-destination galleries. Swap to Cloudinary in one file for production.

**New pages added**
- `/treks` + `/treks/[slug]` — trekking routes with difficulty/altitude/distance facts, day-by-day itinerary timeline, permits and highlights (6 routes seeded).
- `/festivals` — Nepal's festival calendar (8 festivals).
- `/guides` + `/guides/[slug]` — travel-guide listing with featured article + full article template (5 articles).
- `/faq` — grouped accordion help centre.
- `/contact` — info cards + contact form with success state.

New API routes: `/api/treks`, `/api/treks/[slug]`, `/api/festivals`, `/api/guides`.

## 🚀 Getting Started

```bash
npm install          # install dependencies
npm run dev          # start dev server → http://localhost:3000
npm run build        # production build
npm start            # serve production build
npm run typecheck    # TypeScript check
```

### Environment

Copy `.env.example` → `.env.local` and fill in values (Mapbox token, JWT secret, Postgres URL, Cloudinary). The scaffold runs fully on seed data without any of these set.

### Docker

```bash
docker build -t nepayatra .
docker run -p 3000:3000 nepayatra
```

---

## 🔌 API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/districts` | All districts |
| GET | `/api/districts/[slug]` | District + its cities |
| GET | `/api/cities?district=&city=` | Cities (or one city + destinations) |
| GET | `/api/destinations?featured=&trending=&city=&category=` | Filtered destinations |
| GET | `/api/destinations/[slug]` | Destination + reviews + nearby |
| GET / POST | `/api/reviews?destination=` | List / create reviews |
| GET | `/api/search?q=&category=&district=&minRating=&maxBudget=&sort=` | Global search |

All responses follow `{ success: boolean, data | error }`.

---

## 🗺️ Notes & Next Steps

- **Data** is served from typed seed files via API routes — swap the `services/content.ts` layer for a Postgres/Prisma data source to go live.
- **Maps** use a lightweight SVG projection so the scaffold renders with no API key; wire `NEXT_PUBLIC_MAPBOX_TOKEN` into `MapWidget` for real tiles.
- **Auth** flows are UI-complete with mock submission — connect to JWT auth + role-based middleware for production.
- **Fonts** load via `<link>` for offline/sandbox builds; switch to `next/font/google` in environments with network access if preferred.

Built for a final-year project, SaaS MVP, portfolio piece, or real deployment. 🇳🇵
