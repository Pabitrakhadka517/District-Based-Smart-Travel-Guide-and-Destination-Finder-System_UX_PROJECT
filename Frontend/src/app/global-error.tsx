"use client";

// Only fires if the root layout itself throws — the route-level error.tsx
// can't catch that, so this renders its own <html>/<body> as a last resort
// branded fallback instead of Next.js's default unstyled error screen.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{
          display: "grid", minHeight: "100vh", placeItems: "center",
          background: "#faf9f5", color: "#211d18", textAlign: "center", padding: "0 24px",
        }}>
          <div>
            <div style={{
              margin: "0 auto", display: "grid", height: 80, width: 80, placeItems: "center",
              borderRadius: 24, background: "rgba(217, 119, 6, 0.1)", color: "#d97706", fontSize: 36,
            }}>
              ⚠
            </div>
            <h1 style={{ marginTop: 24, fontSize: "2.25rem", fontWeight: 700, color: "#0f766e" }}>
              Something went wrong
            </h1>
            <p style={{ margin: "8px auto 0", maxWidth: 360, fontSize: "0.875rem", color: "#6b7280" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 24, padding: "12px 24px", borderRadius: 12, border: "none",
                background: "#0f766e", color: "#fff", fontSize: "0.95rem", fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
