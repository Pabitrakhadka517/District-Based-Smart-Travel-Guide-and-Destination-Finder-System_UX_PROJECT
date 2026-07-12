import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

const credentials = {
  name: "Test Traveler",
  email: "traveler@example.com",
  password: "correct-horse-battery-staple",
};

describe("auth flow", () => {
  it("registers a new user and returns a token + user profile", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.role).toBe("user");
    // Never leak the password hash to the client
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects a second registration with the same email", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects registration with a too-short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...credentials, email: "short@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: "not-the-password" });
    expect(wrongPassword.status).toBe(401);

    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toEqual(expect.any(String));
    // The refresh token is set as an httpOnly cookie, not returned in the body
    expect(ok.headers["set-cookie"]?.[0]).toMatch(/nepalyatra_rt=/);
  });

  it("returns the current user from /auth/me with a valid token", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });
    const token = login.body.data.token as string;

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(credentials.email);

    const noAuth = await request(app).get("/api/auth/me");
    expect(noAuth.status).toBe(401);
  });

  it("rotates the refresh token via /auth/refresh, invalidating the old cookie", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const cookie = login.headers["set-cookie"]?.[0];
    expect(cookie).toBeDefined();

    const refreshed = await request(app).post("/api/auth/refresh").set("Cookie", cookie!);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.token).toEqual(expect.any(String));

    // The old refresh cookie was rotated out — reusing it should now fail.
    const reused = await request(app).post("/api/auth/refresh").set("Cookie", cookie!);
    expect(reused.status).toBe(401);
  });

  it("rejects /auth/refresh with no cookie at all", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });
});
