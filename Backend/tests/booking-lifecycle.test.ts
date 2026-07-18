import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";

const app = createApp();
const adminToken = signToken({ sub: "admin-1", role: "admin" });

const destinationPayload = {
  slug: "test-lakeside",
  cityId: "test-city",
  districtId: "test-district",
  name: "Test Lakeside",
  category: "Nature",
  coordinates: { lat: 28.2, lng: 83.9 },
  budget: { budget: 1000, midRange: 3000, luxury: 8000 },
  heroImage: { url: "https://images.example.com/test-lakeside.jpg", alt: "Test Lakeside" },
};

async function registerTraveler(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test Traveler", email, password: "correct-horse-battery-staple" });
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

/** Plans a trip, marks it Ready, and books it — the shared setup every test
 *  below needs before it can exercise the lock / state machine. */
async function createBookedTrip(travelerToken: string, destinationId: string) {
  const trip = await request(app)
    .post("/api/planner")
    .set("Authorization", `Bearer ${travelerToken}`)
    .send({
      title: "Lakeside Getaway",
      destinationIds: [destinationId],
      startDate: "2099-01-10",
      endDate: "2099-01-15",
      budget: 20000,
      travelers: 2,
      status: "ready",
    });
  const tripId = trip.body.data.id as string;

  const booking = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${travelerToken}`)
    .send({
      tripPlanId: tripId,
      fullName: "Test Traveler",
      phone: "9800000000",
      emergencyContactName: "Emergency Contact",
      emergencyContactNumber: "9811111111",
    });

  return { tripId, bookingId: booking.body.data.id as string };
}

describe("trip plan lock after booking", () => {
  it("rejects changes to planning-snapshot fields once a plan is booked, but still allows notes/photos", async () => {
    const { token: travelerToken } = await registerTraveler("lock-traveler@example.com");
    const destinationId = await createDestination();
    const { tripId } = await createBookedTrip(travelerToken, destinationId);

    const changeDestinations = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ destinationIds: [] });
    expect(changeDestinations.status).toBe(409);
    expect(changeDestinations.body.error).toMatch(/can't be changed/i);

    // The new district-discovery content arrays are part of the same
    // planning snapshot as destinationIds, so they lock the same way.
    const changeAttractions = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ attractionIds: ["some-attraction"] });
    expect(changeAttractions.status).toBe(409);

    const changeBudget = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ budget: 999 });
    expect(changeBudget.status).toBe(409);

    const changeDates = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ startDate: "2099-02-01" });
    expect(changeDates.status).toBe(409);

    // Trip-progress fields (not part of the Booking snapshot) stay editable.
    const changeNotes = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ notes: "Packed and ready to go!" });
    expect(changeNotes.status).toBe(200);
    expect(changeNotes.body.data.notes).toBe("Packed and ready to go!");

    // Resending an unchanged snapshot field alongside a real edit must not
    // be rejected — the Planner/Tracking UIs routinely do this.
    const resendUnchanged = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ destinationIds: [destinationId], budget: 20000, notes: "Still here" });
    expect(resendUnchanged.status).toBe(200);
  });

  it("won't start a trip whose booking hasn't been confirmed, but will once it is", async () => {
    const { token: travelerToken } = await registerTraveler("start-traveler@example.com");
    const destinationId = await createDestination();
    const { tripId, bookingId } = await createBookedTrip(travelerToken, destinationId);

    const startWhilePending = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "ongoing" });
    expect(startWhilePending.status).toBe(400);
    expect(startWhilePending.body.error).toMatch(/confirmed/i);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    const startAfterConfirm = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "ongoing" });
    expect(startAfterConfirm.status).toBe(200);
    expect(startAfterConfirm.body.data.status).toBe("ongoing");
  });

  it("won't cancel a booked trip plan directly — only the booking cancellation path may revert it", async () => {
    const { token: travelerToken } = await registerTraveler("cancel-traveler@example.com");
    const destinationId = await createDestination();
    const { tripId } = await createBookedTrip(travelerToken, destinationId);

    const directCancel = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "cancelled" });
    expect(directCancel.status).toBe(400);
  });
});

describe("a trip plan can never be created already booked", () => {
  it("rejects creating a plan with status: booked", async () => {
    const { token: travelerToken } = await registerTraveler("forge-traveler@example.com");
    const forged = await request(app)
      .post("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ title: "Forged booking", status: "booked" });
    expect(forged.status).toBe(400);
  });
});

describe("full-object resend safety (Tracking's UI always sends the whole trip)", () => {
  it("lets a photo be added to an ongoing trip via a full-object save that resends the unchanged status", async () => {
    const { token: travelerToken } = await registerTraveler("photo-traveler@example.com");
    const destinationId = await createDestination();
    const { tripId, bookingId } = await createBookedTrip(travelerToken, destinationId);

    await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" })
      .expect(200);

    const started = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "ongoing" });
    expect(started.status).toBe(200);

    // Mirrors OngoingTripCard's PhotoPanel: `{ ...trip, photos: next }` —
    // the whole trip object, including its current (unchanged) status.
    const withPhoto = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({
        ...started.body.data,
        photos: [{ url: "https://images.example.com/trip-photo.jpg", publicId: "nepalyatra/planner/trip-photo", alt: "Trip photo" }],
      });
    expect(withPhoto.status).toBe(200);
    expect(withPhoto.body.data.photos).toHaveLength(1);
  });

  it("lets notes be saved on a booked (not-yet-started) trip via a full-object save", async () => {
    const { token: travelerToken } = await registerTraveler("resend-traveler@example.com");
    const destinationId = await createDestination();
    const { tripId } = await createBookedTrip(travelerToken, destinationId);

    const current = await request(app)
      .get("/api/planner")
      .set("Authorization", `Bearer ${travelerToken}`);
    const trip = current.body.data.find((p: { id: string }) => p.id === tripId);
    expect(trip.status).toBe("booked");

    const resend = await request(app)
      .put(`/api/planner/${tripId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ ...trip, notes: "Can't wait!" });
    expect(resend.status).toBe(200);
    expect(resend.body.data.notes).toBe("Can't wait!");
  });
});

describe("booking status state machine", () => {
  it("allows pending → confirmed → completed but blocks completed → pending", async () => {
    const { token: travelerToken } = await registerTraveler("happy-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    const confirm = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });
    expect(confirm.status).toBe(200);

    const complete = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "completed" });
    expect(complete.status).toBe(200);

    const backToPending = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "pending" });
    expect(backToPending.status).toBe(409);
  });

  it("blocks resurrecting a cancelled booking back to confirmed", async () => {
    const { token: travelerToken } = await registerTraveler("resurrect-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    const cancel = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "cancelled" });
    expect(cancel.status).toBe(200);

    const resurrect = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });
    expect(resurrect.status).toBe(409);
    expect(resurrect.body.error).toMatch(/can't change from "cancelled" to "confirmed"/);
  });

  it("lets a traveler cancel their own pending booking but not resurrect it", async () => {
    const { token: travelerToken } = await registerTraveler("selfcancel-traveler@example.com");
    const destinationId = await createDestination();
    const { bookingId } = await createBookedTrip(travelerToken, destinationId);

    const cancel = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${travelerToken}`)
      .send({ status: "cancelled" });
    expect(cancel.status).toBe(200);

    // A user can still only ever send "cancelled" — but even the admin path
    // is now closed once it's cancelled.
    const adminResurrect = await request(app)
      .patch(`/api/admin/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "confirmed" });
    expect(adminResurrect.status).toBe(409);
  });
});
