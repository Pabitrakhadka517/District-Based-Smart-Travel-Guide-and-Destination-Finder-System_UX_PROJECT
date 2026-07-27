import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";

async function start(): Promise<void> {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] NepaYatra API listening on http://localhost:${env.port}`);
    console.log(`[server] Swagger UI:  http://localhost:${env.port}/api-docs`);
    console.log(`[server] API base:    http://localhost:${env.port}/api`);
  });

  // Graceful shutdown — gives in-flight requests time to finish before closing
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n[server] ${signal} received — shutting down gracefully…`);
    server.close(async () => {
      try {
        await disconnectDB();
        console.log("[server] MongoDB disconnected. Goodbye.");
      } catch (e) {
        console.error("[server] Error during disconnect:", e);
      } finally {
        process.exit(0);
      }
    });
    // Force exit after 10 s if connections don't drain
    setTimeout(() => {
      console.error("[server] Forced shutdown after 10 s timeout.");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT",  () => void shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
