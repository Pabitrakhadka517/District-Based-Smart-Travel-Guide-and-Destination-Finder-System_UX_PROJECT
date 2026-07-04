import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db";
import { District } from "../models/District";
import { City } from "../models/City";
import { Destination } from "../models/Destination";
import { Review } from "../models/Review";
import { Trek } from "../models/Trek";
import { Festival } from "../models/Festival";
import { Guide } from "../models/Guide";
import { User } from "../models/User";
import { TripPlan } from "../models/TripPlan";
import { Attraction } from "../models/Attraction";
import { TravelAlert } from "../models/TravelAlert";
import { PackingChecklist } from "../models/PackingChecklist";
import * as data from "./data";
import { toImage, toGallery } from "./images";

export async function seed(): Promise<void> {
  // Seed IDs — only these demo accounts and their trip plans are replaced; real user accounts are preserved.
  const seedUserIds = data.users.map((u) => u.id);

  console.log("[seed] Clearing collections...");
  await Promise.all([
    District.deleteMany({}),
    City.deleteMany({}),
    Destination.deleteMany({}),
    Review.deleteMany({}),
    Trek.deleteMany({}),
    Festival.deleteMany({}),
    Guide.deleteMany({}),
    User.deleteMany({ id: { $in: seedUserIds } }),
    TripPlan.deleteMany({ userId: { $in: seedUserIds } }),
    Attraction.deleteMany({}),
    TravelAlert.deleteMany({}),
    PackingChecklist.deleteMany({})
  ]);

  // Drop the old sparse compound index so the new partialFilterExpression definition takes effect.
  await Review.collection.dropIndex("destinationId_1_userId_1").catch(() => {});

  console.log("[seed] Inserting content...");
  // Legacy seed data stores images as plain URL strings — wrap them into the
  // structured { url, publicId: null, alt } shape the models now expect.
  const districts = data.districts.map((d) => ({ ...d, heroImage: toImage(d.heroImage, d.name) }));
  const cities = data.cities.map((c) => ({ ...c, image: toImage(c.image, c.name) }));
  const destinations = data.destinations.map((d) => ({
    ...d,
    heroImage: toImage(d.heroImage, d.name),
    gallery: toGallery(d.gallery, d.name)
  }));
  const reviews = data.reviews.map((r) => ({ ...r, avatar: toImage(r.avatar, r.author) }));
  const treks = data.treks.map((t) => ({
    ...t,
    heroImage: toImage(t.heroImage, t.name),
    gallery: toGallery(t.gallery, t.name)
  }));
  const festivals = data.festivals.map((f) => ({ ...f, image: toImage(f.image, f.name) }));
  const guides = data.guides.map((g) => ({
    ...g,
    cover: toImage(g.cover, g.title),
    authorAvatar: toImage(g.authorAvatar, g.author)
  }));
  const attractions = data.attractions.map((a) => ({
    ...a,
    heroImage: toImage(a.heroImage, a.name),
    gallery: toGallery(a.gallery, a.name)
  }));

  await District.insertMany(districts);
  await City.insertMany(cities);
  await Destination.insertMany(destinations);
  await Review.insertMany(reviews);
  await Review.syncIndexes();
  await Trek.insertMany(treks);
  await Festival.insertMany(festivals);
  await Guide.insertMany(guides);

  console.log("[seed] Creating users (hashing passwords)...");
  const users = await Promise.all(
    data.users.map(async (u) => ({
      ...u,
      avatar: toImage(u.avatar, u.name),
      password: await bcrypt.hash(u.password, 10)
    }))
  );
  await User.insertMany(users);
  await TripPlan.insertMany(data.trips);
  await Attraction.insertMany(attractions);
  await TravelAlert.insertMany(data.travelAlerts);
  await PackingChecklist.insertMany(data.packingChecklists);

  const counts = {
    districts: data.districts.length,
    cities: data.cities.length,
    destinations: data.destinations.length,
    reviews: data.reviews.length,
    treks: data.treks.length,
    festivals: data.festivals.length,
    guides: data.guides.length,
    users: data.users.length,
    trips: data.trips.length,
    attractions: data.attractions.length,
    travelAlerts: data.travelAlerts.length,
    packingChecklists: data.packingChecklists.length
  };
  console.log("[seed] Done:", counts);
}

// Run directly via `npm run seed`
if (require.main === module) {
  (async () => {
    await connectDB();
    await seed();
    await disconnectDB();
    process.exit(0);
  })().catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  });
}
