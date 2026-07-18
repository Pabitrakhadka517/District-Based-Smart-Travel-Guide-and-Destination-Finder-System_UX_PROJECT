import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";

const app = createApp();
const adminToken = signToken({ sub: "admin-1", role: "admin" });

const destinationPayload = {
  slug: "notif-test-destination",
  cityId: "test-city",
  districtId: "test-district",
  name: "Notification Test Destination",
  category: "Nature",
  coordinates: { lat: 28.2, lng: 83.9 },
  budget: { budget: 1000, midRange: 3000, luxury: 8000 },
  heroImage: { url: "https://images.example.com/notif-test.jpg", alt: "Notification Test Destination" },
};

async function registerTraveler(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Notif Traveler", email, password: "correct-horse-battery-staple" });
  const userId = res.body.data.user.id as string;
  return { token: signToken({ sub: userId, role: "user" }), userId };
}

async function createDestination() {
  const res = await request(app)
    .post("/api/destinations")
    .set("Authorization", `Bearer ${adminToken}`)
    .send(destinationPayload);
  return res.body.data.id as string;
}

async function createBookedTrip(travelerToken: string, destinationId: string) {
  const trip = await request(app)
    .post("/api/planner")
    .set("Authorization", `Bearer ${travelerToken}`)
    .send({
      title: "Notification Test Trip",
      destinationIds: [destinationId],
      startDate: "2099-06-01",
      endDate: "2099-06-05",
      budget: 15000,
      status: "ready",
    });
  const tripId = trip.body.data.id as string;

  const booking = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${travelerToken}`)
    .send({
      tripPlanId: tripId,
      fullName: "Notif Traveler",
      phone: "9800000000",
      emergencyContactName: "Emergency Contact",
      emergencyContactNumber: "9811111111",
    });

  return { tripId, bookingId: booking.body.data.id as string };
}

describe("booking status changes create in-app notifications", () => {
  it("notifies the traveler when their booking is confirmed, and again when cancelled", async () => {
    const { token: travelerToken } = await registerTraveler("notif-confirm-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    const afterConfirm = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(afterConfirm.body.data.unreadCount).toBe(1);
    expect(afterConfirm.body.data.items).toHaveLength(1);
    expect(afterConfirm.body.data.items[0].type).toBe("booking_confirmed");
    expect(afterConfirm.body.data.items[0].read).toBe(false);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "cancelled" })
      .expect(200);

    const afterCancel = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(afterCancel.body.data.unreadCount).toBe(2);
    expect(afterCancel.body.data.items).toHaveLength(2);
    expect(afterCancel.body.data.items.map((n: { type: string }) => n.type).sort()).toEqual(
      ["booking_cancelled", "booking_confirmed"].sort()
    );
  });

  it("lets a user mark a single notification read, and mark all read", async () => {
    const { token: travelerToken } = await registerTraveler("notif-markread-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);
    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "cancelled" })
      .expect(200);

    const list = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    const [first] = list.body.data.items;

    const markOne = await request(app)
      .patch(`/api/notifications/${first.id}/read`)
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.data.read).toBe(true);

    const afterOne = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(afterOne.body.data.unreadCount).toBe(1);

    await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${travelerToken}`)
      .expect(200);

    const afterAll = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(afterAll.body.data.unreadCount).toBe(0);
  });

  it("won't mark another user's notification as read", async () => {
    const { token: travelerToken } = await registerTraveler("notif-owner-traveler@example.com");
    const { token: otherToken } = await registerTraveler("notif-other-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    const list = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    const [first] = list.body.data.items;

    const stolenRead = await request(app)
      .patch(`/api/notifications/${first.id}/read`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(stolenRead.status).toBe(404);
  });
});

describe("a trip plan reaching 'ready' notifies its owner", () => {
  it("creates a trip_ready notification when a draft plan is updated to ready", async () => {
    const { token: travelerToken } = await registerTraveler("notif-ready-traveler@example.com");

    const draft = await request(app)
      .post("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ title: "Almost Ready Trip", startDate: "2099-07-01", endDate: "2099-07-05" });
    const tripId = draft.body.data.id as string;
    expect(draft.body.data.status).toBe("draft");

    await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "ready" })
      .expect(200);

    const list = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].type).toBe("trip_ready");
    expect(list.body.data.items[0].link).toBe("/booking");
  });
});

describe("deleting a user cleans up their notifications", () => {
  it("removes notifications along with the rest of the user's cascaded data", async () => {
    const { token: travelerToken, userId } = await registerTraveler("notif-cascade-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    const before = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(before.body.data.items.length).toBeGreaterThan(0);

    await request(app)
      .delete(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const after = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(after.body.data.items).toEqual([]);
    expect(after.body.data.unreadCount).toBe(0);
  });
});

describe("admin-side notifications", () => {
  it("rejects a non-admin user hitting the admin notifications endpoint", async () => {
    const { token: travelerToken } = await registerTraveler("notif-admin-reject-traveler@example.com");
    const res = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    expect(res.status).toBe(403);
  });

  it("notifies admins of a new pending booking request", async () => {
    const { token: travelerToken } = await registerTraveler("notif-admin-booking-traveler@example.com");
    const destinationId = await createDestination();

    const before = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    const beforeCount = before.body.data.items.length;

    await createBookedTrip(travelerToken, destinationId);

    const after = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(after.body.data.items.length).toBe(beforeCount + 1);
    expect(after.body.data.items[0].type).toBe("booking_pending");
    expect(after.body.data.items[0].link).toBe("/admin/bookings");
    expect(after.body.data.unreadCount).toBeGreaterThan(0);
  });

  it("notifies admins of a new pending review", async () => {
    const { token: travelerToken } = await registerTraveler("notif-admin-review-traveler@example.com");
    const destinationId = await createDestination();
    await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ destinationId, rating: 5, title: "Loved it", body: "Great trip." })
      .expect(201);

    const after = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    const reviewNotif = after.body.data.items.find((n: { type: string }) => n.type === "review_pending");
    expect(reviewNotif).toBeTruthy();
    expect(reviewNotif.link).toBe("/admin/reviews");
  });

  it("lets an admin mark one admin notification read, and mark all read", async () => {
    const { token: travelerToken } = await registerTraveler("notif-admin-markread-traveler@example.com");
    const destinationId = await createDestination();
    await createBookedTrip(travelerToken, destinationId);

    const list = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    const [first] = list.body.data.items;

    const markOne = await request(app)
      .patch(`/api/admin/notifications/${first.id}/read`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.data.read).toBe(true);

    await request(app)
      .patch("/api/admin/notifications/read-all")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const afterAll = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(afterAll.body.data.unreadCount).toBe(0);
  });

  it("keeps admin-broadcast notifications separate from a traveller's own", async () => {
    const { token: travelerToken } = await registerTraveler("notif-admin-separate-traveler@example.com");
    const destinationId = await createDestination();
    await createBookedTrip(travelerToken, destinationId);

    const travelerNotifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${travelerToken}`);
    // The traveller only ever sees notifications about their own actions
    // (there are none yet — booking is still pending) — the admin-broadcast
    // "booking_pending" row must never leak into their own list.
    expect(travelerNotifs.body.data.items.find((n: { type: string }) => n.type === "booking_pending")).toBeUndefined();
  });
});
