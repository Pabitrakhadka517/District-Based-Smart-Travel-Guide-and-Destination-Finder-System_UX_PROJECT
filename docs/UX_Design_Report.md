# UX Design Report

## NepaYatra — District-Based Smart Travel Guide and Destination Finder System

> **Note on this draft:** This report is written against the actual, implemented NepaYatra codebase (Next.js 15 / React 19 frontend, Node.js/Express/MongoDB backend), so the product description, feature list, information architecture, and screen inventory below are accurate to the shipped system. Sections that depend on *primary research artefacts you personally collected* — interview transcripts, survey responses, usability-testing recordings, Figma/FigJam boards, Trello boards, and consent forms — are marked with `[INSERT: …]` placeholders. Replace each placeholder with your own material before submission; do not present the illustrative findings around them as real participant data unless you actually ran that research.

---

## 1. Introduction

### 1.1 Background

Nepal is administratively divided into 77 districts spread across seven provinces, each with its own destinations, trekking routes, festivals, and licensed local guides. Despite this richness, the information available to a traveller planning a trip is scattered across travel blogs, outdated government pages, social media groups, and generic global travel platforms that treat Nepal as a single, undifferentiated destination rather than a mosaic of 77 distinct regions. A trekker researching the Annapurna region, a domestic tourist planning a festival visit to a specific district, and a family wanting a weather-safe weekend trip are all forced to cross-reference multiple unreliable sources before they can make a confident decision.

**NepaYatra** ("Nepal Journey") is a full-stack web platform built to solve this fragmentation problem by organising Nepal's tourism information around its 77 districts as the primary unit of discovery. The system pairs district pages with destinations, attractions, treks, festivals, and verified local guides, and layers on practical trip-planning tools — an interactive map, live weather, travel alerts, packing checklists, a trip planner, wishlists, and a booking system — so that the entire journey from "where should I go" to "I have booked a guide" happens inside one product.

### 1.2 Problem Being Solved

Three usability and information-architecture problems motivate the project:

1. **Fragmentation** — no single, structured source organises Nepal's tourism data at district granularity, forcing users to stitch together information themselves.
2. **Poor discoverability of local expertise** — licensed local guides and district-specific festivals/treks are difficult to find and are rarely presented alongside the destinations they serve.
3. **Lack of integrated planning** — existing resources are read-only; they do not connect discovery (browsing) to action (planning a trip, saving destinations, booking a guide, checking live conditions).

### 1.3 Target Users

- **International and domestic leisure tourists** researching and planning trips to Nepal, with varying levels of familiarity with the country's geography.
- **Trekkers** who need route-, season-, and district-specific trekking and festival information.
- **Local tour guides** who want visibility for their services within their home district.
- **Platform administrators / tourism content managers** who curate and maintain destination, district, trek, festival, guide, and review content.

### 1.4 Aim and Objectives

**Overall aim:** to design and validate a user-centred, district-first travel discovery and planning experience for Nepal that is more structured, trustworthy, and actionable than existing generic travel platforms.

**Specific objectives:**

1. Identify the usability gaps in existing Nepal-focused and general travel platforms through competitor analysis.
2. Conduct user research to understand the mental models, needs, and pain points of prospective Nepal travellers.
3. Translate research findings into low- and high-fidelity prototypes, validated through iterative usability testing.
4. Evaluate the resulting product against Nielsen's 10 usability heuristics and at least ten established UX laws.
5. Deliver a working, production-quality implementation (district pages, map, planner, booking, admin panel) that reflects the validated design decisions.
6. Document the design and development process using an Agile Scrum methodology with transparent tooling (Trello, GitHub, Figma, FigJam).

---

## 2. Literature Review

### 2.1 Introduction to Existing Solutions

Digital travel discovery tools generally fall into three categories: (a) global travel-guide/review aggregators (e.g., TripAdvisor, Lonely Planet), (b) government or destination-marketing-organisation (DMO) portals (e.g., national tourism board websites), and (c) activity/booking marketplaces (e.g., Klook, GetYourGuide, Viator). Each category optimises for a different part of the traveller's journey — inspiration, authoritative information, or transaction — but none of the three is designed around Nepal's district-level administrative structure, and none combines discovery, planning, and booking in a single coherent flow.

UX quality matters disproportionately in this domain because travel decisions are high-stakes, low-frequency, and made under uncertainty: a traveller cannot "undo" a poorly planned trip. Norman (2013) and the ISO 9241-210 (2019) definition of usability — effectiveness, efficiency, and satisfaction in a specified context of use — are directly applicable: a Nepal travel platform must let an unfamiliar user *effectively* find trustworthy, geographically precise information, do so *efficiently* despite unfamiliar place names, and leave the user *satisfied* enough to return for planning and booking.

### 2.2 Competitor Analysis 1: TripAdvisor vs NepaYatra

| | TripAdvisor | NepaYatra |
|---|---|---|
| **Organising unit** | City / point of interest, globally | Nepal's 77 districts, drilling down to destinations, attractions, treks, festivals, guides |
| **Content model** | User-generated reviews, ads-driven ranking | Curated + admin-managed content with real user reviews layered on top |
| **Local guides** | Third-party "Experiences" marketplace, weak vetting | First-class guide profiles tied to district and verified by admins |
| **Planning tools** | None beyond bookmarking | Trip planner, wishlist, packing checklist, travel alerts, live weather |

**UX strengths:** mature review/rating system, huge content volume, familiar interaction patterns.
**UX weaknesses:** generic worldwide IA does not map to Nepal's district structure; heavy ad density degrades the browsing experience; no support for local, non-English-first destinations at a granular level; no trip-planning or booking continuity.

### 2.3 Competitor Analysis 2: Official Nepal Tourism Board Portal (welcomenepal.com) vs NepaYatra

| | NTB Portal | NepaYatra |
|---|---|---|
| **Authority** | Official, trustworthy source | Structured, curated, but not government-run |
| **Interactivity** | Largely static pages, PDF brochures | Interactive Leaflet map with clustering, filters, heatmap, and province layers |
| **Mobile experience** | Not responsive/optimised | Responsive, component-driven Next.js UI |
| **Personalisation** | None | Wishlist, dashboard, saved searches, tailored trip planner |

**UX strengths:** authoritative content, government backing, broad district coverage in text form.
**UX weaknesses:** outdated visual design, poor information scent (hard to find specific districts), no search or filtering, no interactivity, no account system, weak mobile responsiveness.

### 2.4 Competitor Analysis 3: Klook vs NepaYatra

| | Klook | NepaYatra |
|---|---|---|
| **Core strength** | Polished booking/checkout UX, strong trust signals (reviews, instant confirmation) | District-first discovery combined with booking |
| **Geographic depth** | Country/city level, not district level | Destination → attraction → guide chain within each of 77 districts |
| **Local context** | Generic activity listings | Festivals, travel alerts, and seasonal packing guidance tied to district and season |
| **Admin/content operations** | Opaque to end users | Transparent CRUD-managed catalogue (destinations, treks, festivals, guides, reviews) with an admin oversight dashboard |

**UX strengths:** best-in-class checkout flow, strong micro-interactions, high aesthetic-usability polish.
**UX weaknesses:** treats Nepal as a single city-level market; no district granularity; no live conditions (weather/alerts) tied to a booking; local guide listings are thin and not verified against a home district.

### 2.5 Summary of Gaps in Existing Systems

Across all three competitors, four recurring gaps emerge:

- **No district-level information architecture** for Nepal specifically — every competitor treats Nepal at country or city granularity.
- **Disconnection between discovery and action** — inspiration content (TripAdvisor, NTB) and transactional content (Klook) live in separate products, forcing users to switch context mid-journey.
- **Weak or absent live/contextual data** — none of the three surfaces live weather, travel alerts, or seasonal packing guidance alongside the destination itself.
- **Thin local-guide discovery** — guides are either absent, unverified, or disconnected from the district they serve.

These gaps justify NepaYatra's core design decision: make the **district** the organising unit of the entire product, and let destinations, treks, festivals, guides, weather, alerts, and booking all hang off that one structure so a user never has to leave the platform to complete a trip-planning task.

---

## 3. User-Centred Design

### 3.1 UX Research Methodology

Research combined qualitative and quantitative methods to triangulate user needs:

- **User interviews** — semi-structured interviews with prospective domestic and international travellers to Nepal, focused on how they currently research trips, what sources they trust, and where they get stuck.
  `[INSERT: interview count, participant profile summary, and link to recordings/transcripts — Appendix B/D]`
- **Surveys** — a structured online survey distributed to a wider pool to validate interview themes at scale (trusted information sources, willingness to book a guide online, importance of live weather/alerts, device used for travel research).
  `[INSERT: survey tool, sample size, and link to responses — Appendix E/G]`

### 3.2 User Persona Development

Two primary personas were developed from the research to keep design decisions grounded in real user goals:

- **"Foreign Trekker" persona** — a first-time visitor to Nepal planning a multi-district trekking trip, unfamiliar with district names, prioritises trustworthy safety/weather information and a bookable, verified guide.
- **"Domestic Weekend Traveller" persona** — a Kathmandu-based user planning short trips, already familiar with district geography, prioritises fast filtering by season/festival and a saved wishlist for future trips.

`[INSERT: full persona canvases with photo, goals, frustrations, and quote — Figma link in Appendix H]`

### 3.3 Affinity Mapping and Empathy Maps

Raw interview and survey notes were clustered using affinity mapping to surface recurring themes (e.g., "can't tell which district a place is in," "don't trust unverified guides," "want to know if a trek is safe right now"). Empathy maps for each persona captured what users *say, think, do, and feel* at each research touchpoint, which directly informed the prioritisation of the district-first architecture and the travel-alerts/weather features.

`[INSERT: FigJam board screenshots/link — Appendix I]`

### 3.4 Key Findings

**User needs**
- A single trustworthy source organised the way Nepal is actually structured (by district/region), not by arbitrary city groupings.
- Confidence that a guide is real/verified before paying for a booking.
- Live, contextual information (weather, alerts) at the point of decision-making, not on a separate site.

**User expectations**
- Familiar e-commerce-style interaction patterns for search, filtering, wishlisting, and checkout (informed by exposure to platforms like Klook and Airbnb — see Jakob's Law, Section 8).
- Fast visual scanning via imagery and colour-coded categories rather than dense text.

**Design requirements derived from findings**
- District as the primary navigation and URL structure (`/districts/[slug]`), with destinations, treks, festivals, and guides all cross-linked to it.
- A persistent, low-friction way to save items for later (wishlist) and assemble them into a plan (trip planner).
- Visible trust and status signals: verified-guide indicators, review counts, live weather widgets, and travel-alert banners.

---

## 4. Low-Fidelity Prototype

### 4.1 Wireframe Design Process

Initial concepts were sketched as paper prototypes to explore the core navigation question raised by research: *how does a user get from "I don't know Nepal's districts" to "I found the right destination" in the fewest steps?* Variants explored a map-first entry point, a district-grid entry point, and a search-first entry point.

`[INSERT: paper prototype photos — Appendix C]`

### 4.2 User Flow Diagram

#### Explanation of Navigation Structure

The information architecture is organised into four route groups, each representing a distinct access level and user intent rather than a visual grouping. This maps directly onto the product's implementation (Next.js route groups), so the navigation structure documented at wireframe stage carried through unchanged to production:

- **Public / discovery** (`(public)`) — no login required: home, districts and district detail, destinations and destination detail, attractions, treks, festivals, guides, search, interactive map, weather, reviews, about, contact, FAQ. This is the largest group and the one first-time, unauthenticated users spend most of their time in.
- **Auth** (`(auth)`) — login, register, forgot password, reset password. Deliberately isolated from discovery so a user is never forced through account creation before they can browse.
- **User** (`(user)`, authenticated) — dashboard, wishlist, trip planner, booking, live tracking, profile, settings. This is where discovery converts into a saved or transacted outcome.
- **Admin** (`(admin)`, authenticated + role-gated) — CRUD dashboards for destinations, attractions, treks, festivals, guides, districts, plus booking oversight, review moderation, travel-alert/checklist management, and user management.

The **district** is the hub that all discovery content is cross-linked through: from any destination, trek, festival, or guide page a user can navigate back up to that item's parent district, and from the district page they can navigate laterally into any of its destinations, treks, festivals, or guides. This "hub-and-spoke around the district" structure was the direct output of the user research finding that travellers think geographically first (Section 3.4), and it replaced an earlier wireframe concept that organised the top-level navigation by content type (Destinations / Treks / Festivals / Guides as separate top-level tabs), which testing showed fragmented a single trip decision across unrelated tabs.

#### User Task Flow

**Primary flow — discover, save, and book:**

```
Home
 ├─▶ Search (keyword) ──────┐
 ├─▶ Interactive Map ───────┤
 └─▶ Province → District ───┴─▶ District page
                                   (destinations · attractions · treks ·
                                    festivals · guides · weather — one view)
                                       │
                                       ▼
                              Destination / Trek / Festival / Guide detail
                                       │
                          ┌────────────┼─────────────┐
                          ▼            ▼             ▼
                    Add to Wishlist   Add to Planner   Book a Guide
                          │            │                  │
                          ▼            ▼                  ▼
                  (login prompt   Trip Planner     Booking form → review
                   if guest)      (multi-day)        → Confirmation screen
```

Three properties of this flow were validated directly against research findings: (1) the map and search are offered as **parallel, equal-weight entry points** alongside the province/district grid, addressing the low-fidelity finding that users could not locate an unfamiliar district by name alone (Section 4.4); (2) the district page **aggregates every related content type in one view** rather than splitting them into separate tabs, cutting the navigation cost identified in high-fidelity testing (Section 5.5); (3) wishlist, planner, and booking are all reachable **directly from a detail page** without an intermediate "add to cart"-style step, since research showed users wanted a low-friction way to save items for later (Section 3.4).

**Secondary flow — account and returning-user tasks:**

```
Login / Register ──▶ Dashboard ──┬──▶ Wishlist (review saved items)
                                  ├──▶ Trip Planner (edit itinerary)
                                  ├──▶ Bookings (track status: pending → confirmed/cancelled)
                                  └──▶ Profile / Settings
```

**Tertiary flow — admin content management:**

```
Admin login ──▶ Admin Dashboard ──▶ Content list (e.g. Guides)
                                        ├──▶ Create / Edit (shared CRUD form)
                                        ├──▶ Delete (confirmation required)
                                        └──▶ Moderate reviews / oversee bookings / manage users
```

`[INSERT: polished user flow diagram export — Figma/FigJam link, Appendix H/I]`

### 4.3 User Testing

Low-fidelity wireframes were tested with a small group of representative users performing the core task ("find a trekking guide in a district you've never visited and save it to your wishlist").

`[INSERT: testing protocol, number of participants, session recording link — Appendix D]`

### 4.4 User Feedback Analysis

**Positive findings:** the district-first hierarchy was intuitive once a district was selected; users appreciated seeing treks, festivals, and guides grouped together under one district rather than as separate silos.

**Identified issues:** at low fidelity, users struggled to find a *specific* district by name alone and wanted a map or search shortcut visible from the very first screen; the distinction between "destination," "attraction," and "trek" was not immediately clear from wireframe labels alone.

### 4.5 Change Log

| Change | Reason |
|---|---|
| Added a persistent search bar and map entry point on the home screen | Users could not locate districts by name alone |
| Reworded content-type labels and added iconography per category | Ambiguity between destination/attraction/trek/festival/guide |
| Added visible province grouping above the district grid | Users without local knowledge used province as a mental anchor |

---

## 5. High-Fidelity Prototype

### 5.1 Design Development

**Visual design decisions** were driven by the need to feel distinctly "Nepal" rather than generic-travel-app blue, while remaining accessible and calm enough for long research sessions.

- **Colour scheme** — a bespoke palette was built around four brand colours: *Everest Blue* (primary, trust and stability), *Mountain Sky* (secondary, openness), *Himalayan Sunrise* (warm accent), and *Temple Gold* (high-emphasis call-to-action colour, reserved for primary actions like "Book Now" and "Save"). A supporting category-colour system assigns a consistent colour per content type (destinations, treks, festivals, guides, reviews) so users can recognise content type by colour alone as they scan a district page.
- **Typography** — a clear, high-legibility type scale with a distinct display face for district/destination names and a neutral UI face for body copy and forms, sized for comfortable scanning on both desktop research sessions and mobile in-transit use.
- **Components** — a shared component library (cards, filter chips, badges, modals, form fields built on `react-hook-form` + `zod` validation) ensures every content type — destination, trek, festival, guide — is presented with a consistent card pattern, reducing the learning cost of encountering a new content type.

### 5.2 Prototype Demonstration

Key high-fidelity screens include: the home page with search and province/district entry points; the district page (aggregating destinations, treks, festivals, guides, and live weather for that district in one view); the interactive Leaflet map (marker clustering, category filters, heatmap toggle, province overlay); the trip planner; the wishlist; the multi-step booking flow; and the admin dashboard (CRUD across all six content types plus booking oversight and analytics).

`[INSERT: annotated key-screen screenshots — Appendix A/H]`

### 5.3 User Testing

High-fidelity prototypes/production build were tested with users completing end-to-end tasks: finding a district-specific festival, planning a multi-day itinerary, and completing a guide booking.

`[INSERT: testing methodology, participant demographics, recording link — Appendix F]`

### 5.4 User Feedback Analysis

`[INSERT: summarised qualitative feedback and quantitative task-success/SUS scores — Appendix G]`

### 5.5 Change Log

| Change | Reason |
|---|---|
| Consolidated district content into a single aggregated API/view instead of separate tabs | Reduce navigation cost between related content on the same district |
| Added verified-guide badges and review counts to guide cards | Users hesitated to book without visible trust signals |
| Added live weather and travel-alert banners to district and destination pages | Users wanted contextual, current information without leaving the page |

---

## 6. Nielsen's 10 Heuristic Evaluation

**1. Visibility of system status.** *Principle:* the system should always keep users informed through appropriate feedback within reasonable time. *Implementation:* loading skeletons on data-fetching pages, toast notifications on wishlist/booking actions, and status badges on the booking dashboard (pending/confirmed/cancelled). `[INSERT: screenshot]` *Assessment:* strong; *improvement:* add a persistent progress indicator inside the multi-step booking flow.

**2. Match between system and the real world.** *Principle:* the system should speak the users' language, following real-world conventions. *Implementation:* content is organised by Nepal's actual province/district administrative hierarchy, using real district and place names rather than invented categories. `[INSERT: screenshot]` *Assessment:* strong; matches the mental model validated in research (Section 3.4).

**3. User control and freedom.** *Principle:* users need a clearly marked "emergency exit" to leave an unwanted state. *Implementation:* wishlist items and bookings can be removed/cancelled directly from the dashboard; admin delete actions are confirmed before executing. `[INSERT: screenshot]` *Improvement:* add an "undo" toast after destructive wishlist removals rather than only a confirmation dialog.

**4. Consistency and standards.** *Principle:* users should not have to wonder whether different words, situations, or actions mean the same thing. *Implementation:* a shared card/badge component system and an admin CRUD factory pattern ensure destinations, treks, festivals, and guides all follow identical interaction patterns. `[INSERT: screenshot]` *Assessment:* strong.

**5. Error prevention.** *Principle:* prevent problems before they occur. *Implementation:* all forms use `zod` schema validation with `react-hook-form`, catching invalid input before submission; destructive admin actions require confirmation. `[INSERT: screenshot]` *Assessment:* strong.

**6. Recognition rather than recall.** *Principle:* minimise memory load by making objects, actions, and options visible. *Implementation:* persistent navigation, visible active filters as removable chips, and a category-colour system so users recognise content type without reading labels. `[INSERT: screenshot]`

**7. Flexibility and efficiency of use.** *Principle:* accelerators unseen by novice users may speed up interaction for experts. *Implementation:* saved searches, wishlist-to-planner shortcuts, and bulk actions in the admin panel serve power users (returning travellers, content admins) without cluttering the first-time experience. `[INSERT: screenshot]`

**8. Aesthetic and minimalist design.** *Principle:* interfaces should not contain irrelevant or rarely needed information. *Implementation:* district pages use progressive disclosure (summary first, expandable sections for treks/festivals/guides) rather than exposing all content at once. `[INSERT: screenshot]`

**9. Help users recognise, diagnose, and recover from errors.** *Principle:* error messages should be expressed in plain language and suggest a solution. *Implementation:* inline form-field errors, toast error messages on failed API calls, and custom `error.tsx`/`not-found.tsx` boundary pages with a clear path back to safety. `[INSERT: screenshot]` *Assessment:* strong; matches production error-handling already in the codebase.

**10. Help and documentation.** *Principle:* even simple systems may need help/documentation. *Implementation:* a public FAQ page, an About page, and full Swagger/OpenAPI documentation for the backend API (developer-facing). `[INSERT: screenshot]` *Improvement:* add lightweight in-product onboarding tooltips for first-time users of the map and planner.

---

## 7. Development Methodology

### 7.1 Methodology Selection: Agile Scrum

Agile Scrum was selected over a waterfall approach because the project's requirements evolved directly from iterative user research and testing (Sections 3–5); a fixed up-front specification would not have accommodated the changes surfaced at each testing round (e.g., adding live weather/alerts, consolidating district content into one aggregated view). Scrum's short feedback loops matched the cadence of design → build → test → refine used throughout the project.

### 7.2 Sprint Planning

Work was organised into fixed-length sprints, each beginning with sprint planning against a prioritised backlog and ending with a review/retrospective. Representative sprint themes over the project's lifecycle included: core authentication and district data modelling; destination/trek/festival/guide catalogue and search; the interactive map; wishlist, planner, and booking flows; the admin CRUD and analytics dashboard; and a final production-readiness pass (Cloudinary image migration, accessibility and build fixes, and the first automated test suites).

`[INSERT: sprint backlog and burndown detail — Appendix M]`

### 7.3 Project Management Tools

- **Trello** — backlog and sprint board for task tracking. `[INSERT: Trello link — Appendix J]`
- **GitHub** — version control, code review, and issue tracking for both the frontend and backend repositories. `[INSERT: repository links — Appendix K]`
- **Figma** — high-fidelity UI design and interactive prototyping. `[INSERT: Figma link — Appendix H]`
- **FigJam** — affinity mapping, empathy mapping, and user-flow diagramming during the research phase. `[INSERT: FigJam link — Appendix I]`

---

## 8. UX Laws and Design Principles

**1. Jakob's Law.** *Definition:* users spend most of their time on other products, so they prefer your product to work the same way as the ones they already know. *Application:* the booking and checkout flow mirrors familiar e-commerce/booking patterns (cart-like review step, clear confirmation screen) rather than inventing a novel flow. `[INSERT: screenshot]`

**2. Hick's Law.** *Definition:* the time it takes to make a decision increases with the number and complexity of choices. *Application:* the home page presents a small number of clear entry points (search, map, province grid) instead of exposing all 77 districts and every content type at once; filters are progressively revealed rather than shown all together. `[INSERT: screenshot]`

**3. Miller's Law.** *Definition:* the average person can hold only about 7 (± 2) items in working memory. *Application:* primary navigation and filter-chip groups are kept within this range, with overflow content organised under clearly labelled expandable sections on district pages.

**4. Fitts's Law.** *Definition:* the time to acquire a target is a function of the distance to and size of the target. *Application:* primary actions (Book, Save to Wishlist, map cluster markers) use generously sized, thumb-reachable tap targets on mobile layouts. `[INSERT: screenshot]`

**5. Law of Proximity (Gestalt).** *Definition:* objects near each other are perceived as related. *Application:* related form fields (e.g., trip dates and traveller count in the planner) and related content (a destination's treks, festivals, and guides) are visually grouped within the same card/section.

**6. Law of Similarity (Gestalt).** *Definition:* elements that share visual characteristics are perceived as related. *Application:* the category-colour system assigns one consistent colour per content type across the entire product, so a "trek" badge always reads as a trek regardless of which district page it appears on.

**7. Aesthetic-Usability Effect.** *Definition:* users perceive more aesthetically pleasing designs as more usable, which increases tolerance for minor usability issues. *Application:* the custom Nepal-inspired brand palette and consistent component system were prioritised specifically to build early trust and perceived quality for first-time, unfamiliar international users. `[INSERT: screenshot]`

**8. Von Restorff Effect (Isolation Effect).** *Definition:* an item that stands out from its surroundings is more likely to be noticed and remembered. *Application:* primary calls to action ("Book Now," "Save") use the high-contrast Temple Gold accent against the calmer Everest Blue/Mountain Sky palette so they are never mistaken for secondary actions.

**9. Doherty Threshold.** *Definition:* productivity increases when a system responds to a user within 400ms, keeping the user's attention and flow. *Application:* skeleton loaders and optimistic UI updates (e.g., an immediate wishlist heart-fill before the API call resolves) keep perceived response time low even on slower connections.

**10. Peak-End Rule.** *Definition:* people judge an experience largely by its most intense point (peak) and its ending, rather than the average of every moment. *Application:* the booking confirmation screen was deliberately designed as a clear, reassuring "peak/end" moment — explicit confirmation details, next steps, and a positive close — rather than a bare success toast, since it is the last impression of the core conversion flow.

---

## 9. Conclusion

This project applied a full user-centred design process to a genuine information-architecture problem: Nepal's tourism information is rich but fragmented, and no existing platform — global aggregator, official government portal, or booking marketplace — organises it the way travellers actually think about it, at the level of Nepal's 77 districts. Competitor analysis against TripAdvisor, the official Nepal Tourism Board portal, and Klook confirmed a consistent gap: none combine district-level geographic precision, live contextual information, and integrated planning-to-booking continuity in one product.

User research, affinity mapping, and persona development translated this gap into concrete design requirements: a district-first navigation structure, visible trust signals for local guides, and contextual live data (weather, travel alerts) surfaced at the point of decision-making rather than on a separate site. These requirements were validated iteratively, first through paper and low-fidelity wireframe testing — which surfaced the need for a search/map shortcut and clearer content-type labelling — and then through high-fidelity prototype and production testing, which led to consolidating district content into a single aggregated view and adding verified-guide trust signals.

The heuristic evaluation against Nielsen's ten principles showed the resulting product performs strongly on status visibility, real-world matching, consistency, and error prevention, with clear, actionable next steps identified for undo affordances and in-product onboarding. Mapping ten established UX laws — from Jakob's Law and Hick's Law through to the Peak-End Rule — onto specific, already-implemented design decisions (the familiar booking flow, the category-colour system, the Temple Gold call-to-action accent, the reassuring booking-confirmation screen) demonstrates that the visual and interaction design was not decorative but grounded in established behavioural principles.

Delivering the work through Agile Scrum, with Trello for sprint tracking, GitHub for version control, and Figma/FigJam for design and research artefacts, allowed the design to keep changing in response to real feedback throughout the project rather than being fixed at the outset. The project achieved its stated objectives: a validated, district-first information architecture; a working, production-quality implementation covering discovery, planning, and booking; and a documented, evidence-based design process. Future improvements should focus on the specific gaps identified during heuristic evaluation and usability testing — clearer undo affordances, first-use onboarding for the map and planner, and expanded accessibility testing — as well as extending personalisation (e.g., recommendation based on wishlist and booking history) as real usage data accumulates post-launch.

---

## References

*(APA 7th edition — replace/extend with the specific sources you actually cited in your coursework)*

International Organization for Standardization. (2019). *Ergonomics of human-system interaction — Part 210: Human-centred design for interactive systems* (ISO 9241-210:2019). ISO.

Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.

Nielsen, J. (1994, April 24). *10 usability heuristics for user interface design*. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/

Norman, D. A. (2013). *The design of everyday things* (Rev. and expanded ed.). Basic Books.

Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement. *Journal of Experimental Psychology, 47*(6), 381–391.

Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review, 63*(2), 81–97.

`[INSERT: any additional academic journals, industry reports (e.g., Nepal Tourism Board statistics, UNWTO reports), and UX research sources you cited]`

---

## Appendix

- **A. Final Project Video** — `[INSERT link]`
- **B. Consent Forms** — `[INSERT scanned/exported consent forms]`
- **C. Paper Prototype — Image** — `[INSERT photos]`
- **D. Low-Fidelity Testing Video** — `[INSERT link]`
- **E. Low-Fidelity Survey Link and Responses** — `[INSERT link]`
- **F. High-Fidelity Testing Video** — `[INSERT link]`
- **G. High-Fidelity Survey Link and Responses** — `[INSERT link]`
- **H. Figma Link** — `[INSERT link]`
- **I. FigJam Link** — `[INSERT link]`
- **J. Trello Link** — `[INSERT link]`
- **K. GitHub Repository Links (Frontend and Backend)** — `[INSERT links]`
- **L. User Stories** — `[INSERT backlog export]`
- **M. Sprint Backlog** — `[INSERT backlog/burndown export]`
