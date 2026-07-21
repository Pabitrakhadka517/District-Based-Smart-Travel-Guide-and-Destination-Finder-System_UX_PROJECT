import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

const credentials = {
  name: "Test Traveler",
  email: "traveler@example.com",
  password: "correct-horse-battery-staple",
};

/** Turns a supertest response's Set-Cookie header(s) into a single Cookie
 *  header value, the way a browser would when replaying them on the next request. */
function cookieHeader(res: request.Response): string {
  const raw = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

describe("auth flow", () => {
  it("registers a new user without issuing any auth tokens or cookies", async () => {
    const res = await request(app).post("/api/auth/register").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.role).toBe("user");
    // Never leak the password hash to the client
    expect(res.body.data.user.password).toBeUndefined();
    // Registration must not auto-authenticate the user
    expect(res.headers["set-cookie"]).toBeUndefined();
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
    expect(ok.body.data.token).toBeUndefined();
    // Both the access and refresh tokens are set as httpOnly cookies, not returned in the body
    expect(cookieHeader(ok)).toMatch(/nepalyatra_at=/);
    expect(cookieHeader(ok)).toMatch(/nepalyatra_rt=/);
  });

  it("returns the current user from /auth/me with a valid session cookie", async () => {
    await request(app).post("/api/auth/register").send(credentials);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const me = await request(app).get("/api/auth/me").set("Cookie", cookieHeader(login));
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
    expect(refreshed.body.data.token).toBeUndefined();
    expect(cookieHeader(refreshed)).toMatch(/nepalyatra_at=/);

    // The old refresh cookie was rotated out — reusing it should now fail.
    const reused = await request(app).post("/api/auth/refresh").set("Cookie", cookie!);
    expect(reused.status).toBe(401);
  });

  it("rejects /auth/refresh with no cookie at all", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });
});
