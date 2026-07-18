"use client";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/services/api-client";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      await apiPost("/newsletter", { email: email.trim() });
      setStatus("done");
      setEmail("");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Couldn't subscribe you right now. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-6 py-4 text-sm text-success">
        <CheckCircle2 size={18} />
        <span>You&apos;re subscribed! We&apos;ll email you when the newsletter launches.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={status === "submitting"}
          className="h-12 flex-1 rounded-xl border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <Button type="submit" variant="accent" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? <><Loader2 size={14} className="animate-spin" /> Subscribing…</> : "Subscribe"}
        </Button>
      </form>
      {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
