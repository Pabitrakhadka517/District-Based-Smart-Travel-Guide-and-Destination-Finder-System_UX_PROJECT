import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";

const app = createApp();

const adminToken = signToken({ sub: "admin-1", role: "admin" });
const userToken = signToken({ sub: "user-1", role: "user" });

const payload = {
  slug: "test-lake",
  cityId: "test-city",
  districtId: "test-district",
  name: "Test Lake",
  category: "Nature",
  coordinates: { lat: 28.2, lng: 83.9 },
  budget: { budget: 1000, midRange: 3000, luxury: 8000 },
  heroImage: { url: "https://images.example.com/test-lake.jpg", alt: "Test Lake" },
};

describe("destinations CRUD", () => {
  it("lists destinations as an empty paginated envelope with none created", async () => {
    const res = await request(app).get("/api/destinations");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
  });

  it("rejects create without an admin token", async () => {
    const noAuth = await request(app).post("/api/destinations").send(payload);
    expect(noAuth.status).toBe(401);

    const nonAdmin = await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${userToken}`)
      .send(payload);
    expect(nonAdmin.status).toBe(403);
  });

  it("creates, fetches, updates and deletes a destination as admin", async () => {
    const created = await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe(payload.slug);
    const id = created.body.data.id as string;

    const listed = await request(app).get("/api/destinations");
    expect(listed.body.total).toBe(1);
    expect(listed.body.data[0].id).toBe(id);

    const fetched = await request(app).get(`/api/destinations/${payload.slug}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.destination.id).toBe(id);
    expect(fetched.body.data.reviews).toEqual([]);

    const updated = await request(app)
      .put(`/api/destinations/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Renamed Lake" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe("Renamed Lake");

    const deleted = await request(app)
      .delete(`/api/destinations/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted).toBe(true);

    const afterDelete = await request(app).get(`/api/destinations/${payload.slug}`);
    expect(afterDelete.status).toBe(404);
  });

  it("rejects creating a destination with a slug that already exists", async () => {
    await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);

    const dup = await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...payload, cityId: "another-city" });

    expect(dup.status).toBe(409);
  });

  it("rejects updating a destination to a slug used by another one", async () => {
    const first = await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(payload);
    const second = await request(app)
      .post("/api/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...payload, slug: "test-lake-2" });

    const conflict = await request(app)
      .put(`/api/destinations/${second.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ slug: first.body.data.slug });

    expect(conflict.status).toBe(409);
  });

  it("returns 404 when updating or deleting a destination that doesn't exist", async () => {
    const update = await request(app)
      .put("/api/destinations/does-not-exist")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Nope" });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete("/api/destinations/does-not-exist")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(404);
  });
});
