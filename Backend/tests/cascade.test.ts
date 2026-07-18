import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";

const app = createApp();
const adminToken = signToken({ sub: "admin-1", role: "admin" });

function destinationPayload(slug: string) {
  return {
    slug,
    cityId: "test-city",
    districtId: "test-district",
    name: "Cascade Test Destination",
    category: "Nature",
    coordinates: { lat: 28.2, lng: 83.9 },
    budget: { budget: 1000, midRange: 3000, luxury: 8000 },
    heroImage: { url: "https://images.example.com/cascade-test.jpg", alt: "Cascade Test Destination" },
  };
}

async function registerTraveler(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Cascade Traveler", email, password: "correct-horse-battery-staple" });
  const userId = res.body.data.user.id as string;
  return { token: signToken({ sub: userId, role: "user" }), userId };
}

async function createDestination(slug: string) {
  const res = await request(app)
    .post("/api/destinations")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(destinationPayload(slug));
  return res.body.data.id as string;
}

async function createAttraction(slug: string) {
  const res = await request(app)
    .post("/api/attractions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      slug,
      districtId: "test-district",
      name: "Cascade Test Attraction",
      category: "Natural Attractions",
      coordinates: { lat: 28.2, lng: 83.9 },
      heroImage: { url: "https://images.example.com/cascade-attraction.jpg", alt: "Cascade Test Attraction" },
    });
  return res.body.data.id as string;
}

async function createTrek(slug: string) {
  const res = await request(app)
    .post("/api/treks")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      slug,
      name: "Cascade Test Trek",
      region: "Annapurna",
      difficulty: "Moderate",
      coordinates: { lat: 28.2, lng: 83.9 },
      heroImage: { url: "https://images.example.com/cascade-trek.jpg", alt: "Cascade Test Trek" },
    });
  return res.body.data.id as string;
}

describe("cascade: deleting a destination reverts any TripPlan booked against it", () => {
  it("clears the plan's bookingId and reverts it to ready instead of leaving it stuck on a deleted booking", async () => {
    const { token: travelerToken } = await registerTraveler("cascade-dest-traveler@example.com");
    const destinationId = await createDestination("cascade-dest-test");

    const trip = await request(app)
      .post("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        title: "Trip about to lose its destination",
        destinationIds: [destinationId],
        startDate: "2099-03-01",
        endDate: "2099-03-05",
        budget: 15000,
        status: "ready",
      });
    const tripId = trip.body.data.id as string;

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        tripPlanId: tripId,
        fullName: "Cascade Traveler",
        phone: "9800000001",
        emergencyContactName: "Emergency",
        emergencyContactNumber: "9811111112",
      })
      .expect(201);

    const beforeDelete = await request(app)
      .get("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`);
    const planBefore = beforeDelete.body.data.find((p: { id: string }) => p.id === tripId);
    expect(planBefore.status).toBe("booked");
    expect(planBefore.bookingId).not.toBe("");

    await request(app)
      .delete(`/api/destinations/${destinationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const afterDelete = await request(app)
      .get("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`);
    const planAfter = afterDelete.body.data.find((p: { id: string }) => p.id === tripId);
    expect(planAfter.status).toBe("ready");
    expect(planAfter.bookingId).toBe("");

    const bookings = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(bookings.body.data.length).toBe(0);
  });
});

describe("cascade: deleting an attraction or trek strips it from any TripPlan referencing it", () => {
  it("pulls the deleted ids out of attractionIds/trekIds instead of leaving them dangling", async () => {
    const { token: travelerToken } = await registerTraveler("cascade-content-traveler@example.com");
    const attractionId = await createAttraction("cascade-attraction-test");
    const trekId = await createTrek("cascade-trek-test");

    const trip = await request(app)
      .post("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        title: "Trip referencing attraction/trek content",
        attractionIds: [attractionId],
        trekIds: [trekId],
        startDate: "2099-05-01",
        endDate: "2099-05-05",
      });
    const tripId = trip.body.data.id as string;

    await request(app).delete(`/api/attractions/${attractionId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    await request(app).delete(`/api/treks/${trekId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);

    const after = await request(app)
      .get("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`);
    const planAfter = after.body.data.find((p: { id: string }) => p.id === tripId);
    expect(planAfter.attractionIds).toEqual([]);
    expect(planAfter.trekIds).toEqual([]);
  });
});

describe("cascade: deleting a user cleans up their owned data", () => {
  it("removes the user's trip plans, bookings, and reviews instead of orphaning them", async () => {
    const { token: travelerToken, userId } = await registerTraveler("cascade-user-traveler@example.com");
    const destinationId = await createDestination("cascade-user-test");

    const trip = await request(app)
      .post("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        title: "Trip owned by a soon-to-be-deleted user",
        destinationIds: [destinationId],
        startDate: "2099-04-01",
        endDate: "2099-04-05",
        budget: 10000,
        status: "ready",
      });
    const tripId = trip.body.data.id as string;

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        tripPlanId: tripId,
        fullName: "Cascade Traveler",
        phone: "9800000002",
        emergencyContactName: "Emergency",
        emergencyContactNumber: "9811111113",
      })
      .expect(201);

    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ destinationId, rating: 5, title: "Great!", body: "Loved it here." });
    expect(review.status).toBe(201);

    await request(app)
      .delete(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    // The user's session is gone along with the account — further requests
    // with their old token should behave as if they were never authenticated
    // for anything that looks the user back up (bookings listing still works
    // off the JWT claim alone, so check the underlying data directly instead).
    const remainingPlans = await request(app)
      .get("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(remainingPlans.body.data).toEqual([]);

    const remainingBookings = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(remainingBookings.body.data).toEqual([]);

    const remainingReviews = await request(app).get(`/api/reviews?destination=${destinationId}`);
    expect(remainingReviews.body.data).toEqual([]);
  });
});
