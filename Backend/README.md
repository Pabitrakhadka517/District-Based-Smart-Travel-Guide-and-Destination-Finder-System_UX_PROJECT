# NepalYatra API

Node.js + Express + MongoDB (Mongoose) backend for the **NepalYatra** Next.js frontend.
Written in TypeScript. Every endpoint returns a `{ success, data }` envelope (errors:
`{ success: false, error }`) so it is a drop-in backend for the frontend's
`apiGet` / `apiPost` client.

## Quick start

```bash
npm install
cp .env.example .env          # then edit MONGODB_URI / JWT_SECRET
# Make sure MongoDB is running locally (or set MONGODB_URI to Atlas)
npm run seed                  # load all frontend content into MongoDB
npm run dev                   # http://localhost:5000
```

- API base: `http://localhost:5000/api`
- Interactive docs (Swagger UI): `http://localhost:5000/docs`
- OpenAPI JSON: `http://localhost:5000/api/openapi.json`
- Health check: `http://localhost:5000/health`

### Connect the frontend

In the Next.js app set:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

CORS is enabled for `CORS_ORIGIN` (default `http://localhost:3000`).

## Scripts

| Script            | Description                                  |
|-------------------|----------------------------------------------|
| `npm run dev`     | Start with hot reload (tsx watch)            |
| `npm run build`   | Compile TypeScript to `dist/`                |
| `npm start`       | Run the compiled server                      |
| `npm run seed`    | Reset & load all content into MongoDB        |
| `npm run typecheck` | Type-check without emitting                |

## Seeded demo accounts

| Role  | Email                   | Password     |
|-------|-------------------------|--------------|
| Admin | admin@nepayatra.com     | admin12345   |
| User  | aarav@example.com       | password123  |

## Endpoints

### Public (read)
- `GET /api/districts` · `GET /api/districts/:slug` → `{ district, cities }`
- `GET /api/cities` (`?district=` | `?city=` → `{ city, district, destinations }`)
- `GET /api/destinations` (`?featured= &trending= &city= &category=`)
- `GET /api/destinations/:slug` → `{ destination, reviews, nearby }`
- `GET /api/treks` (`?featured= &difficulty=`) · `GET /api/treks/:slug`
- `GET /api/festivals` · `GET /api/festivals/:slug`
- `GET /api/guides` (`?featured= &category=`) · `GET /api/guides/:slug`
- `GET /api/reviews` (`?destination= &status=`) · `POST /api/reviews` (creates a pending review)
- `GET /api/search` (`?q= &category= &district= &minRating= &maxBudget= &sort=`)
- `POST /api/contact` (public contact form — stores the message and best-effort emails `CONTACT_EMAIL`)

### Auth
- `POST /api/auth/register` · `POST /api/auth/login` → `{ token, user }`
- `GET /api/auth/me` (Bearer) · `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`

### Authenticated user
- `GET/POST /api/planner` · `PUT/DELETE /api/planner/:id`
- `GET/POST /api/wishlist` · `DELETE /api/wishlist/:destinationId`

### Admin (Bearer admin token)
- `POST/PUT/DELETE` for `districts`, `cities`, `destinations`, `treks`, `festivals`, `guides`
- `PATCH /api/reviews/:id/status` · `DELETE /api/reviews/:id`
- `GET /api/users` · `GET /api/users/:id` · `PATCH /api/users/:id/role` · `DELETE /api/users/:id`

## Authentication

Send the JWT from login/register as a header:

```
Authorization: Bearer <token>
```

In Swagger UI click **Authorize** and paste the token to try protected routes.

## Project structure

```
src/
  config/      env + Mongo connection
  middleware/  auth (JWT), error handling
  models/      Mongoose schemas + TS interfaces (types.ts)
  controllers/ one per resource
  routes/      index.ts mounts everything under /api
  docs/        openapi.ts (OpenAPI 3.0 spec, served at /docs)
  seed/        data.ts (ported from the frontend) + seed.ts
  app.ts       Express app factory
  index.ts     server entry
```

## Notes

- String ids (`d1`, `c1`, `p1`, …) from the frontend's static data are preserved as the
  documents' `id` field so all cross-references (`cityId`, `districtId`, `nearby`, …) match.
- `_id` / `__v` are stripped from responses; user passwords are never returned.
- Password reset tokens are kept in memory for the demo; wire up email + persistence for production.

## Scope decisions

- **Email verification is intentionally not implemented.** An earlier build included a full
  verify-email flow (token + email + gated access); it was deliberately removed so `register()`
  activates an account immediately, keeping the demo/grading flow frictionless without needing a
  working SMTP inbox. This is a conscious scope choice, not an oversight — if this app were taken
  to production, restoring it (the `IUser.emailVerified` field pattern and `verify-email`/
  `resend-verification` routes) would close the "anyone can register with an email they don't own"
  gap called out in the July 2026 audit.
